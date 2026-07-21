import type { JapanEntryMessagePurpose } from "./japan-entry-personalized-message-prompts"

export function buildPersonalizedMessageRepairInput<T>(input: {
  candidate: T
  issues: string[]
  wordCount: number
  purpose: JapanEntryMessagePurpose
  includePrice: boolean
  editorialFeedback?: string
}) {
  const requiredBodyWordRange = input.purpose === "initial_interest"
    ? { min: input.includePrice ? 145 : 120, max: input.includePrice ? 210 : 190, target: input.includePrice ? 175 : 150 }
    : undefined
  const lengthIssue = requiredBodyWordRange && (input.wordCount < requiredBodyWordRange.min || input.wordCount > requiredBodyWordRange.max)
    ? `Deterministic body count is ${input.wordCount} words. Rewrite all four body paragraphs to approximately ${requiredBodyWordRange.target} words and verify the final body stays within ${requiredBodyWordRange.min}-${requiredBodyWordRange.max} words. Preserve the supplied facts and exact anchors; add no new claim merely to increase length.`
    : null
  return {
    candidate: input.candidate,
    issues: lengthIssue ? [lengthIssue, ...input.issues] : input.issues,
    editorialFeedback: input.editorialFeedback,
    measuredBodyWordCount: input.purpose === "initial_interest" ? input.wordCount : undefined,
    requiredBodyWordRange,
  }
}
