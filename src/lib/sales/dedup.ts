/**
 * lib/sales/dedup.ts — 企業の重複排除キー正規化 (2026-05-20)
 *
 * 役割: リストに重複企業があっても「1 企業 = 1 行」に統廃合するための正規化キーを生成。
 *   - normalizeDomain: www/プロトコル/パス/大小文字を畳んだ canonical domain (硬い UNIQUE 鍵)
 *   - normalizeCompanyName: 法人格・空白・全半角・記号を畳んだ name_key (軟らかい dedup 鍵)
 *
 * dedup 方針:
 *   1. domain があれば canonical domain で照合 (sales_companies.domain UNIQUE が物理担保)
 *   2. domain が無ければ name_key で照合 (同名異表記を 1 社に集約)
 *   3. 異なる実企業が同 name_key に偶然一致しうるため name_key は **hard UNIQUE にしない**
 *      (誤統合を避け、domain のみ hard UNIQUE)。name_key は code レベルの統合シグナル。
 */

/** プロトコル/パス/www/大小文字/末尾ドットを畳んだ canonical domain。不正なら null */
export function normalizeDomain(raw: unknown): string | null {
  if (typeof raw !== "string") return null
  const d = raw
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/.*$/, "")
    .replace(/:\d+$/, "") // ポート除去
    .trim()
    .toLowerCase()
    .replace(/^www\./, "")
    .replace(/\.$/, "")
  return d.includes(".") ? d : null
}

/**
 * 会社名 → name_key (正規化)。
 * 法人格 (株式会社/有限会社/Co.,Ltd 等) ・空白・記号・全半角差を全て畳む。
 * 例: 「株式会社 ＡＢＣ商事」「ABC商事(株)」「ABC Shoji Co., Ltd.」 → 概ね同一寄りに正規化。
 */
export function normalizeCompanyName(raw: unknown): string | null {
  if (typeof raw !== "string" || !raw.trim()) return null
  let s = raw.normalize("NFKC").toLowerCase()
  // 法人格表記を除去 (日英)
  s = s.replace(
    /(株式会社|有限会社|合同会社|合資会社|合名会社|一般社団法人|一般財団法人|㈱|㈲|\(株\)|\(有\)|co\.\s*,?\s*ltd\.?|company\s+limited|private\s+limited|pte\.?\s*ltd\.?|inc\.?|llc\.?|l\.l\.c\.?|corp\.?|corporation|ltd\.?|gmbh|s\.?a\.?r\.?l\.?|pvt\.?)/gi,
    "",
  )
  // 空白・記号類を除去
  s = s.replace(/[\s　、。・,.\-_/\\()（）「」『』【】\[\]&＆'"`|+*~!?！？:：;；]/g, "")
  s = s.trim()
  return s.length > 0 ? s : null
}

/**
 * Levenshtein distance between two strings.
 * Measures how many single-character edits are needed to transform a into b.
 */
export function levenshtein(a: string, b: string): number {
  const m = a.length
  const n = b.length
  if (m === 0) return n
  if (n === 0) return m
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))
  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      )
    }
  }
  return dp[m][n]
}

/**
 * Check if two company names are likely the same entity.
 * Uses normalized name key comparison + Levenshtein similarity ratio.
 * Returns a similarity score 0-100. Score >= 80 means likely duplicate.
 */
export function companyNameSimilarity(a: string, b: string): number {
  const na = normalizeCompanyName(a)
  const nb = normalizeCompanyName(b)
  if (!na || !nb) return 0
  if (na === nb) return 100
  const maxLen = Math.max(na.length, nb.length)
  if (maxLen === 0) return 0
  const dist = levenshtein(na, nb)
  return Math.round((1 - dist / maxLen) * 100)
}

/**
 * Find potential duplicate companies in Supabase by company name similarity.
 * Returns IDs of companies with >= similarityThreshold match.
 */
export function findDuplicatesByName(
  target: string,
  candidates: Array<{ id: string; company_name: string | null }>,
  threshold = 80,
): string[] {
  return candidates
    .filter((c) => c.company_name && companyNameSimilarity(target, c.company_name) >= threshold)
    .map((c) => c.id)
}
