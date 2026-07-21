import { z } from "zod"

export function boundedGeneratedEvidence(maximum: number) {
  return z.preprocess(
    (value) => typeof value === "string" ? value.trim().slice(0, maximum) : value,
    z.string().min(3).max(maximum),
  )
}
