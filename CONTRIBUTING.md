# Contributing to Textorium

Textorium is a **local-first Chrome extension (Manifest V3)** with a popup and Side Panel. Contributions should be small, reviewable, and backward-compatible.

Read [README.md](README.md) for user-facing behavior, [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the code structure and [docs/TESTING.md](docs/TESTING.md) for QA instructions.

## Local development

The extension requires no build step. Install it in Chrome through `chrome://extensions` → Developer mode → Load unpacked → choose the repository root.

Node.js and npm are used **for tests**, not for running the extension:

```sh
npm ci
npm test
npx playwright install chromium
npm run test:ui
npm run test:functional
```

`npm run test:all` combines all three test commands. Playwright scripts currently contain selectors and flows inherited from pre-2.0 screens. Do not assume they cover the current Side Panel and template features. Perform manual QA and report precisely which checks were run.

## Branch and commit conventions

Do not implement changes directly on `main`. Create a branch:

- `feat/<short-description>`
- `fix/<short-description>`
- `refactor/<short-description>`
- `docs/<short-description>`
- `test/<short-description>`
- `chore/<short-description>`

Use conventional commit messages such as `fix: preserve tag categories on edit` or `docs: document backup procedure`.

## Pull request requirements

Describe the user impact, schema/migration consequences, new permissions (if any), tests performed, screenshots (if UI changed), and known limitations. Use [.github/pull_request_template.md](.github/pull_request_template.md). Mark unchecked tests as **not run**, not passed.

## Engineering guardrails

1. **Local-first privacy:** avoid networking, telemetry, new host permissions, and content scripts unless explicitly approved with a clear reason.
2. **Storage compatibility:** data is stored in `chrome.storage.local` under `snippets`; settings are under `settings`. Preserve existing IDs and unknown fields on import/merge.
3. **Consistent UI:** changes to `popup.js` may affect both `popup.html` and `sidepanel.html`. Test both.
4. **Safe rendering:** user-provided content should be added to the DOM as text, not unescaped HTML.
5. **Testable logic:** keep pure functions in `snippet-domain.js` or `utils.js`; add or update Node.js unit tests for behavior changes.
6. **Docs:** when changing a visible feature, revise `README.md` and `docs/manual.html`. Update the architecture and test guides when their contracts change.

## Review checklist

- [ ] Extension loads in Chrome with its existing Manifest V3 permissions
- [ ] Popup and Side Panel still function
- [ ] Add/edit/delete, search/tabs/tag filters, favorites, and sorting were checked as relevant
- [ ] Template substitution and copy were checked as relevant
- [ ] JSON export/import and local persistence remain compatible
- [ ] New or changed domain behavior has appropriate unit tests
- [ ] Tests actually run, results, and untested scenarios are recorded
- [ ] Documentation accurately reflects current behavior

See [PRODUCT_REVIEW.md](PRODUCT_REVIEW.md) for known gaps. Do not describe proposed features as already implemented.
