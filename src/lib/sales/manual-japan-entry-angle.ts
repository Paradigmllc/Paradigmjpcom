import type { ManualJapanEntryWorkRow } from "./manual-japan-entry-types"

export const MANUAL_MESSAGE_ANGLES = [
  "problem",
  "competitor",
  "opportunity",
  "mockup",
] as const

export type ManualMessageAngle = (typeof MANUAL_MESSAGE_ANGLES)[number]
export type ManualMessageAngleSelection = ManualMessageAngle | "auto"

export const MANUAL_MESSAGE_ANGLE_LABELS: Record<ManualMessageAngle, string> = {
  problem: "問題提起型",
  competitor: "競合比較型",
  opportunity: "推定機会型",
  mockup: "モックアップ型",
}

export function isManualMessageAngle(value: unknown): value is ManualMessageAngle {
  return typeof value === "string" && MANUAL_MESSAGE_ANGLES.includes(value as ManualMessageAngle)
}

function stableHash(value: string): number {
  let hash = 2_166_136_261
  for (const character of value.toLowerCase()) {
    hash ^= character.charCodeAt(0)
    hash = Math.imul(hash, 16_777_619)
  }
  return hash >>> 0
}

export function assignManualMessageAngle(domain: string): ManualMessageAngle {
  const index = stableHash(`angle:${domain}`) % MANUAL_MESSAGE_ANGLES.length
  return MANUAL_MESSAGE_ANGLES[index] ?? "problem"
}

export function resolveManualMessageAngle(input: {
  requested: ManualMessageAngle
  hasVerifiedCompetitor: boolean
  hasModeledOpportunity: boolean
  hasPreparedPositioningConcept: boolean
}): { angle: ManualMessageAngle; fallbackReason: string | null } {
  if (input.requested === "competitor" && !input.hasVerifiedCompetitor) {
    return {
      angle: "problem",
      fallbackReason: "HTTPS公開根拠付きの日本市場競合が未検証のため、競合名を推測せず問題提起型へ変更しました。",
    }
  }
  if (input.requested === "opportunity" && !input.hasModeledOpportunity) {
    return {
      angle: "problem",
      fallbackReason: "公開rank根拠付きの推定機会レンジを作れなかったため、数字を出さず問題提起型へ変更しました。",
    }
  }
  if (input.requested === "mockup" && !input.hasPreparedPositioningConcept) {
    return {
      angle: "problem",
      fallbackReason: "保存済みの日本語ポジショニング案がないため、作成済みと主張せず問題提起型へ変更しました。",
    }
  }
  return { angle: input.requested, fallbackReason: null }
}

export interface ManualAngleMetric {
  angle: ManualMessageAngle
  assigned: number
  manuallySent: number
  replies: number
  founderForwards: number
  meetings: number
}

type AngleExperimentRow = Pick<
  ManualJapanEntryWorkRow,
  "message_angle" | "manually_sent_at" | "reply_received_at" | "founder_forwarded_at" | "meeting_converted_at"
>

export function summarizeManualWorkAngles(rows: AngleExperimentRow[]): ManualAngleMetric[] {
  return MANUAL_MESSAGE_ANGLES.map((angle) => {
    const matches = rows.filter((row) => row.message_angle === angle)
    return {
      angle,
      assigned: matches.length,
      manuallySent: matches.filter((row) => Boolean(row.manually_sent_at)).length,
      replies: matches.filter((row) => Boolean(row.reply_received_at)).length,
      founderForwards: matches.filter((row) => Boolean(row.founder_forwarded_at)).length,
      meetings: matches.filter((row) => Boolean(row.meeting_converted_at)).length,
    }
  })
}
