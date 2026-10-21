# Textorium 2.0

**Textorium** は、定型文・コード片・AIプロンプトをブラウザー内に保存し、必要なときに検索・コピーできる Chrome 拡張機能です。Manifest V3 を使い、ポップアップとサイドパネルの両方で動作します。バックエンドやビルド工程はありません。

> **データの保存先:** `chrome.storage.local`。クラウド同期、ユーザー登録、テレメトリーは実装していません。ブラウザープロファイルや拡張機能を削除するとデータを失う可能性があるため、定期的に JSON でエクスポートしてください。

## はじめる

1. リポジトリをクローンまたは ZIP で取得し、展開します。
2. Chrome の `chrome://extensions` を開き、**デベロッパーモード**を有効化します。
3. **パッケージ化されていない拡張機能を読み込む**から、`manifest.json` があるリポジトリのルートを選択します。
4. 拡張機能アイコンをクリックしてポップアップを開きます。
5. ポップアップの **「◨ サイド」** ボタンからサイドパネル表示を要求できます（利用可能な Chrome 環境が必要です）。

ソースを修正した場合は `chrome://extensions` で拡張機能を再読み込みしてください。Node.js は拡張機能の利用には不要です。

## できること

| 操作 | 使い方 |
| --- | --- |
| 登録 | **「+ 新規」** またはエディターを開き、本文を入力して保存。タイトルが空なら本文から自動生成します。 |
| タグ | タグ名の入力や、本文中の `#work` などのハッシュタグからタグ候補を作成します。 |
| 検索 | 検索欄に入力すると、保存したテキストを絞り込みます。 |
| 絞り込み | **すべて / お気に入り / テンプレート** のタブ、タグチップを使用します。 |
| 並び替え | 作成日・更新日・タイトル・お気に入り優先を選べます。 |
| コピー・編集・削除 | スニペットカードのアクションを使用します。削除前には確認が出ます。 |
| 設定 | **⚙️** から JSON バックアップ・復元、サンプルプロンプト追加を行います。 |
| 表示 | テーマ切替（ライト / ダーク）と言語切替（日本語 / 英語）に対応します。 |

**動的テンプレート:** 本文中の `{{name}}` または `{{name:default}}` を変数として認識します。

```text
以下を{{language:英語}}に翻訳してください。
{{text}}
```

テンプレートカードの **「展開してコピー」** から値を入力し、置換後のテキストをプレビューしてコピーできます。変数は文字列置換であり、コードとして実行されません。

**編集時のショートカット:** エディターの本文欄で `Ctrl+Enter`（macOS は `⌘+Enter`）を押すと保存できます。

より詳しい操作方法は [ユーザーマニュアル](docs/manual.html) を参照してください。

## 現時点の制約

- タグの保存・編集では、現在の 2.0 UI はカテゴリに `general` を設定します。エディターにカテゴリ入力欄はありますが、新規保存処理ではその値を使用していません。カテゴリを含む既存 JSON は読み込み処理で扱われます。
- 同一 Chrome プロファイル内のローカル保存であり、別端末への同期機能はありません。
- サイドパネル起動やクリップボード機能は、Chrome の環境・権限・実行状況によって制限されることがあります。
- Playwright の既存テストには 2.0 UI とセレクターが合っていない箇所があります。自動テストの結果だけで UI の正常動作を保証しないでください。詳細は [テストガイド](docs/TESTING.md)。

## バックアップとデータ形式

**⚙️ → エクスポート**で JSON ファイルを保存します。**⚙️ → JSON をインポート**でスニペット配列を読み込みます。インポートは `id` をキーとして既存スニペットとマージし、不正な項目は除外して件数を表示します。重要データはインポート前にもエクスポートしてください。

保存キーは `chrome.storage.local` 内の `snippets`（配列）です。各要素のおおむねの形式は以下のとおりです。

```json
{
  "id": "id-example",
  "title": "翻訳プロンプト",
  "content": "{{text}} を英訳してください",
  "tags": [
    { "name": "work", "category": "general", "key": "work:general" }
  ],
  "favorite": false,
  "createdAt": 1730000000000,
  "updatedAt": 1730000000000
}
```

`tags[].key` はタグ正規化時に生成されます。過去のデータでは存在しない場合があるため、互換性を保って扱う必要があります。`createdAt` / `updatedAt` は Unix 時刻のミリ秒値です。設定は別キー `settings` に保存します。

マージ・正規化の詳細は [アーキテクチャ](docs/ARCHITECTURE.md) を参照してください。

## 開発とテスト

テスト用には Node.js と npm が必要です。ブラウザー自体の拡張機能実行に npm は必要ありません。

```sh
npm ci
npm test
npx playwright install chromium
npm run test:ui
npm run test:functional
```

`npm run test:all` は上記の自動テスト群をまとめて呼びます。ただし、現行の UI テストとスクリーンショット生成スクリプトには旧UIの前提が残っています。手動の Chrome 拡張機能確認を必ず併用してください。

| 役割 | 主なファイル |
| --- | --- |
| Chrome 拡張機能定義 | `manifest.json`, `background.js` |
| ポップアップ / サイドパネル | `popup.html`, `sidepanel.html`, `popup.css` |
| 画面・ストレージ操作 | `popup.js`, `i18n.js` |
| ドメインロジック | `snippet-domain.js`, `utils.js` |
| テスト | `*.test.js`, `ui-layout-check.mjs`, `ui-functional.test.mjs` |
| ガイド | `docs/manual.html`, `docs/ARCHITECTURE.md`, `docs/TESTING.md` |

## ドキュメント

- [操作マニュアル（日本語 / English）](docs/manual.html)
- [構成とデータ設計](docs/ARCHITECTURE.md)
- [検証・手動QA](docs/TESTING.md)
- [開発への参加方法](CONTRIBUTING.md)
- [AI エージェントへの指示](AGENTS.md)
- [プロダクト課題と改善候補](PRODUCT_REVIEW.md)

## Privacy / Security

Textorium does not implement account sign-in, cloud sync, analytics, or telemetry. Its current manifest requests `storage` and `sidePanel`; it has no declared content scripts or host permissions. Stored snippets are **local browser data, not encrypted vault storage**. Review extension permissions before any future expansion.

## License

[MIT License](LICENSE).
