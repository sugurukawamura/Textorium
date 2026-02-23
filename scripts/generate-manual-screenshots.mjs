import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";

const ROOT_DIR = process.cwd();
const POPUP_FILE = path.join(ROOT_DIR, "popup.html");
const ARTIFACT_DIR = path.join(ROOT_DIR, "docs", "images");

// Ensure correct file protocol for Windows compatibility (if needed)
function fileUrl(filePath) {
  return pathToFileURL(filePath).href;
}

const MOCK_SNIPPETS = [
  {
    id: "id-1",
    title: "会議メモ / Meeting Notes",
    content: "来週のプロジェクト定例について\n・進捗確認\n・課題の洗い出し",
    tags: [{ name: "work", category: "office" }],
    favorite: true,
    createdAt: Date.now() - 100000,
    updatedAt: Date.now() - 100000
  },
  {
    id: "id-2",
    title: "買い物リスト / Shopping List",
    content: "牛乳\n卵\nパン",
    tags: [{ name: "home", category: "personal" }],
    favorite: false,
    createdAt: Date.now() - 200000,
    updatedAt: Date.now() - 200000
  },
  {
    id: "id-3",
    title: "コードスニペット",
    content: "console.log('Hello, World!');",
    tags: [{ name: "dev", category: "js" }],
    favorite: false,
    createdAt: Date.now() - 300000,
    updatedAt: Date.now() - 300000
  }
];

async function run() {
  console.log(`Generating screenshots in ${ARTIFACT_DIR}...`);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 400, height: 600 },
    deviceScaleFactor: 2 // High DPI for clearer screenshots
  });

  // Inject mock chrome API
  await context.addInitScript(() => {
    window.mockStorage = {
      snippets: [],
      settings: { language: 'ja', theme: 'light' } // Default to Japanese
    };

    window.chrome = {
      runtime: {
        lastError: null
      },
      storage: {
        local: {
          get: (keys, callback) => {
            const result = {};
            // Simulate async callback
            setTimeout(() => {
                if (Array.isArray(keys)) {
                keys.forEach(k => result[k] = window.mockStorage[k]);
                } else if (typeof keys === 'string') {
                result[keys] = window.mockStorage[keys];
                } else if (keys === null) {
                    // get all
                    Object.assign(result, window.mockStorage);
                } else {
                // object with default values
                Object.keys(keys).forEach(k => result[k] = window.mockStorage[k] !== undefined ? window.mockStorage[k] : keys[k]);
                }
                callback(result);
            }, 0);
          },
          set: (items, callback) => {
            Object.assign(window.mockStorage, items);
            if (callback) setTimeout(callback, 0);
          }
        }
      }
    };
  });

  const page = await context.newPage();

  // Helper to load page and wait for init
  const loadPage = async () => {
    await page.goto(fileUrl(POPUP_FILE));
    // Wait for the app to initialize (popup.js runs on load)
    await page.waitForTimeout(500);
  };

  // 1. Create Snippet View (with input)
  await loadPage();
  // Fill inputs
  await page.fill('#title', '新しいアイデア / New Idea');
  await page.fill('#content', 'ここに詳細を書く...\nWrite details here...');
  await page.fill('#tagName', 'idea');
  await page.fill('#tagCategory', 'personal');
  // Ensure "New Snippet" section is open
  const createSection = page.locator('details.section').first();
  if (!await createSection.getAttribute('open')) {
      await createSection.click();
  }
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, '01-create.png') });
  console.log('Captured 01-create.png');

  // 2. List View (populated)
  // Update mock storage directly via evaluate
  await page.evaluate((snippets) => {
    window.mockStorage.snippets = snippets;
  }, MOCK_SNIPPETS);

  // Reload to reflect changes
  await loadPage();

  // Close the "New Snippet" section to see the list better
  await createSection.evaluate(el => el.open = false);
  await page.waitForTimeout(200);

  await page.screenshot({ path: path.join(ARTIFACT_DIR, '02-list.png') });
  console.log('Captured 02-list.png');

  // 3. Search View
  await page.fill('#searchInput', '会議');
  await page.click('#searchBtn');
  await page.waitForTimeout(500); // Wait for filter to apply
  await page.screenshot({ path: path.join(ARTIFACT_DIR, '03-search.png') });
  console.log('Captured 03-search.png');

  // 4. Backup View
  // Clear search first to reset view
  await page.click('#clearSearchBtn');
  await page.waitForTimeout(200);

  // Open backup details
  // The backup section is the last details element.
  const details = page.locator('details.section');
  const backupSection = details.last();

  await backupSection.evaluate(el => el.open = true);
  await page.waitForTimeout(200);

  // Scroll to bottom to ensure it's visible
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(200);

  await page.screenshot({ path: path.join(ARTIFACT_DIR, '04-backup.png') });
  console.log('Captured 04-backup.png');

  await browser.close();

  // Update manual.html to use .png instead of .svg if present
  const manualPath = path.join(ROOT_DIR, 'docs', 'manual.html');
  try {
      const fs = await import('node:fs/promises');
      let manualContent = await fs.readFile(manualPath, 'utf-8');
      if (manualContent.includes('.svg')) {
          manualContent = manualContent.replace(/\.svg/g, '.png');
          await fs.writeFile(manualPath, manualContent);
          console.log('Updated docs/manual.html to link to .png screenshots.');
      }
  } catch (e) {
      console.warn('Could not update manual.html:', e.message);
  }
}

run().catch(err => {
    console.error(err);
    process.exit(1);
});
