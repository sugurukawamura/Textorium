// popup.js

/**
 * Handles UI interactions, snippet storage, search/filter, export/import,
 * and favorites functionality for Textorium.
 */

const titleInput = document.getElementById("title");
const tagNameInput = document.getElementById("tagName");
const tagCategoryInput = document.getElementById("tagCategory");
const contentInput = document.getElementById("content");

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

// Theme logic
chrome.storage.local.get(["settings"], (result) => {
  if (chrome.runtime.lastError) {
    showError("Failed to load settings.");
    return;
  }
  const settings = result.settings || {};
  if (settings.theme === "dark") {
    document.body.classList.add("dark-mode");
    themeToggleBtn.textContent = "☀️";
  }
});

themeToggleBtn.addEventListener("click", () => {
  document.body.classList.toggle("dark-mode");
  const isDark = document.body.classList.contains("dark-mode");
  themeToggleBtn.textContent = isDark ? "☀️" : "🌙";

  chrome.storage.local.get(["settings"], (result) => {
    if (chrome.runtime.lastError) {
      showError("Failed to load settings.");
      return;
    }
    const settings = result.settings || {};
    settings.theme = isDark ? "dark" : "light";
    chrome.storage.local.set({ settings }, () => {
      if (chrome.runtime.lastError) {
        showError("Failed to save settings.");
      }
    });
  });
});

// Global sort state
let currentSortBy = "createdAt";
let isDescending = true;
let currentSearchTerm = "";
let isFavoritesOnly = false;
let openEditContainer = null;

const STATUS_DISPLAY_MS = 2500;

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

function showError(message) {
  showStatus(message, "error");
}

// Save new snippet
saveSnippetBtn.addEventListener("click", async () => {
  const title = titleInput.value.trim();
  const content = contentInput.value.trim();
  const tagName = tagNameInput.value.trim();
  const tagCategory = tagCategoryInput.value.trim();

  if (!title || !content) {
    showError("Title and content are required.");
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

  // Clear input fields
  titleInput.value = "";
  tagNameInput.value = "";
  tagCategoryInput.value = "";
  contentInput.value = "";

  await refreshCurrentView();
  showStatus("Snippet saved.");
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

// Search functionality (on button click)
searchBtn.addEventListener("click", async () => {
  currentSearchTerm = searchInput.value.trim().toLowerCase();
  await refreshCurrentView();
});

// Real-time search on input
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

// Clear search input and show all
clearSearchBtn.addEventListener("click", async () => {
  searchInput.value = "";
  currentSearchTerm = "";
  await refreshCurrentView();
});

// Filter favorites only
filterFavoritesBtn.addEventListener("click", async () => {
  isFavoritesOnly = true;
  await refreshCurrentView();
});

// Filter by tag
filterTagsSelect.addEventListener("change", async () => {
  await refreshCurrentView();
});

// Clear favorite filter
clearFilterBtn.addEventListener("click", async () => {
  isFavoritesOnly = false;
  filterTagsSelect.value = "";
  await refreshCurrentView();
});

// Sort direction toggle
sortDirectionBtn.addEventListener("click", () => {
  isDescending = !isDescending;
  sortDirectionBtn.textContent = isDescending ? "↓ Desc" : "↑ Asc";
});

// Apply sort
applySortBtn.addEventListener("click", async () => {
  currentSortBy = sortBySelect.value;
  await refreshCurrentView();
});

// Export snippets as JSON
exportBtn.addEventListener("click", async () => {
  const snippets = await getStoredSnippets();
  if (!snippets) return;
  const dataStr = JSON.stringify(snippets, null, 2);
  const blob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const now = new Date();
  const ts = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
  a.download = `snippets_${ts}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showStatus("Snippets exported.");
});

// Import snippets from JSON file (validated + de-dupe + merge policy)
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
      const byId = new Map(existing.map(s => [s.id, s]));

      let added = 0, updated = 0, invalid = 0;

      const now = Date.now();
      for (const s of parsed) {
        if (!snippetDomain.isValidImportedSnippet(s)) { invalid++; continue; }
        const normalized = snippetDomain.normalizeImportedSnippet(s, now);
        const cur = byId.get(s.id);
        if (!cur) {
          byId.set(s.id, normalized);
          added++;
        } else {
          const merged = mergeSnippets(cur, normalized, now);
          if (JSON.stringify(cur) !== JSON.stringify(merged)) updated++;
          byId.set(s.id, merged);
        }
      }

      const mergedAll = Array.from(byId.values());
      const saved = await setStoredSnippets(mergedAll);
      if (!saved) return;
      await refreshCurrentView();
      showStatus(`Import finished. Added: ${added}, Updated: ${updated}, Skipped invalid: ${invalid}.`);
    } catch (error) {
      showError("Failed to import snippets. Invalid file format.");
    }
  };
  reader.onerror = () => {
    showError("Failed to read import file.");
  };
  reader.readAsText(file);
  importInput.value = "";
});

/**
 * Sort snippets based on current sort criteria and direction
 */
function sortSnippets(snippets) {
  return snippetDomain.sortSnippets(snippets, currentSortBy, isDescending);
}

/**
 * Display snippets with current sort applied
 */
function displaySnippetsWithSort(snippets) {
  const sortedSnippets = sortSnippets(snippets);
  displaySnippets(sortedSnippets);
}

/**
 * Update the tag filter dropdown options based on available snippets.
 */
function updateTagFilterOptions(snippets) {
  const currentSelection = filterTagsSelect.value;
  const options = snippetDomain.buildTagFilterOptions(snippets);

  // Clear existing options except the first "All Tags"
  while (filterTagsSelect.options.length > 1) {
    filterTagsSelect.remove(1);
  }

  options.forEach(({ value, label }) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    filterTagsSelect.appendChild(option);
  });

  // Restore selection if valid
  if (options.some((option) => option.value === currentSelection)) {
    filterTagsSelect.value = currentSelection;
  } else {
    filterTagsSelect.value = "";
  }
}

/**
 * Refresh the current view with appropriate filters and sorting
 */
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

/**
 * Retrieve stored snippets from chrome.storage.local.
 */
async function getStoredSnippets() {
  return new Promise((resolve) => {
    chrome.storage.local.get(["snippets"], (result) => {
      if (chrome.runtime.lastError) {
        showError("Failed to load snippets.");
        resolve(null);
        return;
      }
      resolve(result.snippets || []);
    });
  });
}

/**
 * Save updated snippets array to chrome.storage.local.
 */
async function setStoredSnippets(snippets) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ snippets }, () => {
      if (chrome.runtime.lastError) {
        showError("Failed to save snippets.");
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
  const index = storedSnippets.findIndex((s) => s.id === updatedSnippet.id);
  if (index === -1) {
    showError("Snippet not found.");
    return false;
  }
  storedSnippets[index] = updatedSnippet;
  return setStoredSnippets(storedSnippets);
}

async function deleteSnippetFromStorage(snippetId) {
  const storedSnippets = await getStoredSnippets();
  if (!storedSnippets) return false;
  const updatedSnippets = storedSnippets.filter((s) => s.id !== snippetId);
  return setStoredSnippets(updatedSnippets);
}

function renderSnippetItem(snippet) {
  const container = document.createElement("div");
  container.className = "snippet-item";

  const favoriteBtn = createSnippetFavoriteBtn(snippet);
  container.appendChild(favoriteBtn);

  const titleEl = document.createElement("h3");
  titleEl.textContent = typeof snippet.title === "string" ? snippet.title : "";
  container.appendChild(titleEl);

  const tagContainer = createSnippetTags(snippet);
  container.appendChild(tagContainer);

  const contentEl = createSnippetContent(snippet);
  container.appendChild(contentEl);

  const editContainer = createEditForm(snippet);

  const actions = createSnippetActions(snippet, editContainer);
  container.appendChild(actions);

  container.appendChild(editContainer);

  return container;
}

function createSnippetFavoriteBtn(snippet) {
  const favoriteBtn = document.createElement("button");
  favoriteBtn.textContent = snippet.favorite ? "★" : "☆";
  favoriteBtn.style.marginRight = "8px";
  favoriteBtn.setAttribute("aria-label", "Toggle favorite");
  favoriteBtn.addEventListener("click", async () => {
    const updatedSnippet = {
      ...snippet,
      favorite: !snippet.favorite,
      updatedAt: Date.now()
    };
    const saved = await updateSnippetInStorage(updatedSnippet);
    if (!saved) return;
    showStatus(updatedSnippet.favorite ? "Added to favorites." : "Removed from favorites.");
    refreshCurrentView();
  });
  return favoriteBtn;
}

function createSnippetTags(snippet) {
  const tagContainer = document.createElement("div");
  const tags = snippetDomain.getSnippetTags(snippet);
  if (tags.length > 0) {
    tags.forEach((t) => {
      const tagEl = document.createElement("span");
      tagEl.className = "tag";
      tagEl.textContent = `${t.name} (${t.category || "general"})`;
      tagContainer.appendChild(tagEl);
    });
  }
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

  if (isLong) {
    contentEl.classList.add("collapsed");

    const toggleBtn = document.createElement("button");
    toggleBtn.className = "read-more-btn";
    toggleBtn.textContent = "Read More";
    toggleBtn.addEventListener("click", () => {
      contentEl.classList.toggle("collapsed");
      toggleBtn.textContent = contentEl.classList.contains("collapsed") ? "Read More" : "Show Less";
    });
    container.appendChild(toggleBtn);
  }

  return container;
}

function createSnippetActions(snippet, editContainer) {
  const actions = document.createElement("div");
  actions.className = "snippet-actions";

  // Copy button
  const copyBtn = document.createElement("button");
  copyBtn.textContent = "Copy";
  copyBtn.setAttribute("aria-label", "Copy snippet");
  copyBtn.addEventListener("click", async () => {
    try {
      const contentText = typeof snippet.content === "string" ? snippet.content : String(snippet.content ?? "");
      await navigator.clipboard.writeText(contentText);
      showStatus("Copied to clipboard.");
    } catch (e) {
      showError("Failed to copy to clipboard.");
    }
  });

  // Edit button
  const editBtn = document.createElement("button");
  editBtn.textContent = "Edit";
  editBtn.setAttribute("aria-label", "Edit snippet");
  editBtn.addEventListener("click", () => {
    if (openEditContainer && openEditContainer !== editContainer) {
      openEditContainer.classList.add("hidden");
    }
    editContainer.classList.toggle("hidden");
    openEditContainer = editContainer.classList.contains("hidden") ? null : editContainer;
  });

  // Delete button
  const deleteBtn = document.createElement("button");
  deleteBtn.textContent = "Delete";
  deleteBtn.setAttribute("aria-label", "Delete snippet");
  deleteBtn.addEventListener("click", async () => {
    if (!confirm("Delete this snippet?")) return;
    const deleted = await deleteSnippetFromStorage(snippet.id);
    if (!deleted) return;
    showStatus("Snippet deleted.");
    refreshCurrentView();
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
  editTitleInput.setAttribute("aria-label", "Edit title");
  editTitleInput.placeholder = "Title";

  const editTagNameInput = document.createElement("input");
  editTagNameInput.setAttribute("aria-label", "Edit tag name");
  editTagNameInput.placeholder = "Tag Name";

  const editTagCategoryInput = document.createElement("input");
  editTagCategoryInput.setAttribute("aria-label", "Edit tag category");
  editTagCategoryInput.placeholder = "Tag Category";

  const snippetTags = snippetDomain.getSnippetTags(snippet);
  if (snippetTags.length > 0) {
    editTagNameInput.value = snippetTags[0].name || "";
    editTagCategoryInput.value = snippetTags[0].category || "";
  }

  const editContentTextarea = document.createElement("textarea");
  editContentTextarea.value = typeof snippet.content === "string" ? snippet.content : "";
  editContentTextarea.setAttribute("aria-label", "Edit content");
  editContentTextarea.placeholder = "Content";

  const saveChangesBtn = document.createElement("button");
  saveChangesBtn.textContent = "Save Changes";
  saveChangesBtn.setAttribute("aria-label", "Save snippet changes");
  saveChangesBtn.addEventListener("click", async () => {
    const nextTitle = editTitleInput.value.trim();
    const nextContent = editContentTextarea.value.trim();

    if (!nextTitle || !nextContent) {
      showError("Title and content are required.");
      return;
    }

    const nextTagName = editTagNameInput.value.trim();
    const nextTagCategory = editTagCategoryInput.value.trim();

    // Preserve other tags
    const otherTags = snippetDomain.getSnippetTags(snippet).slice(1);
    const firstTag = nextTagName ? [{ name: nextTagName, category: nextTagCategory || "general" }] : [];
    const nextTags = [...firstTag, ...otherTags];

    const updatedSnippet = {
      ...snippet,
      title: nextTitle,
      tags: nextTags,
      content: nextContent,
      updatedAt: Date.now()
    };

    const saved = await updateSnippetInStorage(updatedSnippet);
    if (!saved) return;
    showStatus("Snippet updated.");
    editContainer.classList.add("hidden");
    if (openEditContainer === editContainer) {
      openEditContainer = null;
    }
    await refreshCurrentView();
  });

  const cancelChangesBtn = document.createElement("button");
  cancelChangesBtn.textContent = "Cancel";
  cancelChangesBtn.setAttribute("aria-label", "Cancel snippet editing");
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
  editContainer.appendChild(document.createElement("br"));
  editContainer.appendChild(editTagNameInput);
  editContainer.appendChild(document.createElement("br"));
  editContainer.appendChild(editTagCategoryInput);
  editContainer.appendChild(document.createElement("br"));
  editContainer.appendChild(editContentTextarea);
  editContainer.appendChild(editActions);

  return editContainer;
}

/**
 * Display the list of snippets.
 * NOTE: ここでは **再ソートしない**。渡された順序（displaySnippetsWithSortの結果）を尊重。
 */
function displaySnippets(snippets) {
  snippetList.textContent = "";

  if (!snippets || snippets.length === 0) {
    const emptyMessage = document.createElement("p");
    emptyMessage.textContent = "No snippets found.";
    snippetList.appendChild(emptyMessage);
    return;
  }

  // Use DocumentFragment to batch DOM insertions and reduce layout thrashing
  const fragment = document.createDocumentFragment();
  snippets.forEach((snippet) => {
    fragment.appendChild(renderSnippetItem(snippet));
  });
  snippetList.appendChild(fragment);
}

/**
 * Initialize the popup by loading stored snippets.
 */
async function init() {
  if (!snippetDomain) {
    showError("Failed to load snippet domain logic.");
    return;
  }
  await refreshCurrentView();
}

// Initialize on popup load
init();
