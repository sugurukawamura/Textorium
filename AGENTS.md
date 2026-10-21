# Agent instructions — Textorium 2.0

These instructions apply repository-wide to AI coding agents. Follow [CONTRIBUTING.md](CONTRIBUTING.md) for branch / PR policy, and the files below for product-specific behavior.

## Read first

1. [README.md](README.md) — install, user interactions, known limitations
2. [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — modules, storage schema, permissions
3. [docs/TESTING.md](docs/TESTING.md) — automated and manual QA
4. [PRODUCT_REVIEW.md](PRODUCT_REVIEW.md) — known gaps and candidate improvements

## Scope

- **Product:** local-first Chrome extension, Manifest V3, version from `manifest.json`.
- **UI:** popup (`popup.html`) and Chrome Side Panel (`sidepanel.html`); shared controller `popup.js` and stylesheet `popup.css`.
- **Background:** `background.js` receives the `openSidePanel` message.
- **Logic:** `snippet-domain.js` and `utils.js` contain testable business logic; `i18n.js` supplies JA/EN UI strings.
- **Tests:** `utils.test.js`, `snippet-domain.test.js` and Playwright scripts. No bundler or backend.

## Hard requirements

- Keep existing `chrome.storage.local` data usable. `snippets` is an array; `settings` is separate. Do not drop unrecognized fields when handling imports.
- Preserve snippet `id`, `title`, `content`, `tags`, `favorite`, `createdAt`, and `updatedAt` semantics. Normalized tags can include a lowercased `key`.
- Use safe DOM rendering (`textContent`) for user data. Never add unreviewed external requests or telemetry.
- The manifest currently requests `storage` and `sidePanel`; new permissions, host permissions, or content scripts must be justified and reviewed.
- Test popup **and** side panel for UI changes; each HTML page loads the same JS controller.
- Do not claim Playwright scripts cover the 2.0 UI without checking their selectors. Document test limitations, actual outcomes and manual QA.
- Keep user-facing docs up to date. For agent instruction changes, maintain this file as the authoritative source; `copilot-instructions.md` should only redirect here.

## Workflow

1. Inspect the latest `main` and the relevant code / tests.
2. Make a short-lived branch (`feat/`, `fix/`, `refactor/`, `docs/`, `test/` or `chore/`).
3. Make the smallest cohesive change that solves the task; avoid unrelated code rewrites.
4. Run `npm test`. If Playwright is available, run the relevant UI checks; manually inspect the actual Chrome extension as needed.
5. Update docs and report results exactly (passed/failed/not run).
6. Open a PR with scope, affected UI, storage implications, and QA.

## Important current caveats

- In 2.0, new-save and inline-edit tag handlers currently set category to `general` even though a category input exists.
- Older manual SVGs are placeholders, and the screenshot generator / UI functional test include legacy UI assumptions.
- The Chrome extension version is `manifest.json`'s `2.0.0`, while npm package metadata currently says `1.0.0`.

Do not silently “fix” these issues while working on unrelated tasks; propose a focused change with tests.
