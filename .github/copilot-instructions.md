# Copilot Instructions

## Project Context

API Mock Manager is a Manifest V3 Chrome extension built with Vite, Vue 3, and IndexedDB.
It intercepts `fetch`, `XMLHttpRequest`, `navigator.sendBeacon`, `EventSource` and `WebSocket` in web pages and returns mocks managed by the extension.

## Read This First

- `src/background.js`: service worker; serves enabled mocks per frame (site scoping, active variants), hit counts, request log, global on/off switch, recording, toolbar badge
- `src/content.js`: isolated-world bridge; talks to `injected.js` over a private `MessagePort`
- `src/injected.js`: MAIN-world interception (declared in `public/manifest.json`, not injected by `content.js`)
- `src/utils/*.js`: pure URL/site/request matching and template helpers, unit-tested in `tests/`
- `src/db/*.js`: IndexedDB persistence for collections and APIs
- `src/popup/**`: Vue UI; `styles/base.css` holds design tokens and `ui-*` primitives

## Data Flow

1. Popup updates IndexedDB through repo helpers and calls `notifyContentScripts()`.
2. Background answers `GET_ENABLED_APIS` with mocks whose collection sites match the requesting frame.
3. At `document_start`, `injected.js` hands `content.js` a `MessagePort`; all mock and hit traffic uses it.
4. `injected.js` matches requests and answers with the mock (or simulated error/timeout/hang).

## Edit Rules

- Never pass mock data through DOM events.
- Don't import a module from `content.js` / `injected.js` that background or popup also imports (the build fails on shared chunks).
- Preserve message names unless every caller is updated together.
- Treat payloads as JSON strings; import/export goes through `src/popup/utils/apiSchema.js`.
- Do not add dependencies unless required; keep permissions within the allowlist in `scripts/verify.mjs`.
- Run `npm test`, `npm run build`, `npm run verify` and `npm run test:e2e` after interception changes.

## Token Discipline

- Read only the files you need plus direct dependencies.
- Suggest minimal diffs instead of broad refactors.
- Avoid restating unchanged code.
- Reference exact file paths when explaining changes.
