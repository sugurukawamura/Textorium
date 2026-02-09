## Goal / Scope

- What is changed
- Why this change is needed

## User Impact

- UI or behavior changes visible to users
- Backward compatibility notes

## Data Considerations

- Storage schema impact (if any)
- Migration/import/export behavior changes

## QA

- [ ] Load unpacked extension and basic popup open
- [ ] Add/Edit/Delete snippet flow
- [ ] Search + tag filter + favorites filter
- [ ] Sort behavior
- [ ] Export/Import roundtrip
- [ ] Reload extension and confirm persistence

## Guardrails Check

- [ ] No new permissions without rationale
- [ ] No content scripts unless explicitly required
- [ ] No telemetry/network calls
