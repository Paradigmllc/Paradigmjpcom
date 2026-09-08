import { readFileSync } from "node:fs"
import { runInNewContext } from "node:vm"
import { describe, expect, it } from "vitest"

const source = readFileSync("services/video-factory/src/video_factory/static/console.js", "utf8").replaceAll("\r\n", "\n")
function evaluate(name: string, input: unknown): unknown {
  const start = source.indexOf(`function ${name}(`)
  if (start < 0) throw new Error(`Missing actual console function ${name}`)
  const end = source.indexOf("\n}", start) + 2
  if (end < start) throw new Error("Incomplete console function")
  return JSON.parse(runInNewContext(`${source.slice(start, end)}; JSON.stringify(${name}(input))`, { input }))
}

describe("actual console connection indicators", () => {
  it("never equates a configured URL with a successful connection", () => {
    const base = { runtime: { comfyui_base_url: "https://gpu.example" } }
    expect(evaluate("comfyConnectionSummary", base)).toMatchObject({ label: "接続未確認" })
    expect(evaluate("comfyConnectionSummary", { ...base, doctor: { comfyui: { reachable: false } } })).toMatchObject({ label: "接続不可" })
    expect(evaluate("comfyConnectionSummary", { ...base, doctor: { comfyui: { reachable: true } } })).toMatchObject({ label: "接続確認済み" })
    expect(evaluate("comfyConnectionSummary", { ...base, doctor: { comfyui: { reachable: "true" } } })).toMatchObject({ label: "接続未確認" })
    expect(evaluate("comfyConnectionSummary", {})).toMatchObject({ label: "未設定" })
  })
  it("marks a configured but unreachable or errored provider as unhealthy", () => {
    expect(evaluate("flattenHealth", { comfyui: { configured: true, reachable: false } })).toEqual([
      { name: "comfyui", ready: false, note: "check required" },
    ])
    expect(evaluate("flattenHealth", { comfyui: { configured: true, error: "connection refused" } })).toEqual([
      { name: "comfyui", ready: false, note: "connection refused" },
    ])
  })
})
