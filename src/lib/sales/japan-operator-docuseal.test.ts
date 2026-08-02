import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { createJapanOperatorContractDraft } from "./japan-operator-docuseal"

const originalBaseUrl = process.env.DOCUSEAL_BASE_URL
const originalApiUrl = process.env.DOCUSEAL_API_URL
const originalApiKey = process.env.DOCUSEAL_API_KEY

function restoreEnv(key: "DOCUSEAL_BASE_URL" | "DOCUSEAL_API_URL" | "DOCUSEAL_API_KEY", value: string | undefined) {
  if (value === undefined) delete process.env[key]
  else process.env[key] = value
}

function supabaseMock(existing: Record<string, unknown> | null = null) {
  const existingQuery = {
    select: vi.fn(), eq: vi.fn(), in: vi.fn(), order: vi.fn(), limit: vi.fn(), maybeSingle: vi.fn(),
  }
  existingQuery.select.mockReturnValue(existingQuery)
  existingQuery.eq.mockReturnValue(existingQuery)
  existingQuery.in.mockReturnValue(existingQuery)
  existingQuery.order.mockReturnValue(existingQuery)
  existingQuery.limit.mockReturnValue(existingQuery)
  existingQuery.maybeSingle.mockResolvedValue({ data: existing, error: null })
  const single = vi.fn().mockResolvedValue({ data: { id: "contract-id" }, error: null })
  const contractQuery = { upsert: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ single }) }) }
  return {
    from: vi.fn((table: string) => table === "sales_japan_operator_contract_links" ? existingQuery : contractQuery),
    rpc: vi.fn().mockResolvedValue({ data: [{ id: "link-id" }], error: null }),
  }
}

const action = {
  action: "create_contract_draft" as const,
  caseId: "11111111-1111-4111-8111-111111111111",
  contractKind: "validation_sow" as const,
  contractName: "Japan validation SOW",
  templateId: 123,
  submitterName: "Brand Owner",
  submitterEmail: "owner@example.com",
  submitterRole: "Brand",
  amountMinor: 500_000,
  currency: "JPY" as const,
  expiresAt: null,
  values: { Company: "Example" },
}

describe("Japan operator DocuSeal draft", () => {
  beforeEach(() => {
    process.env.DOCUSEAL_BASE_URL = "https://docuseal.example.com"
    delete process.env.DOCUSEAL_API_URL
    process.env.DOCUSEAL_API_KEY = "test-key"
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    restoreEnv("DOCUSEAL_BASE_URL", originalBaseUrl)
    restoreEnv("DOCUSEAL_API_URL", originalApiUrl)
    restoreEnv("DOCUSEAL_API_KEY", originalApiKey)
  })

  it("creates a no-email draft, writes the contract SSOT and links the case", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify([{
      id: 88,
      submission_id: 99,
      embed_src: "https://docuseal.example.com/s/draft-link",
      status: "awaiting",
    }]), { status: 200, headers: { "content-type": "application/json" } }))
    vi.stubGlobal("fetch", fetchMock)
    const supabase = supabaseMock()

    const result = await createJapanOperatorContractDraft(
      supabase as unknown as Parameters<typeof createJapanOperatorContractDraft>[0],
      action,
      { key: "payload:user", email: "operator@example.com", role: "legal", authSource: "payload" },
    )

    const request = fetchMock.mock.calls[0][1] as RequestInit
    const body = JSON.parse(String(request.body)) as Record<string, unknown>
    expect(fetchMock).toHaveBeenCalledWith("https://docuseal.example.com/api/submissions", expect.any(Object))
    expect(body).toMatchObject({ template_id: 123, send_email: false, send_sms: false })
    expect(body.submitters).toEqual([expect.objectContaining({ email: "owner@example.com", send_email: false, send_sms: false })])
    expect(supabase.rpc).toHaveBeenCalledWith("sales_link_japan_operator_contract_v1", expect.objectContaining({
      p_case_id: action.caseId,
      p_docuseal_submission_id: "99",
      p_status: "draft",
    }))
    expect(result).toEqual(expect.objectContaining({ contractId: "contract-id", submissionId: "99", emailSent: false }))
  })

  it("reuses an active draft instead of creating a duplicate submission", async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)
    const supabase = supabaseMock({
      sales_contract_id: "existing-contract",
      docuseal_submission_id: "existing-submission",
      status: "draft",
      detail: { embed_src: "https://docuseal.example.com/s/existing" },
    })

    const result = await createJapanOperatorContractDraft(
      supabase as unknown as Parameters<typeof createJapanOperatorContractDraft>[0],
      action,
      { key: "payload:user", email: "operator@example.com", role: "legal", authSource: "payload" },
    )

    expect(fetchMock).not.toHaveBeenCalled()
    expect(supabase.rpc).not.toHaveBeenCalled()
    expect(result).toEqual(expect.objectContaining({
      contractId: "existing-contract",
      submissionId: "existing-submission",
      signingUrl: "https://docuseal.example.com/s/existing",
      reused: true,
    }))
  })
})
