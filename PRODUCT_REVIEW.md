# Textorium Product Review (Baseline)

This document captures a foundational review of current functionality and a practical roadmap.

## 1. Current Strengths

- Very low operational complexity (no build toolchain, no backend)
- Strong privacy posture (local-only)
- Core CRUD flow already implemented
- Backup/restore path exists (export/import JSON)

## 2. Core Gaps (Root-Level)

- Discoverability can degrade as snippet count grows
- Tag model exists but management UX is still minimal
- Import reliability and merge semantics need clear policy and tests
- Manual QA exists but lacks structured release checklist in repository docs
- Product scope boundaries are implied, not always explicit to new contributors

## 3. Product Principles Going Forward

- Local-first by default
- Popup-first interaction (no page injection)
- Backward-compatible data evolution
- Reliability and accessibility before feature breadth
- Small, reversible changes over large rewrites

## 4. Prioritized Roadmap

### Phase A: Reliability and Maintainability

- Harden import validation/migration paths
- Add more unit tests around merge and normalization
- Separate domain logic from DOM rendering for easier testing

### Phase B: Retrieval Quality

- Improved tag filtering options (name/category combinations)
- Better sorting presets and persisted view preferences
- Optional saved filters in local `settings`

### Phase C: Editing Ergonomics

- Richer multi-tag editing UX
- Better keyboard focus flow between list and edit form
- Clear visual state for active filters/sort

## 5. Non-Goals (Unless Explicitly Requested)

- Remote sync / cloud backend
- Analytics or telemetry
- Content script based webpage UI injection
- Framework or bundler migration

## 6. Release Readiness Criteria

- No permission creep in manifest
- Schema compatibility maintained
- Import/export roundtrip verified
- Keyboard and accessibility labels remain intact
- README and CONTRIBUTING are consistent with behavior
