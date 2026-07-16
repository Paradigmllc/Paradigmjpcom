export interface JapanEntryInitialInterestOptions {
  includeEstimate: boolean
  includePrice: boolean
  founderForwardCta: boolean
}

export const DEFAULT_INITIAL_INTEREST_OPTIONS: JapanEntryInitialInterestOptions = {
  includeEstimate: false,
  includePrice: false,
  founderForwardCta: false,
}

export function initialInterestClose(options: JapanEntryInitialInterestOptions): string {
  if (!options.founderForwardCta) {
    return "If useful, I can share a more detailed Japan opportunity analysis based on public evidence. Would you be open to receiving it?"
  }
  const price = options.includePrice
    ? "Paradigm's fixed Japan Entry launch fee is $12,000, with the first six months of managed support included at no additional monthly charge. "
    : ""
  return `${price}I can share a one-page Japan Opportunity Snapshot based on this public evidence. Could you forward this to the founder or person responsible for international growth?`
}
