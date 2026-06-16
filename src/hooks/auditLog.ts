import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from "payload"

type AuditContext = { collection: string }

const safeDiff = (current: unknown, previous: unknown): string => {
  try {
    const diff = {
      after: current ?? null,
      before: previous ?? null,
    }
    return JSON.stringify(diff).slice(0, 8000)
  } catch (e) {
    console.error("[auditLog] safeDiff JSON stringify failed:", e instanceof Error ? e.message : String(e))
    return ""
  }
}

export const makeAfterChangeAudit = (collection: string): CollectionAfterChangeHook => async ({
  doc,
  previousDoc,
  operation,
  req,
}) => {
  try {
    await req.payload.create({
      collection: "audit-logs",
      data: {
        collection,
        action: operation === "create" ? "create" : "update",
        documentId: String(doc?.id ?? ""),
        userEmail: req.user?.email ?? null,
        userRole: (req.user as { role?: string } | undefined)?.role ?? null,
        diff: safeDiff(doc, previousDoc),
      },
      req,
    } as Parameters<typeof req.payload.create>[0])
  } catch (e) {
    req.payload.logger.warn(`[auditLog] afterChange failed for ${collection}: ${(e as Error).message}`)
  }
  return doc
}

export const makeAfterDeleteAudit = (collection: string): CollectionAfterDeleteHook => async ({
  doc,
  id,
  req,
}) => {
  try {
    await req.payload.create({
      collection: "audit-logs",
      data: {
        collection,
        action: "delete",
        documentId: String(id ?? doc?.id ?? ""),
        userEmail: req.user?.email ?? null,
        userRole: (req.user as { role?: string } | undefined)?.role ?? null,
        diff: safeDiff(null, doc),
      },
      req,
    } as Parameters<typeof req.payload.create>[0])
  } catch (e) {
    req.payload.logger.warn(`[auditLog] afterDelete failed for ${collection}: ${(e as Error).message}`)
  }
  return doc
}

export const auditContext = (collection: string): AuditContext => ({ collection })
