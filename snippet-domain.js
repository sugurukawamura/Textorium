/**
 * Pure domain logic for snippets.
 * This file intentionally avoids DOM/chrome APIs so it can be unit tested.
 */

let utils;
if (typeof require !== "undefined") {
  utils = require("./utils.js");
}

function getSnippetTags(snippet) {
  return Array.isArray(snippet?.tags) ? snippet.tags : [];
}

function ensureSnippetsArray(snippets) {
  return Array.isArray(snippets) ? snippets : [];
}

function internalNormalizeTag(tag) {
  if (typeof utils !== "undefined" && utils.normalizeTag) {
    return utils.normalizeTag(tag);
  }
  if (typeof normalizeTag === "function") {
    return normalizeTag(tag);
  }
  return null;
}

function isValidImportedTag(tag) {
  return !!internalNormalizeTag(tag);
}

function normalizeSnippetTags(tags) {
  if (!Array.isArray(tags)) return [];
  return tags
    .map(internalNormalizeTag)
    .filter((tag) => !!tag);
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
      const normalized = internalNormalizeTag(tag);
      if (normalized && !tagsMap.has(normalized.key)) {
        tagsMap.set(normalized.key, `${normalized.name} (${normalized.category})`);
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
  return internalNormalizeTag({ name, category });
}

function includesSearchText(snippet, searchTerm) {
  const title = typeof snippet.title === "string" ? snippet.title : "";
  const content = typeof snippet.content === "string" ? snippet.content : "";
  const inTitle = title.toLowerCase().includes(searchTerm);
  const inContent = content.toLowerCase().includes(searchTerm);
  const inTags = getSnippetTags(snippet).some((tag) => {
    const normalized = internalNormalizeTag(tag);
    if (!normalized) return false;
    return normalized.name.toLowerCase().includes(searchTerm) ||
      normalized.category.toLowerCase().includes(searchTerm);
  });
  return inTitle || inContent || inTags;
}

function filterSnippets(snippets, options = {}) {
  const searchTerm = typeof options.searchTerm === "string" ? options.searchTerm.trim().toLowerCase() : "";
  const favoritesOnly = Boolean(options.favoritesOnly);
  const selectedTag = typeof options.selectedTag === "string" ? options.selectedTag : "";

  const parsedTag = parseTagSelection(selectedTag);

  return ensureSnippetsArray(snippets).filter((snippet) => {
    if (!snippet || typeof snippet !== "object") {
      return false;
    }

    if (favoritesOnly && !snippet.favorite) {
      return false;
    }

    if (parsedTag) {
      const hasTag = getSnippetTags(snippet).some((tag) => {
        const normalized = internalNormalizeTag(tag);
        return normalized && normalized.key === parsedTag.key;
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
    const aSafe = (a && typeof a === "object") ? a : {};
    const bSafe = (b && typeof b === "object") ? b : {};

    const aTitle = typeof aSafe.title === "string" ? aSafe.title : "";
    const bTitle = typeof bSafe.title === "string" ? bSafe.title : "";
    const aCreatedAt = typeof aSafe.createdAt === "number" ? aSafe.createdAt : 0;
    const bCreatedAt = typeof bSafe.createdAt === "number" ? bSafe.createdAt : 0;
    const aUpdatedAt = typeof aSafe.updatedAt === "number" ? aSafe.updatedAt : 0;
    const bUpdatedAt = typeof bSafe.updatedAt === "number" ? bSafe.updatedAt : 0;

    switch (sortBy) {
      case "title":
        comparison = collator.compare(aTitle, bTitle);
        break;
      case "createdAt":
        comparison = aCreatedAt - bCreatedAt;
        break;
      case "updatedAt":
        comparison = aUpdatedAt - bUpdatedAt;
        break;
      case "favorite":
        if (aSafe.favorite === bSafe.favorite) {
          comparison = bCreatedAt - aCreatedAt;
        } else {
          comparison = (bSafe.favorite ? 1 : 0) - (aSafe.favorite ? 1 : 0);
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
  mergeImportedSnippets,
  normalizeTag: internalNormalizeTag
};

if (typeof window !== "undefined") {
  window.SnippetDomain = snippetDomain;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = snippetDomain;
}
