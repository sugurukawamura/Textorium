# Textorium — Copilot instructions

The canonical repository-wide guidance is in [AGENTS.md](AGENTS.md). Before editing code, also read:

- [README.md](README.md) — current Textorium 2.0 behavior
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — module boundaries, manifest, and storage schema
- [docs/TESTING.md](docs/TESTING.md) — test commands, manual QA, and known test limitations
- [CONTRIBUTING.md](CONTRIBUTING.md) — branch, commit and PR conventions

Do not assume Textorium is popup-only or that `storage` is its only permission: the current Manifest V3 extension also has a Side Panel and `sidePanel` permission. Keep existing `chrome.storage.local` data compatible and do not introduce network calls or telemetry without review.
