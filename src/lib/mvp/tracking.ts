/**
 * Click tracking + opt-out token (HMAC ベース・stateless 検証).
 *
 * 設計:
 *   token = base64url(`{run_id}:{lead_id}:{kind}:{exp}`)+"."+hmac(secret, body)
 *   - DB lookup なしで検証可能 (negligible read cost)
 *   - 期限切れ token は reject (default 90 日)
 *   - opt-out は state-changing なので別途 mvp_optout_tokens に記録
 */

import { createHmac, randomBytes } from "node:crypto";

const SECRET = process.env.MVP_TRACK_SECRET ?? "";

export type TrackKind = "pixel" | "cta" | "optout" | "privacy" | "external";

export interface TrackPayload {
  run_id: string;
  lead_id: string;
  kind: TrackKind;
  exp_unix: number;
  destination?: string;
}

const DEFAULT_TTL_DAYS = 90;

export function makeTrackToken(p: Omit<TrackPayload, "exp_unix">): string {
  if (!SECRET) throw new Error("MVP_TRACK_SECRET not configured");
  const exp = Math.floor(Date.now() / 1000) + DEFAULT_TTL_DAYS * 86400;
  const body = `${p.run_id}|${p.lead_id}|${p.kind}|${exp}|${p.destination ?? ""}`;
  const sig = createHmac("sha256", SECRET).update(body).digest("base64url").slice(0, 32);
  return Buffer.from(body).toString("base64url") + "." + sig;
}

export function parseTrackToken(token: string): TrackPayload | null {
  if (!SECRET || !token) return null;
  const dotIdx = token.lastIndexOf(".");
  if (dotIdx < 0) return null;
  const bodyB64 = token.slice(0, dotIdx);
  const sig = token.slice(dotIdx + 1);
  let body: string;
  try { body = Buffer.from(bodyB64, "base64url").toString("utf-8"); } catch { return null; }
  const expectedSig = createHmac("sha256", SECRET).update(body).digest("base64url").slice(0, 32);
  if (sig !== expectedSig) return null;
  const [run_id, lead_id, kind, expStr, destination] = body.split("|");
  const exp_unix = parseInt(expStr, 10);
  if (!Number.isFinite(exp_unix) || exp_unix < Math.floor(Date.now() / 1000)) return null;
  if (!run_id || !lead_id || !kind) return null;
  return { run_id, lead_id, kind: kind as TrackKind, exp_unix, destination: destination || undefined };
}

export function makeOptoutToken(): string {
  return randomBytes(24).toString("base64url");
}

export function hashIp(ip: string): string {
  if (!ip) return "";
  return createHmac("sha256", SECRET || "fallback").update(ip).digest("base64url").slice(0, 16);
}

/**
 * Build report URL with click tracking redirect (CTA).
 */
export function buildTrackedUrl(baseUrl: string, runId: string, leadId: string, kind: TrackKind, destination?: string): string {
  const token = makeTrackToken({ run_id: runId, lead_id: leadId, kind, destination });
  return `${baseUrl}/api/mvp/track/${kind}/${token}`;
}
