const { test } = require('node:test');
const assert = require('node:assert');
const { generateId, mergeSnippets } = require('./utils.js');

test('generateId format', () => {
  const id = generateId();
  // Format: "id-" followed by 9 alphanumeric characters (base 36)
  assert.match(id, /^id-[a-z0-9]{9}$/, 'ID should match expected format "id-xxxxxxxxx"');
});

test('generateId uniqueness', () => {
  const ids = new Set();
  const iterations = 10000;
  for (let i = 0; i < iterations; i++) {
    const id = generateId();
    if (ids.has(id)) {
      assert.fail(`Duplicate ID generated: ${id} at iteration ${i}`);
    }
    ids.add(id);
  }
  assert.strictEqual(ids.size, iterations, 'All generated IDs should be unique');
});

test('mergeSnippets merges two snippets, preferring newer content from the one with later updatedAt', () => {
  const oldSnippet = {
    id: 'id-test',
    title: 'Old Title',
    content: 'Old Content',
    updatedAt: 1000,
    createdAt: 1000,
    favorite: false,
    tags: [{ name: 'tag1', category: 'cat1' }]
  };
  const newSnippet = {
    id: 'id-test',
    title: 'New Title',
    content: 'New Content',
    updatedAt: 2000,
    createdAt: 1500,
    favorite: false,
    tags: [{ name: 'tag2', category: 'cat2' }]
  };

  const overrideUpdatedAt = 3000;
  const merged = mergeSnippets(oldSnippet, newSnippet, overrideUpdatedAt);

  assert.strictEqual(merged.id, 'id-test');
  assert.strictEqual(merged.title, 'New Title');
  assert.strictEqual(merged.content, 'New Content');
  assert.strictEqual(merged.updatedAt, overrideUpdatedAt);
  assert.strictEqual(merged.createdAt, 1000, 'Should keep the earliest createdAt');
});

test('mergeSnippets unions and deduplicates tags case-insensitively', () => {
  const snipA = {
    id: 'id-test',
    tags: [
      { name: 'Work', category: 'general' },
      { name: 'Meeting', category: 'work' }
    ],
    updatedAt: 1000
  };
  const snipB = {
    id: 'id-test',
    tags: [
      { name: 'work', category: 'GENERAL' }, // Duplicate
      { name: 'Urgent', category: 'personal' }
    ],
    updatedAt: 1000
  };

  const merged = mergeSnippets(snipA, snipB);

  // Should have Work(general), Meeting(work), Urgent(personal)
  assert.strictEqual(merged.tags.length, 3);

  const hasTag = (name, cat) => merged.tags.some(t =>
    t.name.toLowerCase() === name.toLowerCase() &&
    (t.category || 'general').toLowerCase() === cat.toLowerCase()
  );

  assert.ok(hasTag('Work', 'general'), 'Should have Work(general)');
  assert.ok(hasTag('Meeting', 'work'), 'Should have Meeting(work)');
  assert.ok(hasTag('Urgent', 'personal'), 'Should have Urgent(personal)');
});

test('mergeSnippets favorite status is preserved if either snippet is a favorite', () => {
  const snipA = { id: 'id-1', favorite: true, updatedAt: 1000 };
  const snipB = { id: 'id-1', favorite: false, updatedAt: 2000 };

  const merged1 = mergeSnippets(snipA, snipB);
  assert.strictEqual(merged1.favorite, true, 'Favorite should be true if at least one is favorite');

  const snipC = { id: 'id-1', favorite: false, updatedAt: 1000 };
  const snipD = { id: 'id-1', favorite: false, updatedAt: 2000 };
  const merged2 = mergeSnippets(snipC, snipD);
  assert.strictEqual(merged2.favorite, false, 'Favorite should be false if both are not favorite');
});

test('mergeSnippets preserves unknown fields from both snippets', () => {
  const snipA = {
    id: 'id-1',
    title: 'A',
    content: 'A content',
    createdAt: 1000,
    updatedAt: 1000,
    customA: { enabled: true }
  };
  const snipB = {
    id: 'id-1',
    title: 'B',
    content: 'B content',
    createdAt: 900,
    updatedAt: 2000,
    customB: ['x', 'y']
  };

  const merged = mergeSnippets(snipA, snipB, 3000);

  assert.deepStrictEqual(merged.customA, { enabled: true });
  assert.deepStrictEqual(merged.customB, ['x', 'y']);
  assert.strictEqual(merged.title, 'B', 'Newer snippet fields should still win conflicts');
});
