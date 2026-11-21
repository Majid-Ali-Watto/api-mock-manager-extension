// End-to-end test: loads dist/ into Chrome for Testing and drives it over the
// DevTools protocol (no extra packages). Run `npm run build` first.
//   CHROME_PATH=/path/to/chrome npm run test:e2e
// Without CHROME_PATH it looks in ~/.cache/puppeteer and ./.cache (where
// `npx @puppeteer/browsers install chrome@stable --path .cache` puts it).
// Branded Google Chrome ignores --load-extension, so use Chrome for Testing.
import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const EXT = path.join(root, "dist");
const PORT = 8765;
const DBG = 9333;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function findChrome() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const bases = [path.join(os.homedir(), ".cache/puppeteer/chrome"), path.join(root, ".cache/chrome")];
  for (const base of bases) {
    if (!fs.existsSync(base)) continue;
    for (const dir of fs.readdirSync(base).sort().reverse()) {
      for (const rel of ["chrome-linux64/chrome", "chrome-mac-x64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
        "chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing", "chrome-win64/chrome.exe"]) {
        const candidate = path.join(base, dir, rel);
        if (fs.existsSync(candidate)) return candidate;
      }
    }
  }
  throw new Error("Chrome for Testing not found. Set CHROME_PATH or run: npx @puppeteer/browsers install chrome@stable --path .cache");
}

if (!fs.existsSync(path.join(EXT, "manifest.json"))) {
  console.error("dist/ not found — run `npm run build` first.");
  process.exit(1);
}

// ---- Test site ---------------------------------------------------------------
const serverHits = {};
const page = `<!doctype html><html><head><script>
window.__leaks = [];
for (const t of ['__api_mock_port__', 'API_MOCK_UPDATE', 'API_MOCK_HIT', 'API_MOCK_READY', 'API_MOCK_INTERCEPT'])
  document.addEventListener(t, e => window.__leaks.push(t + (e.ports && e.ports.length ? '+port' : '')), true);
window.addEventListener('message', () => window.__leaks.push('window.message'));
</script></head><body>test</body></html>`;
const server = http.createServer((req, res) => {
  const pathname = new URL(req.url, "http://x").pathname;
  serverHits[pathname] = (serverHits[pathname] || 0) + 1;
  if (pathname === "/page.html") {
    res.setHeader("content-type", "text/html");
    return res.end(page);
  }
  if (pathname === "/echo") {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => res.end(body));
    return;
  }
  res.setHeader("content-type", "application/json");
  res.end(JSON.stringify({ real: pathname }));
}).listen(PORT);

// ---- Chrome + CDP --------------------------------------------------------------
const profile = fs.mkdtempSync(path.join(os.tmpdir(), "api-mock-e2e-"));
const chrome = spawn(findChrome(), [
  "--headless=new", `--remote-debugging-port=${DBG}`, `--user-data-dir=${profile}`,
  `--load-extension=${EXT}`, `--disable-extensions-except=${EXT}`,
  "--no-first-run", "--no-default-browser-check", ...(process.env.CI ? ["--no-sandbox"] : []), "about:blank",
], { stdio: "ignore" });

let failures = 0;
function check(name, ok, detail) {
  if (!ok) failures++;
  console.log(`${ok ? "✔" : "✖"} ${name}${ok ? "" : `  →  ${JSON.stringify(detail)}`}`);
}
function finish() {
  try { chrome.kill(); } catch { /* already gone */ }
  server.close();
  fs.rmSync(profile, { recursive: true, force: true });
  console.log(failures ? `\n${failures} check(s) failed` : "\nAll checks passed");
  process.exit(failures ? 1 : 0);
}
process.on("unhandledRejection", (err) => {
  console.error("ERROR", err?.message || err);
  failures++;
  finish();
});

let version;
for (let i = 0; i < 50 && !version; i++) {
  try {
    version = await (await fetch(`http://127.0.0.1:${DBG}/json/version`)).json();
  } catch {
    await sleep(200);
  }
}
const ws = new WebSocket(version.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let nextId = 0;
const pending = new Map();
ws.onmessage = (m) => {
  const d = JSON.parse(m.data);
  if (d.id && pending.has(d.id)) {
    pending.get(d.id)(d);
    pending.delete(d.id);
  }
};
const send = (method, params = {}, sessionId) =>
  new Promise((r) => {
    const id = ++nextId;
    pending.set(id, r);
    ws.send(JSON.stringify({ id, method, params, sessionId }));
  });
async function evalIn(sessionId, expression) {
  const r = await Promise.race([
    send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true }, sessionId),
    sleep(15000).then(() => { throw new Error("eval timeout: " + expression.slice(0, 80)); }),
  ]);
  if (r.result?.exceptionDetails) {
    throw new Error(r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text);
  }
  return r.result?.result?.value;
}
async function attach(targetId) {
  const { result } = await send("Target.attachToTarget", { targetId, flatten: true });
  await send("Runtime.runIfWaitingForDebugger", {}, result.sessionId);
  return result.sessionId;
}
async function openTab(url) {
  const { result: { targetId } } = await send("Target.createTarget", { url: "about:blank" });
  const sessionId = await attach(targetId);
  await send("Page.enable", {}, sessionId);
  await send("Page.navigate", { url }, sessionId);
  await sleep(1500);
  return { sessionId, targetId };
}

// Find our service worker by manifest name (Chrome for Testing has its own extensions).
let extId, sw;
for (let i = 0; i < 40 && !extId; i++) {
  const { result } = await send("Target.getTargets");
  for (const t of result.targetInfos.filter((t) => t.type === "service_worker" && t.url.startsWith("chrome-extension://"))) {
    const sessionId = await attach(t.targetId);
    const r = await send("Runtime.evaluate", { expression: "chrome.runtime.getManifest().name", returnByValue: true }, sessionId);
    if (r.result?.result?.value === "API Mock Manager") {
      extId = new URL(t.url).host;
      sw = sessionId;
      break;
    }
  }
  if (!extId) await sleep(300);
}
check("extension loads", !!extId);
if (!extId) finish();

// ---- Seed data (from the service worker) ---------------------------------------
const L = `localhost:${PORT}`;
const collections = [
  { id: 1, name: "Local", enabled: true, sites: [L] },
  { id: 2, name: "Other", enabled: true, sites: ["other.test"] },
  { id: 3, name: "All", enabled: true },
  { id: 4, name: "Recorded", enabled: true },
];
const apis = [
  { id: 1, collectionId: 1, method: "GET", url: "/api/users/:id", templated: true, label: "SECRET_LABEL",
    responsePayload: '{"id":"{{params.id}}","page":"{{query.page}}"}' },
  { id: 4, collectionId: 1, method: "DELETE", url: "/api/item", status: 204, responsePayload: '{"x":1}' },
  { id: 5, collectionId: 1, method: "POST", url: "/api/login", matchBody: true, requestPayload: '{"user":"admin"}', responsePayload: '{"role":"admin"}' },
  { id: 6, collectionId: 1, method: "POST", url: "/api/login", responsePayload: '{"role":"guest"}' },
  { id: 7, collectionId: 1, method: "GET", url: "/api/search", matchQuery: "q=*", responsePayload: '{"search":true}' },
  { id: 8, collectionId: 1, method: "GET", url: "/api/down", responseMode: "network-error" },
  { id: 9, collectionId: 1, method: "GET", url: "/api/slow", responseMode: "timeout", delay: 50 },
  { id: 10, collectionId: 1, method: "GET", url: "/api/hang", responseMode: "hang" },
  { id: 11, collectionId: 1, method: "GET", url: "/api/text", contentType: "text/plain", responsePayload: "hello text" },
  { id: 12, collectionId: 1, method: "GET", url: "/api/variant", responsePayload: '{"v":"main"}',
    variants: [{ name: "error", status: 500, responsePayload: '{"v":"err"}' }], activeVariant: "error" },
  { id: 13, collectionId: 1, method: "GET", url: "/sse", contentType: "text/event-stream",
    responsePayload: "data: one\n\nevent: custom\ndata: two\n\n" },
  { id: 14, collectionId: 1, method: "WS", url: "/socket", templated: true, delay: 10, responsePayload: '["hello",{"echo":"{{body}}"}]' },
  { id: 15, collectionId: 1, method: "POST", url: "/beacon", responsePayload: "" },
  { id: 2, collectionId: 2, method: "GET", url: "/api/other", responsePayload: '{"mocked":"other"}' },
  { id: 3, collectionId: 3, method: "GET", url: "/api/all", status: 201, responsePayload: '{"mocked":"all"}' },
];
await evalIn(sw, `new Promise((res, rej) => {
  const r = indexedDB.open('api-mock-db', 2);
  r.onupgradeneeded = () => {
    const d = r.result;
    if (!d.objectStoreNames.contains('collections')) d.createObjectStore('collections', { keyPath: 'id', autoIncrement: true });
    if (!d.objectStoreNames.contains('apis')) d.createObjectStore('apis', { keyPath: 'id', autoIncrement: true }).createIndex('collectionId', 'collectionId');
  };
  r.onsuccess = () => {
    const tx = r.result.transaction(['collections', 'apis'], 'readwrite');
    ${JSON.stringify(collections)}.forEach(c => tx.objectStore('collections').put(c));
    ${JSON.stringify(apis)}.forEach(a => tx.objectStore('apis').put({ status: 200, enabled: true, ...a }));
    tx.oncomplete = () => res(); tx.onerror = () => rej(String(tx.error));
  };
  r.onerror = () => rej(String(r.error));
}).then(() => chrome.tabs.create({ url: chrome.runtime.getURL('index.html') })).then(() => true)`);
await sleep(1500);
const { result: { targetInfos } } = await send("Target.getTargets");
const popupTarget = targetInfos.find((t) => t.type === "page" && t.url.includes(`${extId}/index.html`));
const popup = await attach(popupTarget.targetId);
await send("Page.enable", {}, popup);

// ---- Page checks ------------------------------------------------------------------
const tab = await openTab(`http://localhost:${PORT}/page.html`);
const r = await evalIn(tab.sessionId, `(async () => {
  const out = {};
  const text = async (p, init) => { const res = await fetch(p, init); return res.status + ' ' + await res.text(); };
  const error = (p, init) => fetch(p, init).then(() => 'resolved', e => e.name);
  out.pathParams = await text('/api/users/42?page=3');
  out.urlObject = await text(new URL(location.origin + '/api/users/9'));
  out.otherSite = await text('/api/other');
  out.allSites = await text('/api/all');
  out.noContent = await text('/api/item', { method: 'DELETE' });
  out.bodyAdmin = await text('/api/login', { method: 'POST', body: JSON.stringify({ user: 'admin', pw: 'x' }) });
  out.bodyGuest = await text('/api/login', { method: 'POST', body: JSON.stringify({ user: 'bob' }) });
  out.queryHit = await text('/api/search?q=shoes');
  out.queryMiss = await text('/api/search');
  out.networkError = await error('/api/down');
  out.timeout = await error('/api/slow');
  const ac = new AbortController(); setTimeout(() => ac.abort(), 100);
  out.hangAbort = await error('/api/hang', { signal: ac.signal });
  const t = await fetch('/api/text'); out.textType = t.headers.get('content-type') + ' ' + await t.text();
  out.variant = await text('/api/variant');
  out.xhrBody = await new Promise(r => { const x = new XMLHttpRequest(); x.open('POST', '/echo'); x.setRequestHeader('x-a', '1'); x.onload = () => r(x.responseText); x.send('hello-body'); });
  out.xhrMock = await new Promise(r => { let n = 0; const x = new XMLHttpRequest(); x.responseType = 'json'; x.onload = () => n++;
    x.open('GET', '/api/users/2'); x.send(); setTimeout(() => r({ onloadCalls: n, response: x.response }), 300); });
  out.xhrBodyMatch = await new Promise(r => { const x = new XMLHttpRequest(); x.open('POST', '/api/login'); x.onload = () => r(x.responseText); x.send('{"user":"admin"}'); });
  out.xhrNetworkError = await new Promise(r => { const x = new XMLHttpRequest(); x.onerror = () => r('error ' + x.status); x.onload = () => r('load'); x.open('GET', '/api/down'); x.send(); });
  out.sse = await new Promise(r => { const got = []; const es = new EventSource('/sse');
    es.onmessage = e => got.push('message:' + e.data); es.addEventListener('custom', e => got.push('custom:' + e.data));
    setTimeout(() => { es.close(); r({ got, isEventSource: es instanceof EventSource }); }, 300); });
  out.ws = await new Promise(r => { const got = []; const s = new WebSocket('ws://' + location.host + '/socket');
    s.onopen = () => { got.push('open'); setTimeout(() => s.send('ping'), 60); };
    s.onmessage = e => got.push(e.data);
    setTimeout(() => { s.close(); r({ got, isWebSocket: s instanceof WebSocket }); }, 400); });
  out.beacon = navigator.sendBeacon('/beacon', 'x');
  document.dispatchEvent(new Event('__api_mock_content_ready__'));
  await new Promise(r => setTimeout(r, 100));
  out.leaks = window.__leaks;
  out.secretVisible = document.documentElement.outerHTML.includes('SECRET_LABEL') ||
    Object.keys(window).some(k => { try { return JSON.stringify(window[k])?.includes('SECRET_LABEL'); } catch { return false; } });
  return out;
})()`);

check("path params + templating", r.pathParams === '200 {"id":"42","page":"3"}', r.pathParams);
check("fetch(URL object)", r.urlObject === '200 {"id":"9","page":""}', r.urlObject);
check("site scoping skips other site", r.otherSite === '200 {"real":"/api/other"}', r.otherSite);
check("all-sites collection applies", r.allSites === '201 {"mocked":"all"}', r.allSites);
check("204 has empty body", r.noContent === "204 ", r.noContent);
check("body match picks specific mock", r.bodyAdmin === '200 {"role":"admin"}', r.bodyAdmin);
check("body mismatch falls back to generic", r.bodyGuest === '200 {"role":"guest"}', r.bodyGuest);
check("query condition matches", r.queryHit === '200 {"search":true}', r.queryHit);
check("query condition missing → real", r.queryMiss === '200 {"real":"/api/search"}', r.queryMiss);
check("network-error mode", r.networkError === "TypeError", r.networkError);
check("timeout mode", r.timeout === "TimeoutError", r.timeout);
check("hang mode honours abort", r.hangAbort === "AbortError", r.hangAbort);
check("text content type", r.textType === "text/plain hello text", r.textType);
check("active variant used", r.variant === '500 {"v":"err"}', r.variant);
check("XHR body forwarded to server", r.xhrBody === "hello-body", r.xhrBody);
check("XHR onload once + json", r.xhrMock.onloadCalls === 1 && r.xhrMock.response?.id === "2", r.xhrMock);
check("XHR body match", r.xhrBodyMatch === '{"role":"admin"}', r.xhrBodyMatch);
check("XHR network error", r.xhrNetworkError === "error 0", r.xhrNetworkError);
check("EventSource mock", JSON.stringify(r.sse.got) === '["message:one","custom:two"]' && r.sse.isEventSource, r.sse);
check("WebSocket mock + templated reply", JSON.stringify(r.ws.got) === '["open","hello","{\\"echo\\":\\"\\"}","hello","{\\"echo\\":\\"ping\\"}"]' && r.ws.isWebSocket, r.ws);
check("sendBeacon swallowed", r.beacon === true && !serverHits["/beacon"], { beacon: r.beacon, serverHits: serverHits["/beacon"] });
check("page sees no bridge traffic", JSON.stringify(r.leaks) === "[]", r.leaks);
check("labels never reach the page", r.secretVisible === false);

// ---- Hit counts, request log, badge ------------------------------------------------
await sleep(300);
const hits = await evalIn(popup, `chrome.runtime.sendMessage({ type: 'GET_HIT_COUNTS' })`);
check("hit counts recorded", hits.hitCounts.apis["1"] === 3 && hits.hitCounts.apis["3"] === 1, hits.hitCounts);
const log = await evalIn(popup, `chrome.runtime.sendMessage({ type: 'GET_REQUEST_LOG' })`);
check("request log has entries", log.log.length >= 15 && log.log.some((e) => e.url.endsWith("/api/users/42?page=3") && e.label === "SECRET_LABEL"), log.log.length);

await send("Target.activateTarget", { targetId: tab.targetId });
await sleep(300);
const tabId = await evalIn(popup, `chrome.tabs.query({ active: true, lastFocusedWindow: true }).then(t => t[0]?.id)`);
const badge = await evalIn(popup, `chrome.action.getBadgeText({ tabId: ${tabId} })`);
check("badge shows mock count", Number(badge) > 0, badge);

// ---- Global switch ------------------------------------------------------------------
await evalIn(popup, `chrome.runtime.sendMessage({ type: 'SET_MOCKS_ENABLED', enabled: false })`);
await sleep(800);
const off = await evalIn(tab.sessionId, `fetch('/api/all').then(r => r.text())`);
check("global off → real responses", off === '{"real":"/api/all"}', off);
check("badge shows OFF", (await evalIn(popup, `chrome.action.getBadgeText({ tabId: ${tabId} })`)) === "OFF");
const pageCannotToggle = await evalIn(tab.sessionId, `true`); // pages have no chrome.runtime to send SET_MOCKS_ENABLED
await evalIn(popup, `chrome.runtime.sendMessage({ type: 'SET_MOCKS_ENABLED', enabled: true })`);
await sleep(800);
check("global on again", (await evalIn(tab.sessionId, `fetch('/api/all').then(r => r.text())`)) === '{"mocked":"all"}' && pageCannotToggle);

// ---- Recording ------------------------------------------------------------------------
await evalIn(popup, `chrome.runtime.sendMessage({ type: 'START_RECORDING', collectionId: 4, tabId: ${tabId} })`);
await sleep(800);
check("badge shows REC", (await evalIn(popup, `chrome.action.getBadgeText({ tabId: ${tabId} })`)) === "REC");
await evalIn(tab.sessionId, `fetch('/real/data?x=1').then(r => r.text()).then(() => new Promise(r => { const x = new XMLHttpRequest(); x.open('GET', '/real/xhr'); x.onload = r; x.send(); }))`);
await sleep(800);
await evalIn(popup, `chrome.runtime.sendMessage({ type: 'STOP_RECORDING' })`);
const recorded = await evalIn(sw, `new Promise(res => { const r = indexedDB.open('api-mock-db'); r.onsuccess = () => {
  const q = r.result.transaction('apis').objectStore('apis').index('collectionId').getAll(4);
  q.onsuccess = () => res(q.result.map(a => ({ url: a.url, method: a.method, enabled: a.enabled, body: a.responsePayload }))); }; })`);
check("recording saved fetch + XHR responses (disabled)",
  recorded.length === 2 && recorded.every((a) => a.enabled === false) &&
  recorded.some((a) => a.url === `http://localhost:${PORT}/real/data` && JSON.parse(a.body).real === "/real/data") &&
  recorded.some((a) => a.url.endsWith("/real/xhr")), recorded);

// ---- Popup renders ---------------------------------------------------------------------
await send("Emulation.setDeviceMetricsOverride", { width: 640, height: 480, deviceScaleFactor: 1, mobile: false }, popup);
await send("Page.reload", {}, popup);
await sleep(1200);
const popupText = await evalIn(popup, `document.body.innerText`);
check("popup renders collections", popupText.includes("Local") && popupText.includes("Recorded"), popupText.slice(0, 200));
if (process.env.E2E_SCREENSHOTS) {
  const shot = await send("Page.captureScreenshot", { format: "png" }, popup);
  fs.writeFileSync(path.join(process.env.E2E_SCREENSHOTS, "popup.png"), Buffer.from(shot.result.data, "base64"));
  await send("Page.navigate", { url: `chrome-extension://${extId}/index.html?action=api-form&mode=edit&apiId=12` }, popup);
  await sleep(1200);
  await send("Emulation.setDeviceMetricsOverride", { width: 900, height: 900, deviceScaleFactor: 1, mobile: false }, popup);
  const form = await send("Page.captureScreenshot", { format: "png" }, popup);
  fs.writeFileSync(path.join(process.env.E2E_SCREENSHOTS, "form.png"), Buffer.from(form.result.data, "base64"));
}

finish();
