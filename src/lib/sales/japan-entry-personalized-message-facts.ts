import type { BusinessModel, JapanEntryProjection } from "./japan-entry-projection";

export interface JapanEntryPersonalizationFact {
  id: string;
  statement: string;
  source: string;
  confidence: number;
  anchors: string[];
}

type JsonRecord = Record<string, unknown>;

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
  return facts.filter((fact) => fact.id.startsWith("modeled-") || fact.confidence >= 0.55);
}
