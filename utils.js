/**
 * Utility functions for Textorium.
 */

/**
 * Generate a simple unique ID.
 */
function generateId() {
  return "id-" + Math.random().toString(36).slice(2, 11);
}

/**
 * Merge policy for same ID: prefer newer updatedAt, OR favorite, union tags.
 */
function mergeSnippets(a, b, updatedAt = Date.now()) {
  a = a || {};
  b = b || {};
  const now = Date.now();
  const newer = (b.updatedAt || 0) >= (a.updatedAt || 0) ? b : a;
  const mergedFields = newer === b ? { ...a, ...b } : { ...b, ...a };
  const nextUpdatedAt = typeof updatedAt === "number" ? updatedAt : now;

  // Unique tags by name+category (case-insensitive)
  const tagsA = Array.isArray(a.tags) ? a.tags : [];
  const tagsB = Array.isArray(b.tags) ? b.tags : [];
  const tags = [...tagsA, ...tagsB];
  const seen = new Set();
  const uniqTags = tags
    .map((tag) => normalizeTagForMerge(tag))
    .filter((tag) => !!tag)
    .filter((tag) => {
      const key = `${tag.name.toLowerCase()}|${tag.category.toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  const createdAtA = typeof a.createdAt === "number" ? a.createdAt : now;
  const createdAtB = typeof b.createdAt === "number" ? b.createdAt : now;

  return {
    ...mergedFields,
    id: a.id,
    createdAt: Math.min(createdAtA, createdAtB),
    updatedAt: nextUpdatedAt,
    favorite: (a.favorite ?? false) || (b.favorite ?? false),
    tags: uniqTags
  };
}

function normalizeTagForMerge(tag) {
  if (!tag || typeof tag !== "object") return null;
  const name = typeof tag.name === "string" ? tag.name.trim() : "";
  if (!name) return null;
  const rawCategory = typeof tag.category === "string" ? tag.category.trim() : "";
  return {
    ...tag,
    name,
    category: rawCategory || "general"
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    generateId,
    mergeSnippets
  };
}
