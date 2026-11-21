// Injected Script - Runs in page context (MAIN world) at document_start.
// Patches fetch, XMLHttpRequest, navigator.sendBeacon, EventSource and WebSocket.
// Note: requests made inside Web Workers / Service Workers are not intercepted.
import { matchUrl, extractPathParams } from "./utils/urlMatcher";
import { matchesQuery, matchesBody } from "./utils/requestMatcher";
import { renderTemplate, buildTemplateContext } from "./utils/template";

(function () {
  "use strict";

  if (window.__API_MOCK_EXTENSION_INSTALLED__) {
    return;
  }
  window.__API_MOCK_EXTENSION_INSTALLED__ = true;

  const originalFetch = window.fetch;
  const originalXHR = window.XMLHttpRequest;
  const NativeEventSource = window.EventSource;
  const NativeWebSocket = window.WebSocket;
  const originalBeacon = navigator.sendBeacon ? navigator.sendBeacon.bind(navigator) : null;

  let activeMocks = [];
  let recording = false;
  const pageHitCounts = {}; // per-mock counter for the {{count}} template variable

  // ---- Private bridge to content.js ---------------------------------------
  // Mock data must not travel over DOM events (any page script can listen to those).
  // Instead we hand content.js one end of a MessageChannel at document_start, before
  // any page script exists, via a synchronous cancelable event. content.js accepts by
  // calling preventDefault(); from then on all traffic uses the private port.
  // Builtins are captured now so later page code can't patch them to observe traffic.
  const BRIDGE = { PORT: "__api_mock_port__", CONTENT_READY: "__api_mock_content_ready__" };
  const channel = new MessageChannel();
  const port = channel.port1;
  const postToContent = MessagePort.prototype.postMessage.bind(port);
  const readEventData = Object.getOwnPropertyDescriptor(MessageEvent.prototype, "data").get;
  const reflectApply = Reflect.apply;
  const isArray = Array.isArray;
  let bridged = false;

  port.onmessage = (event) => {
    const msg = reflectApply(readEventData, event, []);
    if (msg && msg.type === "mocks") {
      activeMocks = isArray(msg.mocks) ? msg.mocks : [];
      recording = msg.record === true;
    }
  };

  function offerPort() {
    if (bridged) return;
    const accepted = !document.dispatchEvent(
      new MessageEvent(BRIDGE.PORT, { ports: [channel.port2], cancelable: true })
    );
    if (accepted) {
      bridged = true;
      document.removeEventListener(BRIDGE.CONTENT_READY, offerPort);
    }
  }

  // Whichever script runs second completes the handshake.
  document.addEventListener(BRIDGE.CONTENT_READY, offerPort);
  offerPort();

  function post(msg) {
    if (!bridged) return;
    try {
      postToContent(msg);
    } catch {
      // Port closed (extension reloaded); nothing to report to.
    }
  }

  function recordMockHit(mock, { method, url, status }) {
    pageHitCounts[mock.id] = (pageHitCounts[mock.id] || 0) + 1;
    post({
      type: "hit",
      apiId: mock.id,
      collectionId: mock.collectionId,
      method,
      url: String(url).slice(0, 2048),
      status,
      mode: mock.responseMode || "mock",
    });
  }

  // ---- Matching -------------------------------------------------------------

  function resolveUrl(url) {
    try {
      return new URL(String(url), window.location.href).href;
    } catch {
      return String(url || "");
    }
  }

  // Mocks with extra conditions are more specific, so they are tried first.
  function specificity(mock) {
    return (mock.matchBody && mock.requestPayload ? 2 : 0) + (mock.matchQuery ? 1 : 0);
  }

  // URL + method + query candidates. Must never throw: an exception here would
  // break every request on the page.
  function findCandidates(url, method) {
    if (activeMocks.length === 0 || !url) return [];
    try {
      const requestMethod = String(method || "GET").toUpperCase();
      const requestUrl = String(url);
      const base = window.location.href;
      return activeMocks
        .filter((api) => {
          if (!api || api.enabled === false || !api.url) return false;
          return (
            String(api.method || "").toUpperCase() === requestMethod &&
            matchUrl(requestUrl, api.url, api.urlMatchType || "auto", base) &&
            matchesQuery(requestUrl, api.matchQuery, base)
          );
        })
        .sort((a, b) => specificity(b) - specificity(a));
    } catch {
      return [];
    }
  }

  function needsBody(candidates) {
    return candidates.some((m) => m.matchBody && m.requestPayload);
  }

  function selectMock(candidates, body) {
    try {
      return candidates.find((m) => !m.matchBody || matchesBody(body, m.requestPayload)) || null;
    } catch {
      return null;
    }
  }

  // Converts a request body to something matchable/templatable (string or plain object).
  function normalizeBody(body) {
    if (body === undefined || body === null) return undefined;
    if (typeof body === "string") return body;
    if (body instanceof URLSearchParams) return body.toString();
    if (typeof FormData !== "undefined" && body instanceof FormData) {
      const fields = {};
      for (const [key, value] of body) if (typeof value === "string") fields[key] = value;
      return fields;
    }
    return undefined; // Blob, ArrayBuffer, streams: not matched by body
  }

  // ---- Response building ----------------------------------------------------

  // Response() throws for statuses outside 200-599 and for bodies on null-body statuses.
  function safeStatus(status) {
    const code = Number(status);
    return Number.isInteger(code) && code >= 200 && code <= 599 ? code : 200;
  }

  const NULL_BODY_STATUSES = new Set([204, 205, 304]);

  const STATUS_TEXT = {
    200: "OK", 201: "Created", 202: "Accepted", 204: "No Content",
    301: "Moved Permanently", 302: "Found", 304: "Not Modified",
    400: "Bad Request", 401: "Unauthorized", 403: "Forbidden", 404: "Not Found",
    405: "Method Not Allowed", 409: "Conflict", 422: "Unprocessable Entity",
    429: "Too Many Requests", 500: "Internal Server Error", 502: "Bad Gateway",
    503: "Service Unavailable", 504: "Gateway Timeout",
  };

  function statusText(code) {
    return STATUS_TEXT[code] || "";
  }

  function contentTypeOf(mock) {
    return typeof mock.contentType === "string" ? mock.contentType : "application/json";
  }

  function isJsonType(type) {
    return /json/i.test(type);
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
    const type = contentTypeOf(mock);
    return {
      ...(type ? { "Content-Type": type } : {}),
      "X-Mocked-By": "API Mock Extension",
      ...parseResponseHeaders(mock.responseHeaders),
    };
  }

  function templateContext(mock, { url, method, body }) {
    return buildTemplateContext({
      url,
      method,
      body,
      baseUrl: window.location.href,
      params: extractPathParams(url, mock.url, window.location.href) || {},
      count: pageHitCounts[mock.id] || 0,
    });
  }

  function renderText(mock, text, request) {
    if (!mock.templated) return text;
    try {
      return renderTemplate(text, templateContext(mock, request), {
        jsonEscape: isJsonType(contentTypeOf(mock)),
      });
    } catch {
      return text;
    }
  }

  function buildBody(mock, status, request) {
    if (NULL_BODY_STATUSES.has(status)) return "";
    const type = contentTypeOf(mock);
    const raw = mock.responsePayload || (isJsonType(type) ? "{}" : "");
    return renderText(mock, raw, request);
  }

  function abortReason(signal) {
    return signal?.reason ?? new DOMException("The operation was aborted.", "AbortError");
  }

  // Resolves after `ms` (never for Infinity); rejects early if the signal aborts.
  function waitFor(ms, signal) {
    return new Promise((resolve, reject) => {
      if (signal?.aborted) return reject(abortReason(signal));
      const timer = ms === Infinity ? null : setTimeout(resolve, Math.max(0, ms || 0));
      signal?.addEventListener("abort", () => {
        clearTimeout(timer);
        reject(abortReason(signal));
      }, { once: true });
    });
  }

  // ---- Recording real responses ---------------------------------------------

  const RECORD_MAX_BYTES = 512 * 1024;
  const RECORDABLE_TYPE = /json|text|xml|javascript/i;

  function recordResponse({ method, url, status, contentType, body, requestBody }) {
    if (!recording || typeof body !== "string" || body.length > RECORD_MAX_BYTES) return;
    if (contentType && !RECORDABLE_TYPE.test(contentType)) return;
    post({
      type: "record",
      method: String(method || "GET").toUpperCase(),
      url: resolveUrl(url),
      status,
      contentType: contentType || "",
      body,
      requestBody: typeof requestBody === "string" ? requestBody.slice(0, RECORD_MAX_BYTES) : "",
    });
  }

  function recordFetchResponse(response, method, url, requestBody) {
    try {
      const type = response.headers.get("content-type") || "";
      const length = Number(response.headers.get("content-length") || 0);
      if (!RECORDABLE_TYPE.test(type) || length > RECORD_MAX_BYTES) return;
      response.clone().text().then(
        (body) => recordResponse({ method, url, status: response.status, contentType: type, body, requestBody }),
        () => {}
      );
    } catch {
      // never let recording break the page
    }
  }

  // ---- fetch ------------------------------------------------------------------

  window.fetch = async function (...args) {
    const [resource, config] = args;
    const isRequest = resource instanceof Request;
    const url = isRequest ? resource.url : resource == null ? "" : String(resource);
    const method = String(config?.method || (isRequest ? resource.method : "GET")).toUpperCase();

    const candidates = findCandidates(url, method);
    let body;
    if (candidates.length || recording) {
      if (config && config.body !== undefined) body = normalizeBody(config.body);
      else if (isRequest && needsBody(candidates)) {
        try {
          body = await resource.clone().text();
        } catch {
          body = undefined;
        }
      }
    }

    const mock = candidates.length ? selectMock(candidates, body) : null;
    if (!mock) {
      const response = await originalFetch.apply(this, args);
      if (recording) recordFetchResponse(response, method, url, typeof body === "string" ? body : "");
      return response;
    }

    const signal = config?.signal || (isRequest ? resource.signal : null);
    const mode = mock.responseMode || "mock";
    const status = safeStatus(mock.status);
    recordMockHit(mock, { method, url, status: mode === "mock" ? status : 0 });

    if (mode === "hang") {
      await waitFor(Infinity, signal);
    }
    await waitFor(mock.delay || 0, signal);
    if (mode === "network-error") throw new TypeError("Failed to fetch");
    if (mode === "timeout") throw new DOMException("The operation timed out.", "TimeoutError");

    const text = buildBody(mock, status, { url: resolveUrl(url), method, body });
    return new Response(NULL_BODY_STATUSES.has(status) ? null : text, {
      status,
      statusText: statusText(status),
      headers: buildHeaders(mock),
    });
  };

  // ---- XMLHttpRequest ----------------------------------------------------------

  // Own properties set on a mocked XHR; removed on open() so the native getters apply again.
  const MOCK_OVERRIDES = [
    "responseText", "response", "status", "statusText", "readyState", "responseURL",
    "getAllResponseHeaders", "getResponseHeader",
  ];

  function xhrResponseValue(xhr, text, type) {
    switch (xhr.responseType) {
      case "json":
        try {
          return text ? JSON.parse(text) : null;
        } catch {
          return null;
        }
      case "blob":
        return new Blob([text], { type: type || "" });
      case "arraybuffer":
        return new TextEncoder().encode(text).buffer;
      case "document":
        try {
          return new DOMParser().parseFromString(text, /xml/i.test(type) ? "application/xml" : "text/html");
        } catch {
          return null;
        }
      default:
        return text;
    }
  }

  class MockXMLHttpRequest extends originalXHR {
    constructor() {
      super();
      this._mockTimer = null;
      this._mockActive = false;
      this._request = null;
    }

    open(method, url, ...args) {
      // Reset state so a reused XHR instance doesn't keep a previous mock.
      clearTimeout(this._mockTimer);
      this._mockActive = false;
      MOCK_OVERRIDES.forEach((key) => delete this[key]);
      this._request = { method: String(method || "GET").toUpperCase(), url, async: args[0] !== false };
      // Always open natively: setRequestHeader etc. keep working, and a mocked
      // request is simply never sent.
      return super.open(method, url, ...args);
    }

    send(body) {
      const request = this._request;
      const candidates = request ? findCandidates(request.url, request.method) : [];
      const normalizedBody = normalizeBody(body);
      const mock = candidates.length ? selectMock(candidates, normalizedBody) : null;

      if (!mock) {
        if (recording && request) this._watchForRecording(request, normalizedBody);
        return super.send(body);
      }

      const mode = mock.responseMode || "mock";
      const status = safeStatus(mock.status);
      this._mockActive = true;
      recordMockHit(mock, { method: request.method, url: request.url, status: mode === "mock" ? status : 0 });

      const deliver = () => {
        this._mockTimer = null;
        if (mode === "network-error") return this._fail("error");
        if (mode === "timeout") return this._fail("timeout");
        this._respond(mock, status, { url: resolveUrl(request.url), method: request.method, body: normalizedBody });
      };

      if (mode === "hang") {
        // Never responds; honours xhr.timeout like a real stalled request.
        if (this.timeout > 0) this._mockTimer = setTimeout(() => this._fail("timeout"), this.timeout);
        return;
      }
      if (!request.async) return deliver(); // synchronous XHR: respond immediately
      this._mockTimer = setTimeout(deliver, mock.delay || 0);
    }

    _define(key, value) {
      Object.defineProperty(this, key, { configurable: true, writable: true, value });
    }

    _respond(mock, status, request) {
      const type = contentTypeOf(mock);
      const text = buildBody(mock, status, request);
      const headers = Object.fromEntries(
        Object.entries(buildHeaders(mock)).map(([k, v]) => [k.toLowerCase(), v])
      );

      this._define("responseText", text);
      this._define("response", xhrResponseValue(this, text, type));
      this._define("status", status);
      this._define("statusText", statusText(status));
      this._define("responseURL", request.url);
      this._define("readyState", 4);
      this._define("getAllResponseHeaders", () =>
        Object.entries(headers).map(([k, v]) => `${k}: ${v}`).join("\r\n")
      );
      this._define("getResponseHeader", (name) => headers[String(name).toLowerCase()] ?? null);

      // dispatchEvent also invokes the matching on* handler property,
      // so handlers must not be called a second time manually.
      this.dispatchEvent(new Event("readystatechange"));
      this.dispatchEvent(new ProgressEvent("load"));
      this.dispatchEvent(new ProgressEvent("loadend"));
    }

    _fail(eventType) {
      this._mockTimer = null;
      this._define("status", 0);
      this._define("statusText", "");
      this._define("responseText", "");
      this._define("response", this.responseType === "" || this.responseType === "text" ? "" : null);
      this._define("readyState", 4);
      this.dispatchEvent(new Event("readystatechange"));
      this.dispatchEvent(new ProgressEvent(eventType));
      this.dispatchEvent(new ProgressEvent("loadend"));
    }

    _watchForRecording(request, requestBody) {
      this.addEventListener("loadend", () => {
        try {
          if (this.status === 0) return;
          let text;
          if (this.responseType === "" || this.responseType === "text") text = this.responseText;
          else if (this.responseType === "json") text = JSON.stringify(this.response);
          else return;
          recordResponse({
            method: request.method,
            url: request.url,
            status: this.status,
            contentType: this.getResponseHeader("content-type") || "",
            body: text,
            requestBody: typeof requestBody === "string" ? requestBody : "",
          });
        } catch {
          // never let recording break the page
        }
      }, { once: true });
    }

    abort() {
      if (this._mockActive) {
        clearTimeout(this._mockTimer);
        this._mockTimer = null;
        this._mockActive = false;
        this._define("readyState", 4);
        this._define("status", 0);
        this.dispatchEvent(new Event("readystatechange"));
        this.dispatchEvent(new ProgressEvent("abort"));
        this.dispatchEvent(new ProgressEvent("loadend"));
        this._define("readyState", 0);
        return;
      }
      return super.abort();
    }
  }

  window.XMLHttpRequest = MockXMLHttpRequest;

  // ---- navigator.sendBeacon ----------------------------------------------------

  if (originalBeacon) {
    navigator.sendBeacon = function (url, data) {
      const candidates = findCandidates(resolveUrl(url), "POST");
      const mock = candidates.length ? selectMock(candidates, normalizeBody(data)) : null;
      if (!mock) return originalBeacon(url, data);
      recordMockHit(mock, { method: "POST", url, status: safeStatus(mock.status) });
      // A beacon has no response; a "network-error" mock reports the beacon as not queued.
      return mock.responseMode !== "network-error";
    };
  }

  // ---- Streaming mocks (EventSource / WebSocket) -------------------------------

  // Splits a mock payload into messages:
  //   text/event-stream -> SSE blocks ("event:", "data:", "id:" lines, blank-line separated)
  //   JSON array        -> one message per item
  //   anything else     -> a single message (nothing if empty)
  function streamMessages(mock, request) {
    const text = renderText(mock, mock.responsePayload || "", request);
    if (/event-stream/i.test(contentTypeOf(mock))) {
      return text.split(/\r?\n\r?\n/).map((block) => {
        const msg = { event: "message", data: [], id: "" };
        for (const line of block.split(/\r?\n/)) {
          const [, field, value = ""] = line.match(/^([a-z]+):\s?(.*)$/i) || [];
          if (field === "event") msg.event = value;
          else if (field === "data") msg.data.push(value);
          else if (field === "id") msg.id = value;
        }
        return { event: msg.event, data: msg.data.join("\n"), id: msg.id };
      }).filter((m) => m.data);
    }
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => ({ event: "message", data: typeof item === "string" ? item : JSON.stringify(item), id: "" }));
      }
    } catch {
      // not JSON: single message
    }
    return text ? [{ event: "message", data: text, id: "" }] : [];
  }

  // Base for fake streaming objects: EventTarget plus on* handler properties.
  // Subclasses re-parent their prototype onto the native class (so `instanceof
  // WebSocket` holds), which drops MockStream.prototype from the chain; adoptNative()
  // copies the helpers back.
  class MockStream extends EventTarget {
    constructor(handlerNames) {
      super();
      this._handlers = {};
      this._timers = [];
      for (const name of handlerNames) {
        Object.defineProperty(this, `on${name}`, {
          configurable: true,
          get: () => this._handlers[name] ?? null,
          set: (fn) => { this._handlers[name] = typeof fn === "function" ? fn : null; },
        });
      }
    }

    _emit(event) {
      this.dispatchEvent(event);
      try {
        this._handlers[event.type]?.call(this, event);
      } catch (err) {
        setTimeout(() => { throw err; });
      }
    }

    _later(fn, ms) {
      this._timers.push(setTimeout(fn, Math.max(0, ms || 0)));
    }

    _clearTimers() {
      this._timers.forEach(clearTimeout);
      this._timers = [];
    }
  }

  function adoptNative(MockClass, NativeClass) {
    Object.setPrototypeOf(MockClass.prototype, NativeClass.prototype);
    for (const key of ["_emit", "_later", "_clearTimers"]) {
      Object.defineProperty(MockClass.prototype, key, { value: MockStream.prototype[key], configurable: true });
    }
  }

  if (NativeEventSource) {
    class MockEventSource extends MockStream {
      constructor(url, init, mock) {
        super(["open", "message", "error"]);
        Object.defineProperties(this, {
          url: { value: url, enumerable: true },
          withCredentials: { value: !!init?.withCredentials, enumerable: true },
          readyState: { value: 0, writable: true, enumerable: true },
        });
        const mode = mock.responseMode || "mock";
        if (mode === "hang") return;
        this._later(() => {
          if (mode !== "mock" || safeStatus(mock.status) !== 200) {
            this.readyState = 2;
            return this._emit(new Event("error"));
          }
          this.readyState = 1;
          this._emit(new Event("open"));
          const origin = new URL(url).origin;
          streamMessages(mock, { url, method: "GET" }).forEach((msg, i) => {
            this._later(() => {
              if (this.readyState !== 1) return;
              this._emit(new MessageEvent(msg.event, { data: msg.data, lastEventId: msg.id, origin }));
            }, (mock.delay || 0) * i);
          });
        }, mock.delay);
      }

      close() {
        this.readyState = 2;
        this._clearTimers();
      }
    }
    adoptNative(MockEventSource, NativeEventSource);

    const PatchedEventSource = function EventSource(url, init) {
      if (!new.target) throw new TypeError("Failed to construct 'EventSource': Please use the 'new' operator.");
      const absolute = resolveUrl(url);
      const candidates = findCandidates(absolute, "GET");
      const mock = candidates.length ? selectMock(candidates, undefined) : null;
      if (!mock) return new NativeEventSource(url, init);
      recordMockHit(mock, { method: "GET", url: absolute, status: safeStatus(mock.status) });
      return new MockEventSource(absolute, init, mock);
    };
    PatchedEventSource.prototype = NativeEventSource.prototype;
    Object.assign(PatchedEventSource, { CONNECTING: 0, OPEN: 1, CLOSED: 2 });
    window.EventSource = PatchedEventSource;
  }

  if (NativeWebSocket) {
    class MockWebSocket extends MockStream {
      constructor(url, protocols, mock) {
        super(["open", "message", "error", "close"]);
        const protocol = isArray(protocols) ? protocols[0] || "" : protocols || "";
        Object.defineProperties(this, {
          url: { value: url, enumerable: true },
          protocol: { value: protocol, enumerable: true },
          extensions: { value: "", enumerable: true },
          bufferedAmount: { value: 0, enumerable: true },
          binaryType: { value: "blob", writable: true, enumerable: true },
          readyState: { value: 0, writable: true, enumerable: true },
        });
        this._mock = mock;
        const mode = mock.responseMode || "mock";
        if (mode === "hang") return;
        this._later(() => {
          if (mode !== "mock") {
            this.readyState = 3;
            this._emit(new Event("error"));
            return this._emit(new CloseEvent("close", { code: 1006, reason: "", wasClean: false }));
          }
          this.readyState = 1;
          this._emit(new Event("open"));
          this._push(streamMessages(mock, { url, method: "WS" }));
        }, mock.delay);
      }

      _push(messages) {
        const origin = new URL(this.url).origin;
        messages.forEach((msg, i) => {
          this._later(() => {
            if (this.readyState !== 1) return;
            this._emit(new MessageEvent("message", { data: msg.data, origin }));
          }, (this._mock.delay || 0) * (i + 1));
        });
      }

      send(data) {
        if (this.readyState === 0) {
          throw new DOMException("Failed to execute 'send' on 'WebSocket': Still in CONNECTING state.", "InvalidStateError");
        }
        if (this.readyState !== 1) return;
        // Templated WS mocks reply to every message; {{body}} is the message sent.
        if (this._mock.templated) {
          this._push(streamMessages(this._mock, { url: this.url, method: "WS", body: typeof data === "string" ? data : undefined }));
        }
      }

      close(code = 1000, reason = "") {
        if (this.readyState >= 2) return;
        this._clearTimers();
        this.readyState = 2;
        setTimeout(() => {
          this.readyState = 3;
          this._emit(new CloseEvent("close", { code, reason, wasClean: true }));
        }, 0);
      }
    }
    adoptNative(MockWebSocket, NativeWebSocket);

    const toWsUrl = (url) => {
      try {
        const parsed = new URL(String(url), window.location.href);
        if (parsed.protocol === "http:") parsed.protocol = "ws:";
        if (parsed.protocol === "https:") parsed.protocol = "wss:";
        return parsed.href;
      } catch {
        return String(url || "");
      }
    };

    const PatchedWebSocket = function WebSocket(url, protocols) {
      if (!new.target) throw new TypeError("Failed to construct 'WebSocket': Please use the 'new' operator.");
      const absolute = toWsUrl(url);
      const candidates = findCandidates(absolute, "WS");
      const mock = candidates.length ? selectMock(candidates, undefined) : null;
      if (!mock) {
        return protocols === undefined ? new NativeWebSocket(url) : new NativeWebSocket(url, protocols);
      }
      recordMockHit(mock, { method: "WS", url: absolute, status: 101 });
      return new MockWebSocket(absolute, protocols, mock);
    };
    PatchedWebSocket.prototype = NativeWebSocket.prototype;
    Object.assign(PatchedWebSocket, { CONNECTING: 0, OPEN: 1, CLOSING: 2, CLOSED: 3 });
    window.WebSocket = PatchedWebSocket;
  }
})();
