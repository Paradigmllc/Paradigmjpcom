import type { Access, FieldAccess } from "payload"

type UserRole = "admin" | "editor" | "viewer"
type Req = Parameters<Access>[0]["req"]

const roleOf = (req: Req): UserRole | null =>
  (req.user as unknown as { role?: UserRole } | undefined)?.role ?? null

export const isLoggedIn: Access = ({ req }): boolean => Boolean(req.user)

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
