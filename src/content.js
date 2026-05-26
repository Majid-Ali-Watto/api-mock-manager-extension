// Content Script for Intercepting Fetch/XHR
(function() {
  'use strict';

  // Load mocks from background and send to injected script
  let contextInvalidated = false;

  function loadAndSendMocks() {
    // Check if extension context is valid
    if (!chrome.runtime?.id) {
      if (!contextInvalidated) {
        contextInvalidated = true;
        console.log('🔄 Extension reloaded - content script will be reinjected');
        // Clear the interval to stop trying
        if (window.mockSyncInterval) {
          clearInterval(window.mockSyncInterval);
        }
      }
      return false; // Context invalid
    }
    
    try {
      chrome.runtime.sendMessage({ type: 'GET_ENABLED_APIS' }, (response) => {
        // Check for runtime errors (extension reloaded)
        if (chrome.runtime.lastError) {
          if (!contextInvalidated) {
            contextInvalidated = true;
            console.log('🔄 Extension context changed - stopping updates');
            if (window.mockSyncInterval) {
              clearInterval(window.mockSyncInterval);
            }
          }
          return;
        }
        
        if (response && response.apis) {
          document.dispatchEvent(new CustomEvent('API_MOCK_UPDATE', {
            detail: JSON.stringify(response.apis)
          }));
        }
      });
    } catch (err) {
      if (!contextInvalidated) {
        contextInvalidated = true;
        console.log('🔄 Extension communication lost');
        if (window.mockSyncInterval) {
          clearInterval(window.mockSyncInterval);
        }
      }
    }
    return true; // Context valid
  }

  document.addEventListener('API_MOCK_READY', loadAndSendMocks);
  document.addEventListener('API_MOCK_HIT', (event) => {
    if (!chrome.runtime?.id || !event.detail) return;

    try {
      chrome.runtime.sendMessage({
        type: 'RECORD_API_HIT',
        hit: event.detail
      });
    } catch {
      // The extension context can disappear during reloads.
    }
  });

  // Sync once immediately and once after the current turn. The ready event handles
  // normal loads; the timeout covers cases where injected.js ran first.
  loadAndSendMocks();
  setTimeout(loadAndSendMocks, 0);

  // Reload mocks every 2 seconds (faster sync)
  window.mockSyncInterval = setInterval(() => {
    const stillValid = loadAndSendMocks();
    if (!stillValid && window.mockSyncInterval) {
      clearInterval(window.mockSyncInterval);
    }
  }, 2000);
  
  // Listen for reload requests
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'RELOAD_MOCKS') {
      loadAndSendMocks();
      sendResponse({ success: true });
      return true;
    }
    
    if (message.type === 'MOCK_API') {
      // Forward mock to injected script
      document.dispatchEvent(new CustomEvent('API_MOCK_INTERCEPT', {
        detail: JSON.stringify({ 
          api: message.api,
          requestUrl: message.requestUrl
        })
      }));
      sendResponse({ success: true });
      return true;
    }
  });

})();
