// @vitest-environment node
import { describe, expect, it, vi } from "vitest"
import type { Access } from "payload"
import { unlockOperation } from "../../node_modules/payload/dist/auth/operations/unlock.js"
import { Users } from "./Users"
import { isAdmin } from "../access/byRole"

describe("CMS lockout access", () => {
  it("overrides the unsafe default for all account unlock operations", () => {
    expect(Users.access?.unlock).toBe(isAdmin)
    expect(Users.auth).toMatchObject({ maxLoginAttempts: 5, lockTime: 600 })
  })
  it.each([null, "viewer", "editor", "admin", "unknown"])("limits unlock for role %s", async (role) => {
    const req = { user: role ? { id: 1, role } : null } as Parameters<Access>[0]["req"]
    expect(await Users.access?.unlock?.({ req })).toBe(role === "admin")
  })

  it.each([null, "viewer", "editor", "admin"])("enforces role %s before writing lockout state in Payload", async (role) => {
    const updateOne = vi.fn().mockResolvedValue({})
    const findOne = vi.fn().mockResolvedValue({ id: 2, loginAttempts: 5, lockUntil: "2099-01-01T00:00:00Z" })
    const args = {
      collection: { config: Users },
      data: { email: "another-user@example.invalid" },
      overrideAccess: false,
      req: { user: role ? { id: 1, role } : null, payload: { db: { findOne, updateOne } } },
    } as unknown as Parameters<typeof unlockOperation>[0]
    if (role === "admin") {
      await expect(unlockOperation(args)).resolves.toBe(true)
      expect(updateOne).toHaveBeenCalledWith(expect.objectContaining({
        id: 2, collection: "users", data: { lockUntil: null, loginAttempts: 0 },
      }))
    } else {
      await expect(unlockOperation(args)).rejects.toMatchObject({ status: 403 })
      expect(findOne).not.toHaveBeenCalled()
      expect(updateOne).not.toHaveBeenCalled()
    }
  })

  it("the maintained CMS package denies implicit unlock even when a collection omits its policy", async () => {
    const updateOne = vi.fn().mockResolvedValue({})
    const findOne = vi.fn().mockResolvedValue({ id: 2, loginAttempts: 5 })
    const { unlock: _unlock, ...access } = Users.access ?? {}
    const args = {
      collection: { config: { ...Users, access } },
      data: { email: "another-user@example.invalid" },
      overrideAccess: false,
      req: { user: { id: 1, role: "editor" }, payload: { db: { findOne, updateOne } } },
    } as unknown as Parameters<typeof unlockOperation>[0]
    await expect(unlockOperation(args)).rejects.toMatchObject({ status: 403 })
    expect(findOne).not.toHaveBeenCalled()
    expect(updateOne).not.toHaveBeenCalled()
  })
})
