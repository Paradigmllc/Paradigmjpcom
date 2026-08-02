import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto"
import { cookies, headers } from "next/headers"
import { getServiceSalesSupabase } from "@/lib/supabase"

export const QUOTE_RECOVERY_SESSION_COOKIE = "qr_session"
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30
const PASSWORD_KEY_LENGTH = 64

export type QuoteRecoveryRole = "owner" | "admin" | "member"

export type QuoteRecoveryIdentity = {
  user: { id: string; email: string; displayName: string }
  organization: {
    id: string
    name: string
    slug: string
    plan: "starter" | "team"
    subscriptionStatus: "incomplete" | "active" | "past_due" | "unpaid" | "canceled" | "paused"
    stripeCustomerId: string | null
    stripeSubscriptionId: string | null
    currentPeriodEnd: string | null
    cancelAtPeriodEnd: boolean
    seatLimit: number
    monthlyQuoteLimit: number
  }
  role: QuoteRecoveryRole
}

type CommercialDb = NonNullable<ReturnType<typeof getServiceSalesSupabase>>

export function getQuoteRecoveryDb(): CommercialDb {
  const db = getServiceSalesSupabase()
  if (!db) throw new Error("Quote Recovery database is not configured")
  return db
}

function scryptAsync(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, PASSWORD_KEY_LENGTH, { N: 16_384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }, (error, key) => {
      if (error) reject(error)
      else resolve(key as Buffer)
    })
  })
}

export async function hashQuoteRecoveryPassword(password: string): Promise<string> {
  const salt = randomBytes(16)
  const derived = await scryptAsync(password, salt)
  return `scrypt$16384$8$1$${salt.toString("base64url")}$${derived.toString("base64url")}`
}

export async function verifyQuoteRecoveryPassword(password: string, encoded: string): Promise<boolean> {
  const [algorithm, n, r, p, saltRaw, hashRaw] = encoded.split("$")
  if (algorithm !== "scrypt" || n !== "16384" || r !== "8" || p !== "1" || !saltRaw || !hashRaw) return false
  try {
    const expected = Buffer.from(hashRaw, "base64url")
    const actual = await scryptAsync(password, Buffer.from(saltRaw, "base64url"))
    return expected.length === actual.length && timingSafeEqual(expected, actual)
  } catch (error) {
    console.error("[quote-recovery/auth] password verification failed:", error)
    return false
  }
}

export function hashQuoteRecoveryToken(token: string): string {
  return createHash("sha256").update(token).digest("hex")
}

function hashRequestValue(value: string | null): string | null {
  return value ? createHash("sha256").update(value).digest("hex") : null
}

export async function createQuoteRecoverySession(userId: string): Promise<void> {
  const token = randomBytes(32).toString("base64url")
  const requestHeaders = await headers()
  const forwarded = requestHeaders.get("cf-connecting-ip") ?? requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000)
  const { error } = await getQuoteRecoveryDb().from("quote_recovery_sessions").insert({
    user_id: userId,
    token_hash: hashQuoteRecoveryToken(token),
    expires_at: expiresAt.toISOString(),
    ip_hash: hashRequestValue(forwarded),
    user_agent_hash: hashRequestValue(requestHeaders.get("user-agent")),
  })
  if (error) throw new Error(`Session creation failed: ${error.message}`)

  const cookieStore = await cookies()
  cookieStore.set(QUOTE_RECOVERY_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  })
}

export async function revokeQuoteRecoverySession(): Promise<void> {
  const cookieStore = await cookies()
  const token = cookieStore.get(QUOTE_RECOVERY_SESSION_COOKIE)?.value
  if (token) {
    const { error } = await getQuoteRecoveryDb()
      .from("quote_recovery_sessions")
      .update({ revoked_at: new Date().toISOString() })
      .eq("token_hash", hashQuoteRecoveryToken(token))
      .is("revoked_at", null)
    if (error) console.error("[quote-recovery/auth] session revoke failed:", error.message)
  }
  cookieStore.set(QUOTE_RECOVERY_SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  })
}

export async function getQuoteRecoveryIdentity(): Promise<QuoteRecoveryIdentity | null> {
  const token = (await cookies()).get(QUOTE_RECOVERY_SESSION_COOKIE)?.value
  if (!token) return null
  const db = getQuoteRecoveryDb()
  const now = new Date().toISOString()
  const { data: session, error: sessionError } = await db
    .from("quote_recovery_sessions")
    .select("user_id,expires_at")
    .eq("token_hash", hashQuoteRecoveryToken(token))
    .is("revoked_at", null)
    .gt("expires_at", now)
    .maybeSingle()
  if (sessionError) throw new Error(`Session lookup failed: ${sessionError.message}`)
  if (!session) return null

  const [{ data: user, error: userError }, { data: membership, error: membershipError }] = await Promise.all([
    db.from("quote_recovery_users").select("id,email,display_name").eq("id", session.user_id).maybeSingle(),
    db.from("quote_recovery_memberships").select("organization_id,role").eq("user_id", session.user_id).limit(1).maybeSingle(),
  ])
  if (userError || membershipError) throw new Error(userError?.message ?? membershipError?.message ?? "Identity lookup failed")
  if (!user || !membership) return null

  const { data: organization, error: organizationError } = await db
    .from("quote_recovery_organizations")
    .select("id,name,slug,plan,subscription_status,stripe_customer_id,stripe_subscription_id,current_period_end,cancel_at_period_end,seat_limit,monthly_quote_limit")
    .eq("id", membership.organization_id)
    .maybeSingle()
  if (organizationError) throw new Error(`Organization lookup failed: ${organizationError.message}`)
  if (!organization) return null

  return {
    user: { id: user.id, email: user.email, displayName: user.display_name },
    organization: {
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      plan: organization.plan,
      subscriptionStatus: organization.subscription_status,
      stripeCustomerId: organization.stripe_customer_id,
      stripeSubscriptionId: organization.stripe_subscription_id,
      currentPeriodEnd: organization.current_period_end,
      cancelAtPeriodEnd: organization.cancel_at_period_end,
      seatLimit: organization.seat_limit,
      monthlyQuoteLimit: organization.monthly_quote_limit,
    },
    role: membership.role,
  }
}

export function quoteRecoveryHasPaidAccess(identity: QuoteRecoveryIdentity): boolean {
  return identity.organization.subscriptionStatus === "active"
}

export function quoteRecoveryCanManage(identity: QuoteRecoveryIdentity): boolean {
  return identity.role === "owner" || identity.role === "admin"
}

export async function writeQuoteRecoveryAudit(input: {
  organizationId: string | null
  actorUserId: string | null
  action: string
  targetType: string
  targetId?: string | null
  metadata?: Record<string, unknown>
}): Promise<void> {
  const { error } = await getQuoteRecoveryDb().from("quote_recovery_audit_logs").insert({
    organization_id: input.organizationId,
    actor_user_id: input.actorUserId,
    action: input.action,
    target_type: input.targetType,
    target_id: input.targetId ?? null,
    metadata: input.metadata ?? {},
  })
  if (error) console.error("[quote-recovery/audit] insert failed:", error.message)
}
