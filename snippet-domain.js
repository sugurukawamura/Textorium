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
  if (typeof snippet.createdAt !== "number" || !Number.isFinite(snippet.createdAt)) return false;
  if (typeof snippet.updatedAt !== "number" || !Number.isFinite(snippet.updatedAt)) return false;
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
      if (!tag || typeof tag !== "object") return;
      const name = typeof tag.name === "string" ? tag.name.trim() : "";
      if (!name) return;
      const rawCategory = typeof tag.category === "string" ? tag.category.trim() : "";
      const category = rawCategory || "general";
      const key = `${name.toLowerCase()}:${category.toLowerCase()}`;
      if (!tagsMap.has(key)) {
        tagsMap.set(key, `${name} (${category})`);
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
    if (!tag || typeof tag !== "object") return false;
    const name = typeof tag.name === "string" ? tag.name.trim() : "";
    if (!name) return false;
    if (name.toLowerCase().includes(searchTerm)) return true;
    const rawCategory = typeof tag.category === "string" ? tag.category.trim() : "";
    const category = rawCategory || "general";
    return category.toLowerCase().includes(searchTerm);
  });
  return inTitle || inContent || inTags;
}

function filterSnippets(snippets, options = {}) {
  const searchTerm = typeof options.searchTerm === "string" ? options.searchTerm.trim().toLowerCase() : "";
  const favoritesOnly = Boolean(options.favoritesOnly);
  const selectedTag = typeof options.selectedTag === "string" ? options.selectedTag : "";

  const parsedTag = parseTagSelection(selectedTag);
  const selectedNameLower = parsedTag ? parsedTag.name.toLowerCase() : "";
  const selectedCategoryLower = parsedTag ? parsedTag.category.toLowerCase() : "";

  return ensureSnippetsArray(snippets).filter((snippet) => {
    if (favoritesOnly && !snippet.favorite) {
      return false;
    }

    if (parsedTag) {
      const hasTag = getSnippetTags(snippet).some((tag) => {
        if (!tag || typeof tag !== "object") return false;
        const name = typeof tag.name === "string" ? tag.name.trim() : "";
        if (!name) return false;
        const rawCategory = typeof tag.category === "string" ? tag.category.trim() : "";
        const category = rawCategory || "general";
        return name.toLowerCase() === selectedNameLower &&
          category.toLowerCase() === selectedCategoryLower;
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

  let collator;
  if (sortBy === "title") {
    collator = new Intl.Collator(undefined, { sensitivity: "accent", usage: "sort" });
  }

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
        comparison = titleCollator.compare(aTitle, bTitle);
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

function mergeImportedSnippets(existingSnippets, importedSnippets, now, mergeById) {
  const byId = new Map(
    ensureSnippetsArray(existingSnippets)
      .filter((snippet) => snippet && typeof snippet.id === "string" && snippet.id.length > 0)
      .map((snippet) => [snippet.id, snippet])
  );
  const mergeFn = typeof mergeById === "function" ? mergeById : ((current, incoming) => ({ ...current, ...incoming }));
  const normalizedNow = typeof now === "number" && Number.isFinite(now) ? now : Date.now();

  let added = 0;
  let updated = 0;
  let invalid = 0;

  ensureSnippetsArray(importedSnippets).forEach((snippet) => {
    if (!isValidImportedSnippet(snippet)) {
      invalid++;
      return;
    }

    const normalized = normalizeImportedSnippet(snippet, normalizedNow);
    const current = byId.get(normalized.id);

    if (!current) {
      byId.set(normalized.id, normalized);
      added++;
      return;
    }

    const merged = mergeFn(current, normalized, normalizedNow);
    if (JSON.stringify(current) !== JSON.stringify(merged)) {
      updated++;
    }
    byId.set(normalized.id, merged);
  });

  return {
    snippets: Array.from(byId.values()),
    added,
    updated,
    invalid
  };
}

const snippetDomain = {
  getSnippetTags,
  isValidImportedSnippet,
  normalizeImportedSnippet,
  buildTagFilterOptions,
  filterSnippets,
  sortSnippets,
  mergeImportedSnippets
};

if (typeof window !== "undefined") {
  window.SnippetDomain = snippetDomain;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = snippetDomain;
}
