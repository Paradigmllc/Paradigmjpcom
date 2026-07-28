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
    ? "Paradigm's fixed Japan Entry launch fee is $15,000, with the standard $2,000/month managed-operation layer included for 90 days ($2,000/month × 3 months = $6,000 of value) for selected launch partners. "
    : ""
  return `${price}I can share a detailed Japan opportunity analysis based on this public evidence. Could you forward this to the founder or person responsible for international growth?`
}
