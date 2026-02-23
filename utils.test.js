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

test('mergeSnippets keeps the first argument id even if second id differs', () => {
  const merged = mergeSnippets(
    { id: 'id-a', title: 'A', content: 'A', createdAt: 10, updatedAt: 10 },
    { id: 'id-b', title: 'B', content: 'B', createdAt: 20, updatedAt: 20 },
    30
  );

  assert.strictEqual(merged.id, 'id-a');
  assert.strictEqual(merged.title, 'B', 'Field conflicts should still prefer the newer snippet');
});

test('mergeSnippets treats equal updatedAt as preferring second snippet fields', () => {
  const merged = mergeSnippets(
    { id: 'id-1', title: 'From A', content: 'A', createdAt: 10, updatedAt: 1000 },
    { id: 'id-1', title: 'From B', content: 'B', createdAt: 20, updatedAt: 1000 },
    2000
  );

  assert.strictEqual(merged.title, 'From B');
  assert.strictEqual(merged.content, 'B');
});

test('mergeSnippets normalizes tags and drops invalid tag entries', () => {
  const merged = mergeSnippets(
    {
      id: 'id-1',
      title: 'A',
      content: 'A',
      createdAt: 100,
      updatedAt: 100,
      tags: [
        { name: ' Work ', category: '  ' },
        { name: '', category: 'bad' },
        null
      ]
    },
    {
      id: 'id-1',
      title: 'B',
      content: 'B',
      createdAt: 200,
      updatedAt: 200,
      tags: [
        { name: 'work', category: 'general' },
        { name: 'Meet', category: 'Team' }
      ]
    },
    300
  );

  assert.deepStrictEqual(merged.tags, [
    { name: 'Work', category: 'general' },
    { name: 'Meet', category: 'Team' }
  ]);
});

test('mergeSnippets falls back to current time when updatedAt override is invalid', () => {
  const before = Date.now();
  const merged = mergeSnippets(
    { id: 'id-1', title: 'A', content: 'A', createdAt: 50, updatedAt: 10 },
    { id: 'id-1', title: 'B', content: 'B', updatedAt: 20 },
    null
  );
  const after = Date.now();

  assert.ok(merged.updatedAt >= before && merged.updatedAt <= after);
  assert.strictEqual(merged.createdAt, 50, 'Missing createdAt on one side should keep the existing timestamp');
});

test('mergeSnippets handles null or undefined inputs gracefully', () => {
  const snippet = { id: 'id-1', title: 'A', content: 'A' };

  // mergeSnippets(null, snippet) -> should return something like snippet
  const merged1 = mergeSnippets(null, snippet);
  assert.strictEqual(merged1.title, 'A');
  assert.strictEqual(merged1.content, 'A');

  // mergeSnippets(snippet, null) -> should return something like snippet
  const merged2 = mergeSnippets(snippet, null);
  assert.strictEqual(merged2.title, 'A');
  assert.strictEqual(merged2.content, 'A');

  // mergeSnippets(null, null) -> should return a safe empty object
  const merged3 = mergeSnippets(null, null);
  assert.ok(merged3);
  assert.strictEqual(typeof merged3, 'object');
  assert.deepStrictEqual(merged3.tags, []);
  assert.strictEqual(merged3.favorite, false);
});
