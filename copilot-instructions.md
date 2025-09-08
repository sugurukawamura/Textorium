# Textorium – Copilot Instructions (Repository-wide)

## プロジェクト概要
- これは **Chrome 拡張 (Manifest V3)** のローカルスニペット管理ツールです。
- 主要ファイル: `manifest.json`, `popup.html`, `popup.js`, `background.js`
- 依存なし（バンドラ無しのプレーン JS/HTML/CSS）。データは **chrome.storage.local** に保存。

## データモデル（厳守）
- 保存キー: `"snippets"`
- スニペット構造:
  ```jsonc
  {
    "id": "id-xxxxx",          // string, 一意
    "title": "string",          // 必須
    "content": "string",        // 必須
    "tags": [{ "name": "string", "category": "string" }], // 0..n
    "favorite": false,          // boolean
    "createdAt": 1730000000000, // number (ms)
    "updatedAt": 1730000000000  // number (ms)
  }
