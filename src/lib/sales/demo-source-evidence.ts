export function detectPublicSourceEvidence(input: unknown): string[] {
  const values: string[] = []
  const visit = (value: unknown, depth: number) => {
    if (depth > 6 || value == null) return
    if (typeof value === "string") {
      values.push(value.toLowerCase())
      return
    }
    if (Array.isArray(value)) {
      value.forEach((item) => visit(item, depth + 1))
      return
    }
    if (typeof value === "object") {
      Object.values(value as Record<string, unknown>).forEach((item) => visit(item, depth + 1))
    }
  }
  visit(input, 0)
  const joined = values.join("\n")
  return [
    /https?:\/\/(?:www\.)?(?:google\.[^/]+\/maps|maps\.google\.[^/]+|maps\.app\.goo\.gl)/u.test(joined) ? "google_maps" : null,
    /https?:\/\/(?:www\.)?instagram\.com\//u.test(joined) ? "instagram" : null,
    /https?:\/\/(?:www\.)?facebook\.com\//u.test(joined) ? "facebook" : null,
    /https?:\/\/(?:www\.)?tiktok\.com\//u.test(joined) ? "tiktok" : null,
    /https?:\/\/(?:www\.)?youtube\.com\//u.test(joined) ? "youtube" : null,
    /official_profile_link/u.test(joined) ? "official_profile" : null,
    /official_feed/u.test(joined) ? "official_feed" : null,
    /public_registry/u.test(joined) ? "public_registry" : null,
    /customer_provided/u.test(joined) ? "customer_provided" : null,
    /operator_verified/u.test(joined) ? "operator_verified" : null,
  ].filter((value): value is string => Boolean(value))
}
