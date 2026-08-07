import { describe, expect, it } from "vitest"

import { getVastInstanceState, resolveVastPortUrl, type VastInstance } from "./vast-client"

/**
 * 実際の /api/v0/instances/ 応答から採ったフィールド構成。
 * 以前このコードは存在しない `status` フィールドを見ていたため、
 * どの状態でも「停止中」と判定していた。
 */
function instance(overrides: Partial<VastInstance> = {}): VastInstance {
  return {
    id: 46258780,
    label: "paradigm-comfyui",
    actual_status: "exited",
    cur_state: "stopped",
    intended_status: "stopped",
    gpu_name: "RTX 3090",
    num_gpus: 1,
    gpu_ram: 24576,
    vcpu_count: 8,
    ram: 32768,
    disk_space: 90.2,
    dph_total: 0.1317,
    image_uuid: "vastai/aio-studio:2026-04-16",
    ssh_host: "ssh7.vast.ai",
    ssh_port: 18780,
    public_ipaddr: "95.86.4.209",
    ports: null,
    jupyter_token: null,
    jupyter_port: null,
    actual_uptime: 0,
    machine_id: 135008,
    geolocation: null,
    ...overrides,
  }
}

describe("getVastInstanceState", () => {
  it("稼働中を running と判定する", () => {
    expect(getVastInstanceState(instance({ actual_status: "running", cur_state: "running" }))).toBe("running")
  })

  it("停止中を stopped と判定する", () => {
    expect(getVastInstanceState(instance())).toBe("stopped")
  })

  it("起動処理中を pending と判定する", () => {
    expect(getVastInstanceState(instance({ actual_status: "loading", cur_state: "loading" }))).toBe("pending")
    expect(getVastInstanceState(instance({ actual_status: null, cur_state: "creating" }))).toBe("pending")
  })

  it("状態が空なら unknown を返す", () => {
    expect(getVastInstanceState(instance({ actual_status: null, cur_state: null }))).toBe("unknown")
  })
})

describe("resolveVastPortUrl", () => {
  const running = instance({
    actual_status: "running",
    cur_state: "running",
    ports: { "8188/tcp": [{ HostIp: "0.0.0.0", HostPort: "40251" }] },
  })

  it("動的に割り当てられた外部ポートでURLを組み立てる", () => {
    expect(resolveVastPortUrl(running, 8188)).toBe("http://95.86.4.209:40251")
  })

  it("公開されていないポートには null を返す", () => {
    // localhost などの当て推量を返さないことが重要。
    // 到達不能なURLを返すと ComfyUI クライアントに設定されて全生成が黙って失敗する。
    expect(resolveVastPortUrl(running, 7860)).toBeNull()
  })

  it("ポート情報がまだ無ければ null を返す", () => {
    expect(resolveVastPortUrl(instance({ actual_status: "running", ports: null }), 8188)).toBeNull()
  })

  it("グローバルIPが無ければ null を返す", () => {
    expect(
      resolveVastPortUrl(instance({ public_ipaddr: null, ports: { "8188/tcp": [{ HostPort: "40251" }] } }), 8188),
    ).toBeNull()
  })

  it("プロトコルを指定できる", () => {
    expect(resolveVastPortUrl(running, 8188, "https")).toBe("https://95.86.4.209:40251")
  })
})
