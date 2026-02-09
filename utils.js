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
  const newer = (b.updatedAt || 0) >= (a.updatedAt || 0) ? b : a;
  const mergedFields = newer === b ? { ...a, ...b } : { ...b, ...a };

  // Unique tags by name+category (case-insensitive)
  const tagsA = Array.isArray(a.tags) ? a.tags : [];
  const tagsB = Array.isArray(b.tags) ? b.tags : [];
  const tags = [...tagsA, ...tagsB];
  const seen = new Set();
  const uniqTags = tags.filter(t => {
    if (!t || typeof t !== "object") return false;
    const key = `${(t.name || "").toLowerCase()}|${(t.category || "general").toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const createdAtA = typeof a.createdAt === "number" ? a.createdAt : Date.now();
  const createdAtB = typeof b.createdAt === "number" ? b.createdAt : Date.now();

  return {
    ...mergedFields,
    id: a.id,
    createdAt: Math.min(createdAtA, createdAtB),
    updatedAt,
    favorite: (a.favorite ?? false) || (b.favorite ?? false),
    tags: uniqTags
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    generateId,
    mergeSnippets
  };
}
