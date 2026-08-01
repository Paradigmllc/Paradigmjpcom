import { describe, expect, it } from "vitest"
import { safeState } from "./video-factory-vast-bootstrap-runtime"
import {
  isJsonRecord,
  jsonArray,
  jsonNumber,
  jsonString,
} from "./video-factory-vast-json"

describe("Video Factory Vast bootstrap safety", () => {
  it("never exposes the managed proxy credential in public state", () => {
    const state = safeState({
      instance_id: 46258780,
      comfyui_base_url: "https://example.invalid:18189",
      proxy_key: "do-not-return-this-value",
    })

    expect(state.proxy_key_configured).toBe(true)
    expect(JSON.stringify(state)).not.toContain("do-not-return-this-value")
    expect(state).not.toHaveProperty("proxy_key")
  })

  it("narrows untrusted marketplace JSON without coercing objects", () => {
    expect(isJsonRecord({ id: 42 })).toBe(true)
    expect(isJsonRecord(["not", "a", "record"])).toBe(false)
    expect(jsonArray({})).toEqual([])
    expect(jsonNumber("0.131722")).toBeCloseTo(0.131722)
    expect(jsonNumber({ value: 1 })).toBeNull()
    expect(jsonString("  RTX 3090  ")).toBe("RTX 3090")
  })
})
