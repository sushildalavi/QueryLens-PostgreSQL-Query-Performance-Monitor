// Playwright screenshot capture for QueryLens dashboard.
// Usage: node capture.mjs <fingerprint_id>
// Run from repo root with the dashboard already running on :3030.

import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fid = process.argv[2] || "";

const BASE = "http://localhost:3030";
const VIEWPORT = { width: 1440, height: 900 };
const OUT = __dirname;

mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: VIEWPORT,
  deviceScaleFactor: 2,
  colorScheme: "dark",
});
const page = await ctx.newPage();

async function snap(path, file, { fullPage = false, waitMs = 800 } = {}) {
  const url = `${BASE}${path}`;
  console.log(`→ ${url}`);
  await page.goto(url, { waitUntil: "networkidle" });
  // wait for animations to settle
  await page.waitForTimeout(waitMs);
  // make sure scroll is at top for full-page consistency
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(150);
  const dest = `${OUT}/${file}`;
  await page.screenshot({ path: dest, fullPage });
  console.log(`  saved ${dest}`);
}

await snap("/", "dashboard.png", { fullPage: true });
await snap("/regressions", "regressions.png", { fullPage: true });
if (fid) {
  await snap(`/queries/${fid}`, "query-detail.png", { fullPage: true });
} else {
  console.warn("no fingerprint id passed — skipping query-detail screenshot");
}

await browser.close();
console.log("done");
