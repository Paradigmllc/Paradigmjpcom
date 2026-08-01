export function normalizeSalesCountryCode(countryCode: string): string {
  const key = countryCode.trim().toUpperCase()
  return key === "UK" ? "GB" : key
}
