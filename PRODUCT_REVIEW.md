# Textorium 2.0 — Product Review & Backlog

This is a **review of the current repository implementation**, not a release promise or a guarantee that every browser scenario is tested. Check [README.md](README.md) for confirmed UI entry points and [docs/TESTING.md](docs/TESTING.md) for QA coverage.

## Implemented capabilities

- Local-first Chrome extension with popup and Side Panel (`manifest.json`).
- Snippets and dynamic `{{variable:default}}` templates (`snippet-domain.js` / `popup.js`).
- Live preview and copy of rendered templates.
- Title inference, inline hashtag extraction, tabs for All/Favorites/Templates, search, tags, sorting.
- Local JSON export/import with ID-based merging; theme and language settings.

## Observed gaps to validate and prioritize

| Area | Observation from code | Suggested next step |
| --- | --- | --- |
| Tags | The 2.0 new-save and inline-edit handlers set categories to `general` even though the editor shows a category field. | Define category UX, preserve category during edits, add regression tests. |
| End-to-end tests | `ui-functional.test.mjs` includes selectors and element order from the earlier popup layout. | Rewrite tests for current popup and Side Panel flows, templates, imports and copy. |
| Manual images | `docs/images/*.svg` are legacy placeholder images; `scripts/generate-manual-screenshots.mjs` targets the earlier layout. | Regenerate real 2.0 screenshots and review the script before publishing them. |
| HTML maintenance | `popup.html` and `sidepanel.html` duplicate markup; compatibility sections contain legacy controls. | Audit accessible IDs, remove obsolete compatibility elements only after updating tests. |
| User messaging | Import/export and clipboard operations depend on Chrome/browser context. | Improve error cases and manual QA for failures / large data. |
| Versioning | `manifest.json` states 2.0.0 while `package.json` states 1.0.0. | Align build/test package metadata once versioning policy is decided. |

These are **candidate tasks** and code-review observations. Runtime behavior has not been comprehensively audited solely by maintaining the documentation.

## Principles

1. Stay local-first: no unexpected transmission of snippet content.
2. Preserve storage and import compatibility with previous versions.
3. Prefer predictable editing, recovery and export over visual polish.
4. Test both Chrome UI entry points, including keyboard and accessibility.
5. Use small, reversible PRs with verified outcomes.

## Before release

- [ ] Inspect the manifest permissions and storage changes
- [ ] Verify snippet edit, copy, search, favorite, sort and deletion
- [ ] Verify template default values, preview and copying
- [ ] Exercise JSON backup and restore with test data
- [ ] Confirm popup and Side Panel manually in Chrome
- [ ] Run and repair applicable automated tests
- [ ] Keep README, manual and architecture consistent

## Out of scope unless explicitly agreed

Cloud sync, account login, telemetry, content-script injection, and adoption of a framework or bundler.
