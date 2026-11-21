# API Mock Manager

A Chrome Manifest V3 extension for mocking API responses directly in the browser. It is built for frontend development, testing, and debugging when the real backend is unavailable, unstable, or not ready yet.

## Features

- Organize mock APIs into collections.
- Enable or disable individual APIs and full collections.
- Intercept `fetch`, `XMLHttpRequest`, `navigator.sendBeacon`, `EventSource` and `WebSocket` from web pages.
- Match full URLs, relative paths, contains matches, wildcards, path params (`/users/:id`) and regex.
- Optional request conditions: required query params and request-body matching.
- Return any status code with JSON, text, HTML, XML, event-stream or empty bodies.
- Simulate network errors, timeouts and requests that never respond.
- Dynamic responses with `{{params.id}}`, `{{query.x}}`, `{{body.field}}`, `{{now}}`, `{{uuid}}` and more.
- Response variants per API, plus one-click scenario switching for a whole collection.
- Record real responses from a tab into a collection.
- Limit each collection to specific sites.
- Global on/off switch (popup button or `Alt+Shift+M`), with a toolbar badge showing active mocks, `OFF` or `REC`.
- Request log of mocked requests (memory only).
- Store collections and APIs locally in IndexedDB.
- Import and export collections or individual APIs as JSON.
- Search globally, per collection, and inside API details.
- Edit, duplicate, copy, and download API definitions.
- View formatted request and response JSON in the details modal.
- Track in-memory interception counts per API and per collection.
- Switch between the current theme and dark theme.
- Generate Chrome extension icons from `public/icon.svg`.

## How It Works

The extension uses a layered browser-extension flow:

1. The popup UI writes collections and API mocks to IndexedDB.
2. The background service worker reads enabled APIs from enabled collections and keeps a short-lived cache.
3. `injected.js` is loaded at `document_start` in the page `MAIN` world.
4. `content.js` bridges extension messages and page events.
5. The injected script overrides `window.fetch` and `XMLHttpRequest`.
6. When a request matches an enabled mock, the extension returns the configured mock response instead of sending the request to the backend.
7. Each successful mock hit is counted in memory by the background service worker. Counts are not persisted.

## Project Structure

```text
vue-api-mock-extension/
├── public/
│   ├── manifest.json
│   ├── icon.svg
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
├── src/
│   ├── background.js
│   ├── content.js
│   ├── injected.js
│   ├── db/
│   ├── popup/
│   │   ├── components/
│   │   ├── composables/
│   │   ├── scripts/
│   │   ├── styles/       # design tokens + ui-* primitives
│   │   └── utils/
│   ├── types/
│   └── utils/            # URL, site, request matching and templates
├── scripts/              # verify.mjs, generate-icons.mjs
├── tests/                # unit tests + e2e/run.mjs
├── .github/workflows/    # ci.yml, release.yml, pages.yml
├── index.html
├── package.json
├── vite.config.js
├── CHANGELOG.md
├── LICENSE
└── README.md
```

## Important Files

- `src/injected.js`: Runs in the page context and intercepts `fetch` / XHR.
- `src/content.js`: Bridges page events to extension runtime messages.
- `src/background.js`: Reads enabled mocks, refreshes cache, and stores in-memory hit counts.
- `src/db/db.js`: IndexedDB setup for `collections` and `apis`.
- `src/db/collections.repo.js`: Collection CRUD and enable/disable logic.
- `src/db/apis.repo.js`: API CRUD, duplication, and enable/disable logic.
- `src/popup/App.vue`: Popup root, import/export, info sidebar, and theme state.
- `src/popup/components/CollectionList.vue`: Main collection and API list.
- `src/popup/components/AddApi.vue`: Add/edit API form with JSON editors.
- `public/manifest.json`: Chrome extension manifest and script entry points.
- `vite.config.js`: Multi-entry Vite build for popup, background, content, and injected scripts.

## Installation

### From a release

1. Download `api-mock-manager-vX.Y.Z.zip` from the [latest release](https://github.com/Majid-Ali-Watto/api-mock-manager-extension/releases/latest).
2. Unzip it into a folder.
3. Open `chrome://extensions/`, enable **Developer mode**, click **Load unpacked** and select that folder.

### From source

```bash
npm ci
npm run build
```

Then load the `dist` folder with **Load unpacked** as above. After rebuilding, reload the extension from `chrome://extensions` and refresh any target website tabs.

## Usage

### Create a Collection

1. Open the extension popup.
2. Click the add collection button.
3. Enter a collection name.
4. Save it.

### Add an API Mock

1. Expand a collection.
2. Click the add API button.
3. Fill in label, method, URL, status code, and response JSON.
4. Add request JSON only when needed.
5. Save the API.
6. Enable both the collection and API.

### URL Matching

Supported URL examples:

```text
https://api.example.com/users
/api/users
api/users
https://api.example.com/users/*
*/users/*
```

Query strings are ignored for matching, so `/api/users?page=1` can match `/api/users`. To require query values, use **Required query params** (see below).

Path parameters: `/users/:id` matches `/users/42` (one path segment) and makes `{{params.id}}` available to dynamic responses.

### Request Conditions

- **Required query params**: `page=2&sort=*&debug` means every listed key must be present, and values must match unless they are `*` or omitted.
- **Body match** (Request tab): the request body must contain the request payload. JSON is compared as a subset, form bodies by key/value, and other text exactly.

When several mocks match, the one with more conditions wins, so a body-specific mock can sit next to a generic fallback for the same URL.

### Behavior And Content Type

| Behavior | fetch | XMLHttpRequest |
|---|---|---|
| Mock response | resolves with the mock | `load` event |
| Network error | rejects with `TypeError` | `error` event, status 0 |
| Timeout | rejects with `TimeoutError` after the delay | `timeout` event |
| Hang | never settles (abort still works) | never completes (honours `xhr.timeout`) |

The content type sets the default `Content-Type` header. A `Content-Type` in the Headers tab overrides it. JSON validation only applies to JSON bodies that aren't templated.

### Dynamic Responses

Turn on **Dynamic response** to render placeholders on every request:

```text
{{params.id}}  {{query.page}}  {{body.user.name}}  {{method}}  {{url}}  {{path}}
{{now}}  {{timestamp}}  {{uuid}}  {{random}}  {{count}}
```

Inside JSON strings, values are escaped automatically, e.g. `{"id": "{{params.id}}", "seen": {{count}}}`.

### Variants And Scenarios

The **🎭 Variants** tab holds alternate responses (name, status, behavior, body). The **active response** replaces the main one. Use **Scenario…** in the collection menu to activate the same variant name (e.g. `error` or `empty`) on every API in the collection, or type `main` to go back.

### Streaming Mocks

- **EventSource**: a `GET` mock. With content type *Event stream*, the body is parsed as SSE (`event:` / `data:` / `id:` blocks). A JSON array sends one message per item. Messages are spaced by the delay.
- **WebSocket**: use method `WS`. After connecting, the body is sent as messages (a JSON array sends one per item). With dynamic responses on, every message the page sends gets a reply, with `{{body}}` set to the message.
- **sendBeacon**: a matching `POST` mock swallows the beacon. *Network error* makes it return `false`.

### Recording

Choose **Record from current tab** in a collection's menu while the popup is open on the page. Real fetch/XHR responses (JSON, text or XML, up to 512 KB) from that tab are saved into the collection as **disabled** mocks, one per method + URL, so the page keeps talking to the real API. If the collection has sites set, only those sites are recorded. The badge shows `REC`. Stop from the same menu; closing the tab also stops it.

### Global Switch, Badge And Log

- **⏻** in the popup (or `Alt+Shift+M`) turns all mocks off or on without touching collection settings.
- The toolbar badge shows how many mocks apply to the current tab, `OFF` when switched off, or `REC` while recording.
- **📜** opens the request log: the last 200 mocked requests from all tabs, with status or behavior, the mock used and the variant. It is kept in memory only.

### Site Scoping

By default a collection applies to every site, shown by the orange 🌐 badge in its header. Click the badge, or choose **Sites…** in the collection menu, to limit it:

```text
localhost:3000        # one host and port
*.example.com         # example.com and all subdomains
staging.myapp.dev     # any port on this host
*                     # all sites (the default)
```

Pages only receive mocks from collections that apply to them. Site lists are included in exports and imports.

### Interception Counts

Each mocked request increments:

- The API badge count.
- The parent collection total badge.

Counts live only in the background service worker memory. They reset when the extension runtime restarts and are never saved to IndexedDB or localStorage.

### Import And Export

- Export all collections from the top action bar.
- Export one collection from the collection menu.
- Export selected collections or APIs with bulk actions.
- Import collections from the top action bar.
- Import a single API from a collection menu.

## Development Commands

```bash
npm run dev
npm run build
npm run build:prod
npm run preview
npm run clean
npm run package
npm test
npm run test:e2e
npm run verify
npm run icons
```

Command notes:

- `npm run dev`: Starts Vite for popup development.
- `npm run build`: Builds the extension into `dist`.
- `npm run build:prod`: Builds with production mode.
- `npm run clean`: Removes `dist`.
- `npm run package`: Builds production output and creates `api-mock-extension.zip`.
- `npm test`: Unit tests for URL, site, request matching and templates (Node's built-in test runner, no extra packages).
- `npm run test:e2e`: Loads `dist/` into Chrome for Testing and checks interception, site scoping, privacy of the page bridge, recording, badge and global switch. Run `npm run build` first. It uses `CHROME_PATH` or a Chrome for Testing found in `~/.cache/puppeteer` or `./.cache`. Install one with `npx @puppeteer/browsers install chrome@stable --path .cache` (branded Chrome ignores `--load-extension`).

- `npm run verify`: Checks the built extension: `package.json`, `manifest.json` (and `RELEASE_TAG`, if set) versions match, every file the manifest references exists in `dist/`, permissions stay within the allowlist in `scripts/verify.mjs`, and no source maps ship.
- `npm run icons`: Regenerates the PNG icons (see Icon Generation).

## CI And Releases

CI (`.github/workflows/ci.yml`) runs on every push to any branch and on every pull request, as two status checks:

1. **Checks**: `npm audit` for production dependencies (fails on high severity), unit tests, production build and `npm run verify`.
2. **E2E**: builds, runs the end-to-end suite in Chrome for Testing, and uploads the packaged zip as the `api-mock-extension` artifact.

`master` is protected and both checks are required, for admins too. A commit can only land on `master` after it has passed CI, with or without a pull request:

```bash
git push origin HEAD:ship        # any branch name; CI runs on it
gh run watch                     # wait for both checks to pass
git push origin HEAD:master      # accepted only once that commit is green
git push origin --delete ship    # optional cleanup
```

To publish a release:

1. Bump `version` in both `package.json` and `public/manifest.json`.
2. Add a `## [x.y.z]` section to `CHANGELOG.md`.
3. Commit, then tag and push: `git tag vX.Y.Z && git push origin vX.Y.Z`.

`.github/workflows/release.yml` re-runs the full CI for the tag, checks that the tag matches the versions, and creates a GitHub release named `API Mock Manager vX.Y.Z` with `api-mock-manager-vX.Y.Z.zip` attached and the changelog section as its notes.

The privacy and terms pages are published to GitHub Pages by `.github/workflows/pages.yml`.

## Build Output

Production builds are optimized by Vite:

- Source maps are disabled.
- Scripts are minified with esbuild.
- `dist` is cleaned before each build.
- Runtime files are emitted with stable names for extension entry points.

Expected output:

```text
dist/
├── assets/
├── background.js
├── content.js
├── index.html
├── injected.js
├── manifest.json
└── icon*.png
```

## Icon Generation

The logo is `public/icon.svg` (indigo tile, white `{ }` braces for the API, green dot for "mock is live"). A heavier variant for small sizes is in `scripts/icon-small.svg`. Regenerate the PNGs Chrome needs after editing either file:

```bash
npm run icons
```

This renders `icon16.png` and `icon32.png` from the small variant and `icon48.png` and `icon128.png` from the main logo, using Chrome for Testing (same lookup as `npm run test:e2e`, no extra packages). Rebuild afterwards with `npm run build`.

## Import Format

Collection exports use this general shape:

```json
{
  "version": 1,
  "exportDate": "2026-05-11T00:00:00.000Z",
  "collections": [
    {
      "name": "Example Collection",
      "enabled": true,
      "createdAt": 1710000000000,
      "sites": ["localhost:3000"],
      "apis": [
        {
          "label": "Get Users",
          "method": "GET",
          "url": "/api/users",
          "status": 200,
          "requestPayload": "",
          "responsePayload": "{\n  \"users\": []\n}",
          "responseHeaders": "",
          "delay": 0,
          "urlMatchType": "auto",
          "matchQuery": "",
          "matchBody": false,
          "responseMode": "mock",
          "contentType": "application/json",
          "templated": false,
          "variants": [{ "name": "empty", "status": 200, "responsePayload": "{\"users\":[]}" }],
          "activeVariant": "",
          "enabled": true,
          "createdAt": 1710000000000
        }
      ]
    }
  ]
}
```

All fields except `method` and `url` are optional. Older exports without the newer fields import with the defaults.

## Permissions

- `storage`: saves the global on/off switch and recording state (`chrome.storage.local`).
- Content scripts on `<all_urls>`: let interception work on whichever site you test. Pages only receive mocks from collections whose sites match.

No `tabs`, `webRequest`, `scripting` or host permissions are requested.

## Limitations

- Requests made inside Web Workers, Shared Workers or Service Workers are not intercepted (only the page's own `fetch`/XHR/EventSource/WebSocket/sendBeacon).
- Does not mock browser internal pages.
- Does not sync data across devices.
- Does not persist interception hit counts or the request log.
- Does not mock binary responses such as images or videos.
- Recording skips binary responses and bodies over 512 KB.

## Troubleshooting

### Mocks Do Not Intercept

1. Confirm the collection is enabled.
2. Confirm the API is enabled.
3. Confirm the HTTP method matches.
4. Confirm the URL pattern matches the real request.
5. Reload the target website tab after reloading the extension.
6. Rebuild with `npm run build` and reload the unpacked extension.

### Edited JSON Looks Empty

Open the API details modal or edit form again after reloading the extension. Request JSON is hidden for `GET` APIs; response JSON is the primary payload for `GET` mocks.

### Import Fails

Validate the JSON file and make sure required API fields exist: `label`, `method`, and `url`.

### Extension Context Invalidated

This happens after the extension is reloaded. Refresh the target page so content scripts are injected again.

## Developer

**Majid Ali** — Full Stack Developer (Vue.js · Nuxt.js · React · Python · FastAPI)
[Portfolio](https://majidev.netlify.app) · [GitHub](https://github.com/Majid-Ali-Watto)

## License

MIT

## Privacy & Terms

API Mock Manager collects no data. Mocks, settings, and form drafts stay in your browser (IndexedDB / `localStorage`), and nothing is sent to any server.

- [Privacy Policy](public/privacy.html)
- [Terms of Use](public/terms.html)

Both pages are bundled into the extension (open them from the info sidebar). `.github/workflows/pages.yml` publishes them to GitHub Pages (enable it under Settings → Pages → Source: GitHub Actions). The resulting `…/privacy.html` URL is the Chrome Web Store privacy policy URL.

Mocks reach pages over a private `MessageChannel`, set up at `document_start` before any page script runs, so page scripts can't read them or fake hit reports. Pages receive only the fields interception needs, and only from collections whose **Sites** setting matches the page. Mocked responses are still handed to the page as replies, so don't put real secrets in mock payloads.
