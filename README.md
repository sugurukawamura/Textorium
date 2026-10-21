# Textorium 2.0 — The Intelligent Local Palette

Textorium is a modern, local-first Chrome extension (Manifest V3) for managing text snippets, AI prompts, and dynamic templates in a persistent Side Panel or popup.

- **Side Panel First**: Keep your palette open alongside ChatGPT, Claude, Gmail, Notion, or GitHub.
- **Dynamic Prompt Templates**: Define variables like `{{target:beginner}}` and fill them out interactively before copying.
- **Zero-Friction Capturing**: Automatic title inference and `#hashtag` parsing.
- **Strict Privacy**: Local storage only (`chrome.storage.local`), zero external network requests, zero telemetry.

## 1. 使い方 (日本語)

### インストール

1. Chrome で `chrome://extensions` を開く
2. 右上の `デベロッパーモード` を ON
3. `パッケージ化されていない拡張機能を読み込む` をクリック
4. このリポジトリのルートフォルダを選択
5. ツールバーの Textorium アイコンをクリック（ポップアップまたは「◨ サイドパネル」で起動）

### 基本操作と新機能

1. **常駐型 Side Panel**:
   - ポップアップ右上の `◨ サイドパネル` ボタンをクリックすると、ブラウザ右側に常時固定表示。
   - 他のタブやWebページを操作しても閉じず、スムーズにプロンプトや定型文を参照・コピーできます。
2. **動的プロンプトテンプレート (`{{変数名:デフォルト値}}`)**:
   - 本文に `{{変数名}}` または `{{変数名:デフォルト値}}` を含めると、自動的に `⚡️ TEMPLATE` として認識されます。
   - 「⚡️ 展開してコピー」をクリックすると入力モーダルが開き、穴埋めした上でリアルタイムプレビュー＆即時コピーが可能です。
3. **ゼロフリクション登録**:
   - 右上の `+ 新規作成` をクリック。
   - タイトルは空欄のままでも本文1行目から自動推測されます。
   - 本文中の `#tag` も自動抽出されます。
4. **ワンクリックコピー**:
   - 通常のスニペットはカードの「📋 コピー」を押すだけでクリップボードに即座にコピーされます。
5. **クイックタブ & タグフィルタ**:
   - `すべて`、`★ お気に入り`、`⚡️ テンプレート` のタブ切り替えや、タグチップをクリックして瞬時に抽出。
6. **バックアップ & サンプル**:
   - 右上の `⚙️` アイコンから JSON エクスポート/インポート、便利なサンプルプロンプトの追加が可能です。

## 2. Quick Start (English)

1. Open `chrome://extensions` and enable Developer mode.
2. Click `Load unpacked` and select this repository root.
3. Click the extension icon in the toolbar.
4. Click `◨ Side Panel` in the top right to pin Textorium alongside your active browser tab.
5. Create prompts with variables (e.g. `Summarize for {{target:beginners}}:\n{{content}}`) and enjoy interactive prompt filling and zero-click copying.

## 3. Core Features (Textorium 2.0)

- **Persistent Side Panel**: Full integration with Chrome Side Panel API (`sidepanel.html`).
- **Dynamic Template Runner**: Live interactive variable substitution with `{{variable:default}}` syntax.
- **Instant Search & Dynamic Tags**: Instant multi-keyword search, dynamic tag bubbles, and tab-based quick filtering.
- **One-Click Quick Copy & Toast**: Copy feedback directly on the card with visual toast notifications.
- **Inferred Titles & Hashtags**: No mandatory title/category burden; automatic title deduction and hashtag discovery.
- **Premium Responsive UI**: Curated slate/indigo aesthetic, dark mode support, and glassmorphic micro-animations.
- **Export & Import JSON**: Safe local backup and restore with ID-based merging.

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
