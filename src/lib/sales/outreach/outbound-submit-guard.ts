import type { SalesCompany } from "../types"
import { persistOutcome } from "./side-effects"
import { authorizeOutboundAttempt } from "./global-suppression"
import type { FormClassification, OutreachItemResult } from "./types"

export async function blockUnauthorizedOutbound(input: {
  company: SalesCompany
  formUrl: string
  message: string
  classification: FormClassification
  dryRun: boolean
  pipelineRunId: string | null
}): Promise<OutreachItemResult | null> {
  const authorization = await authorizeOutboundAttempt({
    companyId: input.company.id,
    channel: "contact_form",
    recipient: input.formUrl,
    message: input.message,
    dryRun: input.dryRun,
  })
  if (authorization.allowed) return null

  const reason = `outbound blocked: ${authorization.reason}`
  await persistOutcome(
    input.company,
    "manual_queue",
    "follow_up",
    reason,
    {
      formUrl: input.formUrl,
      classification: input.classification,
      message: input.message,
      approvalRequired: authorization.operatorCaseId !== null,
      outboundGuard: authorization,
    },
    input.dryRun,
    input.pipelineRunId,
  )
  return {
    companyId: input.company.id,
    domain: input.company.domain,
    finalStage: "manual_queue",
    reason,
    dryRun: input.dryRun,
    formUrl: input.formUrl,
    message: input.message,
    classification: input.classification,
  }
}
