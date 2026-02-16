# Textorium

Textorium is a Chrome extension (Manifest V3) for local text snippet management.

- Local storage only (`chrome.storage.local`)
- No telemetry
- No content scripts
- No external network access

## 1. 使い方 (日本語)

詳細な図解マニュアルは [docs/manual.html](docs/manual.html) を参照してください。

### インストール

1. Chrome で `chrome://extensions` を開く
2. 右上の `デベロッパーモード` を ON
3. `パッケージ化されていない拡張機能を読み込む` をクリック
4. このリポジトリのルートフォルダを選択
5. ツールバーの Textorium アイコンをクリックして起動

### 基本操作

1. 画面右上で言語を `日本語 / EN` から選択
2. `タイトル` と `本文` を入力して保存
3. 必要に応じてタグ名/カテゴリを入力
4. 検索、タグ絞り込み、お気に入り絞り込みを組み合わせて抽出
5. 並び替え条件と昇順/降順を切り替え
6. 必要なスニペットを `コピー` / `編集` / `削除`
7. `エクスポート` でバックアップ、`インポート` で復元

### キーボード操作

- 新規作成:
  - 単一行入力で `Enter` 保存
  - 本文入力で `Ctrl/Cmd + Enter` 保存
- 編集フォーム:
  - 単一行入力で `Enter` 保存
  - 本文入力で `Ctrl/Cmd + Enter` 保存
  - `Esc` でキャンセル

## 2. Quick Start (English)

See [docs/manual.html](docs/manual.html) for a detailed manual with screenshots.

1. Open `chrome://extensions` and enable Developer mode.
2. Click `Load unpacked` and select this repository root.
3. Open the popup from the browser toolbar.
4. Create snippets, then use search/tag/favorites/sort to retrieve them.
5. Use export/import JSON for backup and restore.

## 3. Current Features

- Create, edit, delete snippets
- Favorite toggle
- Japanese/English language switch (saved in local settings)
- Search by title/content/tags
- Tag filter + favorites-only filter
- Sort by created/updated/title/favorite
- Copy content to clipboard
- Export/import JSON with validation and merge-by-id
- Theme toggle (light/dark)
- Collapsible sections and a compact list area for easier popup use

## 4. Data Model

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

Rules:

- Backward compatible with existing stored data
- `updatedAt` is refreshed on edit/import merge
- `createdAt` and `updatedAt` are set on create
- Unknown fields are preserved during import merge

## 5. Project Structure

- `popup.html`: popup layout and styles
- `popup.js`: popup UI + chrome API integration
- `snippet-domain.js`: pure domain logic (filter/sort/import normalization)
- `utils.js`: helpers (`generateId`, merge policy)
- `utils.test.js`: unit tests for utilities
- `snippet-domain.test.js`: unit tests for domain logic
- `background.js`: minimal service worker

## 6. Testing

### Unit tests

- Command: `npm test`
- Scope: pure logic in `utils.js` and `snippet-domain.js`

### Visual layout test

- Command: `npm run test:ui`
- Runs Playwright headless checks on `popup.html` at multiple viewport sizes
- Detects horizontal overflow/clipping and saves screenshots to `artifacts/ui-layout/`

### Manual Screenshots

To regenerate screenshots for the manual (requires Playwright):

```bash
node scripts/generate-manual-screenshots.mjs
```

### PATH troubleshooting (Windows)

If `npm` or `node` is not found, add `C:\Program Files\nodejs` to PATH, then reopen terminal.

PowerShell example:

```powershell
$env:Path = "C:\Program Files\nodejs;$env:Path"
npm test
```

### Manual QA checklist

1. Add/edit/delete snippets
2. Confirm search/filter/sort behavior
3. Toggle favorites and verify filtering
4. Export JSON -> clear storage -> import JSON -> verify roundtrip
5. Reload extension and browser, then confirm persistence

## 7. Development Workflow

New feature development should be done on a dedicated branch, not directly on `main`.

Branch examples:

- `feat/<short-description>`
- `fix/<short-description>`
- `refactor/<short-description>`
- `docs/<short-description>`
- `chore/<short-description>`

Commit message format:

`<type>: <summary>`

Examples:

- `feat: add tag filter composition with search`
- `fix: preserve unknown fields in import merge`
- `docs: reorganize readme for ja/en usage`

Detailed policy: `CONTRIBUTING.md`

## 8. Security and Privacy

- No new manifest permissions unless required and reviewed
- No content scripts unless explicitly requested
- No telemetry/analytics/network calls

## 9. Product Notes

Longer review and roadmap: `PRODUCT_REVIEW.md`

## 10. License

This project is licensed under the [MIT License](LICENSE).
