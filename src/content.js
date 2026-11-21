// Content Script: bridges the background service worker and injected.js (page world).
// Mock data is exchanged with injected.js over a private MessagePort, never via DOM
// events, so page scripts can't read mocks or forge hit reports.
(function() {
  'use strict';

  // Must match BRIDGE in injected.js.
  const BRIDGE = { PORT: '__api_mock_port__', CONTENT_READY: '__api_mock_content_ready__' };

  let port = null;
  let contextInvalidated = false;
  let syncInterval = null;
  // Last payload sent to the page; only re-sent when it changes.
  let lastSentDetail = null;

  function stopSync(reason) {
    if (contextInvalidated) return;
    contextInvalidated = true;
    console.log(`🔄 API Mock: ${reason} - stopping updates`);
    if (syncInterval) clearInterval(syncInterval);
  }

  function loadAndSendMocks(force = false) {
    if (!chrome.runtime?.id) {
      stopSync('extension reloaded');
      return;
    }
    if (!port) return;

    try {
      chrome.runtime.sendMessage({ type: 'GET_ENABLED_APIS' }, (response) => {
        if (chrome.runtime.lastError) {
          stopSync('extension context changed');
          return;
        }
        if (!response || !Array.isArray(response.apis)) return;

        const record = response.record === true;
        const detail = JSON.stringify([record, response.apis]);
        if (!force && detail === lastSentDetail) return;
        lastSentDetail = detail;
        port.postMessage({ type: 'mocks', mocks: response.apis, record });
      });
    } catch {
      stopSync('extension communication lost');
    }
  }

  function toBackground(message) {
    if (!chrome.runtime?.id) return;
    try {
      chrome.runtime.sendMessage(message).catch?.(() => {});
    } catch {
      // The extension context can disappear during reloads.
    }
  }

  // Messages from injected.js. Fields are copied explicitly; nothing else is forwarded.
  function onPortMessage(event) {
    const msg = event.data;
    if (msg?.type === 'hit') {
      toBackground({
        type: 'RECORD_API_HIT',
        hit: {
          apiId: msg.apiId,
          collectionId: msg.collectionId,
          method: String(msg.method || ''),
          url: String(msg.url || '').slice(0, 2048),
          status: Number(msg.status) || 0,
          mode: String(msg.mode || 'mock'),
        },
      });
    } else if (msg?.type === 'record') {
      toBackground({
        type: 'RECORD_RESPONSE',
        response: {
          method: String(msg.method || 'GET'),
          url: String(msg.url || ''),
          status: Number(msg.status) || 200,
          contentType: String(msg.contentType || ''),
          body: typeof msg.body === 'string' ? msg.body : '',
          requestBody: typeof msg.requestBody === 'string' ? msg.requestBody : '',
        },
      });
    }
  }

  // Accept exactly one port: the one injected.js offers at document_start.
  function onPortOffered(event) {
    if (port || !event.ports?.[0]) return;
    event.preventDefault(); // tells injected.js the port was accepted
    port = event.ports[0];
    port.onmessage = onPortMessage;
    document.removeEventListener(BRIDGE.PORT, onPortOffered);
    loadAndSendMocks(true);
  }

  document.addEventListener(BRIDGE.PORT, onPortOffered);
  // If injected.js ran first, ask it to offer the port now.
  document.dispatchEvent(new Event(BRIDGE.CONTENT_READY));

  // Fallback sync; changes are normally pushed via RELOAD_MOCKS.
  syncInterval = setInterval(() => loadAndSendMocks(), 2000);

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'RELOAD_MOCKS') {
      loadAndSendMocks();
      sendResponse({ success: true });
      return true;
    }
  });
})();
