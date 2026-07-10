import { notifyBothChannels } from "@/lib/notify"
import { enrichFromContact } from "@/lib/sales/enrich"
import { buildReportUrl, normalizeReportLocale } from "@/lib/sales/routing"
import { slackInline } from "./contact-route-helpers"

interface ContactEnrichmentInput {
  leadId: string
  email: string
  company: string | null
  message: string
  services: string[]
  reportLocale: string
  targetCountry: string
}

export function startContactEnrichment(input: ContactEnrichmentInput): void {
  void (async () => {
    try {
      const enrich = await enrichFromContact({
        email: input.email,
        company: input.company,
        message: input.message,
        services: input.services,
        reportLocale: input.reportLocale,
        targetCountry: input.targetCountry,
        source: "paradigmjp.com/contact",
      })
      if (enrich.ok && enrich.company) {
        const company = enrich.company
        const safeCompanyName = slackInline(company.company_name)
        const safeDomain = slackInline(company.domain)
        const safeIndustry = company.industry
          ? slackInline(company.industry)
          : "未推定"
        const safeIssues = (company.detected_issues ?? [])
          .map((issue) => slackInline(issue))
          .filter(Boolean)
          .join(", ")
        const reportUrl = company.slug
          ? buildReportUrl(
              normalizeReportLocale(company.report_locale, company.region),
              company.slug,
            )
          : null
        const blocks = [
          {
            type: "header",
            text: {
              type: "plain_text",
              text: `🌱 新規リード: ${safeCompanyName}`.slice(0, 150),
            },
          },
          {
            type: "section",
            fields: [
              { type: "mrkdwn", text: `*ドメイン*\n${safeDomain}` },
              {
                type: "mrkdwn",
                text: `*業種*\n${safeIndustry}`,
              },
              {
                type: "mrkdwn",
                text: `*PSI モバイル*\n${company.pagespeed_mobile ?? "?"} / 100`,
              },
              {
                type: "mrkdwn",
                text: `*検出課題*\n${safeIssues || "なし"}`.slice(0, 2_000),
              },
            ],
          },
          {
            type: "actions",
            elements: [
              ...(company.slug
                ? [
                    {
                      type: "button",
                      text: { type: "plain_text", text: "診断レポート" },
                      url: reportUrl,
                      style: "primary",
                    },
                  ]
                : []),
              {
                type: "button",
                text: { type: "plain_text", text: "Notion で開く" },
                url: "https://www.notion.so/8cbab1f501144f83872c1738ce3e79c4",
              },
            ],
          },
        ]
        const notification = await notifyBothChannels(
          `🌱 新規リード: ${safeCompanyName} (${safeDomain}) / lead ${input.leadId}`,
          {
            title: `Contact enrichment — ${safeCompanyName}`,
            message: `${safeCompanyName} enrichment completed for lead ${input.leadId}.`,
            link: reportUrl ?? "https://twenty.paradigmjp.com",
            type: "contact_enrichment_complete",
            region: input.reportLocale === "ja" ? "jp" : "global",
            priority: 80,
            leadId: input.leadId,
            idempotencyKey: `contact-enrichment:${input.leadId}`,
            clientMessageId: input.leadId,
            blocks,
          },
        )
        if (!notification.ok) {
          console.error(
            `[contact] Lead ${input.leadId} enrichment notification degraded:`,
            notification,
          )
        }
      } else if (enrich.skipped === "personal_domain") {
        console.warn(
          `[contact] Lead ${input.leadId} enrichment skipped: personal_domain`,
        )
      } else if (enrich.error) {
        console.error(
          `[contact] Lead ${input.leadId} enrichment failed:`,
          enrich.error,
        )
      }
    } catch (error) {
      console.error(
        `[contact] Lead ${input.leadId} enrichment pipeline error:`,
        error,
      )
    }
  })()
}
