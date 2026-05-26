# API Mock Manager

A Chrome Manifest V3 extension for mocking API responses directly in the browser. It is built for frontend development, testing, and debugging when the real backend is unavailable, unstable, or not ready yet.

## Features

- Organize mock APIs into collections.
- Enable or disable individual APIs and full collections.
- Intercept `fetch` and `XMLHttpRequest` requests from web pages.
- Match full URLs, relative paths, contains matches, and wildcard patterns.
- Return custom status codes and JSON response payloads.
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
│   │   └── utils/
│   └── types/
├── index.html
├── package.json
├── vite.config.js
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

```bash
npm install
npm run build
```

Then load the extension in Chrome:

1. Open `chrome://extensions/`.
2. Enable Developer mode.
3. Click Load unpacked.
4. Select the `dist` folder.

After rebuilding, reload the extension from `chrome://extensions` and refresh any target website tabs.

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

Query strings are ignored for matching, so `/api/users?page=1` can match `/api/users`.

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
```

Command notes:

- `npm run dev`: Starts Vite for popup development.
- `npm run build`: Builds the extension into `dist`.
- `npm run build:prod`: Builds with production mode.
- `npm run clean`: Removes `dist`.
- `npm run package`: Builds production output and creates `api-mock-extension.zip`.

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

The source icon is `public/icon.svg`. PNG sizes required by Chrome are already expected in `public/`:

```text
icon16.png
icon32.png
icon48.png
icon128.png
```

To regenerate them, use any SVG-to-PNG tool and export these sizes from `public/icon.svg`: 16, 32, 48, and 128 pixels. Then rebuild:

```bash
npm run build
```

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
      "apis": [
        {
          "label": "Get Users",
          "method": "GET",
          "url": "/api/users",
          "status": 200,
          "requestPayload": "",
          "responsePayload": "{\n  \"users\": []\n}",
          "enabled": true,
          "createdAt": 1710000000000
        }
      ]
    }
  ]
}
```

## Permissions

- `storage`: Extension storage support.
- `tabs`: Notify open tabs when mocks are refreshed.
- `scripting`: Extension script support.
- `webRequest`: Declared for request-related extension capabilities.
- `<all_urls>` host permissions: Allow content and main-world scripts to run on target pages.

## Limitations

- Does not mock WebSocket traffic.
- Does not mock browser internal pages.
- Does not sync data across devices.
- Does not persist interception hit counts.
- Does not mock binary responses such as images or videos.
- Page service workers may still affect requests outside this extension's page-context interception path.

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

Majid Ali  
Full Stack Web Developer  
Portfolio: https://majidev.netlify.app  
GitHub: https://github.com/Majid-Ali-Watto

## License

MIT
