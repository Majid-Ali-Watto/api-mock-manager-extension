// Injected Script - Runs in page context
import { matchUrl } from "./utils/urlMatcher";

(function () {
  "use strict";

  if (window.__API_MOCK_EXTENSION_INSTALLED__) {
    return;
  }
  window.__API_MOCK_EXTENSION_INSTALLED__ = true;

  const originalFetch = window.fetch;
  const originalXHR = window.XMLHttpRequest;

  let activeMocks = [];

  function parseEventDetail(detail, fallback) {
    if (typeof detail !== "string") return detail || fallback;
    try {
      return JSON.parse(detail);
    } catch {
      return fallback;
    }
  }

  document.addEventListener("API_MOCK_UPDATE", (event) => {
    const mocks = parseEventDetail(event.detail, []);
    activeMocks = Array.isArray(mocks) ? mocks : mocks.mocks || [];
  });

  function recordMockHit(api) {
    document.dispatchEvent(
      new CustomEvent("API_MOCK_HIT", {
        detail: JSON.stringify({
          apiId: api.id,
          collectionId: api.collectionId,
          method: api.method,
          url: api.url,
        }),
      })
    );
  }

  function findMatchingMock(url, method) {
    if (activeMocks.length === 0) return null;
    return (
      activeMocks.find((api) => {
        const methodMatch = api.method.toUpperCase() === method.toUpperCase();
        const urlMatch = matchUrl(url, api.url, api.urlMatchType || "auto", window.location.href);
        return methodMatch && urlMatch && api.enabled !== false;
      }) || null
    );
  }

  function parseResponseHeaders(raw) {
    if (!raw) return {};
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return Object.fromEntries(
          parsed.filter((r) => r.enabled !== false && r.key).map((r) => [r.key, r.value])
        );
      }
      return typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }

  function buildHeaders(mock) {
    return {
      "Content-Type": "application/json",
      "X-Mocked-By": "API Mock Extension",
      ...parseResponseHeaders(mock.responseHeaders),
    };
  }

  function sleep(ms) {
    return ms > 0 ? new Promise((r) => setTimeout(r, ms)) : Promise.resolve();
  }

  // Override fetch
  window.fetch = async function (...args) {
    const [resource, config] = args;
    const url = typeof resource === "string" ? resource : resource.url;
    const method = (
      config?.method || (resource instanceof Request ? resource.method : "GET")
    ).toUpperCase();

    const mock = findMatchingMock(url, method);

    if (mock) {
      recordMockHit(mock);
      await sleep(mock.delay || 0);
      return new Response(mock.responsePayload || "{}", {
        status: mock.status || 200,
        statusText: "OK",
        headers: buildHeaders(mock),
      });
    }

    return originalFetch.apply(this, args);
  };

  // Override XMLHttpRequest
  class MockXMLHttpRequest extends originalXHR {
    constructor() {
      super();
      this._mockResponse = null;
      this._isMocked = false;
    }

    open(method, url, ...args) {
      const mock = findMatchingMock(url, method);
      if (mock) {
        this._mockResponse = mock;
        this._isMocked = true;
        recordMockHit(mock);
        return super.open(method, "data:text/plain,", ...args);
      }
      return super.open(method, url, ...args);
    }

    setRequestHeader(...args) {
      if (this._isMocked) return;
      return super.setRequestHeader(...args);
    }

    send() {
      if (this._isMocked && this._mockResponse) {
        const mock = this._mockResponse;
        const delay = mock.delay || 0;
        setTimeout(() => {
          const parsedHeaders = parseResponseHeaders(mock.responseHeaders);

          Object.defineProperty(this, "responseText", { writable: true, value: mock.responsePayload || "{}" });
          Object.defineProperty(this, "response",     { writable: true, value: mock.responsePayload || "{}" });
          Object.defineProperty(this, "status",       { writable: true, value: mock.status || 200 });
          Object.defineProperty(this, "statusText",   { writable: true, value: "OK" });
          Object.defineProperty(this, "readyState",   { writable: true, value: 4 });

          const allHeaders = {
            "content-type": "application/json",
            "x-mocked-by": "API Mock Extension",
            ...Object.fromEntries(
              Object.entries(parsedHeaders).map(([k, v]) => [k.toLowerCase(), v])
            ),
          };

          this.getAllResponseHeaders = () =>
            Object.entries(allHeaders)
              .map(([k, v]) => `${k}: ${v}`)
              .join("\r\n");

          this.getResponseHeader = (name) =>
            allHeaders[name.toLowerCase()] ?? null;

          const rscEvent = new Event("readystatechange");
          this.dispatchEvent(rscEvent);
          if (this.onreadystatechange) this.onreadystatechange(rscEvent);

          const loadEvent = new Event("load");
          this.dispatchEvent(loadEvent);
          if (this.onload) this.onload(loadEvent);

          const loadEndEvent = new Event("loadend");
          this.dispatchEvent(loadEndEvent);
          if (this.onloadend) this.onloadend(loadEndEvent);
        }, delay);
        return;
      }
      return super.send();
    }
  }

  window.XMLHttpRequest = MockXMLHttpRequest;

  document.dispatchEvent(new CustomEvent("API_MOCK_READY"));
})();
