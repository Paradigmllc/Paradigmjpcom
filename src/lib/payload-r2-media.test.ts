import { afterEach, describe, expect, it, vi } from "vitest"
import { createR2MediaStorage } from "./payload-r2-media"

const ENV_KEYS = [
  "CLOUDFLARE_R2_ACCOUNT_ID",
  "CLOUDFLARE_R2_ACCESS_KEY_ID",
  "CLOUDFLARE_R2_SECRET_ACCESS_KEY",
  "CLOUDFLARE_R2_MEDIA_BUCKET",
  "CLOUDFLARE_R2_MEDIA_PUBLIC_BASE_URL",
] as const

function setEnv(values: Partial<Record<(typeof ENV_KEYS)[number], string>>) {
  for (const key of ENV_KEYS) delete process.env[key]
  for (const [key, value] of Object.entries(values)) process.env[key] = value
}

afterEach(() => {
  setEnv({})
  vi.restoreAllMocks()
})

describe("createR2MediaStorage", () => {
  it("env が全て未設定ならローカル保存のままエラーも出さない", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {})
    setEnv({})
    expect(typeof createR2MediaStorage()).toBe("function")
    expect(spy).not.toHaveBeenCalled()
  })

  it("env が一部だけ設定されていたら握りつぶさずエラーログを出す", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {})
    setEnv({ CLOUDFLARE_R2_MEDIA_BUCKET: "paradigm-hp-media" })
    createR2MediaStorage()
    expect(spy).toHaveBeenCalledOnce()
    expect(String(spy.mock.calls[0]?.[0])).toContain("CLOUDFLARE_R2_ACCOUNT_ID")
  })

  it("空文字だけの env は未設定として扱う", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {})
    setEnv(Object.fromEntries(ENV_KEYS.map((key) => [key, "   "])))
    createR2MediaStorage()
    expect(spy).not.toHaveBeenCalled()
  })

  it("env が揃っていればプラグインを返す", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {})
    setEnv({
      CLOUDFLARE_R2_ACCOUNT_ID: "acct",
      CLOUDFLARE_R2_ACCESS_KEY_ID: "key",
      CLOUDFLARE_R2_SECRET_ACCESS_KEY: "secret",
      CLOUDFLARE_R2_MEDIA_BUCKET: "paradigm-hp-media",
      CLOUDFLARE_R2_MEDIA_PUBLIC_BASE_URL: "https://assets.paradigmjp.com/",
    })
    expect(typeof createR2MediaStorage()).toBe("function")
    expect(spy).not.toHaveBeenCalled()
  })
})
