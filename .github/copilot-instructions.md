# Copilot Instructions

## Project Context

API Mock Manager is a Manifest V3 Chrome extension built with Vite, Vue 3, and IndexedDB.
It intercepts `fetch` and `XMLHttpRequest` calls in web pages and returns mocked JSON responses from extension-managed data.

## Read This First

- `src/background.js`: service worker, cached lookup of enabled mocks, runtime message handling
- `src/content.js`: content-script bridge, injects `src/injected.js`, reloads mocks into the page
- `src/injected.js`: page-context interception for `fetch` and `XMLHttpRequest`
- `src/db/*.js`: IndexedDB persistence for collections and APIs
- `src/popup/**`: Vue popup UI for CRUD, import/export, search, and toggles

## Data Flow

1. Popup updates IndexedDB through repo helpers.
2. Background loads enabled APIs and answers `GET_ENABLED_APIS` / `REFRESH_MOCKS`.
3. Content script injects `injected.js` at `document_start`.
4. Injected script keeps an in-memory mock list and intercepts requests.

## Edit Rules

- Keep URL-matching behavior aligned between `src/background.js` and `src/injected.js`.
- Preserve existing message/event names unless the whole flow is updated together.
- Treat request and response payloads as JSON strings unless a file clearly expects parsed objects.
- Prefer small utility/composable updates over adding logic directly to large Vue components.
- Do not add dependencies unless required.
- Preserve Manifest V3 constraints.

## Token Discipline

- Read only the files you need plus direct dependencies.
- Suggest minimal diffs instead of broad refactors.
- Avoid restating unchanged code.
- Reference exact file paths when explaining changes.
