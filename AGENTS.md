# Codex Project Context

## What This Repo Is

API Mock Manager is a Vite + Vue 3 Chrome extension for mocking HTTP APIs in the browser.
Core behavior: the popup stores mock definitions in IndexedDB, the background script serves enabled mocks, the content script injects the page hook, and the injected script intercepts `fetch` / `XMLHttpRequest`.

## High-Value Files

- `public/manifest.json`: MV3 config, permissions, entrypoints
- `src/background.js`: enabled-mock cache and runtime messaging
- `src/content.js`: bridge between extension context and page context
- `src/injected.js`: request interception and mock response generation
- `src/db/db.js`, `src/db/apis.repo.js`, `src/db/collections.repo.js`: persistence
- `src/popup/App.vue` and `src/popup/**`: popup UI and feature logic

## Working Rules

- Keep changes scoped and local; prefer surgical edits.
- When request-matching logic changes, update both `background.js` and `injected.js` if behavior must stay consistent.
- Preserve these flow identifiers unless intentionally migrating them:
  - Messages: `GET_ENABLED_APIS`, `REFRESH_MOCKS`, `RELOAD_MOCKS`
  - DOM event: `API_MOCK_UPDATE`
- Assume payload fields are stored as strings containing JSON.
- Keep popup logic in composables, scripts, and utils when possible.
- Respect MV3 limitations and current extension architecture.

## Token Rules

- Read the smallest useful set of files.
- Explain only changed behavior, not general Vue or Chrome-extension basics.
- Prefer concise plans and terse summaries.
- If blocked, ask one concrete question instead of several speculative ones.
