import type { Access, FieldAccess, PayloadRequest } from "payload"

type UserRole = "admin" | "editor" | "viewer"

const roleOf = (req: PayloadRequest): UserRole | null =>
  ((req.user as { role?: string } | null | undefined)?.role as UserRole | undefined) ?? null

export const isLoggedIn: Access = ({ req }) => Boolean(req.user)

export const isAdmin: Access = ({ req }) => roleOf(req) === "admin"

export const isAdminOrEditor: Access = ({ req }) => {
  const role = roleOf(req)
  return role === "admin" || role === "editor"
}

export const isAdminField: FieldAccess = ({ req }) => roleOf(req) === "admin"

export const isAdminOrEditorField: FieldAccess = ({ req }) => {
  const role = roleOf(req)
  return role === "admin" || role === "editor"
}

export const isSelfOrAdmin: Access = ({ req, id }) => {
  if (roleOf(req) === "admin") return true
  if (!req.user || !id) return false
  return req.user.id === id
}
