# Contributing to Textorium

This project uses a lightweight workflow focused on small, reviewable changes.

## Branch Strategy

Do not develop new features directly on `main`.

Use branch naming:

- `feat/<short-description>`
- `fix/<short-description>`
- `refactor/<short-description>`
- `docs/<short-description>`
- `chore/<short-description>`

Examples:

- `feat/tag-multi-select`
- `fix/import-invalid-tags`
- `docs/readme-overhaul`

## Recommended Flow

1. Update `main`
   - `git checkout main`
   - `git pull`
2. Create a branch
   - `git checkout -b feat/<short-description>`
3. Implement and test
   - `npm test`
4. Commit using Conventional Commit style
5. Open PR and review
6. Merge after approval

## Commit Message Convention

Use:

`<type>: <summary>`

Types:

- `feat`: user-visible feature
- `fix`: bug fix
- `refactor`: internal change without behavior change
- `docs`: documentation
- `test`: tests
- `chore`: maintenance

Examples:

- `feat: add tag category filter composition with search`
- `fix: preserve unknown fields during import merge`
- `docs: expand readme with workflow and roadmap`
- `refactor: split popup rendering into focused helpers`

## Pull Request Checklist

- No new permissions in `manifest.json` unless explicitly required
- No content scripts unless explicitly requested
- No network calls/telemetry
- Backward compatibility preserved for stored snippets
- README updated for user-visible behavior changes
- Manual QA completed

## Definition of Done

- Extension loads via `Load unpacked`
- Core popup flows work (add/edit/delete/search/filter/favorite/import/export)
- No obvious regressions in keyboard usage and accessibility labels
- Changes are small enough to review safely
