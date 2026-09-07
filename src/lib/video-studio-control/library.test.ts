import { describe, expect, it } from "vitest"
import { canonicalLibrary, libraryBlockers, librarySaveSchema, librarySpecSchema } from "./library"

export const fixtureSpec = { kind: "template" as const, name: "検証用の解説", genre: "解説", direction: "線図で説明する", limitations: "テスト用。実生成未確認", references: [], character: null,
  settings: { seed: null, steps: null, width: 1080, height: 1920, fps: 24, durationSeconds: 30 } }
export const fixtureInput = { operationId: "11111111-1111-4111-8111-111111111111", entryId: "11111111-1111-4111-8111-111111111111", parentVersionId: null, spec: fixtureSpec }

describe("immutable library contract", () => {
  it("accepts drafts without pretending reference declarations prove quality", () => {
    expect(librarySaveSchema.parse(fixtureInput)).toEqual(fixtureInput)
    expect(libraryBlockers(fixtureSpec)).toHaveLength(4)
    const declared = { ...fixtureSpec, references: [{ role: "composition" as const, assetId: "composition/v1", sha256: "a".repeat(64) }] }
    expect(libraryBlockers(declared)).toHaveLength(3)
    expect(libraryBlockers(declared).join()).toContain("未接続")
  })
  it.each(["../secret", "/etc/passwd", "https://a.test", "asset/../secret", "file?token=abc"])("rejects unsafe reference %s", (assetId) => {
    expect(librarySpecSchema.safeParse({ ...fixtureSpec, references: [{ role: "identity", assetId, sha256: "a".repeat(64) }] }).success).toBe(false)
  })
  it("rejects approval injection, invalid roots and duplicate references", () => {
    expect(librarySaveSchema.safeParse({ ...fixtureInput, approved: true }).success).toBe(false)
    expect(librarySaveSchema.safeParse({ ...fixtureInput, entryId: "22222222-2222-4222-8222-222222222222" }).success).toBe(false)
    const ref = { role: "model", assetId: "model-v1", sha256: "a".repeat(64) }
    expect(librarySpecSchema.safeParse({ ...fixtureSpec, references: [ref, ref] }).success).toBe(false)
  })
  it("requires adult fictional character details for character entries", () => {
    expect(librarySpecSchema.safeParse({ ...fixtureSpec, kind: "character" }).success).toBe(false)
    const character = { identityDescription: "架空の成人", wardrobe: "青いジャケット", adultFictional: true }
    expect(librarySpecSchema.safeParse({ ...fixtureSpec, kind: "character", character }).success).toBe(true)
    expect(librarySpecSchema.safeParse({ ...fixtureSpec, kind: "character", character: { ...character, adultFictional: false } }).success).toBe(false)
  })
  it("bounds compute declarations and identifies missing recipe pins", () => {
    expect(librarySpecSchema.safeParse({ ...fixtureSpec, settings: { ...fixtureSpec.settings, fps: 1000 } }).success).toBe(false)
    expect(libraryBlockers({ ...fixtureSpec, kind: "recipe" })).toContain("seed・steps未固定")
  })
  it("canonicalizes object order but preserves array order", () => {
    expect(canonicalLibrary({ b: 1, a: { y: 2, x: 1 } })).toBe(canonicalLibrary({ a: { x: 1, y: 2 }, b: 1 }))
    expect(canonicalLibrary([1, 2])).not.toBe(canonicalLibrary([2, 1]))
  })
})
