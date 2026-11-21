# Changelog

All notable changes to API Mock Manager. Versions follow [Semantic Versioning](https://semver.org/).
The section for a version is used as its GitHub release notes.

## [1.0.0] - 2026-11-22

First public release.

### Mocking
- Mock `fetch`, `XMLHttpRequest`, `navigator.sendBeacon`, `EventSource` and `WebSocket` (method `WS`).
- URL matching: exact, relative paths, contains, `*` wildcards, `/users/:id` path params and regex.
- Request conditions: required query params and request-body matching (JSON subset, form or text).
- Any status code with JSON, text, HTML, XML, event-stream or empty bodies, plus custom headers and delays.
- Simulate network errors, timeouts and requests that never respond.
- Dynamic responses with `{{params.id}}`, `{{query.x}}`, `{{body.field}}`, `{{now}}`, `{{uuid}}`, `{{count}}` and more.
- Response variants per API, and **Scenario…** to switch a whole collection to one variant.
- Record real responses from a tab into a collection (saved disabled).

### Control
- Collections limited to chosen sites; pages only receive mocks for their site.
- Global on/off switch (popup or `Alt+Shift+M`) and a toolbar badge showing the mock count, `OFF` or `REC`.
- Request log of mocked requests (memory only).
- Active collections are listed above paused ones, pinned active collections first.
- Import/export of collections and single APIs.

### Privacy and security
- Mock data reaches pages over a private `MessagePort`, never DOM events; pages get only the fields interception needs.
- Only the `storage` permission is requested; no host permissions or web-accessible resources.
- All data stays in the browser. See the [privacy policy](https://majid-ali-watto.github.io/api-mock-manager-extension/privacy.html) and [terms](https://majid-ali-watto.github.io/api-mock-manager-extension/terms.html).

### Interface
- Redesigned popup, API form and detail pages with light and dark themes, line icons and toggle switches.

[1.0.0]: https://github.com/Majid-Ali-Watto/api-mock-manager-extension/releases/tag/v1.0.0
