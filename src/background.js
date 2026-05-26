// Background Service Worker for API Interception

import { dbPromise, STORES } from "./db/db";

let cachedEnabledAPIs = [];
let lastCacheUpdate = 0;
const CACHE_TTL = 1000;
const hitCounts = { apis: {}, collections: {} };

function recordApiHit(hit) {
  const parsedHit = typeof hit === "string" ? JSON.parse(hit) : hit;
  const apiId = parsedHit?.apiId;
  const collectionId = parsedHit?.collectionId;
  if (apiId === undefined || collectionId === undefined) return;
  hitCounts.apis[apiId] = (hitCounts.apis[apiId] || 0) + 1;
  hitCounts.collections[collectionId] = (hitCounts.collections[collectionId] || 0) + 1;
}

async function getEnabledAPIs(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && cachedEnabledAPIs.length > 0 && now - lastCacheUpdate < CACHE_TTL) {
    return cachedEnabledAPIs;
  }

  try {
    const db = await dbPromise;
    const collections = await db.getAll(STORES.COLLECTIONS);
    const allApis = await db.getAll(STORES.APIS);

    cachedEnabledAPIs = allApis.filter((api) => {
      const collection = collections.find((col) => col.id === api.collectionId);
      const collectionEnabled = collection ? collection.enabled !== false : false;
      return collectionEnabled && api.enabled !== false;
    });

    lastCacheUpdate = now;
    return cachedEnabledAPIs;
  } catch (err) {
    console.error("Error getting enabled APIs:", err);
    return [];
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "GET_ENABLED_APIS") {
    getEnabledAPIs(false)
      .then((apis) => sendResponse({ apis }))
      .catch(() => sendResponse({ apis: [] }));
    return true;
  }

  if (message.type === "RECORD_API_HIT") {
    try {
      recordApiHit(message.hit);
      chrome.runtime.sendMessage({ type: "HIT_COUNTS_UPDATED", hitCounts }).catch(() => {});
      sendResponse({ success: true });
    } catch (err) {
      sendResponse({ success: false, error: err.message });
    }
    return true;
  }

  if (message.type === "GET_HIT_COUNTS") {
    sendResponse({ hitCounts });
    return true;
  }

  if (message.type === "REFRESH_MOCKS") {
    lastCacheUpdate = 0;
    getEnabledAPIs(true)
      .then((apis) => {
        chrome.tabs.query({}, (tabs) => {
          tabs.forEach((tab) => {
            if (tab.id && tab.id !== -1) {
              chrome.tabs.sendMessage(tab.id, { type: "RELOAD_MOCKS" }).catch(() => {});
            }
          });
        });
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

getEnabledAPIs(true);
