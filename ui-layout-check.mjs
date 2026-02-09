import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const ROOT_DIR = process.cwd();
const POPUP_FILE = path.join(ROOT_DIR, "popup.html");
const ARTIFACT_DIR = path.join(ROOT_DIR, "artifacts", "ui-layout");

const VIEWPORTS = [
  { width: 400, height: 640 },
  { width: 420, height: 700 }
];

function fileUrlForWindows(filePath) {
  const normalized = filePath.replace(/\\/g, "/");
  return `file:///${normalized}`;
}

async function run() {
  await fs.mkdir(ARTIFACT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const failures = [];

  try {
    for (const viewport of VIEWPORTS) {
      const context = await browser.newContext({ viewport });
      const page = await context.newPage();
      await page.goto(fileUrlForWindows(POPUP_FILE));
      await page.waitForTimeout(150);

      const metrics = await page.evaluate(() => {
        const doc = document.documentElement;
        const body = document.body;
        const app = document.querySelector(".app");
        const topbar = document.querySelector(".topbar");
        const addSection = document.querySelector("details.section");
        const searchSection = document.querySelector("section.section");

        return {
          scrollWidth: doc.scrollWidth,
          clientWidth: doc.clientWidth,
          bodyWidth: body.getBoundingClientRect().width,
          appWidth: app ? app.getBoundingClientRect().width : 0,
          topbarWidth: topbar ? topbar.getBoundingClientRect().width : 0,
          addSectionWidth: addSection ? addSection.getBoundingClientRect().width : 0,
          searchSectionWidth: searchSection ? searchSection.getBoundingClientRect().width : 0
        };
      });

      const screenshotPath = path.join(ARTIFACT_DIR, `${viewport.width}x${viewport.height}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });

      try {
        assert.ok(metrics.scrollWidth <= metrics.clientWidth + 1, `Horizontal overflow detected: ${JSON.stringify({ viewport, metrics })}`);
        const minExpectedBodyWidth = Math.min(viewport.width, 360) - 2;
        assert.ok(
          metrics.bodyWidth >= minExpectedBodyWidth,
          `Popup body width too small: ${JSON.stringify({ viewport, metrics, minExpectedBodyWidth })}`
        );
        const minExpectedSectionWidth = Math.min(viewport.width - 16, 340);
        assert.ok(
          metrics.topbarWidth >= minExpectedSectionWidth,
          `Topbar clipped: ${JSON.stringify({ viewport, metrics, minExpectedSectionWidth })}`
        );
        assert.ok(
          metrics.searchSectionWidth >= minExpectedSectionWidth,
          `Search section clipped: ${JSON.stringify({ viewport, metrics, minExpectedSectionWidth })}`
        );
      } catch (error) {
        failures.push(String(error.message || error));
      } finally {
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }

  if (failures.length > 0) {
    throw new Error(`UI layout check failed.\n${failures.join("\n")}`);
  }

  console.log("UI layout check passed.");
}

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
