/**
 * Pure domain logic for snippets.
 * This file intentionally avoids DOM/chrome APIs so it can be unit tested.
 */

let utils;
if (typeof require !== "undefined") {
  utils = require("./utils.js");
}
const LIMITS = {
  TITLE: 200,
  CONTENT: 10000,
  TAG_NAME: 50,
  TAG_CATEGORY: 50
};

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
  const normalized = internalNormalizeTag(tag);
  if (!normalized) return false;
  if (normalized.name.length > LIMITS.TAG_NAME) return false;
  if (normalized.category && normalized.category.length > LIMITS.TAG_CATEGORY) return false;
  return true;
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
  if (typeof snippet.title !== "string" || snippet.title.length > LIMITS.TITLE) return false;
  if (typeof snippet.content !== "string" || snippet.content.length > LIMITS.CONTENT) return false;
  if (typeof snippet.createdAt !== "number") return false;
  if (typeof snippet.updatedAt !== "number") return false;
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

/**
 * Extract template variables from snippet content.
 * Matches {{name}} and {{name:default}}
 */
function extractTemplateVariables(content) {
  if (typeof content !== "string" || !content.includes("{{")) {
    return [];
  }
  const regex = /\{\{([^}]+)\}\}/g;
  const variables = [];
  const seen = new Set();
  let match;

  while ((match = regex.exec(content)) !== null) {
    const inner = match[1].trim();
    if (!inner) continue;

    const colonIndex = inner.indexOf(":");
    let name = inner;
    let defaultValue = "";

    if (colonIndex !== -1) {
      name = inner.slice(0, colonIndex).trim();
      defaultValue = inner.slice(colonIndex + 1).trim();
    }

    if (!name) continue;

    if (!seen.has(name)) {
      seen.add(name);
      variables.push({
        name,
        defaultValue,
        raw: match[0]
      });
    }
  }

  return variables;
}

/**
 * Render a template string with provided variable values.
 */
function renderTemplate(content, values = {}) {
  if (typeof content !== "string") return "";
  return content.replace(/\{\{([^}]+)\}\}/g, (match, inner) => {
    const trimmed = inner.trim();
    const colonIndex = trimmed.indexOf(":");
    let name = trimmed;
    let defaultValue = "";

    if (colonIndex !== -1) {
      name = trimmed.slice(0, colonIndex).trim();
      defaultValue = trimmed.slice(colonIndex + 1).trim();
    }

    if (!name) return match;

    if (Object.prototype.hasOwnProperty.call(values, name) && values[name] !== undefined && values[name] !== null && values[name] !== "") {
      return String(values[name]);
    }
    return defaultValue;
  });
}

/**
 * Extract hashtags from content (e.g. #tag #work).
 * Returns array of { name, category: 'general' }
 */
function extractHashtags(content) {
  if (typeof content !== "string" || !content.includes("#")) {
    return [];
  }
  const regex = /(?:^|\s)#([^\s#,.:;!?(){}\[\]"']+)/g;
  const tags = [];
  const seen = new Set();
  let match;

  while ((match = regex.exec(content)) !== null) {
    const name = match[1].trim();
    if (!name || name.length > LIMITS.TAG_NAME) continue;
    const lower = name.toLowerCase();
    if (!seen.has(lower)) {
      seen.add(lower);
      tags.push({ name, category: "general" });
    }
  }

  return tags;
}

/**
 * Infer a title from content if no title was provided.
 */
function inferTitleFromContent(content, maxLen = 40) {
  if (typeof content !== "string") return "Untitled";
  const lines = content.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return "Untitled";
  const firstLine = lines[0].replace(/^[#\-*\s>]+/, "").trim();
  if (!firstLine) return "Untitled";
  if (firstLine.length <= maxLen) return firstLine;
  return firstLine.slice(0, maxLen).trim() + "…";
}

const snippetDomain = {
  LIMITS,
  getSnippetTags,
  isValidImportedSnippet,
  normalizeImportedSnippet,
  buildTagFilterOptions,
  filterSnippets,
  sortSnippets,
  mergeImportedSnippets,
  extractTemplateVariables,
  renderTemplate,
  extractHashtags,
  inferTitleFromContent
};

if (typeof window !== "undefined") {
  window.SnippetDomain = snippetDomain;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = snippetDomain;
}
