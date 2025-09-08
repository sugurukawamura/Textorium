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
const sortBySelect = document.getElementById("sortBy");
const sortDirectionBtn = document.getElementById("sortDirection");
const applySortBtn = document.getElementById("applySortBtn");
const exportBtn = document.getElementById("exportBtn");
const importInput = document.getElementById("importInput");

const snippetList = document.getElementById("snippetList");

// Global sort state
let currentSortBy = "createdAt";
let isDescending = true;
let currentFilter = null; // null, "favorites", or search term

// Save new snippet
saveSnippetBtn.addEventListener("click", async () => {
  const title = titleInput.value.trim();
  const content = contentInput.value.trim();
  const tagName = tagNameInput.value.trim();
  const tagCategory = tagCategoryInput.value.trim();

  if (!title || !content) {
    alert("Title and content are required.");
    return;
  }

  let tagsArray = [];
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
  storedSnippets.push(newSnippet);
  await setStoredSnippets(storedSnippets);

  // Clear input fields
  titleInput.value = "";
  tagNameInput.value = "";
  tagCategoryInput.value = "";
  contentInput.value = "";

  displaySnippetsWithSort(storedSnippets);
});

// Search functionality (on button click)
searchBtn.addEventListener("click", async () => {
  const keyword = searchInput.value.trim().toLowerCase();
  const storedSnippets = await getStoredSnippets();
  if (!keyword) {
    currentFilter = null;
    displaySnippetsWithSort(storedSnippets);
    return;
  }
  currentFilter = keyword;
  const filtered = storedSnippets.filter((s) => {
    return (
      s.title.toLowerCase().includes(keyword) ||
      s.content.toLowerCase().includes(keyword)
    );
  });
  displaySnippetsWithSort(filtered);
});

// Real-time search on input
searchInput.addEventListener("input", async () => {
  const keyword = searchInput.value.trim().toLowerCase();
  const storedSnippets = await getStoredSnippets();
  if (!keyword) {
    currentFilter = null;
    displaySnippetsWithSort(storedSnippets);
    return;
  }
  currentFilter = keyword;
  const filtered = storedSnippets.filter((s) => {
    return (
      s.title.toLowerCase().includes(keyword) ||
      s.content.toLowerCase().includes(keyword)
    );
  });
  displaySnippetsWithSort(filtered);
});

// Clear search input and show all
clearSearchBtn.addEventListener("click", async () => {
  searchInput.value = "";
  currentFilter = null;
  const storedSnippets = await getStoredSnippets();
  displaySnippetsWithSort(storedSnippets);
});

// Filter favorites only
filterFavoritesBtn.addEventListener("click", async () => {
  currentFilter = "favorites";
  const snippets = await getStoredSnippets();
  const filtered = snippets.filter(s => s.favorite);
  displaySnippetsWithSort(filtered);
});

// Clear favorite filter
clearFilterBtn.addEventListener("click", async () => {
  currentFilter = null;
  const snippets = await getStoredSnippets();
  displaySnippetsWithSort(snippets);
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
  displaySnippetsWithSort(snippets);
});

// Export snippets as JSON
exportBtn.addEventListener("click", async () => {
  const snippets = await getStoredSnippets();
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
      const byId = new Map(existing.map(s => [s.id, s]));

      let added = 0, updated = 0, invalid = 0;

      for (const s of parsed) {
        if (!isValid(s)) { invalid++; continue; }
        const cur = byId.get(s.id);
        if (!cur) {
          byId.set(s.id, s);
          added++;
        } else {
          const merged = mergeSnippets(cur, s);
          if (JSON.stringify(cur) !== JSON.stringify(merged)) updated++;
          byId.set(s.id, merged);
        }
      }

      const mergedAll = Array.from(byId.values());
      await setStoredSnippets(mergedAll);
      displaySnippetsWithSort(mergedAll);
      alert(`Import finished. Added: ${added}, Updated: ${updated}, Skipped invalid: ${invalid}.`);
    } catch (error) {
      alert("Failed to import snippets. Invalid file format.");
    }
  };
  reader.readAsText(file);
});

// Merge policy for same ID: prefer newer updatedAt, OR favorite, union tags
function mergeSnippets(a, b) {
  const newer = (b.updatedAt || 0) >= (a.updatedAt || 0) ? b : a;
  const older = newer === a ? b : a;

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
    updatedAt: Math.max(a.updatedAt || 0, b.updatedAt || 0),
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
 * Refresh the current view with appropriate filters and sorting
 */
async function refreshCurrentView() {
  const storedSnippets = await getStoredSnippets();
  let filteredSnippets = storedSnippets;
  
  // Apply current filter
  if (currentFilter === "favorites") {
    filteredSnippets = storedSnippets.filter(s => s.favorite);
  } else if (typeof currentFilter === "string" && currentFilter.length > 0) {
    // Search filter
    filteredSnippets = storedSnippets.filter((s) => {
      return (
        s.title.toLowerCase().includes(currentFilter) ||
        s.content.toLowerCase().includes(currentFilter)
      );
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
      resolve();
    });
  });
}

/**
 * Generate a simple unique ID.
 */
function generateId() {
  return "id-" + Math.random().toString(36).slice(2, 11);
}

/**
 * Display the list of snippets.
 * NOTE: ここでは **再ソートしない**。渡された順序（displaySnippetsWithSortの結果）を尊重。
 */
function displaySnippets(snippets) {
  snippetList.innerHTML = "";

  if (!snippets || snippets.length === 0) {
    snippetList.innerHTML = "<p>No snippets found.</p>";
    return;
  }

  const list = (snippets || []); // 受け取った順序をそのまま使用
  list.forEach((snippet) => {
    const container = document.createElement("div");
    container.className = "snippet-item";

    // Favorite button
    const favoriteBtn = document.createElement("button");
    favoriteBtn.textContent = snippet.favorite ? "★" : "☆";
    favoriteBtn.style.marginRight = "8px";
    favoriteBtn.setAttribute('aria-label', 'Toggle favorite');
    favoriteBtn.addEventListener("click", async () => {
      snippet.favorite = !snippet.favorite;
      snippet.updatedAt = Date.now();
      const storedSnippets = await getStoredSnippets();
      const index = storedSnippets.findIndex((s) => s.id === snippet.id);
      if (index > -1) {
        storedSnippets[index] = snippet;
        await setStoredSnippets(storedSnippets);
        refreshCurrentView();
      }
    });
    container.appendChild(favoriteBtn);

    // Title element
    const titleEl = document.createElement("h3");
    titleEl.textContent = snippet.title;

    // Tag container
    const tagContainer = document.createElement("div");
    if (snippet.tags && snippet.tags.length > 0) {
      snippet.tags.forEach((t) => {
        const tagEl = document.createElement("span");
        tagEl.className = "tag";
        tagEl.textContent = `${t.name} (${t.category})`;
        tagContainer.appendChild(tagEl);
      });
    }

    // Content element
    const contentEl = document.createElement("p");
    contentEl.textContent = snippet.content;

    // Copy button
    const copyBtn = document.createElement('button');
    copyBtn.textContent = 'Copy';
    copyBtn.setAttribute('aria-label', 'Copy snippet');
    copyBtn.style.marginRight = '8px';
    copyBtn.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(snippet.content); }
      catch (e) { alert('Failed to copy to clipboard.'); }
    });

    // Edit section (initially hidden)
    const editContainer = document.createElement("div");
    editContainer.className = "hidden";

    const editTitleInput = document.createElement("input");
    editTitleInput.type = "text";
    editTitleInput.value = snippet.title;

    const editTagInput = document.createElement("input");
    if (snippet.tags && snippet.tags.length > 0) {
      editTagInput.value = `${snippet.tags[0].name}:${snippet.tags[0].category}`;
    } else {
      editTagInput.value = "";
    }

    const editContentTextarea = document.createElement("textarea");
    editContentTextarea.value = snippet.content;

    const saveChangesBtn = document.createElement("button");
    saveChangesBtn.textContent = "Save Changes";
    saveChangesBtn.addEventListener("click", async () => {
      snippet.title = editTitleInput.value.trim();
      const editTagStr = editTagInput.value.trim();
      if (editTagStr) {
        const [name, category] = editTagStr.split(":").map(s => s.trim());
        snippet.tags = [{ name, category: category || "general" }];
      } else {
        snippet.tags = [];
      }
      snippet.content = editContentTextarea.value.trim();
      snippet.updatedAt = Date.now();

      const storedSnippets = await getStoredSnippets();
      const index = storedSnippets.findIndex((s) => s.id === snippet.id);
      if (index > -1) {
        storedSnippets[index] = snippet;
        await setStoredSnippets(storedSnippets);
        refreshCurrentView();
      }
    });

    editContainer.appendChild(editTitleInput);
    editContainer.appendChild(document.createElement("br"));
    editContainer.appendChild(editTagInput);
    editContainer.appendChild(document.createElement("br"));
    editContainer.appendChild(editContentTextarea);
    editContainer.appendChild(document.createElement("br"));
    editContainer.appendChild(saveChangesBtn);

    const editBtn = document.createElement("button");
    editBtn.textContent = "Edit";
    editBtn.addEventListener("click", () => {
      editContainer.classList.toggle("hidden");
    });

    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "Delete";
    deleteBtn.setAttribute('aria-label', 'Delete snippet');
    deleteBtn.addEventListener("click", async () => {
      if (!confirm('Delete this snippet?')) return;
      const storedSnippets = await getStoredSnippets();
      const updatedSnippets = storedSnippets.filter((s) => s.id !== snippet.id);
      await setStoredSnippets(updatedSnippets);
      refreshCurrentView();
    });

    container.appendChild(titleEl);
    container.appendChild(tagContainer);
    container.appendChild(contentEl);
    container.appendChild(copyBtn);
    container.appendChild(editBtn);
    container.appendChild(deleteBtn);
    container.appendChild(editContainer);

    snippetList.appendChild(container);
  });
}

/**
 * Initialize the popup by loading stored snippets.
 */
async function init() {
  const storedSnippets = await getStoredSnippets();
  displaySnippetsWithSort(storedSnippets);
}

// Initialize on popup load
init();