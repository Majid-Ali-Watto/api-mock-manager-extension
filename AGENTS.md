# Codex Project Context

## What This Repo Is

API Mock Manager is a Vite + Vue 3 Manifest V3 Chrome extension for mocking HTTP APIs in the browser.
The popup stores mocks in IndexedDB; the background service worker serves the enabled mocks that apply to each frame's site; `content.js` (isolated world) passes them to `injected.js` (MAIN world) over a private `MessagePort`; `injected.js` intercepts `fetch`, `XMLHttpRequest`, `sendBeacon`, `EventSource` and `WebSocket`.

## High-Value Files

- `public/manifest.json`: MV3 config; both content scripts are declared here (`injected.js` with `"world": "MAIN"`)
- `src/background.js`: mock cache, per-frame filtering (site scoping, variants), hits/request log, global switch, recording, badge
- `src/content.js`: background ↔ page bridge
- `src/injected.js`: interception and mock response generation
- `src/utils/urlMatcher.js`, `requestMatcher.js`, `template.js`: matching/templating (imported only by `injected.js`)
- `src/utils/siteMatcher.js`: site scoping (background + popup)
- `src/db/*.js`: IndexedDB persistence
- `src/popup/**`: Vue UI; shared styles in `src/popup/styles/base.css`, icons in `components/Icon.vue`
- `scripts/verify.mjs`: release checks (versions, manifest files, permission allowlist)

## Working Rules

- Keep changes scoped; reuse existing helpers and the `ui-*` style primitives.
- Never send mock data over DOM events; use the MessagePort bridge set up at `document_start`.
- `content.js` / `injected.js` must stay self-contained bundles: don't import a module from them that another entry also imports (the build fails if you do).
- Preserve message types unless every caller changes together: `GET_ENABLED_APIS`, `REFRESH_MOCKS`, `RELOAD_MOCKS`, `RECORD_API_HIT`, `RECORD_RESPONSE`, `GET_HIT_COUNTS`, `GET_REQUEST_LOG`, `CLEAR_REQUEST_LOG`, `GET_SETTINGS`, `SET_MOCKS_ENABLED`, `START_RECORDING`, `STOP_RECORDING`.
- Payload fields are stored as strings (usually JSON); import/export goes through `src/popup/utils/apiSchema.js`.
- Permission changes require updating the allowlist in `scripts/verify.mjs` and `public/privacy.html`.
- Verify with `npm test`, then `npm run build && npm run verify && npm run test:e2e`.

## Token Rules

- Read the smallest useful set of files.
- Explain only changed behavior, not general Vue or Chrome-extension basics.
- Prefer concise plans and terse summaries.
- If blocked, ask one concrete question instead of several speculative ones.
