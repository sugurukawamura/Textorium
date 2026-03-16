/**
 * Internationalization (i18n) data for Textorium.
 */

const I18N = {
  ja: {
    header: {
      localOnly: "LOCAL ONLY"
    },
    section: {
      add: "新規スニペット",
      search: "検索とフィルタ",
      sort: "並び替え",
      list: "スニペット一覧",
      transfer: "バックアップ/復元"
    },
    field: {
      title: "タイトル",
      tagName: "タグ名",
      tagCategory: "カテゴリ",
      content: "本文",
      import: "JSONをインポート"
    },
    placeholder: {
      title: "タイトルを入力",
      tagName: "例: meeting",
      tagCategory: "例: work",
      content: "本文を入力",
      search: "タイトル・本文・タグで検索"
    },
    action: {
      saveSnippet: "保存",
      search: "検索",
      clearSearch: "検索クリア",
      clearFilter: "フィルタをリセット",
      applySort: "適用",
      export: "エクスポート",
      favoritesOnlyOff: "お気に入り: OFF",
      favoritesOnlyOn: "お気に入り: ON",
      copy: "コピー",
      edit: "編集",
      delete: "削除",
      saveChanges: "変更を保存",
      cancel: "キャンセル",
      readMore: "続きを読む",
      showLess: "折りたたむ"
    },
    filter: {
      allTags: "すべてのタグ"
    },
    sort: {
      createdAt: "作成日",
      updatedAt: "更新日",
      title: "タイトル",
      favorite: "お気に入り優先",
      dirDesc: "↓ 新しい順",
      dirAsc: "↑ 古い順"
    },
    status: {
      saved: "保存しました。",
      updated: "更新しました。",
      deleted: "削除しました。",
      copied: "クリップボードにコピーしました。",
      exported: "エクスポートしました。",
      importFinished: "インポート完了: 追加 {added} / 更新 {updated} / 無効 {invalid}",
      favoriteAdded: "お気に入りに追加しました。",
      favoriteRemoved: "お気に入りを解除しました。"
    },
    empty: {
      noSnippets: "スニペットがありません。"
    },
    confirm: {
      delete: "このスニペットを削除しますか？"
    },
    error: {
      requiredTitleContent: "タイトルと本文は必須です。",
      loadSnippets: "スニペットの読み込みに失敗しました。",
      saveSnippets: "スニペットの保存に失敗しました。",
      snippetNotFound: "スニペットが見つかりません。",
      importInvalid: "インポートに失敗しました。JSON形式を確認してください。",
      importRead: "インポートファイルの読み込みに失敗しました。",
      copyFailed: "コピーに失敗しました。",
      loadSettings: "設定の読み込みに失敗しました。",
      saveSettings: "設定の保存に失敗しました。",
      loadDomain: "ドメインロジックの読み込みに失敗しました。"
    },
    aria: {
      language: "言語",
      themeToggle: "テーマ切替",
      title: "タイトル",
      tagName: "タグ名",
      tagCategory: "タグカテゴリ",
      content: "本文",
      saveSnippet: "保存",
      search: "検索",
      searchButton: "検索実行",
      clearSearch: "検索クリア",
      filterTag: "タグで絞り込み",
      favoritesOnly: "お気に入りのみ切替",
      clearFilter: "フィルタをリセット",
      sortBy: "並び替え条件",
      sortDirection: "並び替え順",
      applySort: "並び替え適用",
      export: "エクスポート",
      import: "インポート",
      toggleFavorite: "お気に入り切替",
      copySnippet: "スニペットをコピー",
      editSnippet: "スニペットを編集",
      deleteSnippet: "スニペットを削除",
      editTitle: "タイトルを編集",
      editTagName: "タグ名を編集",
      editTagCategory: "タグカテゴリを編集",
      editContent: "本文を編集",
      saveChanges: "変更を保存",
      cancelEditing: "編集をキャンセル"
    }
  },
  en: {
    header: {
      localOnly: "LOCAL ONLY"
    },
    section: {
      add: "New Snippet",
      search: "Search & Filter",
      sort: "Sort",
      list: "Snippets",
      transfer: "Backup / Restore"
    },
    field: {
      title: "Title",
      tagName: "Tag Name",
      tagCategory: "Category",
      content: "Content",
      import: "Import JSON"
    },
    placeholder: {
      title: "Enter title",
      tagName: "e.g., meeting",
      tagCategory: "e.g., work",
      content: "Enter content",
      search: "Search title, content, or tags"
    },
    action: {
      saveSnippet: "Save",
      search: "Search",
      clearSearch: "Clear Search",
      clearFilter: "Reset Filters",
      applySort: "Apply",
      export: "Export",
      favoritesOnlyOff: "Favorites: OFF",
      favoritesOnlyOn: "Favorites: ON",
      copy: "Copy",
      edit: "Edit",
      delete: "Delete",
      saveChanges: "Save Changes",
      cancel: "Cancel",
      readMore: "Read More",
      showLess: "Show Less"
    },
    filter: {
      allTags: "All Tags"
    },
    sort: {
      createdAt: "Created",
      updatedAt: "Updated",
      title: "Title",
      favorite: "Favorites First",
      dirDesc: "↓ Desc",
      dirAsc: "↑ Asc"
    },
    status: {
      saved: "Snippet saved.",
      updated: "Snippet updated.",
      deleted: "Snippet deleted.",
      copied: "Copied to clipboard.",
      exported: "Snippets exported.",
      importFinished: "Import finished: Added {added} / Updated {updated} / Invalid {invalid}",
      favoriteAdded: "Added to favorites.",
      favoriteRemoved: "Removed from favorites."
    },
    empty: {
      noSnippets: "No snippets found."
    },
    confirm: {
      delete: "Delete this snippet?"
    },
    error: {
      requiredTitleContent: "Title and content are required.",
      loadSnippets: "Failed to load snippets.",
      saveSnippets: "Failed to save snippets.",
      snippetNotFound: "Snippet not found.",
      importInvalid: "Failed to import snippets. Check JSON format.",
      importRead: "Failed to read import file.",
      copyFailed: "Failed to copy to clipboard.",
      loadSettings: "Failed to load settings.",
      saveSettings: "Failed to save settings.",
      loadDomain: "Failed to load snippet domain logic."
    },
    aria: {
      language: "Language",
      themeToggle: "Toggle theme",
      title: "Title",
      tagName: "Tag name",
      tagCategory: "Tag category",
      content: "Content",
      saveSnippet: "Save snippet",
      search: "Search",
      searchButton: "Run search",
      clearSearch: "Clear search",
      filterTag: "Filter by tag",
      favoritesOnly: "Toggle favorites only",
      clearFilter: "Reset filters",
      sortBy: "Sort by",
      sortDirection: "Sort direction",
      applySort: "Apply sort",
      export: "Export snippets",
      import: "Import snippets",
      toggleFavorite: "Toggle favorite",
      copySnippet: "Copy snippet",
      editSnippet: "Edit snippet",
      deleteSnippet: "Delete snippet",
      editTitle: "Edit title",
      editTagName: "Edit tag name",
      editTagCategory: "Edit tag category",
      editContent: "Edit content",
      saveChanges: "Save changes",
      cancelEditing: "Cancel editing"
    }
  }
};

if (typeof window !== "undefined") {
  window.I18N = I18N;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { I18N };
}
