# Textorium 2.0 — テストとリリース確認

## テスト環境

- Node.js と npm（`package.json` のテストスクリプトを実行できる環境）
- Chromium を利用できる Playwright（ブラウザーテスト用）
- 手動確認には Chrome（Manifest V3 と Side Panel API に対応した環境）

```sh
npm ci
npm test
npx playwright install chromium
npm run test:ui
npm run test:functional
```

| コマンド | 対象 | 留意点 |
| --- | --- | --- |
| `npm test` | `utils.test.js` / `snippet-domain.test.js` | DOM や Chrome を使わない単体テスト |
| `npm run test:ui` | `ui-layout-check.mjs` | ポップアップの幅・オーバーフロー等を Playwright で確認。画像は `artifacts/ui-layout/` |
| `npm run test:functional` | `ui-functional.test.mjs` | Chrome API をモックしたポップアップ操作。画像は `artifacts/ui-functional/` |
| `npm run test:all` | 上記 3 種類 | 途中で失敗すると後続のコマンドは実行されません |
| `node scripts/generate-manual-screenshots.mjs` | マニュアル用画像生成 | **旧UI前提の操作が残るため、2.0では要修正** |

> **重要:** 既存の Playwright スクリプトは旧 UI 向けに作られた部分があります。自動化テストが未実行・失敗した場合でも、原因を検証せず「合格」と報告しないでください。Playwright の `file://` 読み込みとモック版 Chrome API は、実際の拡張機能の起動・サイドパネル表示の完全な代替にはなりません。

## 手動確認（Chrome に Load unpacked）

変更した画面について、ポップアップとサイドパネルの両方で確認します。サイドパネルを開くにはポップアップの **「◨ サイド」** を使います。

- [ ] 拡張機能が `chrome://extensions` からエラーなく読み込める
- [ ] ポップアップとサイドパネルを開ける
- [ ] 本文だけで新規保存でき、タイトルが生成される
- [ ] タイトル指定、タグ、本文の `#hashtag` を確認する
- [ ] 通常のスニペットをコピーできる
- [ ] `{{name}}` / `{{name:default}}` のテンプレートを展開、プレビュー、コピーできる
- [ ] 検索、3 種のタブ、タグチップ、ソートが利用できる
- [ ] 編集、削除（確認あり）、お気に入り切替ができる
- [ ] ライト / ダーク、JP / EN の切替ができる
- [ ] エクスポートした JSON を読み込み、件数表示とデータ保持を確認できる
- [ ] 拡張機能を再読み込みしても保存データが残る
- [ ] キーボード操作、フォーカス、狭い画面での表示崩れを確認できる

**インポート注意:** クリアや上書きを伴う検証を始める前に JSON をバックアップします。手動確認は捨ててもよいテストデータで実施してください。

## ドキュメントとコードの整合性チェック

1. 変更した機能が `README.md` と `docs/manual.html` の説明に一致するか。
2. `manifest.json` の権限、エントリーポイントと `docs/ARCHITECTURE.md` に矛盾がないか。
3. コードの関数名・コマンドが実在するか。
4. UI のスクリーンショットを追加する場合、実際の **現行 2.0 画面**から作成されたものか。
5. 試験結果は実施した範囲だけを PR に記載し、未実施の項目は未実施とする。

## 現時点で把握しているテスト上の課題

- `ui-functional.test.mjs` は旧 UI の要素順や選択子に依存しており、2.0 の操作手順とずれる可能性があります。
- `scripts/generate-manual-screenshots.mjs` は旧版の「最後の details がバックアップ欄」という前提で書かれています。2.0 のバックアップは設定モーダル内です。
- `docs/images/` に残る SVG は旧マニュアルのプレースホルダーです。2.0 の実スクリーンショットと誤認しないでください。
- マニフェストではバージョン `2.0.0`、npm のメタデータでは `1.0.0` と表記されます。拡張機能の配布バージョンを確認するときは `manifest.json` を優先します。

問題を修正するときは、まずテストの期待 UI と現在の実装を比較し、必要に応じて UI テストの選択子・モック・画像生成スクリプトを更新してください。
