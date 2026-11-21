// Background Service Worker: serves mocks to content scripts, tracks hits and the
// request log (memory only), manages the global on/off switch, recording and the
// toolbar badge.

import { dbPromise, STORES } from "./db/db";
import { matchesSite } from "./utils/siteMatcher";

let cachedEnabledAPIs = [];
let cachedCollections = {};
let lastCacheUpdate = 0;
const CACHE_TTL = 1000;
const hitCounts = { apis: {}, collections: {} };

// ---- Settings (chrome.storage.local) -----------------------------------------
// mocksEnabled: global switch.  recording: { collectionId, tabId } | null.
const settings = { mocksEnabled: true, recording: null };
const settingsReady = chrome.storage.local
  .get({ mocksEnabled: true, recording: null })
  .then((stored) => Object.assign(settings, stored))
  .catch(() => {});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  for (const key of Object.keys(settings)) {
    if (changes[key]) settings[key] = changes[key].newValue ?? (key === "mocksEnabled" ? true : null);
  }
  broadcast({ type: "SETTINGS_UPDATED", settings: { ...settings } });
  reloadAllTabs();
});

function saveSettings(patch) {
  Object.assign(settings, patch);
  return chrome.storage.local.set(patch);
}

// ---- Data ------------------------------------------------------------------

async function getEnabledAPIs(forceRefresh = false) {
  const now = Date.now();
  // Note: an empty list is a valid cached result; don't hit IndexedDB on every poll.
  if (!forceRefresh && lastCacheUpdate > 0 && now - lastCacheUpdate < CACHE_TTL) {
    return cachedEnabledAPIs;
  }

  try {
    const db = await dbPromise;
    const collections = await db.getAll(STORES.COLLECTIONS);
    const allApis = await db.getAll(STORES.APIS);

    cachedCollections = Object.fromEntries(
      collections.map((col) => [
        col.id,
        { name: col.name, sites: Array.isArray(col.sites) ? col.sites : [], enabled: col.enabled !== false },
      ])
    );
    cachedEnabledAPIs = allApis.filter(
      (api) => cachedCollections[api.collectionId]?.enabled && api.enabled !== false
    );

    lastCacheUpdate = now;
    return cachedEnabledAPIs;
  } catch (err) {
    console.error("Error getting enabled APIs:", err);
    return [];
  }
}

// The active variant (if any) overrides the main response fields.
function resolveVariant(api) {
  const variants = Array.isArray(api.variants) ? api.variants : [];
  const active = api.activeVariant ? variants.find((v) => v?.name === api.activeVariant) : null;
  if (!active) return api;
  return {
    ...api,
    status: active.status ?? api.status,
    responsePayload: typeof active.responsePayload === "string" ? active.responsePayload : api.responsePayload,
    contentType: typeof active.contentType === "string" ? active.contentType : api.contentType,
    responseMode: active.responseMode || api.responseMode,
  };
}

// Only the fields interception needs, all as own properties (pages can't observe
// prototype lookups for missing keys). Labels and descriptions never reach pages;
// the request payload is only sent when it is used for body matching.
function toPageMock(rawApi) {
  const api = resolveVariant(rawApi);
  const matchBody = api.matchBody === true;
  return {
    id: api.id,
    collectionId: api.collectionId,
    method: String(api.method || ""),
    url: String(api.url || ""),
    urlMatchType: api.urlMatchType || "auto",
    status: api.status || 200,
    delay: api.delay || 0,
    responsePayload: typeof api.responsePayload === "string" ? api.responsePayload : "",
    responseHeaders: typeof api.responseHeaders === "string" ? api.responseHeaders : "",
    contentType: typeof api.contentType === "string" ? api.contentType : "application/json",
    responseMode: ["network-error", "timeout", "hang"].includes(api.responseMode) ? api.responseMode : "mock",
    templated: api.templated === true,
    matchQuery: typeof api.matchQuery === "string" ? api.matchQuery : "",
    matchBody,
    requestPayload: matchBody && typeof api.requestPayload === "string" ? api.requestPayload : "",
    enabled: true,
  };
}

// Mocks for the frame that asked: only collections scoped to its site (or to all sites).
function mocksForFrame(apis, frameUrl) {
  if (!settings.mocksEnabled) return [];
  return apis
    .filter((api) => matchesSite(frameUrl, cachedCollections[api.collectionId]?.sites))
    .map(toPageMock);
}

function isRecordingFrame(sender) {
  const rec = settings.recording;
  if (!rec || sender.tab?.id !== rec.tabId) return false;
  return matchesSite(sender.url || "", cachedCollections[rec.collectionId]?.sites);
}

// ---- Toolbar badge -------------------------------------------------------------

function updateBadge(tabId, mockCount, isRecording) {
  let text = mockCount > 0 ? String(mockCount) : "";
  let color = "#4f46e5";
  if (!settings.mocksEnabled) {
    text = "OFF";
    color = "#64748b";
  }
  if (isRecording) {
    text = "REC";
    color = "#dc2626";
  }
  chrome.action.setBadgeText({ tabId, text }).catch(() => {});
  chrome.action.setBadgeBackgroundColor({ tabId, color }).catch(() => {});
}

// ---- Hits and request log (memory only) -----------------------------------------

const LOG_LIMIT = 200;
const requestLog = [];

function recordApiHit(hit, sender) {
  const parsedHit = typeof hit === "string" ? JSON.parse(hit) : hit;
  const apiId = parsedHit?.apiId;
  const collectionId = parsedHit?.collectionId;
  if (apiId === undefined || collectionId === undefined) return null;
  // Hits come from page context; only count known enabled mocks.
  const api = cachedEnabledAPIs.find((a) => a.id === apiId && a.collectionId === collectionId);
  if (!api) return null;
  hitCounts.apis[apiId] = (hitCounts.apis[apiId] || 0) + 1;
  hitCounts.collections[collectionId] = (hitCounts.collections[collectionId] || 0) + 1;

  const entry = {
    time: Date.now(),
    tabId: sender.tab?.id ?? null,
    method: String(parsedHit.method || api.method || ""),
    url: String(parsedHit.url || api.url || "").slice(0, 2048),
    status: Number(parsedHit.status) || 0,
    mode: String(parsedHit.mode || "mock"),
    apiId,
    collectionId,
    label: api.label || api.url,
    collectionName: cachedCollections[collectionId]?.name || "",
    variant: api.activeVariant || "",
  };
  requestLog.push(entry);
  if (requestLog.length > LOG_LIMIT) requestLog.splice(0, requestLog.length - LOG_LIMIT);
  return entry;
}

// ---- Recording -------------------------------------------------------------------

let recordQueue = Promise.resolve();

function simplifyContentType(type) {
  const base = String(type || "").split(";")[0].trim().toLowerCase();
  if (!base) return "application/json";
  return /json/.test(base) ? "application/json" : base;
}

async function saveRecordedResponse(response) {
  const rec = settings.recording;
  if (!rec) return;
  let parsed;
  try {
    parsed = new URL(response.url);
  } catch {
    return;
  }
  if (!/^https?:$/.test(parsed.protocol)) return;
  const url = parsed.origin + parsed.pathname;
  const method = String(response.method || "GET").toUpperCase();

  const db = await dbPromise;
  const tx = db.transaction(STORES.APIS, "readwrite");
  const store = tx.objectStore(STORES.APIS);
  const existing = await store.index("collectionId").getAll(IDBKeyRange.only(rec.collectionId));
  if (existing.some((a) => a.method === method && a.url === url)) {
    await tx.done;
    return;
  }
  const contentType = simplifyContentType(response.contentType);
  let body = response.body;
  if (contentType === "application/json") {
    try {
      body = JSON.stringify(JSON.parse(body), null, 2);
    } catch {
      // keep as-is
    }
  }
  await store.add({
    label: `${method} ${parsed.pathname}`,
    url,
    method,
    status: Number(response.status) || 200,
    requestPayload: response.requestBody || "",
    responsePayload: body,
    responseHeaders: "",
    contentType,
    delay: 0,
    urlMatchType: "auto",
    enabled: false, // recorded mocks start disabled so the session keeps hitting the real API
    recorded: true,
    collectionId: rec.collectionId,
    createdAt: Date.now(),
  });
  await tx.done;
  broadcast({ type: "API_RECORDED", collectionId: rec.collectionId });
}

// ---- Messaging helpers --------------------------------------------------------------

function broadcast(message) {
  chrome.runtime.sendMessage(message).catch(() => {});
}

function reloadAllTabs() {
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach((tab) => {
      if (tab.id && tab.id !== -1) {
        chrome.tabs.sendMessage(tab.id, { type: "RELOAD_MOCKS" }).catch(() => {});
      }
    });
  });
}

// Settings-changing messages are only accepted from the extension's own pages.
function isExtensionPage(sender) {
  return sender.id === chrome.runtime.id && String(sender.url || "").startsWith(chrome.runtime.getURL(""));
}

function setMocksEnabled(enabled) {
  return saveSettings({ mocksEnabled: enabled !== false });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "GET_ENABLED_APIS") {
    Promise.all([settingsReady, getEnabledAPIs(false)])
      .then(([, apis]) => {
        const mocks = mocksForFrame(apis, sender.url || "");
        const record = isRecordingFrame(sender);
        if (sender.tab?.id !== undefined && sender.frameId === 0) {
          updateBadge(sender.tab.id, mocks.length, record);
        }
        sendResponse({ apis: mocks, record });
      })
      .catch(() => sendResponse({ apis: [], record: false }));
    return true;
  }

  if (message.type === "RECORD_API_HIT") {
    try {
      const entry = recordApiHit(message.hit, sender);
      if (entry) {
        broadcast({ type: "HIT_COUNTS_UPDATED", hitCounts });
        broadcast({ type: "REQUEST_LOGGED", entry });
      }
      sendResponse({ success: true });
    } catch (err) {
      sendResponse({ success: false, error: err.message });
    }
    return true;
  }

  if (message.type === "RECORD_RESPONSE") {
    if (!isRecordingFrame(sender) || !message.response) {
      sendResponse({ success: false });
      return true;
    }
    recordQueue = recordQueue
      .then(() => saveRecordedResponse(message.response))
      .catch((err) => console.error("Recording failed:", err));
    sendResponse({ success: true });
    return true;
  }

  if (message.type === "GET_HIT_COUNTS") {
    sendResponse({ hitCounts });
    return true;
  }

  if (message.type === "GET_REQUEST_LOG") {
    sendResponse({ log: requestLog });
    return true;
  }

  if (message.type === "CLEAR_REQUEST_LOG") {
    if (isExtensionPage(sender)) requestLog.length = 0;
    sendResponse({ success: true });
    return true;
  }

  if (message.type === "GET_SETTINGS") {
    settingsReady.then(() => sendResponse({ settings: { ...settings } }));
    return true;
  }

  if (message.type === "SET_MOCKS_ENABLED") {
    if (!isExtensionPage(sender)) return false;
    setMocksEnabled(message.enabled).then(() => sendResponse({ success: true }));
    return true;
  }

  if (message.type === "START_RECORDING") {
    if (!isExtensionPage(sender) || !Number.isInteger(message.tabId)) return false;
    saveSettings({ recording: { collectionId: message.collectionId, tabId: message.tabId } })
      .then(() => sendResponse({ success: true }));
    return true;
  }

  if (message.type === "STOP_RECORDING") {
    if (!isExtensionPage(sender)) return false;
    saveSettings({ recording: null }).then(() => sendResponse({ success: true }));
    return true;
  }

  if (message.type === "REFRESH_MOCKS") {
    lastCacheUpdate = 0;
    getEnabledAPIs(true)
      .then((apis) => {
        reloadAllTabs();
        sendResponse({ success: true, count: apis.length });
      })
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (message.type === "RELOAD_MOCKS") {
    sendResponse({ success: true });
    return true;
  }
});

// Keyboard shortcut (see "commands" in manifest.json).
chrome.commands?.onCommand.addListener((command) => {
  if (command === "toggle-mocks") {
    settingsReady.then(() => setMocksEnabled(!settings.mocksEnabled));
  }
});

// Recording is tied to a tab; stop when it closes.
chrome.tabs.onRemoved.addListener((tabId) => {
  if (settings.recording?.tabId === tabId) saveSettings({ recording: null });
});

getEnabledAPIs(true);
