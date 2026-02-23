// popup.js

/**
 * Popup UI controller for Textorium.
 * Keeps chrome/storage/DOM concerns here and delegates pure logic to snippet-domain.js.
 */

const titleInput = document.getElementById("title");
const tagNameInput = document.getElementById("tagName");
const tagCategoryInput = document.getElementById("tagCategory");
const contentInput = document.getElementById("content");
const languageSelect = document.getElementById("languageSelect");

const saveSnippetBtn = document.getElementById("saveSnippetBtn");
const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");
const clearSearchBtn = document.getElementById("clearSearchBtn");
const filterFavoritesBtn = document.getElementById("filterFavoritesBtn");
const clearFilterBtn = document.getElementById("clearFilterBtn");
const filterTagsSelect = document.getElementById("filterTags");
const sortBySelect = document.getElementById("sortBy");
const sortDirectionBtn = document.getElementById("sortDirection");
const applySortBtn = document.getElementById("applySortBtn");
const exportBtn = document.getElementById("exportBtn");
const importInput = document.getElementById("importInput");
const statusMessage = document.getElementById("statusMessage");

const snippetList = document.getElementById("snippetList");
const themeToggleBtn = document.getElementById("themeToggleBtn");
const snippetDomain = window.SnippetDomain;

const SETTINGS_KEY = "settings";
const STATUS_DISPLAY_MS = 2500;


// Global UI state
let currentSortBy = "createdAt";
let isDescending = true;
let currentSearchTerm = "";
let isFavoritesOnly = false;
let openEditContainer = null;
let currentLanguage = detectDefaultLanguage();
let settingsState = {};

function detectDefaultLanguage() {
  const locale = (navigator.language || "en").toLowerCase();
  return locale.startsWith("ja") ? "ja" : "en";
}

function getLanguageTable() {
  return I18N[currentLanguage] || I18N.en;
}

function t(key, values = {}) {
  const table = getLanguageTable();
  const value = key.split(".").reduce((acc, part) => (acc ? acc[part] : undefined), table);
  const template = typeof value === "string" ? value : key;
  return template.replace(/\{(\w+)\}/g, (_, token) => String(values[token] ?? ""));
}

function applyStaticLocalization() {
  document.documentElement.lang = currentLanguage;

  document.querySelectorAll("[data-i18n-text]").forEach((element) => {
    const key = element.getAttribute("data-i18n-text");
    element.textContent = t(key);
  });

  document.querySelectorAll("[data-i18n-placeholder]").forEach((element) => {
    const key = element.getAttribute("data-i18n-placeholder");
    element.placeholder = t(key);
  });

  document.querySelectorAll("[data-aria-key]").forEach((element) => {
    const key = element.getAttribute("data-aria-key");
    element.setAttribute("aria-label", t(key));
  });

  if (filterTagsSelect.options.length > 0) {
    filterTagsSelect.options[0].textContent = t("filter.allTags");
  }
  updateSortDirectionLabel();
  updateFavoritesFilterLabel();
  updateThemeToggleLabel();
}

function updateSortDirectionLabel() {
  sortDirectionBtn.textContent = isDescending ? t("sort.dirDesc") : t("sort.dirAsc");
}

function updateFavoritesFilterLabel() {
  filterFavoritesBtn.textContent = isFavoritesOnly ? t("action.favoritesOnlyOn") : t("action.favoritesOnlyOff");
  filterFavoritesBtn.setAttribute("aria-pressed", isFavoritesOnly ? "true" : "false");
}

function updateThemeToggleLabel() {
  const isDark = document.body.classList.contains("dark-mode");
  themeToggleBtn.textContent = isDark ? "☀️" : "🌙";
}

function showStatus(message, type = "info") {
  if (!statusMessage) return;
  statusMessage.textContent = message;
  statusMessage.classList.remove("hidden", "info", "error");
  statusMessage.classList.add(type);
  window.clearTimeout(showStatus._timer);
  showStatus._timer = window.setTimeout(() => {
    statusMessage.classList.add("hidden");
  }, STATUS_DISPLAY_MS);
}

function showStatusKey(key, values = {}, type = "info") {
  if (typeof values === "string") {
    type = values;
    values = {};
  }
  showStatus(t(key, values), type);
}

async function loadSettings() {
  return new Promise((resolve) => {
    chrome.storage.local.get([SETTINGS_KEY], (result) => {
      if (chrome.runtime.lastError) {
        showStatusKey("error.loadSettings", "error");
        resolve({});
        return;
      }
      resolve(result[SETTINGS_KEY] || {});
    });
  });
}

async function saveSettings() {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [SETTINGS_KEY]: settingsState }, () => {
      if (chrome.runtime.lastError) {
        showStatusKey("error.saveSettings", "error");
        resolve(false);
        return;
      }
      resolve(true);
    });
  });
}

async function setSetting(key, value) {
  settingsState[key] = value;
  await saveSettings();
}

async function applyInitialSettings() {
  settingsState = await loadSettings();

  if (settingsState.theme === "dark") {
    document.body.classList.add("dark-mode");
  }

  const savedLanguage = settingsState.language;
  if (savedLanguage === "ja" || savedLanguage === "en") {
    currentLanguage = savedLanguage;
  }
  languageSelect.value = currentLanguage;
  applyStaticLocalization();
}

// Save new snippet
saveSnippetBtn.addEventListener("click", async () => {
  const title = titleInput.value.trim();
  const content = contentInput.value.trim();
  const tagName = tagNameInput.value.trim();
  const tagCategory = tagCategoryInput.value.trim();

  if (!title || !content) {
    showStatusKey("error.requiredTitleContent", "error");
    return;
  }

  const tagsArray = [];
  if (tagName) {
    tagsArray.push({ name: tagName, category: tagCategory || "general" });
  }

  const newSnippet = {
    id: generateId(),
    title,
    tags: tagsArray,
    content,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    favorite: false
  };

  const storedSnippets = await getStoredSnippets();
  if (!storedSnippets) return;

  storedSnippets.push(newSnippet);
  const saved = await setStoredSnippets(storedSnippets);
  if (!saved) return;

  titleInput.value = "";
  tagNameInput.value = "";
  tagCategoryInput.value = "";
  contentInput.value = "";

  await refreshCurrentView();
  showStatusKey("status.saved");
});

contentInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
    event.preventDefault();
    saveSnippetBtn.click();
  }
});

for (const input of [titleInput, tagNameInput, tagCategoryInput]) {
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      saveSnippetBtn.click();
    }
  });
}

searchBtn.addEventListener("click", async () => {
  currentSearchTerm = searchInput.value.trim().toLowerCase();
  await refreshCurrentView();
});

searchInput.addEventListener("input", async () => {
  currentSearchTerm = searchInput.value.trim().toLowerCase();
  await refreshCurrentView();
});

searchInput.addEventListener("keydown", async (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    currentSearchTerm = searchInput.value.trim().toLowerCase();
    await refreshCurrentView();
  }
});

clearSearchBtn.addEventListener("click", async () => {
  searchInput.value = "";
  currentSearchTerm = "";
  await refreshCurrentView();
});

filterFavoritesBtn.addEventListener("click", async () => {
  isFavoritesOnly = !isFavoritesOnly;
  updateFavoritesFilterLabel();
  await refreshCurrentView();
});

filterTagsSelect.addEventListener("change", async () => {
  await refreshCurrentView();
});

clearFilterBtn.addEventListener("click", async () => {
  isFavoritesOnly = false;
  filterTagsSelect.value = "";
  updateFavoritesFilterLabel();
  await refreshCurrentView();
});

sortDirectionBtn.addEventListener("click", async () => {
  isDescending = !isDescending;
  updateSortDirectionLabel();
  await refreshCurrentView();
});

sortBySelect.addEventListener("change", async () => {
  currentSortBy = sortBySelect.value;
  await refreshCurrentView();
});

applySortBtn.addEventListener("click", async () => {
  currentSortBy = sortBySelect.value;
  await refreshCurrentView();
});

exportBtn.addEventListener("click", async () => {
  const snippets = await getStoredSnippets();
  if (!snippets) return;

  const dataStr = JSON.stringify(snippets, null, 2);
  const blob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const now = new Date();
  const ts = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(now.getSeconds()).padStart(2, "0")}`;
  a.download = `snippets_${ts}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showStatusKey("status.exported");
});

importInput.addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const parsed = JSON.parse(e.target.result);
      if (!Array.isArray(parsed)) throw new Error("Invalid JSON structure");

      const existing = await getStoredSnippets();
      if (!existing) return;
      const result = snippetDomain.mergeImportedSnippets(existing, parsed, Date.now(), mergeSnippets);
      const saved = await setStoredSnippets(result.snippets);
      if (!saved) return;

      await refreshCurrentView();
      showStatusKey("status.importFinished", {
        added: result.added,
        updated: result.updated,
        invalid: result.invalid
      });
    } catch (error) {
      showStatusKey("error.importInvalid", "error");
    }
  };

  reader.onerror = () => {
    showStatusKey("error.importRead", "error");
  };

  reader.readAsText(file);
  importInput.value = "";
});

themeToggleBtn.addEventListener("click", async () => {
  document.body.classList.toggle("dark-mode");
  updateThemeToggleLabel();
  const theme = document.body.classList.contains("dark-mode") ? "dark" : "light";
  await setSetting("theme", theme);
});

languageSelect.addEventListener("change", async () => {
  currentLanguage = languageSelect.value === "en" ? "en" : "ja";
  await setSetting("language", currentLanguage);
  applyStaticLocalization();
  await refreshCurrentView();
});

function sortSnippets(snippets) {
  return snippetDomain.sortSnippets(snippets, currentSortBy, isDescending);
}

function displaySnippetsWithSort(snippets) {
  displaySnippets(sortSnippets(snippets));
}

function updateTagFilterOptions(snippets) {
  const currentSelection = filterTagsSelect.value;
  const options = snippetDomain.buildTagFilterOptions(snippets);

  while (filterTagsSelect.options.length > 1) {
    filterTagsSelect.remove(1);
  }

  options.forEach(({ value, label }) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    filterTagsSelect.appendChild(option);
  });

  if (options.some((option) => option.value === currentSelection)) {
    filterTagsSelect.value = currentSelection;
  } else {
    filterTagsSelect.value = "";
  }

  if (filterTagsSelect.options.length > 0) {
    filterTagsSelect.options[0].textContent = t("filter.allTags");
  }
}

async function refreshCurrentView() {
  const storedSnippets = await getStoredSnippets();
  if (!storedSnippets) return;

  updateTagFilterOptions(storedSnippets);

  const filteredSnippets = snippetDomain.filterSnippets(storedSnippets, {
    searchTerm: currentSearchTerm,
    favoritesOnly: isFavoritesOnly,
    selectedTag: filterTagsSelect.value
  });

  displaySnippetsWithSort(filteredSnippets);
}

async function getStoredSnippets() {
  return new Promise((resolve) => {
    chrome.storage.local.get(["snippets"], (result) => {
      if (chrome.runtime.lastError) {
        showStatusKey("error.loadSnippets", "error");
        resolve(null);
        return;
      }
      resolve(result.snippets || []);
    });
  });
}

async function setStoredSnippets(snippets) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ snippets }, () => {
      if (chrome.runtime.lastError) {
        showStatusKey("error.saveSnippets", "error");
        resolve(false);
        return;
      }
      resolve(true);
    });
  });
}

async function updateSnippetInStorage(updatedSnippet) {
  const storedSnippets = await getStoredSnippets();
  if (!storedSnippets) return false;

  const index = storedSnippets.findIndex((snippet) => snippet.id === updatedSnippet.id);
  if (index === -1) {
    showStatusKey("error.snippetNotFound", "error");
    return false;
  }

  storedSnippets[index] = updatedSnippet;
  return setStoredSnippets(storedSnippets);
}

async function deleteSnippetFromStorage(snippetId) {
  const storedSnippets = await getStoredSnippets();
  if (!storedSnippets) return false;
  const updatedSnippets = storedSnippets.filter((snippet) => snippet.id !== snippetId);
  return setStoredSnippets(updatedSnippets);
}

function renderSnippetItem(snippet) {
  const container = document.createElement("div");
  container.className = "snippet-item";

  const head = document.createElement("div");
  head.className = "snippet-head";

  const titleEl = document.createElement("h3");
  titleEl.textContent = typeof snippet.title === "string" ? snippet.title : "";
  head.appendChild(titleEl);
  head.appendChild(createSnippetFavoriteBtn(snippet));
  container.appendChild(head);

  container.appendChild(createSnippetTags(snippet));
  container.appendChild(createSnippetContent(snippet));

  const editContainer = createEditForm(snippet);
  container.appendChild(createSnippetActions(snippet, editContainer));
  container.appendChild(editContainer);

  return container;
}

function createSnippetFavoriteBtn(snippet) {
  const favoriteBtn = document.createElement("button");
  favoriteBtn.textContent = snippet.favorite ? "★" : "☆";
  favoriteBtn.style.width = "auto";
  favoriteBtn.style.minWidth = "42px";
  favoriteBtn.setAttribute("aria-label", t("aria.toggleFavorite"));
  favoriteBtn.addEventListener("click", async () => {
    const updatedSnippet = {
      ...snippet,
      favorite: !snippet.favorite,
      updatedAt: Date.now()
    };
    const saved = await updateSnippetInStorage(updatedSnippet);
    if (!saved) return;
    showStatusKey(updatedSnippet.favorite ? "status.favoriteAdded" : "status.favoriteRemoved");
    await refreshCurrentView();
  });
  return favoriteBtn;
}

function createSnippetTags(snippet) {
  const tagContainer = document.createElement("div");
  const tags = snippetDomain.getSnippetTags(snippet);
  tags.forEach((tag) => {
    const tagEl = document.createElement("span");
    tagEl.className = "tag";
    tagEl.textContent = `${tag.name} (${tag.category || "general"})`;
    tagContainer.appendChild(tagEl);
  });
  return tagContainer;
}

function createSnippetContent(snippet) {
  const container = document.createElement("div");
  const contentText = typeof snippet.content === "string" ? snippet.content : "";

  const contentEl = document.createElement("p");
  contentEl.className = "snippet-content";
  contentEl.textContent = contentText;
  container.appendChild(contentEl);

  const lines = (contentText.match(/\n/g) || []).length;
  const isLong = contentText.length > 200 || lines > 3;
  if (!isLong) return container;

  contentEl.classList.add("collapsed");
  const toggleBtn = document.createElement("button");
  toggleBtn.className = "read-more-btn";
  toggleBtn.textContent = t("action.readMore");
  toggleBtn.addEventListener("click", () => {
    contentEl.classList.toggle("collapsed");
    toggleBtn.textContent = contentEl.classList.contains("collapsed") ? t("action.readMore") : t("action.showLess");
  });
  container.appendChild(toggleBtn);
  return container;
}

function createSnippetActions(snippet, editContainer) {
  const actions = document.createElement("div");
  actions.className = "snippet-actions";

  const copyBtn = document.createElement("button");
  copyBtn.textContent = t("action.copy");
  copyBtn.setAttribute("aria-label", t("aria.copySnippet"));
  copyBtn.addEventListener("click", async () => {
    try {
      const contentText = typeof snippet.content === "string" ? snippet.content : String(snippet.content ?? "");
      await navigator.clipboard.writeText(contentText);
      showStatusKey("status.copied");
    } catch (error) {
      showStatusKey("error.copyFailed", "error");
    }
  });

  const editBtn = document.createElement("button");
  editBtn.textContent = t("action.edit");
  editBtn.setAttribute("aria-label", t("aria.editSnippet"));
  editBtn.addEventListener("click", () => {
    if (openEditContainer && openEditContainer !== editContainer) {
      openEditContainer.classList.add("hidden");
    }
    editContainer.classList.toggle("hidden");
    openEditContainer = editContainer.classList.contains("hidden") ? null : editContainer;
  });

  const deleteBtn = document.createElement("button");
  deleteBtn.textContent = t("action.delete");
  deleteBtn.setAttribute("aria-label", t("aria.deleteSnippet"));
  deleteBtn.addEventListener("click", async () => {
    if (!confirm(t("confirm.delete"))) return;
    const deleted = await deleteSnippetFromStorage(snippet.id);
    if (!deleted) return;
    showStatusKey("status.deleted");
    await refreshCurrentView();
  });

  actions.appendChild(copyBtn);
  actions.appendChild(editBtn);
  actions.appendChild(deleteBtn);
  return actions;
}

function createEditForm(snippet) {
  const editContainer = document.createElement("div");
  editContainer.className = "hidden";

  const editTitleInput = document.createElement("input");
  editTitleInput.type = "text";
  editTitleInput.value = typeof snippet.title === "string" ? snippet.title : "";
  editTitleInput.placeholder = t("placeholder.title");
  editTitleInput.setAttribute("aria-label", t("aria.editTitle"));

  const editTagNameInput = document.createElement("input");
  editTagNameInput.placeholder = t("placeholder.tagName");
  editTagNameInput.setAttribute("aria-label", t("aria.editTagName"));

  const editTagCategoryInput = document.createElement("input");
  editTagCategoryInput.placeholder = t("placeholder.tagCategory");
  editTagCategoryInput.setAttribute("aria-label", t("aria.editTagCategory"));

  const snippetTags = snippetDomain.getSnippetTags(snippet);
  if (snippetTags.length > 0) {
    editTagNameInput.value = snippetTags[0].name || "";
    editTagCategoryInput.value = snippetTags[0].category || "";
  }

  const editContentTextarea = document.createElement("textarea");
  editContentTextarea.value = typeof snippet.content === "string" ? snippet.content : "";
  editContentTextarea.placeholder = t("placeholder.content");
  editContentTextarea.setAttribute("aria-label", t("aria.editContent"));

  const saveChangesBtn = document.createElement("button");
  saveChangesBtn.textContent = t("action.saveChanges");
  saveChangesBtn.setAttribute("aria-label", t("aria.saveChanges"));
  saveChangesBtn.addEventListener("click", async () => {
    const nextTitle = editTitleInput.value.trim();
    const nextContent = editContentTextarea.value.trim();
    if (!nextTitle || !nextContent) {
      showStatusKey("error.requiredTitleContent", "error");
      return;
    }

    const nextTagName = editTagNameInput.value.trim();
    const nextTagCategory = editTagCategoryInput.value.trim();
    const otherTags = snippetDomain.getSnippetTags(snippet).slice(1);
    const firstTag = nextTagName ? [{ name: nextTagName, category: nextTagCategory || "general" }] : [];
    const nextTags = [...firstTag, ...otherTags];

    const updatedSnippet = {
      ...snippet,
      title: nextTitle,
      content: nextContent,
      tags: nextTags,
      updatedAt: Date.now()
    };

    const saved = await updateSnippetInStorage(updatedSnippet);
    if (!saved) return;
    showStatusKey("status.updated");
    editContainer.classList.add("hidden");
    if (openEditContainer === editContainer) {
      openEditContainer = null;
    }
    await refreshCurrentView();
  });

  const cancelChangesBtn = document.createElement("button");
  cancelChangesBtn.textContent = t("action.cancel");
  cancelChangesBtn.setAttribute("aria-label", t("aria.cancelEditing"));
  cancelChangesBtn.addEventListener("click", () => {
    editContainer.classList.add("hidden");
    if (openEditContainer === editContainer) {
      openEditContainer = null;
    }
  });

  const handleEditKeydown = (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      cancelChangesBtn.click();
      return;
    }
    if (event.key === "Enter" && event.target !== editContentTextarea) {
      event.preventDefault();
      saveChangesBtn.click();
      return;
    }
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey) && event.target === editContentTextarea) {
      event.preventDefault();
      saveChangesBtn.click();
    }
  };

  editTitleInput.addEventListener("keydown", handleEditKeydown);
  editTagNameInput.addEventListener("keydown", handleEditKeydown);
  editTagCategoryInput.addEventListener("keydown", handleEditKeydown);
  editContentTextarea.addEventListener("keydown", handleEditKeydown);

  const editActions = document.createElement("div");
  editActions.className = "edit-actions";
  editActions.appendChild(saveChangesBtn);
  editActions.appendChild(cancelChangesBtn);

  editContainer.appendChild(editTitleInput);
  editContainer.appendChild(editTagNameInput);
  editContainer.appendChild(editTagCategoryInput);
  editContainer.appendChild(editContentTextarea);
  editContainer.appendChild(editActions);

  return editContainer;
}

function displaySnippets(snippets) {
  snippetList.textContent = "";

  if (!snippets || snippets.length === 0) {
    const emptyMessage = document.createElement("p");
    emptyMessage.textContent = t("empty.noSnippets");
    snippetList.appendChild(emptyMessage);
    return;
  }

  const fragment = document.createDocumentFragment();
  snippets.forEach((snippet) => fragment.appendChild(renderSnippetItem(snippet)));
  snippetList.appendChild(fragment);
}

async function init() {
  if (!snippetDomain) {
    showStatusKey("error.loadDomain", "error");
    return;
  }
  await applyInitialSettings();
  await refreshCurrentView();
}

init();
