import { describe, it, expect } from "vitest"
import { sanitizeBlocks } from "./hallucination-guard"

describe("sanitizeBlocks hallucination guard (Phase 6-4)", () => {
  it("strips unknown numeric props as likely hallucinated", () => {
    const blocks = [
      { type: "stat", props: { made_up_metric: 1234, label: "Revenue" } },
    ]
    const res = sanitizeBlocks(blocks, {})
    const out = res.blocks[0] as { props: Record<string, unknown> }
    expect(out.props.made_up_metric).toBeNull()
    expect(out.props.label).toBe("Revenue")
    expect(res.stripped_keys.length).toBeGreaterThan(0)
    expect(res.stripped_keys.some((k) => k.includes("made_up_metric"))).toBe(true)
  })

  it("keeps non-numeric props untouched", () => {
    const blocks = [{ type: "text", props: { body: "御社サイト", cta: "相談する" } }]
    const res = sanitizeBlocks(blocks, {})
    const out = res.blocks[0] as { props: Record<string, unknown> }
    expect(out.props.body).toBe("御社サイト")
    expect(out.props.cta).toBe("相談する")
    expect(res.stripped_keys.length).toBe(0)
  })

  it("returns an empty result for non-array input", () => {
    const res = sanitizeBlocks(null, {})
    expect(res.blocks).toEqual([])
    expect(res.total_blocks).toBe(0)
  })
})
