import { describe, expect, it } from "vitest"
import { isPrivateAddress } from "./japan-entry-score-service"

describe("public DNS safety", () => {
  it.each([
    "127.0.0.1",
    "169.254.169.254",
    "10.0.0.1",
    "100.64.0.1",
    "172.16.1.1",
    "192.168.1.1",
    "198.18.0.1",
    "::1",
    "fd00::1",
    "fe80::1",
    "::ffff:127.0.0.1",
  ])("rejects private, link-local, and reserved address %s", (address) => {
    expect(isPrivateAddress(address)).toBe(true)
  })

  it.each(["8.8.8.8", "1.1.1.1", "2606:4700:4700::1111"])("allows public address %s", (address) => {
    expect(isPrivateAddress(address)).toBe(false)
  })
})
