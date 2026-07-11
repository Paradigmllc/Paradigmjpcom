const PRIVATE_SURFACE_KEYS = new Set([
  "company_id",
  "companyId",
  "visits",
  "generator",
  "artifact_admin",
  "artifactAdmin",
  "diagnostic",
  "pain_diagnosis",
  "painDiagnosis",
  "dify_result",
  "difyResult",
  "visual_evidence",
  "visualEvidence",
  "tech_stack",
  "techStack",
  "design_spec",
  "api_key",
  "apiKey",
  "secret",
  "token",
])

export function sanitizePublicJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitizePublicJson)
  if (!value || typeof value !== "object") return value

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([key]) => !PRIVATE_SURFACE_KEYS.has(key))
      .map(([key, nested]) => [key, sanitizePublicJson(nested)]),
  )
}

export function sanitizePublicRecord(value: unknown): Record<string, unknown> {
  const sanitized = sanitizePublicJson(value)
  return sanitized && typeof sanitized === "object" && !Array.isArray(sanitized)
    ? sanitized as Record<string, unknown>
    : {}
}
