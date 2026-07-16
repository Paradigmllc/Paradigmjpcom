import type { BusinessModel, JapanEntryProjection } from "./japan-entry-projection";
import { JAPAN_ENTRY_MARKET_EVIDENCE } from "@/lib/japan-entry-market-evidence";
import type { ManualPositioningConcept } from "./manual-japan-entry-playbook";

export interface JapanEntryPersonalizationFact {
  id: string;
  statement: string;
  source: string;
  confidence: number;
  anchors: string[];
}

type JsonRecord = Record<string, unknown>;

export interface JapanEntryPersonalizationContext {
  competitorAnalysis?: unknown;
  positioningConcept?: ManualPositioningConcept | null;
}

function asRecord(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : null;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim())
    : [];
}

function httpsUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch (error) {
    console.error("[japan-entry-message] invalid market-context evidence URL:", { value, error });
    return null;
  }
}

function competitorFacts(value: unknown): JapanEntryPersonalizationFact[] {
  const raw = asRecord(value);
  if (!Array.isArray(raw?.competitors)) return [];
  return raw.competitors.slice(0, 2).flatMap((item, index): JapanEntryPersonalizationFact[] => {
    const row = asRecord(item);
    const evidence = Array.isArray(row?.evidence) ? row.evidence.map(asRecord) : [];
    const source = evidence.map((entry) => httpsUrl(entry?.source_url)).find(Boolean);
    const category = row?.category;
    if (
      !row || typeof row.name !== "string" || typeof row.summary !== "string" || !source ||
      !["direct", "adjacent", "substitute"].includes(String(category))
    ) return [];
    const name = row.name.trim().slice(0, 100);
    const summary = row.summary.trim().slice(0, 240);
    if (!name || !summary) return [];
    return [{
      id: `verified-competitor-${index + 1}`,
      statement: `Public-source analysis identifies ${name} as a ${category} Japan-market comparator: ${summary}`,
      source,
      confidence: 0.76,
      anchors: [name, summary],
    }];
  });
}

function demandFacts(value: unknown): JapanEntryPersonalizationFact[] {
  const raw = asRecord(value);
  const rows = Array.isArray(raw?.demand_signals)
    ? raw.demand_signals
    : Array.isArray(raw?.japan_demand_signals) ? raw.japan_demand_signals : [];
  return rows.slice(0, 2).flatMap((item, index): JapanEntryPersonalizationFact[] => {
    const row = asRecord(item);
    const source = httpsUrl(row?.evidence_url ?? row?.source_url);
    const confidence = typeof row?.confidence === "number" ? row.confidence : 0;
    if (!row || typeof row.statement !== "string" || !source || confidence < 0.55) return [];
    const statement = row.statement.trim().slice(0, 260);
    if (!statement) return [];
    return [{
      id: `verified-japan-demand-${index + 1}`,
      statement,
      source,
      confidence,
      anchors: [statement],
    }];
  });
}

function auditFact(input: {
  id: string;
  missing: boolean;
  missingStatement: string;
  presentStatement: string;
  presentSignals: string[];
  anchors: string[];
  confidence: number;
}): JapanEntryPersonalizationFact {
  const observed = input.presentSignals.slice(0, 3).join(", ");
  return {
    id: input.id,
    statement: input.missing ? input.missingStatement : `${input.presentStatement}${observed ? ` (${observed})` : ""}.`,
    source: "Japan market public-page audit",
    confidence: input.confidence,
    anchors: input.anchors,
  };
}

export function buildJapanEntryPersonalizationFacts(
  audit: unknown,
  businessModel: BusinessModel,
  projection?: JapanEntryProjection,
  context?: JapanEntryPersonalizationContext,
): JapanEntryPersonalizationFact[] {
  const record = asRecord(audit);
  const status = asRecord(record?.status);
  const signals = asRecord(record?.signals);
  const pages = stringArray(record?.pages_checked);
  if (!status || pages.length === 0) return [];
  const confidence = pages.length >= 3 ? 0.76 : 0.58;
  const facts: JapanEntryPersonalizationFact[] = [];

  if (typeof status.japanese_language_missing === "boolean") {
    facts.push(auditFact({
      id: "japan-audit-language",
      missing: status.japanese_language_missing,
      missingStatement: "The checked public pages did not show a Japanese-language customer path.",
      presentStatement: "The checked public pages showed Japanese-language content",
      presentSignals: stringArray(signals?.japanese_language),
      anchors: ["Japanese-language", "Japanese language", "Japanese content"],
      confidence,
    }));
  }
  if (businessModel !== "service" && typeof status.jpy_currency_missing === "boolean") {
    facts.push(auditFact({
      id: "japan-audit-jpy",
      missing: status.jpy_currency_missing,
      missingStatement: "The checked public pages did not show customer-facing JPY pricing.",
      presentStatement: "The checked public pages showed customer-facing JPY pricing",
      presentSignals: stringArray(signals?.jpy_currency),
      anchors: ["JPY", "yen pricing", "yen prices"],
      confidence,
    }));
  }
  if (businessModel === "ecommerce" && typeof status.japan_shipping_missing === "boolean") {
    facts.push(auditFact({
      id: "japan-audit-shipping",
      missing: status.japan_shipping_missing,
      missingStatement: "The checked public pages did not show Japan-specific delivery terms.",
      presentStatement: "The checked public pages referenced delivery to Japan",
      presentSignals: stringArray(signals?.japan_shipping),
      anchors: ["Japan-specific delivery", "shipping to Japan", "Japan delivery"],
      confidence,
    }));
  }
  if (businessModel === "ecommerce" && typeof status.local_payments_missing === "boolean") {
    facts.push(auditFact({
      id: "japan-audit-payments",
      missing: status.local_payments_missing,
      missingStatement: "The checked public pages did not show Japan-local payment references such as JCB, PayPay, Paidy, or konbini.",
      presentStatement: "The checked public pages referenced Japan-local payment options",
      presentSignals: stringArray(signals?.local_payments),
      anchors: ["Japan-local payment", "JCB", "PayPay", "Paidy", "konbini"],
      confidence,
    }));
  }
  if (businessModel === "ecommerce" && typeof status.tokushoho_missing === "boolean") {
    facts.push(auditFact({
      id: "japan-audit-commerce-disclosure",
      missing: status.tokushoho_missing,
      missingStatement: "The checked public pages did not show a Japan-specific commercial transactions disclosure.",
      presentStatement: "The checked public pages showed a Japan-specific commercial transactions disclosure",
      presentSignals: stringArray(signals?.tokushoho),
      anchors: ["commercial transactions disclosure", "Japan-specific disclosure", "Tokushoho"],
      confidence,
    }));
  }

  const verifiedCompetitors = competitorFacts(context?.competitorAnalysis);
  const verifiedDemand = demandFacts(context?.competitorAnalysis);
  if (verifiedCompetitors.length > 0) {
    facts.push(...verifiedCompetitors, ...verifiedDemand, {
      id: "official-japan-ecommerce-market",
      statement: "METI reports Japan's 2024 B2C e-commerce market at ¥26.1 trillion, up 5.1% year over year.",
      source: JAPAN_ENTRY_MARKET_EVIDENCE.ecommerce.sourceUrl,
      confidence: 0.98,
      anchors: ["¥26.1 trillion", "5.1%", "B2C e-commerce market"],
    });
    if (businessModel === "ecommerce" && status.tokushoho_missing === true) {
      facts.push({
        id: "regulatory-commerce-enforcement",
        statement: "Japan's Consumer Affairs Agency states that in-scope failures to meet the Specified Commercial Transactions Act can result in business-improvement instructions, suspension orders or penalties; this public-page screen does not establish applicability or breach.",
        source: JAPAN_ENTRY_MARKET_EVIDENCE.commerceEnforcement.sourceUrl,
        confidence: 0.94,
        anchors: ["suspension orders", "business-improvement instructions", "does not establish applicability or breach"],
      });
    }
    if (status.appi_missing === true) {
      facts.push({
        id: "regulatory-privacy-review",
        statement: "Japan's Personal Information Protection Commission published a 2026 reform policy during its statutory triennial APPI review; the public-page screen does not establish which obligations apply.",
        source: JAPAN_ENTRY_MARKET_EVIDENCE.privacyReview.sourceUrl,
        confidence: 0.94,
        anchors: ["2026 reform policy", "triennial APPI review", "does not establish which obligations apply"],
      });
    }
  }

  if (context?.positioningConcept) {
    facts.push({
      id: "prepared-positioning-concept",
      statement: `A draft Japanese positioning concept is prepared and stored for this review, grounded in the public product phrase “${context.positioningConcept.sourcePhrase}”. It is an unpublished draft, not evidence of demand or performance.`,
      source: "Stored manual-work positioning draft",
      confidence: 0.9,
      anchors: ["draft Japanese positioning concept", context.positioningConcept.sourcePhrase],
    });
  }

  const japanMarket = projection?.markets.find((market) => market.code === "JP");
  if (projection && japanMarket && japanMarket.estimatedMonthlyVisits > 0) {
    const visits = japanMarket.estimatedMonthlyVisits.toLocaleString("en-US");
    facts.push({
      id: "modeled-japan-monthly-visits",
      statement: `The public-signal planning model estimates approximately ${visits} monthly visits from Japan.`,
      source: projection.modelVersion,
      confidence: japanMarket.confidence,
      anchors: [visits, "monthly visits from Japan", "Japan visits"],
    });
  }
  if (projection && projection.monthlyOpportunityGapUsd > 0) {
    const gap = projection.monthlyOpportunityGapUsd.toLocaleString("en-US");
    facts.push({
      id: "modeled-monthly-opportunity-gap",
      statement: `Under stated planning assumptions, the model estimates a potential monthly revenue opportunity gap of approximately $${gap}.`,
      source: projection.modelVersion,
      confidence: 0.3,
      anchors: [`$${gap}`, "monthly revenue opportunity", "opportunity gap"],
    });
  }
  if (projection) {
    const conservative = projection.scenarios.find((scenario) => scenario.scenario === "conservative");
    const upside = projection.scenarios.find((scenario) => scenario.scenario === "upside");
    const low = conservative?.months.slice(0, 12).reduce((sum, month) => sum + month.incrementalRevenueUsd, 0) ?? 0;
    const high = upside?.months.slice(0, 12).reduce((sum, month) => sum + month.incrementalRevenueUsd, 0) ?? 0;
    if (low > 0 && high >= low) {
      const lowLabel = low.toLocaleString("en-US");
      const highLabel = high.toLocaleString("en-US");
      facts.push({
        id: "modeled-annual-opportunity-range",
        statement: `Based on public signals and conservative planning assumptions, the model estimates a potential first-12-month Japan revenue opportunity range of approximately $${lowLabel}–$${highLabel}.`,
        source: projection.modelVersion,
        confidence: 0.3,
        anchors: [`$${lowLabel}–$${highLabel}`, "first-12-month Japan revenue opportunity", "public signals"],
      });
    }
  }
  return facts.filter((fact) => fact.id.startsWith("modeled-") || fact.confidence >= 0.55);
}
