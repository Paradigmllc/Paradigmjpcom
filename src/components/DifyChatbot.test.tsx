import { act, type ReactNode } from "react"
import { createRoot } from "react-dom/client"
import { afterEach, describe, expect, test, vi } from "vitest"

const navigation = vi.hoisted(() => ({ pathname: "/en" }))
const intl = vi.hoisted(() => ({ translate: (key: string) => key }))

vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
}))

vi.mock("next-intl", () => ({
  useTranslations: () => intl.translate,
}))

vi.mock("@/i18n/routing", () => ({
  Link: ({ children, href }: { children: ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

import DifyChatbot from "./DifyChatbot"

afterEach(() => {
  navigation.pathname = "/en"
  document.body.innerHTML = ""
  vi.restoreAllMocks()
})

describe("DifyChatbot route visibility", () => {
  test("keeps a stable hook order when client navigation hides the chatbot", () => {
    const container = document.createElement("div")
    document.body.append(container)
    const root = createRoot(container)

    act(() => root.render(<DifyChatbot locale="en" />))
    expect(container.querySelector("button")).not.toBeNull()

    navigation.pathname = "/en/contact"
    expect(() => {
      act(() => root.render(<DifyChatbot locale="en" />))
    }).not.toThrow()
    expect(container.innerHTML).toBe("")

    act(() => root.unmount())
  })
})
