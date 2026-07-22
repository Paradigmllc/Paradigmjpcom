import {
  groundRejectedManualMessageSentences,
  stripRejectedManualMessageSentences,
  type ManualMessageSimilarityReview,
} from "./manual-japan-entry-message-similarity"

interface FinalizableCandidate {
  message: string
  product_evidence_rendering: string
}

interface CandidateInspection<T extends FinalizableCandidate> {
  candidate: T
  safety: { passed: boolean }
  similarity: ManualMessageSimilarityReview
  usedRecovery: boolean
}

export function finalizeManualMessageUniqueness<
  T extends FinalizableCandidate,
  I extends CandidateInspection<T>,
>(input: {
  inspection: I
  companyName: string
  inspect: (candidate: T) => I
  maxPasses?: number
}): I {
  let current = input.inspection
  const maxPasses = input.maxPasses ?? 8

  for (let pass = 0; pass < maxPasses && !current.similarity.passed; pass += 1) {
    const alreadyGrounded = /Within the documented “[^”]+” scope,/i.test(current.candidate.message)
    const grounded = alreadyGrounded
      ? current.candidate.message
      : groundRejectedManualMessageSentences({
          message: current.candidate.message,
          reasons: current.similarity.reasons,
          companyName: input.companyName,
          productEvidence: current.candidate.product_evidence_rendering,
        })
    const nextMessage = grounded !== current.candidate.message
      ? grounded
      : stripRejectedManualMessageSentences(current.candidate.message, current.similarity.reasons)

    if (nextMessage === current.candidate.message) break
    current = input.inspect({ ...current.candidate, message: nextMessage })
  }

  return current
}
