import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, describe, expect, test, vi } from "vitest"

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}))
vi.mock("next-intl", () => ({
  useLocale: () => "en",
  useTranslations: () => Object.assign((key: string) => key, { raw: () => [] }),
}))
vi.mock("@/i18n/routing", () => ({ Link: () => null }))
vi.mock("next/script", () => ({ default: () => null }))

import {
  ContactForm,
  isJapanEntryContact,
  shouldRotateSubmissionIdentity,
} from "./ContactForm"

const mountedRoots: Array<{ container: HTMLDivElement; root: Root }> = []

afterEach(() => {
  for (const { container, root } of mountedRoots.splice(0)) {
    act(() => root.unmount())
    container.remove()
  }
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe("isJapanEntryContact", () => {
  test("makes every English contact route a Japan Entry application", () => {
    expect(isJapanEntryContact("en", null)).toBe(true)
    expect(isJapanEntryContact("en", "general")).toBe(true)
  })

  test("keeps non-English general contact routes unchanged", () => {
    expect(isJapanEntryContact("ja", null)).toBe(false)
    expect(isJapanEntryContact("de", null)).toBe(false)
    expect(isJapanEntryContact("de", "japan-entry")).toBe(true)
  })
})

describe("shouldRotateSubmissionIdentity", () => {
  test.each([400, 401, 403, 409, 422])(
    "rotates after an explicit client-side verification failure (%s)",
    (status) => {
      expect(shouldRotateSubmissionIdentity(status)).toBe(true)
    },
  )

  test.each([429, 500, 502, 503])(
    "preserves idempotency after an ambiguous or retryable failure (%s)",
    (status) => {
      expect(shouldRotateSubmissionIdentity(status)).toBe(false)
    },
  )
})

describe("ContactForm verification recovery", () => {
  test.each([
    { status: 500, rotates: false },
    { status: 403, rotates: true },
  ])(
    "refreshes one-use verification after HTTP $status (rotates=$rotates)",
    async ({ status, rotates }) => {
      const challengeSubmissionIds: string[] = []
      const postSubmissionIds: string[] = []
      const fetchMock = vi.fn(
        async (_input: RequestInfo | URL, init?: RequestInit) => {
          const headers = new Headers(init?.headers)
          const submissionId =
            headers.get("X-Contact-Submission-Id") ?? "missing"
          if (init?.method === "GET") {
            challengeSubmissionIds.push(submissionId)
            return new Response(
              JSON.stringify({ challenge: `challenge-${challengeSubmissionIds.length}` }),
              { status: 200, headers: { "Content-Type": "application/json" } },
            )
          }
          postSubmissionIds.push(submissionId)
          return new Response(JSON.stringify({ error: "Try again" }), {
            status,
            headers: { "Content-Type": "application/json" },
          })
        },
      )
      vi.stubGlobal("fetch", fetchMock)

      const container = document.createElement("div")
      document.body.append(container)
      const root = createRoot(container)
      mountedRoots.push({ container, root })
      await act(async () => root.render(<ContactForm />))
      await vi.waitFor(() => expect(challengeSubmissionIds).toHaveLength(1))
      const form = container.querySelector("form")
      if (!form) throw new Error("Expected contact form")
      await act(async () => {
        form.dispatchEvent(
          new Event("submit", { bubbles: true, cancelable: true }),
        )
      })

      await vi.waitFor(() => expect(challengeSubmissionIds).toHaveLength(2))
      expect(postSubmissionIds[0]).toBe(challengeSubmissionIds[0])
      if (rotates) {
        expect(challengeSubmissionIds[1]).not.toBe(challengeSubmissionIds[0])
      } else {
        expect(challengeSubmissionIds[1]).toBe(challengeSubmissionIds[0])
      }
    },
  )
})
