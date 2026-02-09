const { test } = require("node:test");
const assert = require("node:assert");
const {
  getSnippetTags,
  isValidImportedSnippet,
  normalizeImportedSnippet,
  buildTagFilterOptions,
  filterSnippets,
  sortSnippets
} = require("./snippet-domain.js");

test("getSnippetTags returns [] when tags is missing or invalid", () => {
  assert.deepStrictEqual(getSnippetTags({}), []);
  assert.deepStrictEqual(getSnippetTags({ tags: "invalid" }), []);
});

test("isValidImportedSnippet validates required fields and tag shape", () => {
  const valid = {
    id: "id-1",
    title: "Title",
    content: "Content",
    createdAt: 1,
    updatedAt: 2,
    tags: [{ name: "work", category: "general" }]
  };
  const invalidTagShape = {
    ...valid,
    tags: [{ category: "general" }]
  };

  assert.strictEqual(isValidImportedSnippet(valid), true);
  assert.strictEqual(isValidImportedSnippet(invalidTagShape), false);
});

test("normalizeImportedSnippet applies defaults and preserves extra fields", () => {
  const snippet = {
    id: "id-1",
    title: "Title",
    content: "Content",
    createdAt: 1,
    updatedAt: 2,
    tags: [{ name: "work", category: "" }],
    extra: { keep: true }
  };

  const normalized = normalizeImportedSnippet(snippet, 100);

  assert.strictEqual(normalized.updatedAt, 100);
  assert.strictEqual(normalized.favorite, false);
  assert.deepStrictEqual(normalized.tags, [{ name: "work", category: "general" }]);
  assert.deepStrictEqual(normalized.extra, { keep: true });
});

test("buildTagFilterOptions deduplicates and sorts tags", () => {
  const snippets = [
    { tags: [{ name: "beta", category: "x" }, { name: "alpha", category: "" }] },
    { tags: [{ name: "beta", category: "x" }] }
  ];

  const options = buildTagFilterOptions(snippets);

  assert.deepStrictEqual(options, [
    { value: "alpha:general", label: "alpha (general)" },
    { value: "beta:x", label: "beta (x)" }
  ]);
});

test("filterSnippets composes search + favorites + tag filters with AND logic", () => {
  const snippets = [
    {
      id: "1",
      title: "Meeting notes",
      content: "Weekly sync",
      favorite: true,
      tags: [{ name: "team", category: "work" }]
    },
    {
      id: "2",
      title: "Shopping list",
      content: "Milk",
      favorite: true,
      tags: [{ name: "home", category: "personal" }]
    }
  ];

  const filtered = filterSnippets(snippets, {
    searchTerm: "meeting",
    favoritesOnly: true,
    selectedTag: "team:work"
  });

  assert.strictEqual(filtered.length, 1);
  assert.strictEqual(filtered[0].id, "1");
});

test("sortSnippets handles title asc and createdAt desc", () => {
  const snippets = [
    { id: "1", title: "Bravo", createdAt: 1, updatedAt: 1, favorite: false },
    { id: "2", title: "Alpha", createdAt: 2, updatedAt: 2, favorite: true }
  ];

  const titleAsc = sortSnippets(snippets, "title", false);
  assert.deepStrictEqual(titleAsc.map((s) => s.id), ["2", "1"]);

  const createdDesc = sortSnippets(snippets, "createdAt", true);
  assert.deepStrictEqual(createdDesc.map((s) => s.id), ["2", "1"]);
});
