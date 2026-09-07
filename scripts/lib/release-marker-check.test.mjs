import assert from "node:assert/strict"
import test from "node:test"
import { missingReleaseMarkers } from "./release-marker-check.mjs"

test("accepts React text separators without changing required words or counts", () => {
  assert.deepEqual(missingReleaseMarkers("<h2>28<!-- --> distinct decisions</h2>", ["28 distinct decisions"], "text/html; charset=utf-8"), [])
  assert.deepEqual(missingReleaseMarkers("<h2>320<!----> published scenarios</h2>", ["320 published scenarios"], "text/html"), [])
})
test("still rejects wrong counts and absent markers", () => {
  assert.deepEqual(missingReleaseMarkers("<h2>27<!-- --> distinct decisions</h2>", ["28 distinct decisions"], "text/html"), ["28 distinct decisions"])
  assert.deepEqual(missingReleaseMarkers("<h2>28<!-- --> decisions</h2>", ["28 distinct decisions"], "text/html"), ["28 distinct decisions"])
})
test("does not normalize JSON, unknown content types, markup or arbitrary comments", () => {
  for (const type of ["application/json", "text/plain", ""]) {
    assert.deepEqual(missingReleaseMarkers('28<!-- --> distinct decisions', ["28 distinct decisions"], type), ["28 distinct decisions"])
  }
  for (const body of ["28<!-- hidden --> distinct decisions", "28</h2><p> distinct decisions"]) {
    assert.deepEqual(missingReleaseMarkers(body, ["28 distinct decisions"], "text/html"), ["28 distinct decisions"])
  }
})
