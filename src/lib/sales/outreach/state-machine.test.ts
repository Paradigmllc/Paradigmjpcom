/**
 * state-machine.test.ts — outreach 遷移ロジックの単体テスト (純関数)
 */

import { describe, it, expect } from "vitest"
import {
  isAllowedTransition,
  isTerminalStage,
  stageToPipelineStatus,
} from "./state-machine"

describe("outreach state-machine", () => {
  it("許可された遷移を通す", () => {
    expect(isAllowedTransition("queued", "discovering")).toBe(true)
    expect(isAllowedTransition("discovered", "classified_safe")).toBe(true)
    expect(isAllowedTransition("preflight_passed", "submitting")).toBe(true)
    expect(isAllowedTransition("submitting", "submitted")).toBe(true)
  })

  it("不正な遷移を拒否する", () => {
    expect(isAllowedTransition("queued", "submitted")).toBe(false)
    expect(isAllowedTransition("classified_skip", "submitting")).toBe(false)
    expect(isAllowedTransition("submitted", "queued")).toBe(false)
  })

  it("captcha は risky → manual_queue に escalate できる", () => {
    expect(isAllowedTransition("discovered", "classified_risky")).toBe(true)
    expect(isAllowedTransition("classified_risky", "manual_queue")).toBe(true)
  })

  it("終端ステージを正しく判定する", () => {
    expect(isTerminalStage("submitted")).toBe(true)
    expect(isTerminalStage("manual_queue")).toBe(true)
    expect(isTerminalStage("classified_skip")).toBe(true)
    expect(isTerminalStage("queued")).toBe(false)
    expect(isTerminalStage("submitting")).toBe(false)
  })

  it("ステージ → pipeline_status マッピング", () => {
    expect(stageToPipelineStatus("submitted")).toBe("sent")
    expect(stageToPipelineStatus("manual_queue")).toBe("manual_queue")
    expect(stageToPipelineStatus("classified_risky")).toBe("manual_queue")
    expect(stageToPipelineStatus("submit_uncertain")).toBe("manual_queue")
    expect(stageToPipelineStatus("submit_failed")).toBe("report_ready")
    expect(stageToPipelineStatus("classified_skip")).toBe("report_ready")
  })
})
