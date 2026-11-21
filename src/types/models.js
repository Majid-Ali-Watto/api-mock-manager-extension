// types/models.js
// "WS" is a pseudo-method for WebSocket mocks (EventSource mocks use GET, sendBeacon uses POST).
export const HttpMethods = ["GET", "POST", "PUT", "PATCH", "DELETE", "WS"];

export const ResponseModes = [
  { value: "mock", label: "Mock response" },
  { value: "network-error", label: "Network error" },
  { value: "timeout", label: "Timeout" },
  { value: "hang", label: "Hang" },
];

export const ContentTypes = [
  { value: "application/json", label: "JSON" },
  { value: "text/plain", label: "Text" },
  { value: "text/html", label: "HTML" },
  { value: "application/xml", label: "XML" },
  { value: "text/event-stream", label: "Event stream (SSE)" },
  { value: "", label: "None" },
];
