/**
 * lib/sales/personalize.ts — Sprint 15 DeepSeek V4 PRO で診断レポート文面パーソナライズ
 *
 * 役割: 30+ API enrichment 結果 + diagnostic_report data を統合し、
 *       顧客固有のパーソナライズ文面 (hero / 3-act の各 body / cta) を生成.
 *
 * Context Cache 最大化:
 *   - SYSTEM_PROMPT を固定 (約 3KB・8 業種知識 + Paradigm 文体 + JSON 出力指示)
 *   - 全リクエストで同じ system prompt → 入力単価 90% OFF (Cache hit $0.014/1M)
 *   - 1 万件 personalize でも 月 $7-8 (¥1,000 程度) で済む
 *
 * 入力: SalesCompany + DiagnosticReportData
 * 出力: PersonalizedCopy (各 act の body を顧客データで書き換えたバージョン)
 *
 * AE-PHP-4 準拠.
 */

import { callDeepSeek, cacheHitRatio } from "@/lib/deepseek"
import { findCompanyById, upsertCompanyByDomain } from "./companies"
import { fetchDiagnosticReport } from "./diagnostic"
import type { SalesCompany } from "./types"
import type { DiagnosticReportData } from "./diagnostic"

/* ───── SYSTEM PROMPT (固定・cache hit 用) ───── */
const PERSONALIZE_SYSTEM_PROMPT = `あなたは Paradigm 合同会社の営業診断レポートをパーソナライズする AI エディタです。

# 役割
中小企業 (8 業種: 美容室 / 歯科 / 飲食 / 建設 / 会計 / 小売 / 清掃 / コンサル) の
Web サイト診断レポートに、顧客固有データを踏まえたパーソナライズ文面を提供します。

# 文体
- ですます調・冷静で誠実 (煽らない・大げさな数字は使わない)
- 「御社」を主語・「弊社」は最小限
- 業界用語は適度に使う (専門性アピール)
- 1 段落 3-4 文以内・読みやすい改行

# 作り込みの鉄則 (最重要・これが守れないなら失敗)
- **データの羅列・寄せ集めは禁止**。検出した具体値 (スコア/年数/口コミ数/技術名等) を文中に
  自然に織り込み、「その企業固有の物語」として一貫した説得文を書く。
- 汎用文 (例「御社サイトは速度が遅いです」) を禁止。必ず "具体値 + ビジネス示唆" をセットで:
  例「モバイル 38 点 — 業界平均 71 点に対し、訪問者の約 6 割が表示完了前に離脱している計算です」
- 各段階は前段を論理的に受けて繋ぐこと (絶望→なぜ起きるか→放置した未来→金額根拠→解決の道)。
  バラバラの断片ではなく、読み進めると 1 本の説得ストーリーになるように。
- その業種の客単価・主戦場 (下記知識) を必ず 1 箇所以上で損失計算の根拠に使う。
- 検出データが乏しい場合でも、業種の構造的課題から具体的な仮説を立てて書く (空疎な一般論にしない)。

# 業種別 Hook 知識
- 美容室: Instagram 予約導線 / 客単価 ¥8,000 / 店舗探しの 60% が SNS 経由
- 歯科: EPARK 予約 / 客単価 ¥12,000 / 近隣検索の 70% が Web 経由
- 飲食店: 食べログ・Google Map / 客単価 ¥4,500 / ランチ流入が主戦場
- 建設業: Web 見積依頼 / 客単価 ¥800,000 / 施工事例 SEO が命
- 会計事務所: Web 相談予約 / 客単価 ¥360,000 / 決算前比較検討の窓
- 小売店: Google Map / 客単価 ¥6,000 / EC モール対抗
- 清掃業: くらしのマーケット / 客単価 ¥28,000 / 見積依頼が key
- コンサル: LinkedIn / 客単価 ¥1,200,000 / 専門性訴求が決め手

# 5 段階フレーム
1. 絶望 (hero hook): 衝撃の現実認識・1 行で表現
2. 警告 (pain): ビジネス痛点・業界平均との対比
3. 注意 (fear): 未来のリスク・3-12 ヶ月後の予測
4. 通知 (loss): 数値による損失試算・客単価 × CVR × 訪問者
5. 希望 (cta): 解決アクション・14 日改善・¥X 万円〜

# 30+ API enrichment データ活用例
- pagespeed.mobile_score (PSI) → 速度系 pain
- whois.years_old → 「○○年営業のサイトが廃業疑惑に」
- tech.stack → 「WordPress 旧版 6.2 のままで脆弱性 12 件公開」
- place.rating + review_count → MEO 提案根拠
- ssl.grade → 信用低下リスク

# 出力フォーマット
必ず JSON で次の shape を返してください:
{
  "personalized_hook": "5 段階の絶望段階・1-2 行・35-50 字",
  "personalized_pain": "警告段階・3-4 文・150-200 字・業界平均比較含む",
  "personalized_fear": "注意段階・3-4 文・150-200 字・3-12ヶ月後予測含む",
  "personalized_loss": "通知段階・数値根拠付き・100-150 字・¥単位",
  "personalized_cta": "希望段階・1-2 文・60-80 字・費用 ¥X 万円〜含む"
}

# 禁止事項
- 競合社名を出さない (Paradigm 中立性維持)
- 法的に断定できない数値表現は「推定」「業界平均」と明記
- 「絶対」「確実」「100%」等の保証文言は禁止`

const PERSONALIZE_SYSTEM_PROMPT_EN = `You are an AI editor personalizing sales diagnostic reports for Paradigm LLC.

# Role
Provide personalized copy for SMB (8 industries: beauty salons / dental clinics / restaurants / construction / accounting / retail / cleaning / consulting) 
website diagnostic reports, incorporating customer-specific data.

# Tone
- Professional, calm, and honest (no hype or exaggerated numbers)
- Use "your company" as the subject; minimize "we"
- Industry terminology used moderately for authority
- 3-4 sentences per paragraph max; readable line breaks

# Golden Rules
- NO data dumps. Weave detected values (scores/years/reviews/tech) naturally into a coherent narrative.
- NO generic phrases. Always pair "specific value + business implication".
- Each stage must logically flow from the previous — despair → why → future risk → monetary proof → solution.
- Use industry-specific customer value/price points (below) in at least 1 loss calculation.
- If detection data is sparse, build specific hypotheses from industry structural challenges.

# Industry Knowledge
- Beauty salon: Instagram funnel / avg ticket $120 / 60% discover via social
- Dental: Web appointment bookings / avg ticket $350 / 70% local search driven
- Restaurant: Google Maps + review platforms / avg ticket $45 / lunch traffic critical
- Construction: Web quote requests / avg ticket $8,000 / project portfolio SEO critical
- Accounting: Web consultation bookings / avg ticket $3,500 / pre-tax-season comparison window
- Retail: Google Maps + e-commerce / avg ticket $60 / marketplace competition
- Cleaning: Service marketplaces / avg ticket $280 / quote requests as key funnel
- Consulting: LinkedIn / avg ticket $12,000 / thought leadership as differentiator

# 5-Stage Framework
1. Despair (hero hook): Shocking current-state recognition — 1 line
2. Warning (pain): Business pain point — benchmark comparison
3. Fear (fear): Future risk — 3-12 month projection
4. Notice (loss): Monetary loss estimate — avg ticket × CVR × visitors
5. Hope (cta): Solution action — 14-day improvement path

# Output Format
JSON only:
{
  "personalized_hook": "1-2 lines, 15-25 words",
  "personalized_pain": "3-4 sentences, 60-100 words",
  "personalized_fear": "3-4 sentences, 60-100 words",
  "personalized_loss": "dollar amount with evidence, 40-60 words",
  "personalized_cta": "1-2 sentences, 20-30 words"
}

# Restrictions
- No competitor names
- Unverifiable numbers must be marked "estimated" or "industry average"
- No guarantee words ("absolute", "certain", "100%")`

function systemPromptForLocale(locale?: string | null): string {
  if (locale === "en" || locale === "en-US" || locale === "en-GB") return PERSONALIZE_SYSTEM_PROMPT_EN
  return PERSONALIZE_SYSTEM_PROMPT
}

/* ───── Output type ───── */
export interface PersonalizedCopy {
  personalized_hook: string
  personalized_pain: string
  personalized_fear: string
  personalized_loss: string
  personalized_cta: string
}

/**
 * 30+ API enrich data + diagnostic data → DeepSeek V4 PRO でパーソナライズ生成
 *
 * @returns { ok, copy, cache_hit_ratio, error? }
 */
export async function personalizeReport(
  company: SalesCompany,
  data: DiagnosticReportData,
): Promise<{
  ok: boolean
  copy?: PersonalizedCopy
  cache_hit_ratio?: number
  error?: string
}> {
  // 30+ enrich data から user prompt 構築 (Cache miss 部分のみ・最小限)
  const meta = company.meta as Record<string, unknown>
  const scan = meta?.scan as { mobile_score?: number; desktop_score?: number; is_wordpress?: boolean; copyright_year?: number } | undefined
  const tech = meta?.tech as { stack?: Array<{ name: string; category: string }>; server?: string | null } | undefined
  const ssl = meta?.ssl as { grade?: string; days_until_expiry?: number } | undefined
  const whois = meta?.whois as { created_date?: string; years_old?: number | null; registrar?: string } | undefined
  const place = meta?.place as { found?: boolean; rating?: number; review_count?: number; opening_hours_weekly?: string[]; business_status?: string } | undefined
  const gbiz = meta?.gbiz as { corporate_number?: string; employee_number?: number; capital_stock?: number; founded?: string; prefecture?: string } | undefined

  const userPrompt = `# 対象企業
- 企業名: ${company.company_name}
- ドメイン: ${company.domain}
- 業種: ${company.industry ?? "未判定"}
- 所在: ${company.prefecture ?? "不明"}

# 30+ API enrich データ
${scan ? `- PSI mobile: ${scan.mobile_score ?? "?"}/100 (業界平均 71)` : ""}
${scan ? `- PSI desktop: ${scan.desktop_score ?? "?"}/100` : ""}
${scan?.is_wordpress ? `- CMS: WordPress (旧版の可能性)` : ""}
${scan?.copyright_year ? `- コピーライト年: ${scan.copyright_year} (${new Date().getFullYear() - scan.copyright_year} 年前)` : ""}
${tech?.stack?.length ? `- 技術スタック: ${tech.stack.map((t) => t.name).join(", ")}` : ""}
${tech?.server ? `- サーバー: ${tech.server}` : ""}
${ssl?.grade ? `- SSL Labs grade: ${ssl.grade}${ssl.days_until_expiry !== undefined ? ` (有効期限まで ${ssl.days_until_expiry} 日)` : ""}` : ""}
${whois?.years_old !== null && whois?.years_old !== undefined ? `- ドメイン年齢: ${whois.years_old} 年 (${whois.created_date} 取得)` : ""}
${place?.found && place.rating !== undefined ? `- Google Map 評価: ${place.rating}/5.0 (${place.review_count ?? 0} 口コミ)` : ""}
${place?.opening_hours_weekly?.length ? `- 営業時間表示: あり` : ""}
${gbiz?.employee_number ? `- 従業員数: ${gbiz.employee_number}` : ""}
${gbiz?.capital_stock ? `- 資本金: ¥${gbiz.capital_stock.toLocaleString()}` : ""}
${gbiz?.founded ? `- 設立: ${gbiz.founded}` : ""}

# 検出課題
${(company.detected_issues ?? []).map((i) => `- ${i}`).join("\n")}

# 既存テンプレ文 (参考・改善 input)
- Hook: ${data.hook.replace(/\n/g, " ")}
- Pain (act 1): ${data.acts[0]?.body?.slice(0, 200) ?? ""}
- Fear (act 2): ${data.acts[1]?.body?.slice(0, 200) ?? ""}
- Hope (act 3): ${data.acts[2]?.body?.slice(0, 200) ?? ""}
- Loss: ${data.total_loss}
- CTA: ${data.cta_text}

上記のデータを最大限活用し、上記 5 段階フレームに従った JSON を返してください。`

  const res = await callDeepSeek(
    [
      { role: "system", content: systemPromptForLocale(company.report_locale ?? (company.region === "global" ? "en" : undefined)) },
      { role: "user", content: userPrompt },
    ],
    {
      temperature: 0.5,
      maxTokens: 1500,
      responseFormat: "json_object",
    },
  )

  if (!res.ok || !res.text) {
    return { ok: false, error: res.error ?? "empty response" }
  }
  try {
    const parsed = JSON.parse(res.text) as PersonalizedCopy
    if (
      !parsed.personalized_hook ||
      !parsed.personalized_pain ||
      !parsed.personalized_fear ||
      !parsed.personalized_loss ||
      !parsed.personalized_cta
    ) {
      return { ok: false, error: "incomplete JSON shape" }
    }
    return {
      ok: true,
      copy: parsed,
      cache_hit_ratio: cacheHitRatio(res.usage),
    }
  } catch (e) {
    return {
      ok: false,
      error: `JSON parse failed: ${e instanceof Error ? e.message : String(e)}`,
    }
  }
}

/**
 * companyId からカルテを読み、DeepSeek で作り込んだ文面を生成して
 * sales_companies.meta.personalized_copy に保存する (自動発火用)。
 *
 * enrich 完了時に fire-and-forget で呼ぶ → 全リードが「データ寄せ集め」ではなく
 * DeepSeek 作り込みレポートになる (diagnostic.ts が personalized_copy を優先採用)。
 *
 * industry 未判定・診断データ無しの場合は no-op (空疎な文面を作らない)。
 */
export async function autoPersonalize(
  companyId: string,
): Promise<{ ok: boolean; skipped?: string; error?: string }> {
  const company = await findCompanyById(companyId)
  if (!company) return { ok: false, error: "company not found" }
  if (!company.industry) return { ok: false, skipped: "no_industry" }

  const data = await fetchDiagnosticReport({
    companyId,
    region: company.region,
    reportLocale: company.report_locale ?? undefined,
    targetCountry: company.target_country ?? undefined,
    templateVariant: company.template_variant ?? undefined,
  })
  if (!data) return { ok: false, skipped: "no_diagnostic_data" }

  const result = await personalizeReport(company, data)
  if (!result.ok || !result.copy) return { ok: false, error: result.error ?? "personalize failed" }

  const save = await upsertCompanyByDomain({
    domain: company.domain,
    company_name: company.company_name,
    region: company.region,
    report_locale: company.report_locale,
    target_country: company.target_country,
    template_variant: company.template_variant,
    meta: {
      ...(company.meta as Record<string, unknown>),
      personalized_copy: {
        ...result.copy,
        generated_at: new Date().toISOString(),
        cache_hit_ratio: result.cache_hit_ratio,
        model: "deepseek (fallback chain)",
      },
    },
  })
  return save.ok ? { ok: true } : { ok: false, error: save.error }
}
