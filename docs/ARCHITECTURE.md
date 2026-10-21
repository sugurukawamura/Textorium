# Textorium 2.0 — アーキテクチャとデータ設計

この文書は `manifest.json` と現在の JavaScript 実装を基準とした開発者向け資料です。設計上の意図と実装済みの機能を区別しています。

## 全体像

Textorium は **Manifest V3 の Chrome 拡張機能**です。Web サーバー、データベース、ビルドツールは不要です。ポップアップとサイドパネルが同じ UI コントローラーとローカル保存データを使用します。

```text
Chrome extension (manifest.json)
 ├─ action.default_popup → popup.html
 ├─ side_panel.default_path → sidepanel.html
 └─ background.service_worker → background.js
       └─ "openSidePanel" メッセージ → chrome.sidePanel.open(...)

popup.html / sidepanel.html
 ├─ popup.css       … UI スタイル
 ├─ utils.js       … ID 生成・スニペットマージ・タグ正規化
 ├─ snippet-domain.js … 検索・ソート・インポート検証・テンプレート処理
 ├─ i18n.js        … 日本語 / 英語の表示文字列
 └─ popup.js       … 画面表示・ユーザー操作・Chrome API・状態管理
                            ↓
                    chrome.storage.local
                         ├─ snippets
                         └─ settings
```

### 権限

`manifest.json` に定義された権限は `storage` と `sidePanel` です。`background.js` は、ポップアップからの `openSidePanel` メッセージを受けて Side Panel API を呼びます。コンテンツスクリプト、`host_permissions`、外部 API、ユーザー認証は現状の実装にありません。

## 主なファイル

| ファイル | 責務 |
| --- | --- |
| `manifest.json` | 拡張機能のエントリーポイント・バージョン・権限 |
| `popup.html` / `sidepanel.html` | 共通の UI 要素を含む 2 種類の画面 |
| `background.js` | サイドパネル起動用メッセージを処理 |
| `popup.js` | イベント登録、表示、テンプレートモーダル、設定、保存と復元 |
| `snippet-domain.js` | DOM / Chrome API に依存しないスニペット操作 |
| `utils.js` | ID 生成、タグ正規化、スニペット同士のマージ |
| `i18n.js` | 表示文字列（`ja` / `en`） |
| `popup.css` | ポップアップとサイドパネルのレイアウト |
| `*.test.js` | Node.js で動作するドメイン・ユーティリティテスト |
| `ui-*.mjs` | Playwright による画面検証スクリプト |

拡張機能がロードするスクリプトの順序は HTML の `utils.js` → `snippet-domain.js` → `i18n.js` → `popup.js` です。`snippet-domain.js` は Node.js テスト環境では `require("./utils.js")` を使用します。

## ストレージ

### `snippets`

`chrome.storage.local` の `snippets` 配列に各データを保存します。

```json
{
  "id": "id-abc",
  "title": "例",
  "content": "本文",
  "tags": [
    { "name": "work", "category": "general", "key": "work:general" }
  ],
  "favorite": false,
  "createdAt": 1730000000000,
  "updatedAt": 1730000000000
}
```

- `id` はスニペットを識別する文字列です。通常は `utils.generateId` で生成します。
- `tags` は配列です。タグ正規化は名前・カテゴリの空白を除去し、カテゴリが空なら `general` とし、`名前:カテゴリ` を小文字化した `key` を生成します。
- インポート時には既存の追加フィールドを維持する設計であり、過去のデータには `tags[].key` がない場合があります。
- `createdAt` および `updatedAt` はミリ秒単位の時刻です。インポートされたレコードの `updatedAt` は取り込み時刻に更新されます。

### `settings`

`settings` は `snippets` と別の保存キーです。`popup.js` は言語（`language`）やテーマ（`theme` / `darkMode`）を扱います。

## データの流れ

1. 画面が開くと `popup.js` が設定とスニペットを読み込み、表示を構築します。
2. 保存・編集・お気に入り変更・削除などはメモリ上の一覧を更新し、`chrome.storage.local` に書き込みます。
3. 検索・タグ抽出・並び替えは主に `snippet-domain.js` のロジックで処理します。
4. エクスポートではスニペット配列を JSON として保存します。インポートは JSON 配列を検証し、`id` が一致するスニペットを `mergeSnippets` のルールで統合します。

**マージルールの概要:** 新しい `updatedAt` を優先しつつ、両方の既知・未知フィールドをなるべく保持し、`favorite` は論理 OR、`tags` はタグキーで重複排除します。`createdAt` は小さい値が優先されます。詳細な振る舞いは `utils.test.js` と `snippet-domain.test.js` を参照してください。

## テンプレートとタグ

- `extractTemplateVariables`: `{{name}}` と `{{name:default}}` から変数一覧を抽出し、同名変数をまとめます。
- `renderTemplate`: モーダルの入力値、またはデフォルト値を使ってテキストを置換します。JavaScript を実行する機能ではありません。
- `extractHashtags`: 本文中の `#name` を検出します。
- `inferTitleFromContent`: 空のタイトルを本文先頭行から補います。
- `normalizeTag`: `utils.js` の正規化処理を、`snippet-domain.js` 経由で UI でも再利用します。

**現行の既知の制約:** 2.0 の新規保存／インライン編集ではタグのカテゴリが `general` に固定されています。カテゴリ入力欄は表示されますが、その値は新規保存に反映されません。変更時には互換性と関連テストを確認してください。

## 変更時の注意

- ストレージの既存キー・未知フィールドを壊さないこと。
- ユーザー入力は原則 `textContent` として描画し、`innerHTML` に直接差し込まないこと。
- 新しい権限、外部送信、コンテンツスクリプトはレビュー対象です。
- ポップアップとサイドパネルの両方に影響する変更は **両画面**で確認してください。
- UI テストと手動確認の現状については [TESTING.md](TESTING.md) を参照してください。
