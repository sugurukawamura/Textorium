const { test } = require("node:test");
const assert = require("node:assert");
const {
  getSnippetTags,
  isValidImportedSnippet,
  normalizeImportedSnippet,
  buildTagFilterOptions,
  filterSnippets,
  sortSnippets,
  mergeImportedSnippets
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
  const invalidCreatedAt = { ...valid, createdAt: NaN };
  const invalidUpdatedAt = { ...valid, updatedAt: Infinity };

  assert.strictEqual(isValidImportedSnippet(valid), true);
  assert.strictEqual(isValidImportedSnippet(invalidTagShape), false);
  assert.strictEqual(isValidImportedSnippet(invalidCreatedAt), false);
  assert.strictEqual(isValidImportedSnippet(invalidUpdatedAt), false);
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

test("buildTagFilterOptions normalizes tag values and ignores invalid tags", () => {
  const snippets = [
    {
      tags: [
        { name: " Work ", category: " " },
        { name: "", category: "invalid" },
        { name: "work", category: "GENERAL" }
      ]
    }
  ];

  const options = buildTagFilterOptions(snippets);

  assert.deepStrictEqual(options, [
    { value: "work:general", label: "Work (general)" }
  ]);
});

test("filterSnippets handles non-array input and colon-containing tag names", () => {
  assert.deepStrictEqual(filterSnippets(null, { searchTerm: "x" }), []);

  const snippets = [
    {
      id: "1",
      title: "API memo",
      content: "Details",
      favorite: false,
      tags: [{ name: "scope:api", category: "work" }]
    }
  ];

  const filtered = filterSnippets(snippets, {
    selectedTag: "SCOPE:API:WORK"
  });

  assert.strictEqual(filtered.length, 1);
  assert.strictEqual(filtered[0].id, "1");
});

test("filterSnippets gracefully handles null or undefined elements", () => {
  const snippets = [
    { id: "1", title: "Valid", favorite: true },
    null,
    undefined,
    { id: "2", title: "Also Valid", favorite: false }
  ];
  const filtered = filterSnippets(snippets, { favoritesOnly: true });
  assert.strictEqual(filtered.length, 1);
  assert.strictEqual(filtered[0].id, "1");
});

test("sortSnippets handles non-array input and keeps favorite sort stable across direction", () => {
  assert.deepStrictEqual(sortSnippets(undefined, "title", true), []);

  const snippets = [
    { id: "1", title: "z", createdAt: 1, favorite: false },
    { id: "2", title: "a", createdAt: 3, favorite: true },
    { id: "3", title: "b", createdAt: 2, favorite: true }
  ];

  const favoriteDesc = sortSnippets(snippets, "favorite", true).map((s) => s.id);
  const favoriteAsc = sortSnippets(snippets, "favorite", false).map((s) => s.id);

  assert.deepStrictEqual(favoriteDesc, ["2", "3", "1"]);
  assert.deepStrictEqual(favoriteAsc, ["2", "3", "1"]);
});

test("sortSnippets handles null or non-object elements", () => {
  const snippets = [
    { id: "1", title: "B", createdAt: 10 },
    null,
    { id: "2", title: "A", createdAt: 20 }
  ];

  // Should not crash and should treat null as having default values (empty title, 0 createdAt)
  const sorted = sortSnippets(snippets, "title", false);
  assert.strictEqual(sorted.length, 3);
  // null has "" title, "A" has "A", "B" has "B". ASC: null, A, B
  assert.strictEqual(sorted[0], null);
  assert.strictEqual(sorted[1].id, "2");
  assert.strictEqual(sorted[2].id, "1");

  const sortedCreated = sortSnippets(snippets, "createdAt", true);
  // null has 0 createdAt, "1" has 10, "2" has 20. DESC: 2, 1, null
  assert.strictEqual(sortedCreated[0].id, "2");
  assert.strictEqual(sortedCreated[1].id, "1");
  assert.strictEqual(sortedCreated[2], null);
});

test("mergeImportedSnippets returns added/updated/invalid counts and merged snippets", () => {
  const existing = [
    {
      id: "id-1",
      title: "Old",
      content: "before",
      createdAt: 1,
      updatedAt: 10,
      favorite: false,
      tags: []
    }
  ];
  const imported = [
    {
      id: "id-1",
      title: "New",
      content: "after",
      createdAt: 1,
      updatedAt: 99,
      favorite: false,
      tags: [{ name: "work", category: "" }]
    },
    {
      id: "id-2",
      title: "Added",
      content: "new",
      createdAt: 5,
      updatedAt: 6,
      favorite: false,
      tags: []
    },
    {
      id: "",
      title: "Invalid",
      content: "invalid",
      createdAt: 1,
      updatedAt: 1
    }
  ];

  const result = mergeImportedSnippets(existing, imported, 100, (current, incoming) => ({
    ...current,
    ...incoming
  }));

  assert.strictEqual(result.added, 1);
  assert.strictEqual(result.updated, 1);
  assert.strictEqual(result.invalid, 1);
  assert.strictEqual(result.snippets.length, 2);
  assert.strictEqual(result.snippets.find((snippet) => snippet.id === "id-1").updatedAt, 100);
});

test("mergeImportedSnippets tolerates non-array input", () => {
  const result = mergeImportedSnippets(null, null, 123);
  assert.deepStrictEqual(result, {
    snippets: [],
    added: 0,
    updated: 0,
    invalid: 0
  });
});
