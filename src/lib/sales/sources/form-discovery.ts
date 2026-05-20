/**
 * lib/sales/sources/form-discovery.ts — 問い合わせフォーム URL 発見 (Phase 2)
 *
 * 役割: リードの「問い合わせフォーム URL」を fetch ベースで高精度に特定する。
 *       ④フォーム営業 worker の入力 (contact_form_url) を作る。
 *
 * 設計 (Appexxme form-discovery.ts のウォーターフォールを self-contained 移植):
 *   Layer 0: homepage HTML の anchor regex          (free, ~1s)
 *   Layer A: sitemap.xml + heuristic パスの GET 200  (free, ~1-2s, 主力)
 *   Layer B: DeepSeek 抽出 (opts.enableLlm=true 時)   (~$0.001, optional)
 *   Layer C: SPA 追跡 (opts.spaDiscover hook=worker)  (重い・worker のみ)
 *
 * コストゲーティング: 前 layer がヒットしたら以降は実行しない。
 * 依存ゼロ (fetch のみ)・Next.js serverless で動く (Chromium 不要)。
 * Chromium が要る Layer C は worker の BrowserProvider 経由で注入。
 */

import { callDeepSeek } from "@/lib/deepseek"
import type { Region } from "../types"

export type DiscoveryMethod =
  | "regex"
  | "sitemap"
  | "heuristic"
  | "llm"
  | "spa"
  | "fallback"
  | "none"

export interface FormDiscoveryResult {
  /** 決定した問い合わせフォーム URL。全 layer ミスで origin fallback も無ければ null */
  formUrl: string | null
  method: DiscoveryMethod
  /** 0-100 の信頼度 */
  confidence: number
  /** 他 layer で見つかった候補 (デバッグ用) */
  candidates: string[]
  traceMs: number
}

export interface FormDiscoveryOptions {
  /** 対象サイトのホーム URL (例 https://example.com) */
  homeUrl: string
  region?: Region
  /** 既に取得済みの homepage HTML があれば渡す (二重 fetch 回避) */
  homepageHtml?: string
  /** Layer B (DeepSeek 抽出) を有効化 */
  enableLlm?: boolean
  /** Layer C (SPA 追跡) フック — worker の BrowserProvider が提供 */
  spaDiscover?: (url: string) => Promise<string | null>
  timeoutMs?: number
}

/* ───── heuristic パス辞書 (region 別) ───── */

const HEURISTIC_PATHS_JP = [
  "/contact",
  "/contact/",
  "/contact.html",
  "/contact.php",
  "/inquiry",
  "/inquiry/",
  "/toiawase",
  "/otoiawase",
  "/お問い合わせ",
  "/お問合せ",
  "/contact-us",
  "/form",
  "/form/",
]

const HEURISTIC_PATHS_GLOBAL = [
  "/contact",
  "/contact/",
  "/contact-us",
  "/contact-us/",
  "/contact.html",
  "/get-in-touch",
  "/inquiry",
  "/enquiry",
  "/support",
  "/form",
]

/* ───── URL helpers ───── */

/** http(s):// を補い、末尾スラッシュ無しの origin を返す */
export function normalizeOrigin(input: string): string | null {
  try {
    const withProto = input.startsWith("http") ? input : `https://${input}`
    const u = new URL(withProto)
    return `${u.protocol}//${u.host}`
  } catch {
    return null
  }
}

/** 相対/絶対 href を origin に解決 (失敗時 null) */
export function resolveHref(origin: string, href: string): string | null {
  try {
    return new URL(href, origin).toString()
  } catch {
    return null
  }
}

const CONTACT_KEYWORDS =
  /contact|inquiry|enquiry|toiawase|otoiawase|お問い?合(わ)?せ|問い合わせ|get-in-touch|フォーム/i

/* ───── Layer 0: homepage anchor regex ───── */

function extractContactAnchors(origin: string, html: string): string[] {
  const hits = new Set<string>()
  const anchorRe = /<a\b[^>]*href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi
  let m: RegExpExecArray | null
  while ((m = anchorRe.exec(html)) !== null) {
    const href = m[1]
    const label = m[2].replace(/<[^>]+>/g, " ")
    if (CONTACT_KEYWORDS.test(href) || CONTACT_KEYWORDS.test(label)) {
      const abs = resolveHref(origin, href)
      if (abs && abs.startsWith("http")) hits.add(abs)
    }
  }
  return [...hits]
}

/* ───── fetch helpers (HEAD→GET、200+HTML 判定) ───── */

async function urlExistsAsHtml(url: string, timeoutMs: number): Promise<boolean> {
  // 一部サーバは HEAD を弾くため GET で軽く確認 (本文は読み切らない)
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: AbortSignal.timeout(timeoutMs),
      headers: { "User-Agent": "ParadigmFormDiscovery/1.0 (+https://paradigmjp.com)" },
    })
    if (!res.ok) return false
    const ct = res.headers.get("content-type") ?? ""
    return ct.includes("text/html") || ct === ""
  } catch {
    return false
  }
}

async function fetchText(url: string, timeoutMs: number): Promise<string | null> {
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(timeoutMs),
      headers: { "User-Agent": "ParadigmFormDiscovery/1.0 (+https://paradigmjp.com)" },
    })
    if (!res.ok) return null
    return await res.text()
  } catch {
    return null
  }
}

/* ───── Layer A: sitemap.xml ───── */

function extractSitemapUrls(xml: string): string[] {
  const out: string[] = []
  const locRe = /<loc>([^<]+)<\/loc>/gi
  let m: RegExpExecArray | null
  while ((m = locRe.exec(xml)) !== null) out.push(m[1].trim())
  return out
}

/* ───── Layer B: DeepSeek 抽出 ───── */

const LLM_SYSTEM = `あなたは Web サイトから「問い合わせフォームのページ URL」を 1 つ特定する抽出器です。与えられたリンク一覧から最も問い合わせフォームらしい URL を 1 つだけ選び JSON で返す: {"url":"https://...","confidence":0.0-1.0}。該当が無ければ {"url":null,"confidence":0}。`

async function llmPickFormUrl(
  origin: string,
  candidates: string[],
  timeoutMs: number,
): Promise<{ url: string | null; confidence: number }> {
  if (candidates.length === 0) return { url: null, confidence: 0 }
  const res = await callDeepSeek(
    [
      { role: "system", content: LLM_SYSTEM },
      { role: "user", content: `サイト: ${origin}\nリンク候補:\n${candidates.slice(0, 60).join("\n")}` },
    ],
    { temperature: 0.1, maxTokens: 120, responseFormat: "json_object", timeoutMs },
  )
  if (!res.ok || !res.text) return { url: null, confidence: 0 }
  try {
    const parsed = JSON.parse(res.text) as { url?: string | null; confidence?: number }
    return { url: parsed.url ?? null, confidence: parsed.confidence ?? 0 }
  } catch {
    return { url: null, confidence: 0 }
  }
}

/* ───── Public API ───── */

export async function discoverFormUrl(
  opts: FormDiscoveryOptions,
): Promise<FormDiscoveryResult> {
  const started = Date.now()
  const timeoutMs = opts.timeoutMs ?? 8_000
  const origin = normalizeOrigin(opts.homeUrl)
  const candidates = new Set<string>()

  const done = (
    formUrl: string | null,
    method: DiscoveryMethod,
    confidence: number,
  ): FormDiscoveryResult => ({
    formUrl,
    method,
    confidence,
    candidates: [...candidates],
    traceMs: Date.now() - started,
  })

  if (!origin) return done(null, "none", 0)

  // Layer 0: homepage anchor regex
  const html = opts.homepageHtml ?? (await fetchText(origin, timeoutMs))
  if (html) {
    for (const a of extractContactAnchors(origin, html)) candidates.add(a)
    const first = [...candidates][0]
    if (first) return done(first, "regex", 75)
  }

  // Layer A-1: sitemap.xml
  const sitemapXml = await fetchText(`${origin}/sitemap.xml`, timeoutMs)
  if (sitemapXml) {
    const contactSitemapUrls = extractSitemapUrls(sitemapXml).filter((u) =>
      CONTACT_KEYWORDS.test(u),
    )
    for (const u of contactSitemapUrls) candidates.add(u)
    const first = contactSitemapUrls[0]
    if (first) return done(first, "sitemap", 80)
  }

  // Layer A-2: heuristic パスを順に GET 200 確認
  const paths = opts.region === "global" ? HEURISTIC_PATHS_GLOBAL : HEURISTIC_PATHS_JP
  for (const p of paths) {
    const candidate = `${origin}${p}`
    // eslint-disable-next-line no-await-in-loop -- 前ヒットで即 return するため逐次で十分
    if (await urlExistsAsHtml(candidate, timeoutMs)) {
      candidates.add(candidate)
      return done(candidate, "heuristic", 70)
    }
  }

  // Layer B: DeepSeek 抽出 (opt-in・候補から選ぶ)
  if (opts.enableLlm && candidates.size > 0) {
    const picked = await llmPickFormUrl(origin, [...candidates], timeoutMs)
    if (picked.url) return done(picked.url, "llm", Math.round(picked.confidence * 100))
  }

  // Layer C: SPA 追跡 (worker の BrowserProvider が hook を渡す)
  if (opts.spaDiscover) {
    const spaUrl = await opts.spaDiscover(origin)
    if (spaUrl) {
      candidates.add(spaUrl)
      return done(spaUrl, "spa", 65)
    }
  }

  // 全 layer ミス → origin を最終 fallback (worker 側で人間 escalate 判断)
  return done(origin, "fallback", 20)
}
