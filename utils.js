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

  // Unique tags by name+category (case-insensitive)
  const tags = [...(a.tags || []), ...(b.tags || [])];
  const seen = new Set();
  const uniqTags = tags.filter(t => {
    const key = `${(t.name || "").toLowerCase()}|${(t.category || "general").toLowerCase()}`;
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

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    generateId,
    mergeSnippets
  };
}
