import { resolveDifyWorkflowKey, normalizeDifyCloudBaseUrl } from "@/lib/sales/dify-cloud"

export type ReplyIntent = "interested" | "not_interested" | "needs_info" | "unsubscribe" | "auto_reply" | "unknown"

export interface ReplyClassification {
  intent: ReplyIntent
  confidence: "high" | "medium" | "low"
  shouldFollowUp: boolean
  shouldNotifyOperator: boolean
  queueType: "follow_up" | "crm_update" | null
  summary: string
  raw: string | null
}

// ── Tier 1: Regex-based intent classification ──
const INTENT_PATTERNS: Array<{ intent: ReplyIntent; patterns: RegExp[] }> = [
  {
    intent: "unsubscribe",
    patterns: [
      /\b(?:unsubscribe|配信停止|退会|解除)\b/i,
      /\b(?:remove|do not (?:contact|email)|stop (?:emailing|contacting))\b/i,
    ],
  },
  {
    intent: "interested",
    patterns: [
      /\b(?:interested|興味|関心|検討|前向き|positive|sounds good|let'?s (?:talk|chat|discuss|schedule|meet))\b/i,
      /\b(?:please (?:contact|call|reach out)|send (?:more|details|info|quote|proposal))\b/i,
      /\b(?:見積|お見積|相談|詳細|資料|デモ|面談)\b/,
    ],
  },
  {
    intent: "needs_info",
    patterns: [
      /\b(?:question|質問|教えて|わかりません|わからない|詳しく|もう少し)\b/i,
      /\b(?:what|how|when|where|who|why|explain|clarify|elaborate)\b/i,
      /\b(?:料金|価格|費用|価格表|プラン|period|cost|price|budget)\b/i,
    ],
  },
  {
    intent: "not_interested",
    patterns: [
      /\b(?:not interested|興味なし|不要|結構|間に合|not at this time|no thanks)\b/i,
      /\b(?:sorry|ごめん|申し訳|busy|not now|maybe later)\b/i,
    ],
  },
  {
    intent: "auto_reply",
    patterns: [
      /\b(?:out of office|不在|自動返信|auto.?reply|vacation|休暇|休み)\b/i,
      /\b(?:i am (?:currently )?(?:away|out|on leave))\b/i,
    ],
  },
]

function classifyByRegex(text: string): ReplyIntent {
  const lower = text.toLowerCase()
  for (const entry of INTENT_PATTERNS) {
    if (entry.patterns.some((p) => p.test(lower))) return entry.intent
  }
  return "unknown"
}

function estimateConfidence(intent: ReplyIntent, text: string): ReplyClassification["confidence"] {
  if (intent === "auto_reply" || intent === "unsubscribe") return "high"
  if (intent === "unknown") return "low"
  if (text.length < 30) return "low"
  if (text.length > 200) return "high"
  return "medium"
}

function queueTypeForIntent(intent: ReplyIntent): ReplyClassification["queueType"] {
  switch (intent) {
    case "interested":
    case "needs_info":
      return "follow_up"
    case "unsubscribe":
    case "not_interested":
      return "crm_update"
    default:
      return null
  }
}

// ── Tier 2: Dify Cloud freelance-autoreply workflow ──
async function classifyByDifyAutoreply(address: string, message: string): Promise<{ intent: ReplyIntent; raw: string | null }> {
  const envName = resolveDifyWorkflowKey(["freelanceAutoreply"])
  if (!envName) return { intent: "unknown", raw: null }
  const key = process.env[envName]
  if (!key) return { intent: "unknown", raw: null }

  const baseUrl = normalizeDifyCloudBaseUrl(process.env.DIFY_BASE_URL)
  const endpoint = `${baseUrl}/v1/workflows/run`

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        inputs: {
          from_address: address,
          message_body: message,
        },
        response_mode: "blocking",
        user: `revenue-os-reply-${address}`,
      }),
      signal: AbortSignal.timeout(30_000),
    })

    if (!res.ok) {
      console.error("[reply-classifier] Dify autoreply HTTP", res.status)
      return { intent: "unknown", raw: null }
    }

    const data = (await res.json()) as { data?: { outputs?: { result?: string; intent?: string } } }
    const result = data?.data?.outputs?.result ?? data?.data?.outputs?.intent ?? null
    const raw = typeof result === "string" ? result : JSON.stringify(data)

    const recognized = INTENT_PATTERNS.find((e) => e.intent === result)
    return { intent: recognized ? (result as ReplyIntent) : "unknown", raw }
  } catch (e) {
    console.error("[reply-classifier] Dify autoreply failed:", e instanceof Error ? e.message : String(e))
    return { intent: "unknown", raw: null }
  }
}

// ── Public API ──
export async function classifyReply(address: string, subject: string, body: string): Promise<ReplyClassification> {
  const text = `${subject} ${body}`.trim()
  const regexIntent = classifyByRegex(text)

  if (regexIntent !== "unknown" && regexIntent !== "needs_info") {
    return {
      intent: regexIntent,
      confidence: estimateConfidence(regexIntent, text),
      shouldFollowUp: regexIntent === "interested",
      shouldNotifyOperator: regexIntent === "interested" || regexIntent === "unsubscribe",
      queueType: queueTypeForIntent(regexIntent),
      summary: `reply_intent=${regexIntent} (regex, confidence=${estimateConfidence(regexIntent, text)})`,
      raw: null,
    }
  }

  const dify = await classifyByDifyAutoreply(address, text)
  const intent = dify.intent !== "unknown" ? dify.intent : regexIntent

  return {
    intent,
    confidence: estimateConfidence(intent, text),
    shouldFollowUp: intent === "interested" || intent === "needs_info",
    shouldNotifyOperator: intent === "interested" || intent === "unsubscribe" || intent === "unknown",
    queueType: queueTypeForIntent(intent),
    summary: `reply_intent=${intent} (dify=${dify.intent !== "unknown" ? "classified" : "unknown"}, regex=${regexIntent})`,
    raw: dify.raw,
  }
}
