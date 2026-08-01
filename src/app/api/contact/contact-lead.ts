import { getSalesSupabaseConfig } from "@/lib/supabase"

export interface ContactLeadInsert {
  business_name: string
  email: string
  phone: string | null
  country: string
  industry: string
  pipeline_stage: "new"
  region: string
  meta: Record<string, unknown>
}

export interface ContactNotificationOutbox {
  title: string
  message: string
  link: string | null
  type:
    | "japan_entry_application"
    | "video_service_application"
    | "contact_inquiry"
  region: "jp" | "global"
  priority: number
  slack_text: string
}

export interface PersistedContactLead {
  id: string
  meta: Record<string, unknown>
  created: boolean
  outboxId: string
  notificationClaimed: boolean
  notificationClaimToken: string | null
  notificationStatus: ContactNotificationStatus
}

export interface ContactStorageConfig {
  restBaseUrl: string
  serviceKey: string
}

export class ContactChallengeReplayError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ContactChallengeReplayError"
  }
}

export type ContactNotificationStatus =
  | "pending"
  | "processing"
  | "complete"
  | "degraded"

interface ContactSubmissionRepresentation {
  lead_id?: unknown
  lead_meta?: unknown
  operator_queue_item_id?: unknown
  created?: unknown
  notification_claimed?: unknown
  notification_claim_token?: unknown
  notification_status?: unknown
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function normalizeRestBaseUrl(url: string): string {
  const normalized = url.replace(/\/+$/, "")
  if (normalized.endsWith("/rest/v1")) return normalized

  const parsed = new URL(normalized)
  const directPostgrestFlag = process.env.SALES_SUPABASE_DIRECT_POSTGREST
  const directPostgrest =
    /supabase-rest-1(?::3000)?$/i.test(parsed.host) ||
    (directPostgrestFlag ? /^(1|true|yes)$/i.test(directPostgrestFlag) : false)
  return directPostgrest ? normalized : `${normalized}/rest/v1`
}

export function requireContactStorageConfig(): ContactStorageConfig {
  const config = getSalesSupabaseConfig()
  if (!config) {
    throw new Error(
      "Contact lead storage is not configured: set NEXT_PUBLIC_SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY or SALES_SUPABASE_URL/SALES_SUPABASE_SERVICE_ROLE_KEY",
    )
  }
  return {
    restBaseUrl: normalizeRestBaseUrl(config.url),
    serviceKey: config.serviceKey,
  }
}

function requestHeaders(
  config: ContactStorageConfig,
  prefer?: string,
): HeadersInit {
  return {
    "Content-Type": "application/json",
    apikey: config.serviceKey,
    Authorization: `Bearer ${config.serviceKey}`,
    ...(prefer ? { Prefer: prefer } : {}),
  }
}

async function responseFailure(response: Response): Promise<string> {
  const body = await response.text()
  const detail = body.trim().slice(0, 500)
  return detail
    ? `HTTP ${response.status}: ${detail}`
    : `HTTP ${response.status}`
}

function isNotificationStatus(
  value: unknown,
): value is ContactNotificationStatus {
  return (
    value === "pending" ||
    value === "processing" ||
    value === "complete" ||
    value === "degraded"
  )
}

function parseSubmissionRepresentation(
  value: unknown,
  context: string,
): PersistedContactLead {
  const candidate = (Array.isArray(value) ? value[0] : value) as
    | ContactSubmissionRepresentation
    | undefined
  if (
    !candidate ||
    typeof candidate !== "object" ||
    (typeof candidate.lead_id !== "string" &&
      typeof candidate.lead_id !== "number") ||
    (typeof candidate.operator_queue_item_id !== "string" &&
      typeof candidate.operator_queue_item_id !== "number") ||
    typeof candidate.created !== "boolean" ||
    typeof candidate.notification_claimed !== "boolean" ||
    (candidate.notification_claimed &&
      typeof candidate.notification_claim_token !== "string") ||
    (!candidate.notification_claimed &&
      candidate.notification_claim_token != null &&
      typeof candidate.notification_claim_token !== "string") ||
    !isNotificationStatus(candidate.notification_status)
  ) {
    throw new Error(`${context} did not return an atomic contact submission`)
  }
  return {
    id: String(candidate.lead_id),
    meta: isRecord(candidate.lead_meta) ? candidate.lead_meta : {},
    created: candidate.created,
    outboxId: String(candidate.operator_queue_item_id),
    notificationClaimed: candidate.notification_claimed,
    notificationClaimToken:
      typeof candidate.notification_claim_token === "string"
        ? candidate.notification_claim_token
        : null,
    notificationStatus: candidate.notification_status,
  }
}

export async function persistContactLead(
  input: {
    idempotencyKey: string
    challengeHash: string
    lead: ContactLeadInsert
    notification: ContactNotificationOutbox
  },
  config: ContactStorageConfig = requireContactStorageConfig(),
): Promise<PersistedContactLead> {
  const response = await fetch(
    `${config.restBaseUrl}/rpc/sales_create_contact_submission`,
    {
      method: "POST",
      headers: requestHeaders(config),
      body: JSON.stringify({
        p_idempotency_key: input.idempotencyKey,
        p_challenge_hash: input.challengeHash,
        p_lead: input.lead,
        p_notification: input.notification,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    },
  )
  if (!response.ok) {
    const failure = await responseFailure(response)
    if (
      response.status === 409 &&
      /challenge_hash|contact_challenge_replayed/i.test(failure)
    ) {
      throw new ContactChallengeReplayError(failure)
    }
    throw new Error(`Atomic contact submission failed: ${failure}`)
  }

  return parseSubmissionRepresentation(
    (await response.json()) as unknown,
    "Atomic contact submission",
  )
}

export async function completeContactNotification(
  input: {
    idempotencyKey: string
    claimToken: string
    status: "complete" | "degraded"
    slackError?: string
  },
  config: ContactStorageConfig = requireContactStorageConfig(),
): Promise<void> {
  const response = await fetch(
    `${config.restBaseUrl}/rpc/sales_complete_contact_notification`,
    {
      method: "POST",
      headers: requestHeaders(config),
      body: JSON.stringify({
        p_idempotency_key: input.idempotencyKey,
        p_claim_token: input.claimToken,
        p_status: input.status,
        p_slack_error: input.slackError ?? null,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    },
  )
  if (!response.ok) {
    throw new Error(
      `Contact notification completion failed: ${await responseFailure(response)}`,
    )
  }
}
