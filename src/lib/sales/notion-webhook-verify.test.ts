/**
 * notion-webhook-verify.test.ts — Webhook 署名検証 + property 抽出の回帰テスト
 *
 * 守る不変条件:
 *   - 正しい鍵で計算した署名は通り、改竄/別鍵/欠落は弾く (security critical)
 *   - extractProperty が Notion の status / people 型を正しく抜ける (Kanban / 担当者)
 */

import { describe, it, expect } from "vitest"
import { createHmac } from "node:crypto"
import {
  computeNotionSignature,
  verifyNotionSignature,
} from "./notion-webhook-verify"
import { extractProperty } from "@/lib/notion"

const SECRET = "secret_token_abc123"
const BODY = JSON.stringify({ type: "page.properties_updated", entity: { id: "abc" } })

describe("verifyNotionSignature", () => {
  it("accepts a signature computed with the correct secret", () => {
    const sig = computeNotionSignature(BODY, SECRET)
    expect(verifyNotionSignature(BODY, sig, SECRET)).toBe(true)
  })

  it("matches Notion's documented scheme (sha256=<hmac hex>)", () => {
    const manual = "sha256=" + createHmac("sha256", SECRET).update(BODY, "utf8").digest("hex")
    expect(computeNotionSignature(BODY, SECRET)).toBe(manual)
  })

  it("rejects a tampered body", () => {
    const sig = computeNotionSignature(BODY, SECRET)
    expect(verifyNotionSignature(BODY + "x", sig, SECRET)).toBe(false)
  })

  it("rejects a signature made with a different secret", () => {
    const sig = computeNotionSignature(BODY, "wrong_secret")
    expect(verifyNotionSignature(BODY, sig, SECRET)).toBe(false)
  })

  it("rejects a missing header or empty secret", () => {
    expect(verifyNotionSignature(BODY, null, SECRET)).toBe(false)
    expect(verifyNotionSignature(BODY, computeNotionSignature(BODY, SECRET), "")).toBe(false)
  })
})

describe("extractProperty (status / people types)", () => {
  it("extracts a Notion status property (Kanban 用 商談ステージ)", () => {
    const props = { 商談ステージ: { type: "status", status: { name: "商談中" } } }
    expect(extractProperty(props, "商談ステージ")).toBe("商談中")
  })

  it("extracts the first person's name from a people property (担当者)", () => {
    const props = {
      担当者: { type: "people", people: [{ id: "u1", name: "田中" }, { id: "u2", name: "佐藤" }] },
    }
    expect(extractProperty(props, "担当者")).toBe("田中")
  })

  it("falls back to person id when name is absent", () => {
    const props = { 担当者: { type: "people", people: [{ id: "u1" }] } }
    expect(extractProperty(props, "担当者")).toBe("u1")
  })

  it("returns null for an empty people property", () => {
    const props = { 担当者: { type: "people", people: [] } }
    expect(extractProperty(props, "担当者")).toBeNull()
  })
})
