/**
 * Pure domain logic for snippets.
 * This file intentionally avoids DOM/chrome APIs so it can be unit tested.
 */

function getSnippetTags(snippet) {
  return Array.isArray(snippet?.tags) ? snippet.tags : [];
}

function ensureSnippetsArray(snippets) {
  return Array.isArray(snippets) ? snippets : [];
}

function normalizeTag(tag) {
  if (!tag || typeof tag !== "object") return null;
  const name = typeof tag.name === "string" ? tag.name.trim() : "";
  if (!name) return null;
  const rawCategory = typeof tag.category === "string" ? tag.category.trim() : "";
  const category = rawCategory || "general";
  const key = `${name.toLowerCase()}:${category.toLowerCase()}`;
  return { name, category, key };
}

function isValidImportedTag(tag) {
  return !!tag &&
    typeof tag === "object" &&
    typeof tag.name === "string" &&
    tag.name.trim().length > 0 &&
    (tag.category === undefined || typeof tag.category === "string");
}

function normalizeSnippetTags(tags) {
  if (!Array.isArray(tags)) return [];
  return tags
    .filter(isValidImportedTag)
    .map((tag) => ({
      ...tag,
      category: tag.category && tag.category.trim().length > 0 ? tag.category : "general"
    }));
}

function isValidImportedSnippet(snippet) {
  if (!snippet || typeof snippet !== "object") return false;
  if (typeof snippet.id !== "string" || snippet.id.length === 0) return false;
  if (typeof snippet.title !== "string") return false;
  if (typeof snippet.content !== "string") return false;
  if (typeof snippet.createdAt !== "number") return false;
  if (typeof snippet.updatedAt !== "number") return false;
  if (snippet.tags !== undefined && (!Array.isArray(snippet.tags) || !snippet.tags.every(isValidImportedTag))) {
    return false;
  }
  return true;
}

function normalizeImportedSnippet(snippet, updatedAt) {
  return {
    ...snippet,
    tags: normalizeSnippetTags(snippet.tags),
    favorite: typeof snippet.favorite === "boolean" ? snippet.favorite : false,
    updatedAt
  };
}

function buildTagFilterOptions(snippets) {
  const tagsMap = new Map();

  ensureSnippetsArray(snippets).forEach((snippet) => {
    const tags = getSnippetTags(snippet);
    tags.forEach((tag) => {
      const normalizedTag = normalizeTag(tag);
      if (!normalizedTag) return;
      if (!tagsMap.has(normalizedTag.key)) {
        tagsMap.set(normalizedTag.key, `${normalizedTag.name} (${normalizedTag.category})`);
      }
    });
  });

  const sortedKeys = Array.from(tagsMap.keys()).sort();
  return sortedKeys.map((key) => ({
    value: key,
    label: tagsMap.get(key)
  }));
}

function parseTagSelection(selectedTag) {
  if (!selectedTag) return null;
  const lastColonIndex = selectedTag.lastIndexOf(":");
  const name = lastColonIndex > -1 ? selectedTag.substring(0, lastColonIndex) : selectedTag;
  const category = lastColonIndex > -1 ? selectedTag.substring(lastColonIndex + 1) : "";
  return normalizeTag({ name, category });
}

function includesSearchText(snippet, searchTerm) {
  const title = typeof snippet.title === "string" ? snippet.title : "";
  const content = typeof snippet.content === "string" ? snippet.content : "";
  const inTitle = title.toLowerCase().includes(searchTerm);
  const inContent = content.toLowerCase().includes(searchTerm);
  const inTags = getSnippetTags(snippet).some((tag) => {
    const normalizedTag = normalizeTag(tag);
    if (!normalizedTag) return false;
    return normalizedTag.name.toLowerCase().includes(searchTerm) ||
      normalizedTag.category.toLowerCase().includes(searchTerm);
  });
  return inTitle || inContent || inTags;
}

function filterSnippets(snippets, options = {}) {
  const searchTerm = typeof options.searchTerm === "string" ? options.searchTerm.trim().toLowerCase() : "";
  const favoritesOnly = Boolean(options.favoritesOnly);
  const selectedTag = typeof options.selectedTag === "string" ? options.selectedTag : "";

  const parsedTag = parseTagSelection(selectedTag);

  return ensureSnippetsArray(snippets).filter((snippet) => {
    if (favoritesOnly && !snippet.favorite) {
      return false;
    }

    if (parsedTag) {
      const hasTag = getSnippetTags(snippet).some((tag) => {
        const normalizedTag = normalizeTag(tag);
        return normalizedTag && normalizedTag.key === parsedTag.key;
      });
      if (!hasTag) return false;
    }

    if (searchTerm.length > 0 && !includesSearchText(snippet, searchTerm)) {
      return false;
    }

    return true;
  });
}

function sortSnippets(snippets, sortBy = "createdAt", isDescending = true) {
  const sorted = [...ensureSnippetsArray(snippets)];

  sorted.sort((a, b) => {
    let comparison = 0;
    const aTitle = typeof a.title === "string" ? a.title : "";
    const bTitle = typeof b.title === "string" ? b.title : "";
    const aCreatedAt = typeof a.createdAt === "number" ? a.createdAt : 0;
    const bCreatedAt = typeof b.createdAt === "number" ? b.createdAt : 0;
    const aUpdatedAt = typeof a.updatedAt === "number" ? a.updatedAt : 0;
    const bUpdatedAt = typeof b.updatedAt === "number" ? b.updatedAt : 0;

    switch (sortBy) {
      case "title":
        comparison = aTitle.toLowerCase().localeCompare(bTitle.toLowerCase());
        break;
      case "createdAt":
        comparison = aCreatedAt - bCreatedAt;
        break;
      case "updatedAt":
        comparison = aUpdatedAt - bUpdatedAt;
        break;
      case "favorite":
        if (a.favorite === b.favorite) {
          comparison = bCreatedAt - aCreatedAt;
        } else {
          comparison = (b.favorite ? 1 : 0) - (a.favorite ? 1 : 0);
        }
        break;
      default:
        comparison = bCreatedAt - aCreatedAt;
    }

    if (sortBy !== "favorite") {
      return isDescending ? -comparison : comparison;
    }
    return comparison;
  });

  return sorted;
}

const snippetDomain = {
  getSnippetTags,
  isValidImportedSnippet,
  normalizeImportedSnippet,
  buildTagFilterOptions,
  filterSnippets,
  sortSnippets
};

if (typeof window !== "undefined") {
  window.SnippetDomain = snippetDomain;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = snippetDomain;
}
