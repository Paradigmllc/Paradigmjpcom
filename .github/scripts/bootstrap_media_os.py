from __future__ import annotations

import json
import os
import re
from pathlib import Path
from textwrap import dedent

ROOT = Path.cwd()
APP = Path("src/app") if (ROOT / "src/app").is_dir() else Path("app")
LIB = Path("src/lib") if (ROOT / "src").is_dir() else Path("lib")
MIGRATIONS = Path("supabase/migrations")


def write(path: Path, content: str) -> None:
    target = ROOT / path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(dedent(content).lstrip(), encoding="utf-8")


def rel_import(source: Path, target: Path) -> str:
    relative = os.path.relpath(target, source.parent).replace(os.sep, "/")
    if not relative.startswith("."):
        relative = "./" + relative
    return re.sub(r"\.(ts|tsx)$", "", relative)


# Never overwrite a substantive implementation produced by the primary worktree.
existing = {
    p
    for base in (ROOT / APP, ROOT / LIB, ROOT / "supabase")
    if base.exists()
    for p in base.rglob("*")
    if p.is_file()
    and re.search(r"media.?os|japan-market-insights", str(p), re.IGNORECASE)
}
if len(existing) >= 8:
    print(f"Existing Media OS implementation detected ({len(existing)} files); bootstrap skipped.")
    raise SystemExit(0)

CORE = LIB / "media-os"

write(
    CORE / "types.ts",
    r'''
    export const MEDIA_OS_CHANNELS = ["pseo", "youtube", "x", "linkedin", "commercial"] as const;
    export type MediaOsChannel = (typeof MEDIA_OS_CHANNELS)[number];

    export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

    export interface MediaOsEvidence {
      id: string;
      memo_id: string;
      title: string;
      source_url: string;
      excerpt: string;
      source_type: string;
      published_at: string | null;
      retrieved_at: string;
      metadata: Record<string, JsonValue>;
      created_at: string;
    }

    export interface MediaOsMemo {
      id: string;
      slug: string;
      title: string;
      summary: string;
      research_body: string;
      declaration_evidence_ids: string[];
      status: "draft" | "review" | "approved" | "archived";
      revision: number;
      approval_stage: 0 | 1 | 2;
      stage1_approved_by: string | null;
      stage1_approved_at: string | null;
      stage2_approved_by: string | null;
      stage2_approved_at: string | null;
      approved_at: string | null;
      created_by: string;
      updated_by: string;
      created_at: string;
      updated_at: string;
    }

    export interface MediaOsClaim {
      text: string;
      evidenceIds: string[];
    }

    export interface MediaOsArtifactContent {
      slug: string;
      title: string;
      summary: string;
      body: string[];
      claims: MediaOsClaim[];
      evidence: Array<Pick<MediaOsEvidence, "id" | "title" | "source_url" | "excerpt">>;
      callToAction: string;
      deliveryMode: "internal-publish" | "human-controlled";
      metadata: Record<string, JsonValue>;
    }

    export interface MediaOsQualityIssue {
      code:
        | "UNKNOWN_EVIDENCE_ID"
        | "UNSUPPORTED_CLAIM"
        | "DECLARATION_MISMATCH"
        | "MISSING_EVIDENCE"
        | "INVALID_CHANNEL_CONTENT";
      severity: "error" | "warning";
      message: string;
      path?: string;
    }

    export interface MediaOsArtifact {
      id: string;
      memo_id: string;
      channel: MediaOsChannel;
      source_revision: number;
      revision: number;
      state: "draft" | "approved" | "scheduled" | "publishing" | "awaiting_human" | "published" | "stale" | "error";
      approval_stage: 0 | 1 | 2;
      content: MediaOsArtifactContent;
      quality_issues: MediaOsQualityIssue[];
      quality_error_count: number;
      instruction_payload: Record<string, JsonValue> | null;
      instruction_signature: string | null;
      instruction_expires_at: string | null;
      scheduled_at: string | null;
      external_url: string | null;
      published_at: string | null;
      created_at: string;
      updated_at: string;
    }

    export interface MediaOsLead {
      id: string;
      insight_slug: string;
      email: string;
      name: string | null;
      company: string | null;
      website: string | null;
      message: string | null;
      consent: boolean;
      consented_at: string;
      created_at: string;
    }

    export interface MediaOsAuditEvent {
      id: number;
      entity_type: string;
      entity_id: string;
      action: string;
      actor: string;
      before_state: Record<string, JsonValue> | null;
      after_state: Record<string, JsonValue> | null;
      created_at: string;
    }

    export interface MediaOsAdminSnapshot {
      memos: MediaOsMemo[];
      selectedMemo: MediaOsMemo | null;
      evidence: MediaOsEvidence[];
      artifacts: MediaOsArtifact[];
      leads: MediaOsLead[];
      audit: MediaOsAuditEvent[];
      analytics: Array<{ insight_slug: string; event_name: string; count: number }>;
      serverTime: string;
    }
    ''',
)

write(
    CORE / "config.ts",
    r'''
    const read = (name: string): string => process.env[name]?.trim() ?? "";

    export function requiredServerEnv(name: string): string {
      const value = read(name);
      if (!value) throw new Error(`Missing required server environment variable: ${name}`);
      return value;
    }

    export function supabaseServerConfig(): { url: string; serviceKey: string; anonKey: string } {
      return {
        url: requiredServerEnv("NEXT_PUBLIC_SUPABASE_URL").replace(/\/$/, ""),
        serviceKey: requiredServerEnv("SUPABASE_SERVICE_ROLE_KEY"),
        anonKey: requiredServerEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
      };
    }

    export function mediaOsSigningSecret(): string {
      return requiredServerEnv("MEDIA_OS_SIGNING_SECRET");
    }

    export function mediaOsIpHashSecret(): string {
      return read("MEDIA_OS_IP_HASH_SECRET") || mediaOsSigningSecret();
    }

    export function mediaOsPublisherToken(): string {
      return requiredServerEnv("MEDIA_OS_PUBLISHER_TOKEN");
    }

    export function turnstileSecret(): string | null {
      return read("TURNSTILE_SECRET_KEY") || read("CLOUDFLARE_TURNSTILE_SECRET_KEY") || null;
    }

    export function mediaOsAdminEmails(): Set<string> {
      const value = read("MEDIA_OS_ADMIN_EMAILS") || read("ADMIN_EMAILS") || read("ALLOWED_EMAILS");
      return new Set(value.split(",").map((email) => email.trim().toLowerCase()).filter(Boolean));
    }
    ''',
)

write(
    CORE / "http.ts",
    r'''
    import { createHash, createHmac } from "node:crypto";
    import type { NextRequest } from "next/server";

    export class MediaOsHttpError extends Error {
      constructor(public readonly status: number, message: string, public readonly code = "MEDIA_OS_ERROR") {
        super(message);
        this.name = "MediaOsHttpError";
      }
    }

    export async function readJsonObject(request: Request, maxBytes = 64_000): Promise<Record<string, unknown>> {
      const declared = Number(request.headers.get("content-length") || 0);
      if (Number.isFinite(declared) && declared > maxBytes) throw new MediaOsHttpError(413, "Request body is too large.");
      const raw = await request.text();
      if (Buffer.byteLength(raw, "utf8") > maxBytes) throw new MediaOsHttpError(413, "Request body is too large.");
      try {
        const value: unknown = JSON.parse(raw || "{}");
        if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("object required");
        return value as Record<string, unknown>;
      } catch {
        throw new MediaOsHttpError(400, "A valid JSON object is required.", "INVALID_JSON");
      }
    }

    export function nonEmptyString(value: unknown, name: string, max = 20_000): string {
      if (typeof value !== "string") throw new MediaOsHttpError(400, `${name} must be a string.`, "INVALID_INPUT");
      const normalized = value.trim();
      if (!normalized || normalized.length > max) throw new MediaOsHttpError(400, `${name} is invalid.`, "INVALID_INPUT");
      return normalized;
    }

    export function optionalString(value: unknown, max = 2_000): string | null {
      if (value === null || value === undefined || value === "") return null;
      if (typeof value !== "string") throw new MediaOsHttpError(400, "Invalid string value.", "INVALID_INPUT");
      const normalized = value.trim();
      if (normalized.length > max) throw new MediaOsHttpError(400, "String value is too long.", "INVALID_INPUT");
      return normalized || null;
    }

    export function expectedRevision(value: unknown): number {
      const revision = typeof value === "number" ? value : Number(value);
      if (!Number.isInteger(revision) || revision < 1) throw new MediaOsHttpError(400, "A valid expected revision is required.", "INVALID_REVISION");
      return revision;
    }

    export function safeSlug(input: string): string {
      const slug = input.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 120);
      if (!slug) throw new MediaOsHttpError(400, "A URL-safe English slug is required.", "INVALID_SLUG");
      return slug;
    }

    function privateIpv4(host: string): boolean {
      const match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
      if (!match) return false;
      const octets = match.slice(1).map(Number);
      if (octets.some((part) => part > 255)) return true;
      const [a, b] = octets;
      return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || a >= 224;
    }

    export function safeExternalUrl(value: unknown, { allowHttp = false }: { allowHttp?: boolean } = {}): string {
      const raw = nonEmptyString(value, "URL", 2_048);
      let parsed: URL;
      try { parsed = new URL(raw); } catch { throw new MediaOsHttpError(400, "A valid absolute URL is required.", "INVALID_URL"); }
      if (parsed.protocol !== "https:" && !(allowHttp && parsed.protocol === "http:")) throw new MediaOsHttpError(400, "Only secure public URLs are accepted.", "INVALID_URL");
      const host = parsed.hostname.toLowerCase().replace(/\.$/, "");
      if (!host || host === "localhost" || host.endsWith(".local") || host === "::1" || host.startsWith("fe80:") || privateIpv4(host)) {
        throw new MediaOsHttpError(400, "Private or local URLs are not accepted.", "INVALID_URL");
      }
      parsed.username = "";
      parsed.password = "";
      return parsed.toString();
    }

    export function assertSameOrigin(request: NextRequest): void {
      if (request.headers.get("authorization")?.startsWith("Bearer ")) return;
      const origin = request.headers.get("origin");
      if (!origin) throw new MediaOsHttpError(403, "Origin header is required.", "CSRF_BLOCKED");
      const forwardedHost = request.headers.get("x-forwarded-host") || request.headers.get("host");
      const forwardedProto = request.headers.get("x-forwarded-proto") || request.nextUrl.protocol.replace(":", "");
      if (!forwardedHost || origin !== `${forwardedProto}://${forwardedHost}`) throw new MediaOsHttpError(403, "Cross-origin request blocked.", "CSRF_BLOCKED");
    }

    export function clientIp(request: Request): string {
      const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
      return forwarded || request.headers.get("cf-connecting-ip") || request.headers.get("x-real-ip") || "unknown";
    }

    export function privacyHash(value: string, secret: string): string {
      return createHmac("sha256", secret).update(value).digest("hex");
    }

    export function sessionHash(value: string): string {
      return createHash("sha256").update(value).digest("hex");
    }
    ''',
)

write(
    CORE / "auth.ts",
    r'''
    import type { NextRequest } from "next/server";
    import { mediaOsAdminEmails, supabaseServerConfig } from "./config";
    import { MediaOsHttpError } from "./http";

    export interface MediaOsAdminUser { id: string; email: string; role: string; }

    function decodeCookieValue(raw: string): unknown {
      let value = raw;
      try { value = decodeURIComponent(value); } catch { /* cookie may already be decoded */ }
      if (value.startsWith("base64-")) {
        const encoded = value.slice(7).replace(/-/g, "+").replace(/_/g, "/");
        try { value = Buffer.from(encoded, "base64").toString("utf8"); } catch { return null; }
      }
      try { return JSON.parse(value); } catch { return value; }
    }

    function findAccessToken(value: unknown): string | null {
      if (!value) return null;
      if (typeof value === "object") {
        const record = value as Record<string, unknown>;
        if (typeof record.access_token === "string") return record.access_token;
        if (Array.isArray(value)) {
          for (const item of value) { const token = findAccessToken(item); if (token) return token; }
        } else {
          for (const item of Object.values(record)) { const token = findAccessToken(item); if (token) return token; }
        }
      }
      return null;
    }

    function tokenFromCookies(request: NextRequest): string | null {
      const candidates = request.cookies.getAll().filter((cookie) => /auth-token(?:\.\d+)?$/.test(cookie.name));
      const groups = new Map<string, Array<{ name: string; value: string }>>();
      for (const cookie of candidates) {
        const base = cookie.name.replace(/\.\d+$/, "");
        groups.set(base, [...(groups.get(base) || []), cookie]);
      }
      for (const values of groups.values()) {
        values.sort((a, b) => {
          const ai = Number(a.name.match(/\.(\d+)$/)?.[1] ?? -1);
          const bi = Number(b.name.match(/\.(\d+)$/)?.[1] ?? -1);
          return ai - bi;
        });
        const token = findAccessToken(decodeCookieValue(values.map((entry) => entry.value).join("")));
        if (token) return token;
      }
      return null;
    }

    export async function requireMediaOsAdmin(request: NextRequest): Promise<MediaOsAdminUser> {
      const bearer = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
      const accessToken = bearer || tokenFromCookies(request);
      if (!accessToken) throw new MediaOsHttpError(401, "Authentication required.", "UNAUTHENTICATED");
      const { url, anonKey } = supabaseServerConfig();
      const response = await fetch(`${url}/auth/v1/user`, {
        headers: { apikey: anonKey, authorization: `Bearer ${accessToken}` },
        cache: "no-store",
      });
      if (!response.ok) throw new MediaOsHttpError(401, "Session is invalid or expired.", "UNAUTHENTICATED");
      const user = (await response.json()) as {
        id?: string; email?: string; app_metadata?: Record<string, unknown>; user_metadata?: Record<string, unknown>;
      };
      const email = user.email?.toLowerCase() || "";
      const roleValue = user.app_metadata?.role ?? user.user_metadata?.role ?? "";
      const role = typeof roleValue === "string" ? roleValue.toLowerCase() : "";
      const allowedRoles = new Set(["admin", "owner", "staff", "editor", "internal"]);
      const emails = mediaOsAdminEmails();
      if (!user.id || !email || (!allowedRoles.has(role) && !emails.has(email))) {
        throw new MediaOsHttpError(403, "Media OS administrator access is required.", "FORBIDDEN");
      }
      return { id: user.id, email, role: role || "allowlisted" };
    }
    ''',
)

write(
    CORE / "signatures.ts",
    r'''
    import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

    export interface SignedInstructionPayload {
      version: 1;
      action: "human_publish" | "human_outreach";
      artifactId: string;
      channel: string;
      revision: number;
      expiresAt: string;
      nonce: string;
      deliveryMode: "human-controlled";
    }

    function canonical(value: unknown): string {
      if (value === null || typeof value !== "object") return JSON.stringify(value);
      if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
      const record = value as Record<string, unknown>;
      return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonical(record[key])}`).join(",")}}`;
    }

    export function signInstruction(
      input: Omit<SignedInstructionPayload, "version" | "nonce" | "deliveryMode">,
      secret: string,
    ): { payload: SignedInstructionPayload; signature: string } {
      const payload: SignedInstructionPayload = { ...input, version: 1, nonce: randomUUID(), deliveryMode: "human-controlled" };
      const signature = createHmac("sha256", secret).update(canonical(payload)).digest("base64url");
      return { payload, signature };
    }

    export function verifyInstruction(payload: SignedInstructionPayload, signature: string, secret: string, now = Date.now()): boolean {
      if (payload.version !== 1 || payload.deliveryMode !== "human-controlled" || Date.parse(payload.expiresAt) <= now) return false;
      const expected = createHmac("sha256", secret).update(canonical(payload)).digest();
      let received: Buffer;
      try { received = Buffer.from(signature, "base64url"); } catch { return false; }
      return received.length === expected.length && timingSafeEqual(received, expected);
    }

    export function timingSafeTokenEqual(received: string, expectedValue: string): boolean {
      const left = Buffer.from(received);
      const right = Buffer.from(expectedValue);
      return left.length === right.length && timingSafeEqual(left, right);
    }
    ''',
)

write(
    CORE / "quality.ts",
    r'''
    import type { MediaOsArtifactContent, MediaOsChannel, MediaOsEvidence, MediaOsQualityIssue } from "./types";

    const EVIDENCE_ID = /^EV-[A-Z0-9][A-Z0-9-]{2,63}$/;
    const MARKER = /\[(EV-[A-Z0-9][A-Z0-9-]{2,63})\]/g;
    const FACTUAL_SIGNAL = /(?:\b\d+(?:[.,]\d+)?%?\b|[$€£¥]\s?\d|\b(?:million|billion|trillion|increase|decrease|grew|growth|market size|ranking)\b)/i;

    export function extractEvidenceMarkers(text: string): string[] {
      return [...text.matchAll(MARKER)].map((match) => match[1]);
    }

    export function validEvidenceId(value: string): boolean { return EVIDENCE_ID.test(value); }

    export function validateArtifactQuality(input: {
      channel: MediaOsChannel;
      content: MediaOsArtifactContent;
      evidence: MediaOsEvidence[];
      declarationEvidenceIds: string[];
    }): MediaOsQualityIssue[] {
      const { content, evidence, declarationEvidenceIds, channel } = input;
      const issues: MediaOsQualityIssue[] = [];
      const known = new Set(evidence.map((item) => item.id));
      const used = new Set<string>();
      for (const [index, claim] of content.claims.entries()) {
        if (!claim.text.trim()) issues.push({ code: "INVALID_CHANNEL_CONTENT", severity: "error", message: "Claim text is required.", path: `claims.${index}` });
        if (claim.evidenceIds.length === 0 && FACTUAL_SIGNAL.test(claim.text)) {
          issues.push({ code: "UNSUPPORTED_CLAIM", severity: "error", message: "A factual or numeric claim has no evidence ID.", path: `claims.${index}` });
        }
        for (const id of claim.evidenceIds) {
          used.add(id);
          if (!known.has(id)) issues.push({ code: "UNKNOWN_EVIDENCE_ID", severity: "error", message: `Unknown evidence ID: ${id}`, path: `claims.${index}` });
        }
      }
      for (const paragraph of content.body) for (const id of extractEvidenceMarkers(paragraph)) used.add(id);
      for (const id of used) if (!known.has(id)) issues.push({ code: "UNKNOWN_EVIDENCE_ID", severity: "error", message: `Unknown evidence marker: ${id}` });
      for (const id of declarationEvidenceIds) {
        if (!known.has(id)) issues.push({ code: "DECLARATION_MISMATCH", severity: "error", message: `Declaration references evidence not attached to the memo: ${id}` });
      }
      if (declarationEvidenceIds.length > 0 && !declarationEvidenceIds.some((id) => used.has(id))) {
        issues.push({ code: "DECLARATION_MISMATCH", severity: "error", message: "Generated content does not use any declared evidence ID." });
      }
      if (known.size === 0) issues.push({ code: "MISSING_EVIDENCE", severity: "error", message: "At least one evidence record is required." });
      if (!content.title.trim() || !content.summary.trim() || content.body.length === 0) {
        issues.push({ code: "INVALID_CHANNEL_CONTENT", severity: "error", message: `${channel} content is incomplete.` });
      }
      if (channel === "pseo" && content.deliveryMode !== "internal-publish") {
        issues.push({ code: "INVALID_CHANNEL_CONTENT", severity: "error", message: "pSEO must use internal publishing." });
      }
      if (channel !== "pseo" && content.deliveryMode !== "human-controlled") {
        issues.push({ code: "INVALID_CHANNEL_CONTENT", severity: "error", message: "External channels must remain human-controlled." });
      }
      return issues;
    }
    ''',
)

write(
    CORE / "generator.ts",
    r'''
    import type { MediaOsArtifactContent, MediaOsChannel, MediaOsEvidence, MediaOsMemo } from "./types";

    function claim(text: string, evidence: MediaOsEvidence[]) {
      return { text, evidenceIds: evidence.slice(0, 3).map((item) => item.id) };
    }

    function marker(evidence: MediaOsEvidence[]): string {
      return evidence.slice(0, 3).map((item) => `[${item.id}]`).join(" ");
    }

    function base(memo: MediaOsMemo, evidence: MediaOsEvidence[], channel: MediaOsChannel): MediaOsArtifactContent {
      const citations = marker(evidence);
      const factual = memo.summary || memo.research_body.split(/\n+/)[0] || memo.title;
      const common = {
        slug: memo.slug,
        evidence: evidence.map(({ id, title, source_url, excerpt }) => ({ id, title, source_url, excerpt })),
        claims: [claim(factual, evidence)],
        callToAction: "Discuss a controlled Japan market-entry validation with Paradigm.",
      };
      if (channel === "pseo") return {
        ...common,
        title: memo.title,
        summary: memo.summary,
        body: [memo.summary, `${factual} ${citations}`.trim(), memo.research_body, "Evidence references are listed below and should be reviewed before a commercial decision."],
        deliveryMode: "internal-publish",
        metadata: { channel, sourceRevision: memo.revision, locale: "en", evidenceMarkers: citations },
      };
      if (channel === "youtube") return {
        ...common,
        title: `${memo.title} — YouTube production package`,
        summary: memo.summary,
        body: ["00:00 — Context", `00:30 — Core finding ${citations}`, "02:00 — Japan-entry implications", "04:30 — Evidence and limitations", "06:00 — Human-reviewed next step"],
        deliveryMode: "human-controlled",
        metadata: { channel, sourceRevision: memo.revision, timecodes: ["00:00", "00:30", "02:00", "04:30", "06:00"] },
      };
      if (channel === "x") return {
        ...common,
        title: `${memo.title} — X thread`,
        summary: memo.summary,
        body: [`1/ ${memo.title}`, `2/ ${factual} ${citations}`.trim(), "3/ Market-entry decisions require localized validation, not automated outreach.", "4/ Sources and limitations are attached for human review."],
        deliveryMode: "human-controlled",
        metadata: { channel, sourceRevision: memo.revision, format: "thread" },
      };
      if (channel === "linkedin") return {
        ...common,
        title: `${memo.title} — LinkedIn draft`,
        summary: memo.summary,
        body: [memo.summary, `${factual} ${citations}`.trim(), "The operational takeaway is to validate positioning, compliance, distribution, and demand before scaling.", "This draft requires a human editor and manual publication."],
        deliveryMode: "human-controlled",
        metadata: { channel, sourceRevision: memo.revision, format: "post" },
      };
      return {
        ...common,
        title: `${memo.title} — commercial brief`,
        summary: memo.summary,
        body: ["Opportunity summary", `${factual} ${citations}`.trim(), "Qualification questions", "Risks and evidence limitations", "Human-controlled consultation handoff; no automated messaging or engagement."],
        deliveryMode: "human-controlled",
        metadata: { channel, sourceRevision: memo.revision, automatedOutreach: false },
      };
    }

    export function generateAllArtifacts(memo: MediaOsMemo, evidence: MediaOsEvidence[]): Array<{ channel: MediaOsChannel; content: MediaOsArtifactContent }> {
      return (["pseo", "youtube", "x", "linkedin", "commercial"] as const).map((channel) => ({ channel, content: base(memo, evidence, channel) }));
    }
    ''',
)

write(
    CORE / "store.ts",
    r'''
    import { randomUUID } from "node:crypto";
    import { mediaOsSigningSecret, supabaseServerConfig } from "./config";
    import { generateAllArtifacts } from "./generator";
    import { MediaOsHttpError, safeExternalUrl, safeSlug } from "./http";
    import { validateArtifactQuality } from "./quality";
    import { signInstruction } from "./signatures";
    import type { JsonValue, MediaOsAdminSnapshot, MediaOsArtifact, MediaOsEvidence, MediaOsMemo } from "./types";

    type Row = Record<string, unknown>;

    async function serviceRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
      const { url, serviceKey } = supabaseServerConfig();
      const response = await fetch(`${url}/rest/v1/${path}`, {
        ...init,
        cache: "no-store",
        headers: {
          apikey: serviceKey,
          authorization: `Bearer ${serviceKey}`,
          "content-type": "application/json",
          ...(init.headers || {}),
        },
      });
      if (!response.ok) {
        const detail = await response.text();
        const conflict = response.status === 409 || /stale_revision|revision_conflict/i.test(detail);
        throw new MediaOsHttpError(conflict ? 409 : response.status, conflict ? "The record changed. Reload the latest revision before retrying." : `Media OS storage error: ${detail.slice(0, 500)}`, conflict ? "REVISION_CONFLICT" : "STORE_ERROR");
      }
      if (response.status === 204) return undefined as T;
      const text = await response.text();
      return (text ? JSON.parse(text) : null) as T;
    }

    async function rpc<T>(name: string, args: Record<string, unknown>): Promise<T> {
      return serviceRequest<T>(`rpc/${name}`, { method: "POST", body: JSON.stringify(args) });
    }

    async function audit(entityType: string, entityId: string, action: string, actor: string, before: unknown, after: unknown): Promise<void> {
      await serviceRequest("media_os_audit_log", {
        method: "POST",
        headers: { prefer: "return=minimal" },
        body: JSON.stringify({ entity_type: entityType, entity_id: entityId, action, actor, before_state: before, after_state: after }),
      });
    }

    export async function adminSnapshot(selectedMemoId?: string | null): Promise<MediaOsAdminSnapshot> {
      const memos = await serviceRequest<MediaOsMemo[]>("media_os_memos?select=*&order=updated_at.desc&limit=100");
      const selectedMemo = (selectedMemoId ? memos.find((memo) => memo.id === selectedMemoId) : memos[0]) || null;
      const memoFilter = selectedMemo ? `&memo_id=eq.${encodeURIComponent(selectedMemo.id)}` : "&memo_id=is.null";
      const [evidence, artifacts, leads, auditEvents, analytics] = await Promise.all([
        serviceRequest<MediaOsEvidence[]>(`media_os_evidence?select=*${memoFilter}&order=created_at.asc`),
        serviceRequest<MediaOsArtifact[]>(`media_os_artifacts?select=*${memoFilter}&order=channel.asc,created_at.desc`),
        serviceRequest<MediaOsAdminSnapshot["leads"]>("media_os_leads?select=id,insight_slug,email,name,company,website,message,consent,consented_at,created_at&order=created_at.desc&limit=100"),
        serviceRequest<MediaOsAdminSnapshot["audit"]>(selectedMemo ? `media_os_audit_log?select=*&entity_id=eq.${encodeURIComponent(selectedMemo.id)}&order=created_at.desc&limit=200` : "media_os_audit_log?select=*&order=created_at.desc&limit=100"),
        rpc<MediaOsAdminSnapshot["analytics"]>("media_os_analytics_summary", {}),
      ]);
      return { memos, selectedMemo, evidence, artifacts, leads, audit: auditEvents, analytics, serverTime: new Date().toISOString() };
    }

    export async function createMemo(input: Row, actor: string): Promise<MediaOsMemo> {
      const title = String(input.title || "").trim();
      const summary = String(input.summary || "").trim();
      if (!title || !summary) throw new MediaOsHttpError(400, "Title and summary are required.");
      const slug = safeSlug(String(input.slug || title));
      const rows = await serviceRequest<MediaOsMemo[]>("media_os_memos", {
        method: "POST", headers: { prefer: "return=representation" },
        body: JSON.stringify({ slug, title: title.slice(0, 240), summary: summary.slice(0, 2_000), research_body: String(input.researchBody || "").slice(0, 80_000), declaration_evidence_ids: [], created_by: actor, updated_by: actor }),
      });
      const memo = rows[0];
      await audit("memo", memo.id, "created", actor, null, memo);
      return memo;
    }

    export async function updateMemo(input: Row, actor: string): Promise<MediaOsMemo> {
      const id = String(input.id || "");
      const revision = Number(input.expectedRevision);
      if (!id || !Number.isInteger(revision)) throw new MediaOsHttpError(400, "Memo ID and expected revision are required.");
      const beforeRows = await serviceRequest<MediaOsMemo[]>(`media_os_memos?select=*&id=eq.${encodeURIComponent(id)}&limit=1`);
      const body: Row = { updated_by: actor };
      if (typeof input.title === "string") body.title = input.title.trim().slice(0, 240);
      if (typeof input.summary === "string") body.summary = input.summary.trim().slice(0, 2_000);
      if (typeof input.researchBody === "string") body.research_body = input.researchBody.slice(0, 80_000);
      if (typeof input.slug === "string") body.slug = safeSlug(input.slug);
      if (Array.isArray(input.declarationEvidenceIds)) body.declaration_evidence_ids = input.declarationEvidenceIds.filter((value): value is string => typeof value === "string");
      const rows = await serviceRequest<MediaOsMemo[]>(`media_os_memos?id=eq.${encodeURIComponent(id)}&revision=eq.${revision}`, { method: "PATCH", headers: { prefer: "return=representation" }, body: JSON.stringify(body) });
      if (!rows[0]) throw new MediaOsHttpError(409, "The memo changed. Reload before saving.", "REVISION_CONFLICT");
      await audit("memo", id, "updated", actor, beforeRows[0] || null, rows[0]);
      return rows[0];
    }

    export async function addEvidence(input: Row, actor: string): Promise<MediaOsEvidence> {
      const memoId = String(input.memoId || "");
      const title = String(input.title || "").trim();
      const excerpt = String(input.excerpt || "").trim();
      const sourceUrl = safeExternalUrl(input.sourceUrl, { allowHttp: true });
      if (!memoId || !title || !excerpt) throw new MediaOsHttpError(400, "Memo, evidence title, URL, and excerpt are required.");
      const id = `EV-${randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase()}`;
      const rows = await serviceRequest<MediaOsEvidence[]>("media_os_evidence", {
        method: "POST", headers: { prefer: "return=representation" },
        body: JSON.stringify({ id, memo_id: memoId, title: title.slice(0, 300), source_url: sourceUrl, excerpt: excerpt.slice(0, 8_000), source_type: String(input.sourceType || "web").slice(0, 60), published_at: input.publishedAt || null, retrieved_at: new Date().toISOString(), metadata: {}, created_by: actor }),
      });
      await audit("memo", memoId, "evidence_added", actor, null, { evidenceId: id, sourceUrl });
      return rows[0];
    }

    export async function removeEvidence(input: Row, actor: string): Promise<void> {
      const id = String(input.evidenceId || "");
      const memoId = String(input.memoId || "");
      if (!id || !memoId) throw new MediaOsHttpError(400, "Evidence and memo IDs are required.");
      await serviceRequest(`media_os_evidence?id=eq.${encodeURIComponent(id)}&memo_id=eq.${encodeURIComponent(memoId)}`, { method: "DELETE", headers: { prefer: "return=minimal" } });
      await audit("memo", memoId, "evidence_removed", actor, { evidenceId: id }, null);
    }

    export async function approveMemo(input: Row, actor: string): Promise<MediaOsMemo> {
      return rpc("media_os_approve_memo", { p_memo_id: String(input.memoId || ""), p_expected_revision: Number(input.expectedRevision), p_stage: Number(input.stage), p_actor: actor });
    }

    export async function generateArtifacts(input: Row, actor: string): Promise<MediaOsArtifact[]> {
      const memoId = String(input.memoId || "");
      const expected = Number(input.expectedRevision);
      const snapshot = await rpc<{ memo: MediaOsMemo; evidence: MediaOsEvidence[] }>("media_os_generation_snapshot", { p_memo_id: memoId, p_expected_revision: expected });
      const generated = generateAllArtifacts(snapshot.memo, snapshot.evidence).map(({ channel, content }) => {
        const quality = validateArtifactQuality({ channel, content, evidence: snapshot.evidence, declarationEvidenceIds: snapshot.memo.declaration_evidence_ids });
        const errors = quality.filter((issue) => issue.severity === "error").length;
        const external = channel !== "pseo";
        const signed = external ? signInstruction({ action: channel === "commercial" ? "human_outreach" : "human_publish", artifactId: `${memoId}:${channel}:${expected}`, channel, revision: expected, expiresAt: new Date(Date.now() + 7 * 86_400_000).toISOString() }, mediaOsSigningSecret()) : null;
        return { channel, content, quality_issues: quality, quality_error_count: errors, instruction_payload: signed?.payload || null, instruction_signature: signed?.signature || null, instruction_expires_at: signed?.payload.expiresAt || null };
      });
      const blocking = generated.flatMap((artifact) => artifact.quality_issues).filter((issue) => issue.severity === "error");
      if (blocking.length) throw new MediaOsHttpError(422, `Quality gate blocked generation: ${blocking.map((issue) => issue.message).join("; ")}`, "QUALITY_GATE_FAILED");
      return rpc("media_os_store_artifacts", { p_memo_id: memoId, p_expected_revision: expected, p_actor: actor, p_artifacts: generated });
    }

    export async function approveArtifact(input: Row, actor: string): Promise<MediaOsArtifact> {
      return rpc("media_os_approve_artifact", { p_artifact_id: String(input.artifactId || ""), p_expected_revision: Number(input.expectedRevision), p_stage: Number(input.stage), p_actor: actor });
    }

    export async function scheduleArtifact(input: Row, actor: string): Promise<MediaOsArtifact> {
      const scheduledAt = new Date(String(input.scheduledAt || ""));
      if (Number.isNaN(scheduledAt.valueOf())) throw new MediaOsHttpError(400, "A valid schedule time is required.");
      return rpc("media_os_schedule_artifact", { p_artifact_id: String(input.artifactId || ""), p_expected_revision: Number(input.expectedRevision), p_scheduled_at: scheduledAt.toISOString(), p_actor: actor });
    }

    export async function retryArtifact(input: Row, actor: string): Promise<MediaOsArtifact> {
      return rpc("media_os_retry_artifact", { p_artifact_id: String(input.artifactId || ""), p_expected_revision: Number(input.expectedRevision), p_actor: actor });
    }

    export async function confirmExternalPublication(input: Row, actor: string): Promise<MediaOsArtifact> {
      return rpc("media_os_confirm_external_publication", { p_artifact_id: String(input.artifactId || ""), p_expected_revision: Number(input.expectedRevision), p_external_url: safeExternalUrl(input.externalUrl), p_actor: actor });
    }

    export async function publicInsights(): Promise<Array<{ slug: string; title: string; summary: string; published_at: string }>> {
      return serviceRequest("media_os_artifacts?select=public_slug:content->>slug,public_title:content->>title,public_summary:content->>summary,published_at&channel=eq.pseo&state=eq.published&order=published_at.desc&limit=100").then((rows: unknown) => (rows as Array<Record<string, string>>).map((row) => ({ slug: row.public_slug, title: row.public_title, summary: row.public_summary, published_at: row.published_at })));
    }

    export async function publicInsight(slug: string): Promise<MediaOsArtifact | null> {
      const safe = safeSlug(slug);
      const rows = await serviceRequest<MediaOsArtifact[]>(`media_os_artifacts?select=*&channel=eq.pseo&state=eq.published&content->>slug=eq.${encodeURIComponent(safe)}&limit=1`);
      return rows[0] || null;
    }

    export async function acceptLead(input: Row): Promise<{ id: string }> {
      return rpc("media_os_accept_lead", input);
    }

    export async function recordAnalytics(input: Row): Promise<void> {
      await rpc("media_os_record_analytics", input);
    }

    export async function publisherHealth(): Promise<Record<string, JsonValue>> {
      return rpc("media_os_health", {});
    }

    export async function claimPublishJob(workerId: string): Promise<Row | null> {
      return rpc("media_os_claim_publish_job", { p_worker_id: workerId });
    }

    export async function completePublishJob(jobId: string, claimToken: string, actor: string): Promise<Row> {
      return rpc("media_os_complete_publish_job", { p_job_id: jobId, p_claim_token: claimToken, p_actor: actor });
    }

    export async function failPublishJob(jobId: string, claimToken: string, error: string): Promise<void> {
      await rpc("media_os_fail_publish_job", { p_job_id: jobId, p_claim_token: claimToken, p_error: error.slice(0, 2_000) });
    }
    ''',
)

# Route imports are computed so the bootstrap works with either /app or /src/app.
admin_route = APP / "api/media-os/admin/route.ts"
store_import = rel_import(admin_route, CORE / "store.ts")
auth_import = rel_import(admin_route, CORE / "auth.ts")
http_import = rel_import(admin_route, CORE / "http.ts")
write(
    admin_route,
    f'''
    import {{ NextRequest, NextResponse }} from "next/server";
    import {{ requireMediaOsAdmin }} from "{auth_import}";
    import {{ assertSameOrigin, MediaOsHttpError, readJsonObject }} from "{http_import}";
    import {{ adminSnapshot, addEvidence, approveArtifact, approveMemo, confirmExternalPublication, createMemo, generateArtifacts, removeEvidence, retryArtifact, scheduleArtifact, updateMemo }} from "{store_import}";

    export const runtime = "nodejs";
    export const dynamic = "force-dynamic";

    function failure(error: unknown): NextResponse {{
      if (error instanceof MediaOsHttpError) return NextResponse.json({{ error: error.message, code: error.code }}, {{ status: error.status }});
      console.error("Media OS admin API error", error);
      return NextResponse.json({{ error: "Media OS request failed.", code: "INTERNAL_ERROR" }}, {{ status: 500 }});
    }}

    export async function GET(request: NextRequest): Promise<NextResponse> {{
      try {{
        await requireMediaOsAdmin(request);
        return NextResponse.json(await adminSnapshot(request.nextUrl.searchParams.get("memo")), {{ headers: {{ "cache-control": "no-store" }} }});
      }} catch (error) {{ return failure(error); }}
    }}

    export async function POST(request: NextRequest): Promise<NextResponse> {{
      try {{
        assertSameOrigin(request);
        const user = await requireMediaOsAdmin(request);
        const input = await readJsonObject(request);
        const action = String(input.action || "");
        const actor = `${{user.id}}:${{user.email}}`;
        let data: unknown;
        switch (action) {{
          case "createMemo": data = await createMemo(input, actor); break;
          case "updateMemo": data = await updateMemo(input, actor); break;
          case "addEvidence": data = await addEvidence(input, actor); break;
          case "removeEvidence": data = await removeEvidence(input, actor); break;
          case "approveMemo": data = await approveMemo(input, actor); break;
          case "generateArtifacts": data = await generateArtifacts(input, actor); break;
          case "approveArtifact": data = await approveArtifact(input, actor); break;
          case "scheduleArtifact": data = await scheduleArtifact(input, actor); break;
          case "retryArtifact": data = await retryArtifact(input, actor); break;
          case "confirmExternalPublication": data = await confirmExternalPublication(input, actor); break;
          default: throw new MediaOsHttpError(400, "Unknown Media OS action.", "UNKNOWN_ACTION");
        }}
        return NextResponse.json({{ ok: true, data }});
      }} catch (error) {{ return failure(error); }}
    }}
    ''',
)

lead_route = APP / "api/media-os/leads/route.ts"
lead_store_import = rel_import(lead_route, CORE / "store.ts")
lead_config_import = rel_import(lead_route, CORE / "config.ts")
lead_http_import = rel_import(lead_route, CORE / "http.ts")
write(
    lead_route,
    f'''
    import {{ NextRequest, NextResponse }} from "next/server";
    import {{ mediaOsIpHashSecret, turnstileSecret }} from "{lead_config_import}";
    import {{ clientIp, MediaOsHttpError, optionalString, privacyHash, readJsonObject, safeExternalUrl, safeSlug }} from "{lead_http_import}";
    import {{ acceptLead }} from "{lead_store_import}";

    export const runtime = "nodejs";
    export const dynamic = "force-dynamic";

    async function verifyTurnstile(token: string, ip: string): Promise<boolean> {{
      const secret = turnstileSecret();
      if (!secret) return true;
      if (!token) return false;
      const body = new URLSearchParams({{ secret, response: token, remoteip: ip }});
      const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {{ method: "POST", body, cache: "no-store" }});
      if (!response.ok) return false;
      return Boolean(((await response.json()) as {{ success?: boolean }}).success);
    }}

    export async function POST(request: NextRequest): Promise<NextResponse> {{
      try {{
        const input = await readJsonObject(request, 24_000);
        if (typeof input.website === "string" && input.website.trim()) return NextResponse.json({{ ok: true }}, {{ status: 202 }});
        if (input.consent !== true) throw new MediaOsHttpError(400, "Explicit consent is required.", "CONSENT_REQUIRED");
        const email = String(input.email || "").trim().toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) throw new MediaOsHttpError(400, "A valid email address is required.", "INVALID_EMAIL");
        const ip = clientIp(request);
        if (!(await verifyTurnstile(String(input.turnstileToken || ""), ip))) throw new MediaOsHttpError(400, "Human verification failed.", "TURNSTILE_FAILED");
        const companyWebsite = input.companyWebsite ? safeExternalUrl(input.companyWebsite) : null;
        const result = await acceptLead({{
          p_insight_slug: safeSlug(String(input.insightSlug || "general")), p_email: email,
          p_name: optionalString(input.name, 160), p_company: optionalString(input.company, 240), p_website: companyWebsite,
          p_message: optionalString(input.message, 4_000), p_consent: true,
          p_ip_hash: privacyHash(ip, mediaOsIpHashSecret()), p_user_agent_hash: privacyHash(request.headers.get("user-agent") || "unknown", mediaOsIpHashSecret()),
        }});
        return NextResponse.json({{ ok: true, id: result.id }}, {{ status: 201 }});
      }} catch (error) {{
        if (error instanceof MediaOsHttpError) return NextResponse.json({{ error: error.message, code: error.code }}, {{ status: error.status }});
        const message = error instanceof Error ? error.message : "";
        if (/rate_limited/i.test(message)) return NextResponse.json({{ error: "Too many requests." }}, {{ status: 429 }});
        console.error("Media OS lead error", error);
        return NextResponse.json({{ error: "Unable to submit the request." }}, {{ status: 500 }});
      }}
    }}
    ''',
)

analytics_route = APP / "api/media-os/analytics/route.ts"
analytics_store_import = rel_import(analytics_route, CORE / "store.ts")
analytics_config_import = rel_import(analytics_route, CORE / "config.ts")
analytics_http_import = rel_import(analytics_route, CORE / "http.ts")
write(
    analytics_route,
    f'''
    import {{ NextRequest, NextResponse }} from "next/server";
    import {{ mediaOsIpHashSecret }} from "{analytics_config_import}";
    import {{ clientIp, privacyHash, readJsonObject, safeSlug }} from "{analytics_http_import}";
    import {{ recordAnalytics }} from "{analytics_store_import}";

    export const runtime = "nodejs";
    export async function POST(request: NextRequest): Promise<NextResponse> {{
      try {{
        const input = await readJsonObject(request, 8_000);
        const eventName = String(input.eventName || "page_view");
        if (!new Set(["page_view", "lead_open", "lead_submit"]).has(eventName)) return NextResponse.json({{ error: "Invalid event." }}, {{ status: 400 }});
        await recordAnalytics({{ p_insight_slug: safeSlug(String(input.insightSlug || "general")), p_event_name: eventName, p_session_hash: privacyHash(String(input.sessionId || "anonymous"), mediaOsIpHashSecret()), p_ip_hash: privacyHash(clientIp(request), mediaOsIpHashSecret()) }});
        return new NextResponse(null, {{ status: 204 }});
      }} catch {{ return new NextResponse(null, {{ status: 204 }}); }}
    }}
    ''',
)

health_route = APP / "api/media-os/publisher/health/route.ts"
health_store_import = rel_import(health_route, CORE / "store.ts")
health_config_import = rel_import(health_route, CORE / "config.ts")
health_sig_import = rel_import(health_route, CORE / "signatures.ts")
write(
    health_route,
    f'''
    import {{ NextRequest, NextResponse }} from "next/server";
    import {{ mediaOsPublisherToken }} from "{health_config_import}";
    import {{ timingSafeTokenEqual }} from "{health_sig_import}";
    import {{ publisherHealth }} from "{health_store_import}";

    export const runtime = "nodejs";
    export const dynamic = "force-dynamic";
    export async function GET(request: NextRequest): Promise<NextResponse> {{
      const received = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
      let expected = "";
      try {{ expected = mediaOsPublisherToken(); }} catch {{ return NextResponse.json({{ ok: false, configured: false }}, {{ status: 503 }}); }}
      if (!timingSafeTokenEqual(received, expected)) return NextResponse.json({{ error: "Unauthorized" }}, {{ status: 401 }});
      try {{ return NextResponse.json({{ ok: true, configured: true, database: await publisherHealth(), time: new Date().toISOString() }}); }}
      catch {{ return NextResponse.json({{ ok: false, configured: true }}, {{ status: 503 }}); }}
    }}
    ''',
)

publisher_route = APP / "api/media-os/publisher/run/route.ts"
pub_store_import = rel_import(publisher_route, CORE / "store.ts")
pub_config_import = rel_import(publisher_route, CORE / "config.ts")
pub_sig_import = rel_import(publisher_route, CORE / "signatures.ts")
write(
    publisher_route,
    f'''
    import {{ randomUUID }} from "node:crypto";
    import {{ NextRequest, NextResponse }} from "next/server";
    import {{ mediaOsPublisherToken }} from "{pub_config_import}";
    import {{ timingSafeTokenEqual }} from "{pub_sig_import}";
    import {{ claimPublishJob, completePublishJob, failPublishJob }} from "{pub_store_import}";

    export const runtime = "nodejs";
    export const dynamic = "force-dynamic";
    export async function POST(request: NextRequest): Promise<NextResponse> {{
      const received = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
      let expected = "";
      try {{ expected = mediaOsPublisherToken(); }} catch {{ return NextResponse.json({{ error: "Publisher is not configured." }}, {{ status: 503 }}); }}
      if (!timingSafeTokenEqual(received, expected)) return NextResponse.json({{ error: "Unauthorized" }}, {{ status: 401 }});
      const worker = `publisher:${{randomUUID()}}`;
      const job = await claimPublishJob(worker);
      if (!job) return new NextResponse(null, {{ status: 204 }});
      const id = String(job.id || "");
      const token = String(job.claim_token || "");
      try {{
        const result = await completePublishJob(id, token, worker);
        return NextResponse.json({{ ok: true, result, externalActionsAutomated: false }});
      }} catch (error) {{
        await failPublishJob(id, token, error instanceof Error ? error.message : "Unknown publisher error");
        return NextResponse.json({{ error: "Publish job failed." }}, {{ status: 500 }});
      }}
    }}
    ''',
)

write(CORE / "version.ts", 'export const MEDIA_OS_SCHEMA_VERSION = 1 as const;\n')

# UI and migrations are added in the second half below.
