import { NextRequest } from "next/server"
import {
  authorizePayloadAdminRequest,
  authorizeWebhookRequest,
  verifyAdminSessionToken,
} from "@/lib/admin-auth"
import { getServiceSalesSupabase } from "@/lib/supabase"
import { DB_TABLES } from "@/lib/sales/db-tables"

export const OPERATOR_ROLES = [
  "admin",
  "commercial_lead",
  "researcher",
  "finance",
  "legal",
  "delivery",
  "japan_operator",
  "viewer",
  "automation",
] as const

export type OperatorRole = (typeof OPERATOR_ROLES)[number]

export type SalesApiPrincipal = {
  key: string
  email: string | null
  role: OperatorRole
  authSource: "payload" | "legacy" | "work" | "webhook"
}

export type SalesApiAuthorization =
  | { ok: true; principal: SalesApiPrincipal }
  | { ok: false; principal: null }

function payloadRoleToOperatorRole(role: string | null | undefined): OperatorRole {
  if (role === "admin") return "admin"
  if (role === "viewer") return "viewer"
  return "commercial_lead"
}

function principalKey(id: string | null | undefined, email: string | null): string {
  if (id) return `payload:${id}`
  if (email) return `email:${email.toLowerCase()}`
  return "payload:unknown"
}

async function applyOperatorRoleAssignment(principal: SalesApiPrincipal): Promise<SalesApiPrincipal> {
  const supabase = getServiceSalesSupabase()
  if (!supabase) return principal
  const { data, error } = await supabase
    .from(DB_TABLES.SALES_JAPAN_OPERATOR_ROLE_ASSIGNMENTS)
    .select("operator_role")
    .eq("principal_key", principal.key)
    .eq("active", true)
    .maybeSingle()
  if (error) {
    console.error("[sales-api-auth] operator role lookup failed:", error.message)
    return principal
  }
  const assignedRole = data?.operator_role
  if (typeof assignedRole === "string" && (OPERATOR_ROLES as readonly string[]).includes(assignedRole)) {
    return { ...principal, role: assignedRole as OperatorRole }
  }
  return principal
}

export async function authorizeSalesApiRequest(req: NextRequest): Promise<SalesApiAuthorization> {
  const webhookAuth = authorizeWebhookRequest(req.headers)
  if (webhookAuth.ok) {
    return {
      ok: true,
      principal: { key: "automation:webhook", email: null, role: "automation", authSource: "webhook" },
    }
  }

  const workApiToken = req.cookies.get("paradigm_work_api_token")?.value
  if (verifyAdminSessionToken(workApiToken)) {
    return {
      ok: true,
      principal: { key: "session:work", email: null, role: "admin", authSource: "work" },
    }
  }

  const adminAuth = await authorizePayloadAdminRequest({
    headers: req.headers,
    legacyToken: req.cookies.get("paradigm_admin_token")?.value,
  })
  if (!adminAuth.ok) return { ok: false, principal: null }

  const basePrincipal: SalesApiPrincipal = adminAuth.source === "legacy"
    ? { key: "session:legacy-admin", email: null, role: "admin", authSource: "legacy" }
    : {
        key: principalKey(adminAuth.userId, adminAuth.userEmail),
        email: adminAuth.userEmail,
        role: payloadRoleToOperatorRole(adminAuth.userRole),
        authSource: "payload",
      }
  return { ok: true, principal: await applyOperatorRoleAssignment(basePrincipal) }
}

export async function isSalesApiAuthorized(req: NextRequest): Promise<boolean> {
  return (await authorizeSalesApiRequest(req)).ok
}
