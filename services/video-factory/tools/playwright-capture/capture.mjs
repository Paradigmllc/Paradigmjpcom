#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { chromium } from "playwright";

function arg(name, fallback = null) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

const targetUrl = arg("url");
const output = arg("output");
const actionsPath = arg("actions");
const width = Number(arg("width", "1920"));
const height = Number(arg("height", "1080"));
const durationMs = Number(arg("duration-ms", "3000"));
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined;

if (!targetUrl || !output) {
  throw new Error("--url and --output are required");
}
const parsed = new URL(targetUrl);
if (!["http:", "https:"].includes(parsed.protocol)) {
  throw new Error("Only http and https URLs are allowed");
}

const allowed = (process.env.PLAYWRIGHT_ALLOWED_HOSTS || "")
  .split(",")
  .map((value) => value.trim().toLowerCase())
  .filter(Boolean);
if (allowed.length > 0 && !allowed.includes(parsed.hostname.toLowerCase())) {
  throw new Error(`Host is not allow-listed: ${parsed.hostname}`);
}

const actions = actionsPath ? JSON.parse(await fs.readFile(actionsPath, "utf8")) : [];
const videoDir = path.resolve(path.dirname(output), `.recording-${Date.now()}`);
await fs.mkdir(videoDir, { recursive: true });

const browser = await chromium.launch({ executablePath, headless: true });
const context = await browser.newContext({
  viewport: { width, height },
  recordVideo: { dir: videoDir, size: { width, height } },
});
const page = await context.newPage();
const video = page.video();

try {
  await page.goto(targetUrl, { waitUntil: "networkidle", timeout: 60_000 });
  for (const action of actions) {
    switch (action.type) {
      case "click":
        await page.locator(action.selector).click();
        break;
      case "fill":
        await page.locator(action.selector).fill(String(action.value ?? ""));
        break;
      case "press":
        await page.locator(action.selector || "body").press(action.key);
        break;
      case "scroll":
        await page.evaluate(
          (y) => window.scrollBy({ top: y, behavior: "instant" }),
          Number(action.y || 0),
        );
        break;
      case "wait":
        await page.waitForTimeout(Number(action.milliseconds || 0));
        break;
      case "waitFor":
        await page.locator(action.selector).waitFor({ state: action.state || "visible" });
        break;
      default:
        throw new Error(`Unsupported action type: ${action.type}`);
    }
  }
  await page.waitForTimeout(durationMs);
} finally {
  await context.close();
  await browser.close();
}

if (!video) throw new Error("Playwright did not create a video recorder");
const recorded = await video.path();
await fs.mkdir(path.dirname(output), { recursive: true });
await fs.rename(recorded, output);
await fs.rm(videoDir, { recursive: true, force: true });
console.log(output);
