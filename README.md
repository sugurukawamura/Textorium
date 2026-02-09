# Textorium

Textorium is a Chrome extension (Manifest V3) for local snippet management in the popup UI.
It is intentionally small, offline-first, and privacy-safe:

- Local storage only (`chrome.storage.local`)
- No telemetry
- No content scripts
- No external network access

## Why Textorium Exists

Textorium focuses on quick capture and retrieval of text snippets without leaving the browser context.
The core design is:

- Fast save and edit
- Reliable local persistence
- Lightweight search and filtering
- Safe backup and restore via JSON

## Current Feature Set

- Create, edit, delete snippets
- Favorite toggle
- Japanese/English language switch (saved in local settings)
- Search by title, content, and tags
- Filter by tag and favorites
- Sort by created/updated/title/favorite
- Copy snippet content to clipboard
- Export/import JSON with validation and merge-by-id behavior
- Light, compact popup UI with theme toggle (light/dark)
- Keyboard shortcuts
  - New snippet: `Ctrl/Cmd + Enter` in content, `Enter` in single-line inputs
  - Edit form: `Enter` save (single-line), `Ctrl/Cmd + Enter` save (content), `Esc` cancel

## Code Structure

- `popup.js`: popup UI and Chrome API integration
- `snippet-domain.js`: pure snippet domain logic (filter/sort/import validation)
- `utils.js`: shared utilities (`generateId`, merge policy)
- `*.test.js`: Node-based unit tests for pure logic

## Data Model

Stored under key `snippets` in `chrome.storage.local`.

```jsonc
{
  "id": "id-<unique>",
  "title": "string",
  "content": "string",
  "tags": [{ "name": "string", "category": "string" }],
  "favorite": false,
  "createdAt": 1730000000000,
  "updatedAt": 1730000000000
}
```

Compatibility rules:

- Existing data must remain readable
- Import/edit updates `updatedAt`
- Create sets `createdAt` and `updatedAt`
- Unknown fields should be preserved during merge/import operations

## Install (No Build Tooling)

1. Open `chrome://extensions`
2. Enable Developer mode
3. Click `Load unpacked`
4. Select this repository root
5. Open the extension popup from the toolbar

## Quick Usage

1. Choose language (`日本語` / `EN`) from the header.
2. Add title/content and optional tag info, then save.
3. Use search + tag + favorites toggle together to narrow results.
4. Use sort controls to reorder by date/title/favorite.
5. Export for backup and import JSON to restore.

## Manual QA (Minimum)

1. Add/edit/delete snippets
2. Confirm sort and search behavior
3. Toggle favorites and tag filters
4. Export JSON, clear storage, import JSON back
5. Confirm data persists after extension reload and browser restart

## Automated Tests

- Run: `npm test`
- Scope: pure functions only (`utils.js`, `snippet-domain.js`)
- UI behavior remains manually tested in Chrome popup

## Product Direction

A deeper functional review and roadmap are documented in `PRODUCT_REVIEW.md`.
Short version:

- Keep Textorium popup-only and local-first
- Improve retrieval quality (tags/filtering/saved views)
- Improve reliability and accessibility before adding complex features

## Development Workflow

Branching and commit policy are documented in `CONTRIBUTING.md`.
All new development should use a dedicated branch and merge via PR.

## License

[MIT License](LICENSE)
