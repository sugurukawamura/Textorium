## Summary / 変更概要

- What changed and why / 変更内容と目的:
- User impact / ユーザーへの影響:
- Scope: popup / side panel / domain logic / documentation / other

## Data, Privacy & Permissions / データと権限

- Stored snippet or settings schema changed? How are older records handled?
- Does JSON import/export or ID-based merging change?
- Are any Manifest V3 permissions, host permissions, content scripts, or network requests added? Explain why and how data is protected.

## Tests actually run / 実施した検証

Check only tests **actually run and passed**. Document failures and untested areas below.

- [ ] `npm test` — unit tests
- [ ] `npm run test:ui` — Playwright layout
- [ ] `npm run test:functional` — Playwright mocked UI
- [ ] Chrome Load unpacked — popup
- [ ] Chrome Load unpacked — Side Panel
- [ ] Manual create/edit/delete/copy/favorite/search/sort
- [ ] Template variable input, preview and rendered copy
- [ ] JSON export/import and reload persistence
- [ ] Language/theme, keyboard and accessibility checks

**Results / failed or not run (with reason):**

## Documentation / ドキュメント

- [ ] User-facing changes are reflected in `README.md` / `docs/manual.html`
- [ ] Architecture, data model or QA documents were updated if relevant
- [ ] Screenshots correspond to the current Textorium 2.0 UI (if included)

## Review notes / レビュー時の注意

- Risks and rollback approach:
- Known limitations and follow-up tasks:

See [CONTRIBUTING.md](../CONTRIBUTING.md) and [docs/TESTING.md](../docs/TESTING.md) for expectations. Current Playwright tests may contain legacy UI selectors, so list their true status.
