import fs from "node:fs/promises";
import path from "node:path";
import { build } from "esbuild";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";
import { chromium } from "@playwright/test";
const destination = process.argv[2];
if (!destination || !path.isAbsolute(destination))
  throw new Error("Provide an absolute evidence directory");
await fs.mkdir(destination, { recursive: true });
const root = process.cwd();
const bundle = await build({
  stdin: {
    contents: `import React from 'react';import {createRoot} from 'react-dom/client';import {Toaster} from 'sonner';import {ShopifyOperationsPanel} from './src/components/shopify-ops/ShopifyOperationsPanel';createRoot(document.getElementById('app')).render(<><Toaster/><ShopifyOperationsPanel/></>);`,
    resolveDir: root,
    loader: "tsx",
  },
  bundle: true,
  write: false,
  format: "iife",
  platform: "browser",
  jsx: "automatic",
  define: { "process.env.NODE_ENV": '"production"' },
});
const styles = await postcss([tailwind()]).process(
  '@import "tailwindcss"; @source "../src/components/shopify-ops/ShopifyOperationsPanel.tsx"; @source "../src/components/shopify-ops/ShopifyOperationsLinks.tsx";',
  { from: path.join(root, "scripts/sericia-fixture.css") },
);
const now = "2026-10-02T00:00:00Z";
const base = { source_updated_at: now, received_at: now, deleted: false };
const dashboard = {
  shop: "fixture.myshopify.com",
  webhookConfigured: true,
  warehouseConfigured: false,
  hasMore: false,
  events: [],
  snapshots: [
    {
      ...base,
      kind: "product",
      entity_id: "1",
      data: { id: "1", title: "Fixture Sencha", status: "draft" },
    },
    {
      ...base,
      kind: "order",
      entity_id: "2",
      data: {
        id: "2",
        name: "#FIXTURE-2",
        financial_status: "paid",
        fulfillment_status: null,
      },
    },
    {
      ...base,
      kind: "fulfillment",
      entity_id: "3",
      data: {
        id: "3",
        order_id: "2",
        status: "success",
        shipment_status: null,
      },
    },
  ],
};
const browser = await chromium.launch({ headless: true, channel: "chrome" });
let fail = false;
const calls = [];
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("http://sericia-fixture.test/**", async (route) => {
    const request = route.request(),
      url = new URL(request.url());
    if (url.pathname === "/api/shopify-ops/operations") {
      if (request.method() === "GET")
        return route.fulfill({
          status: fail ? 503 : 200,
          json: fail
            ? { ok: false, error: "Fixture connection failure" }
            : { ok: true, dashboard },
        });
      const input = request.postDataJSON();
      calls.push(input);
      const result =
        input.action === "status"
          ? {
              topics: [
                {
                  topic: "PRODUCTS_UPDATE",
                  permitted: true,
                  subscribed: false,
                },
                {
                  topic: "ORDERS_UPDATED",
                  permitted: false,
                  subscribed: false,
                },
              ],
            }
          : input.action === "reconcile"
            ? {
                count: input.cursor ? 1 : 50,
                cursor: input.cursor ? null : "next-page",
              }
            : { count: 1, cursor: null };
      return route.fulfill({ json: { ok: true, result } });
    }
    if (url.pathname === "/bundle.js")
      return route.fulfill({
        contentType: "text/javascript",
        body: bundle.outputFiles[0].text,
      });
    if (url.pathname === "/style.css")
      return route.fulfill({ contentType: "text/css", body: styles.css });
    return route.fulfill({
      contentType: "text/html",
      body: '<!doctype html><html lang="ja"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SERICIA isolated UI test</title><link rel="stylesheet" href="/style.css"><body style="padding:16px;background:#f7f7f5"><div id="app"></div><script src="/bundle.js"></script></body></html>',
    });
  });
  await page.goto("http://sericia-fixture.test/");
  await page.getByText("#FIXTURE-2", { exact: true }).waitFor();
  await page
    .getByRole("button", { name: "接続状況を確認", exact: true })
    .click();
  await page
    .getByText("ORDERS_UPDATED: Shopify権限が必要", { exact: true })
    .waitFor();
  await page.getByRole("button", { name: "商品を再取得", exact: true }).click();
  await page
    .getByRole("button", { name: "残りの商品を取得", exact: true })
    .click();
  await page.getByText(/今回の商品取得 51件/).waitFor();
  await page
    .getByRole("button", { name: "注文・発送を再取得", exact: true })
    .click();
  await page.getByText(/注文取得 1件/).waitFor();
  await page
    .getByRole("button", { name: "Shopify在庫を再取得", exact: true })
    .click();
  await page.getByText(/在庫品目取得 1件/).waitFor();
  await page.getByRole("button", { name: "商品", exact: true }).click();
  await page.getByText("Fixture Sencha", { exact: true }).waitFor();
  await page.getByRole("textbox", { name: "同期情報を検索" }).fill("missing");
  await page
    .getByText("検索条件に一致する記録がありません。", { exact: true })
    .waitFor();
  await page.getByRole("textbox", { name: "同期情報を検索" }).fill("");
  await page.getByRole("button", { name: "発送・配達", exact: true }).click();
  await page.getByText("出荷登録済み（配達未確認）", { exact: true }).waitFor();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  if (overflow) throw new Error("Mobile horizontal overflow");
  await page.screenshot({
    path: path.join(destination, "operations-mobile.png"),
    fullPage: true,
  });
  fail = true;
  await page
    .getByRole("button", { name: "同期状況を再読み込み", exact: true })
    .click();
  await page.getByRole("alert").waitFor();
  fail = false;
  await page
    .getByRole("button", { name: "同期状況を再読み込み", exact: true })
    .click();
  await page.getByRole("alert").waitFor({ state: "detached" });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({
    path: path.join(destination, "operations-desktop.png"),
    fullPage: true,
  });
  if (errors.length) throw new Error(errors.join("\n"));
  if (!calls.some((c) => c.cursor === "next-page"))
    throw new Error("Pagination cursor was not submitted");
  await fs.writeFile(
    path.join(destination, "operations-ui.json"),
    JSON.stringify(
      {
        passed: true,
        fixtureOnly: true,
        mobileOverflow: overflow,
        uncaughtErrors: errors,
        calls,
      },
      null,
      2,
    ),
  );
  console.info(
    "PASS: isolated operations UI, mobile/desktop, search, scope state, cursor continuation, error/recovery; no live side effects",
  );
} finally {
  await browser.close();
}
