/**
 * lib/sales/diagnostic.ts — 診断レポート LP のデータ取得 (Sprint 9-D)
 *
 * 役割: sales_companies + sales_templates を組み合わせて、
 *       3-Act 構造 (pain → fear → hope) の診断レポートデータを返す.
 *
 * 設計:
 *   - input: companyId or domain
 *   - output: DiagnosticReportData (LP component が受け取る型)
 *   - 業種 + detected_issues (最大3つ) で sales_templates を matching
 *   - 各 act は severity + headline + body + metric_value で構成
 */

import { findCompanyById, findCompanyByDomain, findCompanyBySlug } from "./companies"
import { getTemplatesByIndustry } from "./templates"
import type {
  Industry,
  IssueCode,
  SalesCompany,
  SalesTemplate,
  Severity,
} from "./types"

export interface DiagnosticAct {
  type: "pain" | "fear" | "hope"
  icon: string
  headline: string
  body: string
  metric_label: string
  metric_value: string
  metric_unit: string
  metric_bench: string
  severity: Severity
}

export interface DiagnosticReportData {
  company_name: string
  industry: Industry | null
  prefecture: string | null
  expires_at: string
  hook: string
  total_loss: string
  acts: DiagnosticAct[]
  cta_text: string
  video_thumbnail: string | null
  report_url: string
}

/* ───── 業種別の icon / hook 母版 (Plan B 母版・後で Notion 側に外出し可) ───── */

const INDUSTRY_HOOK: Record<Industry, string> = {
  beauty_salon:
    "今この瞬間、御社サイトを訪れた10人のうち6人は\n内容を見る前に帰っています",
  dental: "近隣の歯科医院を探している患者の70%が\n御社のサイトに辿り着けていません",
  restaurant: "ランチ時間の検索流入が\n月間推定4,200件、漏れています",
  construction: "施工事例を探す施主の80%が\n御社のサイトを5秒で閉じています",
  accounting:
    "決算前の顧問先候補が御社を比較検討した結果、\n7割が他事務所に流れています",
  retail: "オンライン購買意欲のある顧客の60%が\n御社のサイトを完了せずに離脱しています",
  cleaning:
    "見積もり依頼の問い合わせフォームに\n50%以上が到達せず離脱しています",
  consulting:
    "新規問い合わせの大半が、御社の専門性に\n気付かないまま競合へ流れています",
}

const ISSUE_ICON: Record<IssueCode, string> = {
  speed_critical: "⚡",
  ua_残存: "📉",
  ssl_expired: "🔒",
  wp_outdated: "🛠",
  no_ogp: "🖼",
  no_sns: "📸",
  copyright_old: "📅",
}

const ISSUE_METRIC: Record<
  IssueCode,
  { label: string; unit: string; bench: string }
> = {
  speed_critical: {
    label: "モバイルスコア",
    unit: "点",
    bench: "業界平均 71点",
  },
  ua_残存: {
    label: "データ欠損期間",
    unit: "ヶ月",
    bench: "2023年7月から継続中",
  },
  ssl_expired: { label: "SSL期限", unit: "日後", bench: "業界推奨 30日以上前更新" },
  wp_outdated: { label: "WP脆弱性", unit: "件", bench: "標準は 0 件" },
  no_ogp: { label: "OGP設定", unit: "", bench: "SNSシェア時のクリック率 -45%" },
  no_sns: { label: "SNS連携", unit: "", bench: "競合上位3社は全て運用中" },
  copyright_old: { label: "最終更新", unit: "年前", bench: "業界推奨 6ヶ月以内" },
}

/* ───── Hook 文言を組立 ───── */

function buildHook(industry: Industry | null): string {
  if (!industry) {
    return "御社サイトを訪れた訪問者の半数以上が\n機会を活かしきれずに離脱しています"
  }
  return INDUSTRY_HOOK[industry]
}

/* ───── 3-Act を build (template が無い issue は static fallback) ───── */

function buildAct(
  company: SalesCompany,
  issueCode: IssueCode,
  template: SalesTemplate | undefined,
  metricValue: number | string,
): DiagnosticAct {
  const meta = ISSUE_METRIC[issueCode]
  // type 判定 (severity の critical=pain / warning=fear / info=hope)
  const severity: Severity = template?.severity ?? "warning"
  const type: "pain" | "fear" | "hope" =
    severity === "critical" ? "pain" : severity === "info" ? "hope" : "fear"
  return {
    type,
    icon: ISSUE_ICON[issueCode],
    headline: template?.headline ?? `${issueCode} を検出`,
    body:
      template?.pain ||
      template?.fear ||
      template?.loss ||
      `${company.company_name} のサイトで ${issueCode} を確認しました。詳細レポートをご参照ください。`,
    metric_label: meta.label,
    metric_value: String(metricValue),
    metric_unit: meta.unit,
    metric_bench: meta.bench,
    severity,
  }
}

/* ───── 損失合計を計算 (template.loss の数字を合算・stub) ───── */

function parseLossYen(loss: string | null | undefined): number {
  if (!loss) return 0
  const match = loss.match(/[¥￥]\s*([\d,]+)/u)
  if (!match) return 0
  return Number.parseInt(match[1].replace(/,/g, ""), 10) || 0
}

function formatYen(n: number): string {
  return `¥${n.toLocaleString("ja-JP")}`
}

/* ───── Public API ───── */

export async function fetchDiagnosticReport(opts: {
  companyId?: string
  domain?: string
  slug?: string
}): Promise<DiagnosticReportData | null> {
  const company = opts.slug
    ? await findCompanyBySlug(opts.slug)
    : opts.companyId
      ? await findCompanyById(opts.companyId)
      : opts.domain
        ? await findCompanyByDomain(opts.domain)
        : null
  if (!company) return null

  // detected_issues の上位 3 件で 3-Act 構成
  const issues = (company.detected_issues ?? []).slice(0, 3)
  const templates = company.industry
    ? await getTemplatesByIndustry(company.industry, issues)
    : []
  const templateByIssue = new Map(templates.map((t) => [t.issue_code, t]))

  const acts: DiagnosticAct[] = issues.map((issueCode, i) => {
    // metric_value のデフォルト: pagespeed_mobile (1st act) / その他は static
    const metric =
      i === 0 && issueCode === "speed_critical"
        ? company.pagespeed_mobile ?? 38
        : issueCode === "ua_残存"
          ? 23
          : "—"
    return buildAct(company, issueCode, templateByIssue.get(issueCode), metric)
  })

  // 損失合計
  const totalLossYen = acts.reduce(
    (sum, _act, i) => sum + parseLossYen(templates[i]?.loss),
    0,
  )

  // 期限: 30 日後
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 30)
  const expiresStr = `${expiresAt.getFullYear()}年${expiresAt.getMonth() + 1}月${expiresAt.getDate()}日`

  return {
    company_name: company.company_name,
    industry: company.industry,
    prefecture: company.prefecture,
    expires_at: expiresStr,
    hook: buildHook(company.industry),
    total_loss: formatYen(totalLossYen || 340_000),
    acts,
    cta_text: templates[0]?.cta_text ?? "まず話だけ聞いてみる",
    video_thumbnail: null,
    report_url: company.report_url ?? "",
  }
}
