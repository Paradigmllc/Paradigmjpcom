import "server-only"
import { getQuoteRecoveryDb, type QuoteRecoveryIdentity } from "./auth"

export type QuoteRecoveryDashboardData = {
  metrics: {
    totalQuotes: number
    openAmount: number
    staleAmount: number
    urgentCount: number
    missingNextAction: number
  }
  quotes: Array<{
    id: string
    externalQuoteId: string
    customerName: string
    quoteDate: string
    amount: number
    ownerName: string | null
    nextActionDate: string | null
    status: string
    recoveryScore: number
    recoveryPriority: string
    recoveryReasons: string[]
    updatedAt: string
  }>
  imports: Array<{ id: string; fileName: string; importedRows: number; staleAmount: number; createdAt: string }>
  members: Array<{ id: string; userId: string; role: string; email: string; displayName: string; createdAt: string }>
  notifications: Array<{ id: string; title: string; message: string; link: string | null; readAt: string | null; createdAt: string }>
  usage: { quoteRows: number; importCount: number }
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []
}

export async function loadQuoteRecoveryDashboard(identity: QuoteRecoveryIdentity): Promise<QuoteRecoveryDashboardData> {
  const db = getQuoteRecoveryDb()
  const organizationId = identity.organization.id
  const now = new Date()
  const periodStart = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-01`
  const [quotesResult, importsResult, membershipsResult, notificationsResult, usageResult] = await Promise.all([
    db.from("quote_recovery_quotes")
      .select("id,external_quote_id,customer_name,quote_date,amount,owner_name,next_action_date,status,recovery_score,recovery_priority,recovery_reasons,updated_at")
      .eq("organization_id", organizationId)
      .order("recovery_score", { ascending: false })
      .limit(200),
    db.from("quote_recovery_imports")
      .select("id,file_name,imported_rows,stale_amount,created_at")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(20),
    db.from("quote_recovery_memberships")
      .select("id,user_id,role,created_at")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: true }),
    db.from("quote_recovery_notifications")
      .select("id,title,message,link,read_at,created_at")
      .eq("organization_id", organizationId)
      .or(`user_id.is.null,user_id.eq.${identity.user.id}`)
      .order("created_at", { ascending: false })
      .limit(20),
    db.from("quote_recovery_usage_monthly")
      .select("quote_row_count,import_count")
      .eq("organization_id", organizationId)
      .eq("period_start", periodStart)
      .maybeSingle(),
  ])
  const firstError = [quotesResult.error, importsResult.error, membershipsResult.error, notificationsResult.error, usageResult.error].find(Boolean)
  if (firstError) throw new Error(`Dashboard load failed: ${firstError.message}`)

  const membershipRows = membershipsResult.data ?? []
  const userIds = membershipRows.map((membership) => membership.user_id)
  const { data: users, error: usersError } = userIds.length > 0
    ? await db.from("quote_recovery_users").select("id,email,display_name").in("id", userIds)
    : { data: [], error: null }
  if (usersError) throw new Error(`Team load failed: ${usersError.message}`)
  const usersById = new Map((users ?? []).map((user) => [user.id, user]))

  const quotes = (quotesResult.data ?? []).map((quote) => ({
    id: quote.id,
    externalQuoteId: quote.external_quote_id,
    customerName: quote.customer_name,
    quoteDate: quote.quote_date,
    amount: Number(quote.amount),
    ownerName: quote.owner_name,
    nextActionDate: quote.next_action_date,
    status: quote.status,
    recoveryScore: Number(quote.recovery_score),
    recoveryPriority: quote.recovery_priority,
    recoveryReasons: stringArray(quote.recovery_reasons),
    updatedAt: quote.updated_at,
  }))
  const openQuotes = quotes.filter((quote) => quote.status === "open")
  return {
    metrics: {
      totalQuotes: quotes.length,
      openAmount: openQuotes.reduce((sum, quote) => sum + quote.amount, 0),
      staleAmount: openQuotes.filter((quote) => quote.recoveryPriority === "urgent" || quote.recoveryPriority === "high").reduce((sum, quote) => sum + quote.amount, 0),
      urgentCount: openQuotes.filter((quote) => quote.recoveryPriority === "urgent").length,
      missingNextAction: openQuotes.filter((quote) => !quote.nextActionDate).length,
    },
    quotes,
    imports: (importsResult.data ?? []).map((row) => ({ id: row.id, fileName: row.file_name, importedRows: row.imported_rows, staleAmount: Number(row.stale_amount), createdAt: row.created_at })),
    members: membershipRows.map((row) => {
      const user = usersById.get(row.user_id)
      return { id: row.id, userId: row.user_id, role: row.role, email: user?.email ?? "", displayName: user?.display_name ?? "", createdAt: row.created_at }
    }),
    notifications: (notificationsResult.data ?? []).map((row) => ({ id: row.id, title: row.title, message: row.message, link: row.link, readAt: row.read_at, createdAt: row.created_at })),
    usage: { quoteRows: Number(usageResult.data?.quote_row_count ?? 0), importCount: Number(usageResult.data?.import_count ?? 0) },
  }
}
