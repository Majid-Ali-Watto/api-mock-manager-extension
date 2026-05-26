# Claude Code Context

## Project Summary

This repo is a browser extension for managing API mocks.
Stack: Vue 3 popup UI, Vite build, IndexedDB storage, Manifest V3 background/content/injected scripts.

## Architecture

- `src/popup/**`: UI for collections, APIs, import/export, search, and enable/disable flows
- `src/db/**`: IndexedDB schema and CRUD helpers
- `src/background.js`: reads enabled mocks and notifies tabs
- `src/content.js`: injects `injected.js` and syncs mocks into the page
- `src/injected.js`: monkey-patches `fetch` and `XMLHttpRequest`

## Important Constraints

- Keep request interception stable before adding UI polish.
- Preserve extension message/event contracts unless all callers are updated together.
- Keep payload handling compatible with stored JSON strings.
- Avoid large rewrites; prefer minimal diffs and reuse existing helpers.
- Do not introduce new packages unless necessary.

## Efficient Workflow

- Inspect only touched files and their immediate collaborators.
- Reuse existing patterns from nearby code instead of inventing new abstractions.
- Keep responses short and implementation-focused.
- Mention exact files changed and any unverified assumptions.
