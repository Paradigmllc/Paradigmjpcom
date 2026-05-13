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
      { role: "system", content: PERSONALIZE_SYSTEM_PROMPT },
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
