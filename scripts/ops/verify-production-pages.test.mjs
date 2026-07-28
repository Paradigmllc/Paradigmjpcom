#!/usr/bin/env node

import assert from "node:assert/strict"

import {
  findMissingMarkers,
  normalizePageText,
  probePage,
} from "./verify-production-pages.mjs"

const jaHtml = `<!doctype html><html><head><style>.x{display:block}</style><script>const hidden = "wrong"</script></head><body><h1>動画制作チームを、<span>採用せずに</span>。</h1><p>$1,500</p></body></html>`
const enHtml = `<!doctype html><html><body><h1>Your <strong>on-demand</strong> video production team.</h1><p>Questions&nbsp;before you subscribe</p></body></html>`

assert.equal(
  normalizePageText(jaHtml).compact.includes("動画制作チームを、採用せずに。"),
  true,
)
assert.deepEqual(
  findMissingMarkers(jaHtml, ["動画制作チームを、採用せずに。", "$1,500"]),
  [],
)
assert.deepEqual(
  findMissingMarkers(enHtml, [
    "Your on-demand video production team.",
    "Questions before you subscribe",
  ]),
  [],
)
assert.deepEqual(findMissingMarkers(enHtml, ["$5,500"]), ["$5,500"])

const okResult = await probePage({
  site: "https://example.test",
  pathname: "/en/video-as-a-service",
  markers: ["Your on-demand video production team."],
  fetchImpl: async () => new Response(enHtml, { status: 200 }),
})
assert.equal(okResult.ok, true)
assert.equal(okResult.status, 200)

const failedResult = await probePage({
  site: "https://example.test",
  pathname: "/en/video-as-a-service",
  markers: ["$5,500"],
  fetchImpl: async () => new Response(enHtml, { status: 200 }),
})
assert.equal(failedResult.ok, false)
assert.deepEqual(failedResult.missing, ["$5,500"])

console.log("verify-production-pages tests passed")
