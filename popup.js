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

// Theme logic
chrome.storage.local.get(["settings"], (result) => {
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
    const settings = result.settings || {};
    settings.theme = isDark ? "dark" : "light";
    chrome.storage.local.set({ settings });
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

  displaySnippetsWithSort(storedSnippets);
  showStatus("Snippet saved.");
});

contentInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
    event.preventDefault();
    saveSnippetBtn.click();
  }
});

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
  const snippets = await getStoredSnippets();
  if (!snippets) return;
  displaySnippetsWithSort(snippets);
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

      const isValid = (s) => (
        s && typeof s === "object" &&
        typeof s.id === "string" && s.id &&
        typeof s.title === "string" &&
        typeof s.content === "string" &&
        typeof s.createdAt === "number" &&
        typeof s.updatedAt === "number"
      );

      const existing = await getStoredSnippets();
      if (!existing) return;
      const byId = new Map(existing.map(s => [s.id, s]));

      let added = 0, updated = 0, invalid = 0;

      const now = Date.now();
      for (const s of parsed) {
        if (!isValid(s)) { invalid++; continue; }
        const cur = byId.get(s.id);
        if (!cur) {
          byId.set(s.id, { ...s, updatedAt: now });
          added++;
        } else {
          const merged = mergeSnippets(cur, s, now);
          if (JSON.stringify(cur) !== JSON.stringify(merged)) updated++;
          byId.set(s.id, merged);
        }
      }

      const mergedAll = Array.from(byId.values());
      const saved = await setStoredSnippets(mergedAll);
      if (!saved) return;
      displaySnippetsWithSort(mergedAll);
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

// Merge policy for same ID: prefer newer updatedAt, OR favorite, union tags
function mergeSnippets(a, b, updatedAt = Date.now()) {
  const newer = (b.updatedAt || 0) >= (a.updatedAt || 0) ? b : a;

  // Unique tags by name+category (case-insensitive)
  const tags = [...(a.tags || []), ...(b.tags || [])];
  const seen = new Set();
  const uniqTags = tags.filter(t => {
    const key = `${(t.name||"").toLowerCase()}|${(t.category||"general").toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return {
    ...newer,
    id: a.id,
    createdAt: Math.min(a.createdAt || Date.now(), b.createdAt || Date.now()),
    updatedAt,
    favorite: (a.favorite ?? false) || (b.favorite ?? false),
    tags: uniqTags
  };
}

/**
 * Sort snippets based on current sort criteria and direction
 */
function sortSnippets(snippets) {
  const sorted = [...snippets]; // Create a copy to avoid mutating original
  
  sorted.sort((a, b) => {
    let comparison = 0;
    
    switch (currentSortBy) {
      case "title":
        comparison = a.title.toLowerCase().localeCompare(b.title.toLowerCase());
        break;
      case "createdAt":
        comparison = a.createdAt - b.createdAt;
        break;
      case "updatedAt":
        comparison = a.updatedAt - b.updatedAt;
        break;
      case "favorite":
        // Favorites first, then by creation date
        if (a.favorite === b.favorite) {
          comparison = b.createdAt - a.createdAt; // Newer first for same favorite status
        } else {
          comparison = (b.favorite ? 1 : 0) - (a.favorite ? 1 : 0); // Favorites first
        }
        break;
      default:
        comparison = b.createdAt - a.createdAt; // Default: newest first
    }
    
    // Apply sort direction (only for non-favorite sorting)
    if (currentSortBy !== "favorite") {
      return isDescending ? -comparison : comparison;
    }
    return comparison;
  });
  
  return sorted;
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
  const tagsMap = new Map();

  snippets.forEach(s => {
    if (s.tags) {
      s.tags.forEach(t => {
        const key = `${t.name}:${t.category}`;
        tagsMap.set(key, `${t.name} (${t.category})`);
      });
    }
  });

  // Clear existing options except the first "All Tags"
  while (filterTagsSelect.options.length > 1) {
    filterTagsSelect.remove(1);
  }

  const sortedKeys = Array.from(tagsMap.keys()).sort();

  sortedKeys.forEach(key => {
    const option = document.createElement("option");
    option.value = key;
    option.textContent = tagsMap.get(key);
    filterTagsSelect.appendChild(option);
  });

  // Restore selection if valid
  if (tagsMap.has(currentSelection)) {
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

  let filteredSnippets = storedSnippets;
  
  // Apply current filter
  if (isFavoritesOnly) {
    filteredSnippets = storedSnippets.filter(s => s.favorite);
  }

  const selectedTag = filterTagsSelect.value;
  if (selectedTag) {
    // Last colon separates name and category.
    const lastColonIndex = selectedTag.lastIndexOf(":");
    const name = lastColonIndex > -1 ? selectedTag.substring(0, lastColonIndex) : selectedTag;
    const category = lastColonIndex > -1 ? selectedTag.substring(lastColonIndex + 1) : "";
    filteredSnippets = filteredSnippets.filter(s =>
      s.tags && s.tags.some(t => t.name === name && t.category === category)
    );
  }

  if (currentSearchTerm.length > 0) {
    filteredSnippets = filteredSnippets.filter((s) => {
      const inTitle = s.title.toLowerCase().includes(currentSearchTerm);
      const inContent = s.content.toLowerCase().includes(currentSearchTerm);
      const inTags = s.tags && s.tags.some(t =>
        (t.name && t.name.toLowerCase().includes(currentSearchTerm)) ||
        (t.category && t.category.toLowerCase().includes(currentSearchTerm))
      );
      return inTitle || inContent || inTags;
    });
  }
  
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

/**
 * Generate a simple unique ID.
 */
function generateId() {
  return "id-" + Math.random().toString(36).slice(2, 11);
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
  titleEl.textContent = snippet.title;
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
  if (snippet.tags && snippet.tags.length > 0) {
    snippet.tags.forEach((t) => {
      const tagEl = document.createElement("span");
      tagEl.className = "tag";
      tagEl.textContent = `${t.name} (${t.category})`;
      tagContainer.appendChild(tagEl);
    });
  }
  return tagContainer;
}

function createSnippetContent(snippet) {
  const container = document.createElement("div");

  const contentEl = document.createElement("p");
  contentEl.className = "snippet-content";
  contentEl.textContent = snippet.content;
  container.appendChild(contentEl);

  const lines = (snippet.content.match(/\n/g) || []).length;
  const isLong = snippet.content.length > 200 || lines > 3;

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
      await navigator.clipboard.writeText(snippet.content);
      showStatus("Copied to clipboard.");
    } catch (e) {
      showError("Failed to copy to clipboard.");
    }
  });

  // Edit button
  const editBtn = document.createElement("button");
  editBtn.textContent = "Edit";
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
  editTitleInput.value = snippet.title;
  editTitleInput.setAttribute("aria-label", "Edit title");
  editTitleInput.placeholder = "Title";

  const editTagNameInput = document.createElement("input");
  editTagNameInput.setAttribute("aria-label", "Edit tag name");
  editTagNameInput.placeholder = "Tag Name";

  const editTagCategoryInput = document.createElement("input");
  editTagCategoryInput.setAttribute("aria-label", "Edit tag category");
  editTagCategoryInput.placeholder = "Tag Category";

  if (snippet.tags && snippet.tags.length > 0) {
    editTagNameInput.value = snippet.tags[0].name || "";
    editTagCategoryInput.value = snippet.tags[0].category || "";
  }

  const editContentTextarea = document.createElement("textarea");
  editContentTextarea.value = snippet.content;
  editContentTextarea.setAttribute("aria-label", "Edit content");
  editContentTextarea.placeholder = "Content";

  const saveChangesBtn = document.createElement("button");
  saveChangesBtn.textContent = "Save Changes";
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
    const otherTags = (snippet.tags || []).slice(1);
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
    refreshCurrentView();
  });

  const cancelChangesBtn = document.createElement("button");
  cancelChangesBtn.textContent = "Cancel";
  cancelChangesBtn.addEventListener("click", () => {
    editContainer.classList.add("hidden");
    if (openEditContainer === editContainer) {
      openEditContainer = null;
    }
  });

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

  // 受け取った順序をそのまま使用
  snippets.forEach((snippet) => {
    snippetList.appendChild(renderSnippetItem(snippet));
  });
}

/**
 * Initialize the popup by loading stored snippets.
 */
async function init() {
  const storedSnippets = await getStoredSnippets();
  if (!storedSnippets) return;
  displaySnippetsWithSort(storedSnippets);
}

// Initialize on popup load
init();
