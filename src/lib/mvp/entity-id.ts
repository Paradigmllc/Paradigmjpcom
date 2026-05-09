/**
 * Lead → canonical entity_id 抽出 (B30 #14 永久ルール準拠).
 * 5 段優先順: jp_corp_no → gleif_lei → normalized_domain → random_uuid → unverified.
 *
 * B36-P3 では既存 lead.meta.entity_id を read-only で使う想定 (Appexxme intake-gate
 * が confirm 済). 取得失敗時は domain 正規化で fallback.
 */

export interface LeadCore {
  id: string;
  domain?: string | null;
  meta?: {
    entity_id?: string | null;
    entity_id_kind?: string | null;
    [k: string]: unknown;
  } | null;
}

export function getEntityId(lead: LeadCore): string {
  const explicit = lead.meta?.entity_id;
  if (explicit && typeof explicit === "string" && explicit.length > 0) return explicit;
  return `domain:${normalizeDomain(lead.domain ?? "")}` || `unverified:${lead.id}`;
}

export function normalizeDomain(host: string): string {
  if (!host) return "";
  return host
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/^www\./, "")
    .toLowerCase()
    .trim();
}
