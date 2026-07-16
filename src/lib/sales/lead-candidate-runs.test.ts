import { describe, expect, it } from "vitest"
import { leadCandidateRunLifecycle } from "./lead-candidate-runs"

describe("leadCandidateRunLifecycle", () => {
  it("never resurrects a cancelled run while refreshing counters", () => {
    expect(leadCandidateRunLifecycle({
      discovered: 42,
      verified: 18,
      verifyLimit: 100,
      failed: 3,
      cancelRequested: true,
    })).toEqual({ hasMore: false, status: "cancelled" })
  })

  it("keeps an unfinished active run running", () => {
    expect(leadCandidateRunLifecycle({
      discovered: 42,
      verified: 18,
      verifyLimit: 100,
      failed: 3,
      cancelRequested: false,
    })).toEqual({ hasMore: true, status: "running" })
  })

  it("marks terminal runs with failures as partial", () => {
    expect(leadCandidateRunLifecycle({
      discovered: 0,
      verified: 100,
      verifyLimit: 100,
      failed: 3,
      cancelRequested: false,
    })).toEqual({ hasMore: false, status: "partial" })
  })
})
