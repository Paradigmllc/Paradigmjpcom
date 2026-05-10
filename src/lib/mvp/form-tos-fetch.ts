/**
 * Form 規約 fetch — 送信先フォームページの利用規約相当 keywords を抽出.
 *
 * Phase 5: violation detector の input として form_url の規約 hints を渡し、
 * 「フォームの目的に合致しない営業送信」を構造的に検出.
 *
 * 設計:
 *   1. form_url を GET (5s timeout・User-Agent 控えめ)
 *   2. HTML から regulation/notice/privacy 関連 keywords を heuristic 抽出
 *   3. 「営業お断り」「業者お断り」「商品問合せのみ」等のキーワード を violation detector に inject
 *   4. fetch 失敗 / 大きすぎる HTML は graceful degradation (空 keywords で続行)
 */

const KEY_PATTERNS = [
  // 営業 NG signals (日本語)
  { code: "no_sales", pattern: /営業[ｱ-ｲ\s]*?(?:お断り|禁止|不可|お控え|遠慮|ご遠慮)/g },
  { code: "no_solicitation", pattern: /(?:勧誘|セールス|商談|押し売り|テレアポ|テレマ)[ｱ-ｲ\s]*?(?:お断り|禁止|不可|ご遠慮)/g },
  { code: "purpose_purchase_only", pattern: /(?:商品|サービス|製品|プロダクト)[\s\S]{0,30}?(?:お問い合わせ|質問|問合)(?:のみ|限定|に限り)/g },
  { code: "purpose_recruit_only", pattern: /(?:採用|応募|エントリー|キャリア)[\s\S]{0,30}?(?:のみ|限定|に限り|専用)/g },
  { code: "no_marketing", pattern: /(?:マーケティング|広告|宣伝|PR|リスト販売)[\s\S]{0,20}?(?:お断り|禁止|不可)/g },
  { code: "personal_info_strict", pattern: /(?:第三者提供|個人情報[\s\S]{0,20}?(?:同意|提供|取得)).*?(?:厳禁|禁止|お断り)/g },
  // English signals
  { code: "no_sales_en", pattern: /no\s+(?:sales|solicitation|marketing|advertising|cold[\s-]?call)/gi },
  { code: "purpose_only_en", pattern: /(?:product|customer|support)\s+(?:inquiries?|questions?)\s+only/gi },
];

export interface FormTosResult {
  ok: boolean;
  keywords_found: string[];      // detected violation signals (codes)
  excerpt: string;               // matched text excerpt for LLM context
  http_status: number;
  fetch_ms: number;
  error?: string;
}

const MAX_HTML_BYTES = 500_000;
const FETCH_TIMEOUT_MS = 5_000;

export async function fetchFormTos(url: string): Promise<FormTosResult> {
  const start = Date.now();
  if (!url || !/^https?:\/\//i.test(url)) {
    return { ok: false, keywords_found: [], excerpt: "", http_status: 0, fetch_ms: 0, error: "invalid url" };
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      headers: {
        "User-Agent": "ParadigmFormTosScanner/1.0 (+https://paradigmjp.com/privacy)",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    const fetchMs = Date.now() - start;
    if (!res.ok) {
      return { ok: false, keywords_found: [], excerpt: "", http_status: res.status, fetch_ms: fetchMs, error: "non-2xx" };
    }
    // Read but cap size
    const reader = res.body?.getReader();
    if (!reader) {
      return { ok: false, keywords_found: [], excerpt: "", http_status: res.status, fetch_ms: fetchMs, error: "no body reader" };
    }
    let received = 0;
    const chunks: Uint8Array[] = [];
    const decoder = new TextDecoder("utf-8", { fatal: false });
    while (received < MAX_HTML_BYTES) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      received += value.byteLength;
    }
    const html = decoder.decode(Buffer.concat(chunks.map(c => Buffer.from(c))));

    // Strip <script> and <style> for cleaner text scan
    const cleaned = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ");

    const found = new Set<string>();
    const excerpts: string[] = [];
    for (const { code, pattern } of KEY_PATTERNS) {
      const matches = cleaned.match(pattern);
      if (matches && matches.length > 0) {
        found.add(code);
        excerpts.push(matches[0].slice(0, 100));
      }
    }
    return {
      ok: true,
      keywords_found: Array.from(found),
      excerpt: excerpts.slice(0, 5).join(" | "),
      http_status: res.status,
      fetch_ms: fetchMs,
    };
  } catch (e) {
    clearTimeout(timer);
    return {
      ok: false,
      keywords_found: [],
      excerpt: "",
      http_status: 0,
      fetch_ms: Date.now() - start,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}
