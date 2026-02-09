# AGENTS.md — Textorium (Chrome Extension, Manifest V3)

> This file tells AI coding agents (e.g., GitHub Copilot coding agent) how to work on this repo.
> Keep it concise, precise, and actionable. Treat it as living documentation.

## Project overview
- **What**: Textorium is a *Chrome extension (Manifest V3)* for managing local text snippets in a popup UI.
- **Scope**: Plain HTML/CSS/JS. No bundler. No external network calls.
- **Key files**: `manifest.json`, `popup.html`, `popup.js`, `snippet-domain.js`, `utils.js`, `background.js`, `README.md`.

## Repository layout (flat)
```
/manifest.json        # MV3 manifest
/popup.html           # Popup UI
/popup.js             # Popup logic (render/search/import/export etc.)
/snippet-domain.js    # Pure domain logic (filter/sort/import normalization)
/utils.js             # Shared helpers (id generation, merge policy)
/utils.test.js        # Unit tests for utils.js
/snippet-domain.test.js # Unit tests for snippet-domain.js
/background.js        # Minimal service worker (onInstalled, future hooks)
/README.md            # Overview & install steps
```
*(No build tooling. Keep file size & complexity modest.)*

## Setup & run (no build)
1. Open Chrome → `chrome://extensions` → enable **Developer mode**
2. **Load unpacked** → select repo root
3. Click the extension icon to open the popup and test
*(Reload from the extensions page after changes.)*

## Data model (must remain backward‑compatible)
Stored under key **`"snippets"`** in `chrome.storage.local`. Each item:
```jsonc
{
  "id": "id-<unique>",                // string (unique)
  "title": "string",                  // required
  "content": "string",                // required (multiline allowed)
  "tags": [{ "name": "string", "category": "string" }], // optional 0..n
  "favorite": false,                  // boolean
  "createdAt": 1730000000000,         // number (ms)
  "updatedAt": 1730000000000          // number (ms) - update on change
}
```
- Do **not** break existing stored data. Migrations must preserve unknown fields.
- On edit/import, always set/refresh `updatedAt`. On create, set `createdAt` & `updatedAt`.

## Coding standards
- **Language**: modern JS; use `const`/`let`, async/await.
- **DOM/XSS**: never inject untrusted HTML. Prefer `textContent`; sanitize inputs if needed.
- **I/O discipline**: batch reads/writes to `chrome.storage.local`; avoid loops that `set` per item.
- **Error handling**: check `chrome.runtime.lastError`; surface user‑friendly messages in the popup.
- **Structure**: keep functions short; extract UI renderers (e.g., `renderSnippetItem(snippet)`), storage helpers (`getStoredSnippets`, `setStoredSnippets`).
- **Separation**: keep pure domain logic in `snippet-domain.js`; keep `popup.js` focused on UI events and chrome APIs.
- **Naming**: lowerCamel for vars/functions, SCREAMING_SNAKE for constants.

## Security & privacy guardrails (do not remove)
- **Minimal permissions**: keep only what is necessary (currently `storage`).
- **No content scripts** unless explicitly requested.
- **No network calls / telemetry / analytics**. Any new capability that needs extra permissions must be a separate PR with rationale and least‑privilege review.

## Definition of Done (for any agent task)
- Loads as an unpacked extension with **no new permissions** and **no content scripts**.
- Popup flows: add/edit/delete, search, favorite toggle work as described in README.
- Data schema preserved; migrations (if any) are safe and idempotent.
- **UX**: focus order and keyboard usage remain reasonable; main controls have `aria-label`.
- **Docs**: Update `README.md` if user‑visible behavior changes.
- **Tests (manual)**: Follow the QA checklist below.

## Manual QA checklist (run before PR)
- Install via `Load unpacked` and open popup.
- Create, edit, delete snippets; verify `updatedAt` changes and list sorts by newest.
- Search by lowercase‑contains on title/content.
- Toggle favorites; filter favorites view (if present).
- **Export/Import** JSON: export current data, clear storage, import back, confirm equality.
- Large content (multi‑KB): UI remains responsive, line breaks preserved.
- Reload extension and Chrome: data persists.

## Common tasks / recipes
- **Tag filter UI**: add dropdown/checkbox filters for `tags[].name` and/or `tags[].category`, composing with the existing text search (AND logic).
- **Import validation**: when importing an array, validate items; skip invalid, show counts (added/updated/skipped).
- **Duplicate handling**: define duplicate as identical `id`; allow *merge by id* and (optionally) detect exact `title+content` duplicates.
- **Keyboard affordances**: focus management for list → detail → back; `Enter` to save, `Esc` to cancel.
- **Copy action**: use `navigator.clipboard.writeText(content)` with try/catch and a short toast.

## Branching, commits & PRs
- **Branch**: `feat/<short>`, `fix/<short>`, `refactor/<short>`.
- **Commits**: Conventional style (`feat:`, `fix:`, `refactor:`, `docs:`).
- **PR template** (include in description):
  - **Goal / Scope**: what & why
  - **User impact**: visible UI/behavior changes
  - **Data considerations**: schema/migration notes
  - **QA**: steps you ran (checklist results + screenshots welcome)

## Non‑goals (unless explicitly requested)
- Adding remote sync, analytics, or any host permissions.
- Injecting UI into third‑party pages via content scripts.
- Introducing a bundler or framework.

## Notes for agents
- If you need additional metadata (e.g., sort preferences), store it under a separate key like `"settings"` to avoid mixing with `"snippets"`.
- Keep changes reversible; prefer small PRs. If you must change the data shape, propose a migration plan first.
