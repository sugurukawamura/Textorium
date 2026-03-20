import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const ROOT_DIR = process.cwd();
const POPUP_FILE = path.join(ROOT_DIR, "popup.html");
const ARTIFACT_DIR = path.join(ROOT_DIR, "artifacts", "ui-functional");

function fileUrlForWindows(filePath) {
  const normalized = filePath.replace(/\\/g, "/");
  return `file:///${normalized}`;
}

async function run() {
  await fs.mkdir(ARTIFACT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();

  // Inject mock chrome API
  await context.addInitScript(() => {
    window.mockStorage = {
        settings: {},
        snippets: []
    };

    window.chrome = {
      runtime: {
        lastError: undefined
      },
      storage: {
        local: {
          get: (keys, callback) => {
            console.log('[MockStorage] get', keys);
            const result = {};
            if (typeof keys === 'string') {
              keys = [keys];
            }
            if (Array.isArray(keys)) {
              keys.forEach(key => {
                if (window.mockStorage[key] !== undefined) {
                    result[key] = window.mockStorage[key];
                }
              });
            } else if (typeof keys === 'object' && keys !== null) {
                 for (const [key, defaultValue] of Object.entries(keys)) {
                    result[key] = window.mockStorage[key] !== undefined ? window.mockStorage[key] : defaultValue;
                 }
            } else {
                 Object.assign(result, window.mockStorage);
            }
            console.log('[MockStorage] get result', result);
            setTimeout(() => callback(result), 0);
          },
          set: (items, callback) => {
            console.log('[MockStorage] set', items);
            Object.assign(window.mockStorage, items);
            if (callback) setTimeout(() => callback(), 0);
          }
        }
      }
    };
  });

  const page = await context.newPage();

  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err));

  const loadPage = async () => {
     await page.goto(fileUrlForWindows(POPUP_FILE));
     await page.evaluate(() => {
         window.mockStorage = { settings: {}, snippets: [] };
     });
     await page.reload();
     await page.waitForSelector('.app');
  };

  try {
    console.log("Starting functional tests...");

    // Initial Load
    await loadPage();

    // Test 1: Add Snippet
    console.log("Test: Add Snippet");
    await page.fill('#title', 'Test Snippet 1');
    await page.fill('#content', 'Content for snippet 1');
    await page.fill('#tagName', 'tag1');
    await page.click('#saveSnippetBtn');

    // Wait for update
    await page.waitForFunction(() => document.querySelectorAll('.snippet-item').length === 1);

    // Check if snippet appears in list
    const snippetTitle = await page.textContent('.snippet-item h3');
    assert.equal(snippetTitle, 'Test Snippet 1', 'Snippet title should match');

    // Check storage
    const storage = await page.evaluate(() => window.mockStorage);
    assert.equal(storage.snippets.length, 1, 'Storage should have 1 snippet');
    assert.equal(storage.snippets[0].title, 'Test Snippet 1');


    // Test 2: Search
    console.log("Test: Search");
    // Add another snippet
    await page.fill('#title', 'Second Snippet');
    await page.fill('#content', 'Content 2');
    await page.click('#saveSnippetBtn');

    // Wait for list to grow to 2
    await page.waitForFunction(() => document.querySelectorAll('.snippet-item').length === 2);

    // Verify 2 snippets
    let items = await page.$$('.snippet-item');
    assert.equal(items.length, 2, 'Should have 2 snippets before search');

    // Search for "Second"
    await page.fill('#searchInput', 'Second');
    // Trigger input event or click search (popup.js listens to input)
    await page.click('#searchBtn'); // Explicit click to be sure

    // Wait for list to shrink to 1
    await page.waitForFunction(() => document.querySelectorAll('.snippet-item').length === 1);

    // Verify 1 snippet
    items = await page.$$('.snippet-item');
    assert.equal(items.length, 1, 'Should have 1 snippet after search');
    const visibleTitle = await page.textContent('.snippet-item h3');
    assert.equal(visibleTitle, 'Second Snippet');

    // Clear search
    await page.click('#clearSearchBtn');

    // Wait for list to grow to 2
    await page.waitForFunction(() => document.querySelectorAll('.snippet-item').length === 2);
    items = await page.$$('.snippet-item');
    assert.equal(items.length, 2, 'Should have 2 snippets after clearing search');


    // Test 3: Delete
    console.log("Test: Delete");
    // Mock window.confirm to return true
    await page.evaluate(() => {
        window.confirm = () => true;
    });

    // Delete the first snippet (which should be 'Second Snippet' as it is newest)
    // Verify first item is indeed 'Second Snippet'
    const firstItemTitle = await page.textContent('.snippet-item:first-child h3');
    assert.equal(firstItemTitle, 'Second Snippet');

    // Click delete button of the first item (3rd button)
    await page.click('.snippet-item:first-child .snippet-actions button:nth-child(3)');

    // Wait for list to shrink to 1
    await page.waitForFunction(() => document.querySelectorAll('.snippet-item').length === 1);
    items = await page.$$('.snippet-item');
    assert.equal(items.length, 1, 'Should have 1 snippet after delete');
    const remainingTitle = await page.textContent('.snippet-item h3');
    assert.equal(remainingTitle, 'Test Snippet 1', 'Remaining snippet should be the first one');


    // Test 4: Favorite
    console.log("Test: Favorite");
    // Click favorite star on the remaining snippet
    const starBtn = page.locator('.snippet-item:first-child .snippet-head button');
    await starBtn.click();

    // Wait for star to become filled
    await page.waitForFunction(() => {
        const btn = document.querySelector('.snippet-item:first-child .snippet-head button');
        return btn && btn.textContent === '★';
    });

    // Verify storage update
    const favStorage = await page.evaluate(() => window.mockStorage);
    assert.equal(favStorage.snippets.length, 1);
    assert.equal(favStorage.snippets[0].favorite, true, 'Snippet should be favorited in storage');

    // Verify UI update (text content changes from ☆ to ★)
    const starText = await starBtn.textContent();
    assert.equal(starText, '★', 'Star button should show filled star');


    // Test 5: Edit
    console.log("Test: Edit");
    // Click edit button (2nd button in actions)
    await page.click('.snippet-item:first-child .snippet-actions button:nth-child(2)');

    // Edit form should be visible.
    const editContainer = page.locator('.snippet-item:first-child > div:last-child');
    const isHidden = await editContainer.evaluate(el => el.classList.contains('hidden'));
    assert.equal(isHidden, false, 'Edit container should be visible');

    // Change title
    const editTitleInput = editContainer.locator('input[type="text"]').first();
    await editTitleInput.fill('Updated Title');

    // Save (1st button in edit-actions)
    await editContainer.locator('.edit-actions button:first-child').click();

    // Wait for update
    await page.waitForFunction(() => {
        const title = document.querySelector('.snippet-item h3');
        return title && title.textContent === 'Updated Title';
    });

    // Verify update
    const updatedTitle = await page.textContent('.snippet-item h3');
    assert.equal(updatedTitle, 'Updated Title', 'Title should be updated');


    // Test 6: Theme Toggle
    console.log("Test: Theme Toggle");
    await page.click('#themeToggleBtn');

    // Wait for class change
    await page.waitForFunction(() => document.body.classList.contains('dark-mode'));
    const isDark = await page.evaluate(() => document.body.classList.contains('dark-mode'));
    assert.equal(isDark, true, 'Body should have dark-mode class');

    // Verify storage
    const settings = await page.evaluate(() => window.mockStorage.settings);
    assert.equal(settings.theme, 'dark', 'Settings should save theme as dark');

    console.log("All functional tests passed.");

  } catch (error) {
    console.error("Test failed:", error);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'failure.png'), fullPage: true });
    process.exit(1);
  } finally {
    await browser.close();
  }
}

run();
