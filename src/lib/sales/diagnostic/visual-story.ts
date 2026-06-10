import type { SourceCoverageSnapshot } from "../source-coverage"
import type { TemplateVariant } from "../types"
import type {
  DiagnosticAct,
  ImprovementPreview,
  VisitorJourneyStep,
  VisualEvidenceAnnotation,
} from "./types"

type JsonRecord = Record<string, unknown>

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : {}
}

function clampPoint(value: unknown, fallback: number): number {
  const n = typeof value === "number" ? value : Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.max(8, Math.min(92, Math.round(n)))
}

function clean(value: unknown, fallback: string, max = 86): string {
  const text = typeof value === "string" ? value.replace(/\s+/g, " ").trim() : ""
  if (!text) return fallback
  return text.length > max ? `${text.slice(0, max - 1)}...` : text
}

function readStoredAnnotations(meta: JsonRecord): VisualEvidenceAnnotation[] {
  const visual = asRecord(meta.visual_evidence)
  const raw = Array.isArray(visual.annotations) ? visual.annotations : []
  return raw.slice(0, 4).map((item, index) => {
    const record = asRecord(item)
    const severity = record.severity === "critical" || record.severity === "warning" ? record.severity : "info"
    return {
      id: clean(record.id, `stored-${index}`, 32),
      label: clean(record.label, `Finding ${index + 1}`, 44),
      body: clean(record.body, "Captured during the visual audit.", 110),
      severity,
      x: clampPoint(record.x, 28 + index * 18),
      y: clampPoint(record.y, 28 + index * 14),
    }
  })
}

function variantCopy(variant: TemplateVariant, lang: string): ImprovementPreview {
  if (variant === "video_subscription") {
    return lang === "ja"
      ? {
          headline: "投稿実績から相談までを1画面でつなぐ",
          before: "SNSや動画の証拠が、サイト上の予約導線と分断されている状態。",
          after: "ファーストビューに実績、料金、相談CTAを集約し、検討を止めない。",
          ctaLabel: "動画実績 -> 相談導線",
        }
      : {
          headline: "Connect proof, offer, and booking in one view",
          before: "Social/video proof is disconnected from the booking path.",
          after: "Show proof, pricing, and consultation CTA before visitors start comparing.",
          ctaLabel: "Proof -> consult",
        }
  }
  if (variant === "meo") {
    return lang === "ja"
      ? {
          headline: "Maps比較画面で選ばれる理由を先に出す",
          before: "口コミ、写真、予約導線の弱さが競合比較で目立つ状態。",
          after: "写真更新、口コミ返信、予約CTAを揃え、地図上の選択理由を明確化。",
          ctaLabel: "Maps -> 予約",
        }
      : {
          headline: "Make the Maps comparison obvious",
          before: "Reviews, photos, and booking cues look weaker than competitors.",
          after: "Refresh photos, review replies, and booking CTA so the choice is visible.",
          ctaLabel: "Maps -> booking",
        }
  }
  if (variant === "outreach") {
    return lang === "ja"
      ? {
          headline: "問い合わせ後の初動を3分以内にする",
          before: "フォーム到達後の分類、通知、返信が遅く商談化前に冷めている状態。",
          after: "フォーム分類、Slack通知、AI一次返信をつなぎ、即時対応に変える。",
          ctaLabel: "フォーム -> 即返信",
        }
      : {
          headline: "Turn form submissions into fast replies",
          before: "Lead routing and first response are too slow after form submission.",
          after: "Classify, notify, and draft replies immediately so hot leads do not cool down.",
          ctaLabel: "Form -> reply",
        }
  }
  if (variant === "japan_entry") {
    return lang === "ja"
      ? {
          headline: "日本の購入者が安心して進める画面にする",
          before: "翻訳、特商法、決済、問い合わせの信頼材料が分散し、日本向けの本気度が伝わりにくい状態。",
          after: "日本語の価値訴求、法規制表示、決済/配送条件、相談CTAを一画面で確認できる状態へ。",
          ctaLabel: "海外サイト -> 日本向け導線",
        }
      : {
          headline: "Make the Japan buyer path feel local and trustworthy",
          before: "Translation, legal disclosure, payment, and inquiry proof are fragmented.",
          after: "Show Japanese value copy, compliance proof, payment/shipping cues, and consultation CTA together.",
          ctaLabel: "Global site -> Japan path",
        }
  }
  if (variant === "subsidy") {
    return lang === "ja"
      ? {
          headline: "使える補助金を、申請できる計画に変える",
          before: "対象制度、締切、対象経費、必要書類が散らばり、申請判断が後回しになっている状態。",
          after: "制度候補、採択可能性、必要書類、制作/DX計画を並べ、申請までの道筋を明確化。",
          ctaLabel: "制度候補 -> 申請計画",
        }
      : {
          headline: "Turn available grants into an actionable application plan",
          before: "Programs, deadlines, eligible costs, and documents are scattered.",
          after: "Rank grant candidates, readiness, required documents, and implementation scope in one plan.",
          ctaLabel: "Grant match -> application",
        }
  }
  if (variant === "dx_ai_package") {
    return lang === "ja"
      ? {
          headline: "AI導入を、業務の最初の一手に落とす",
          before: "問い合わせ、見積、在庫、報告などの手作業が分断され、AI導入の効果が見えにくい状態。",
          after: "最初に自動化する業務、期待削減時間、必要データ、運用画面をまとめて導入判断できる状態へ。",
          ctaLabel: "手作業 -> AI運用",
        }
      : {
          headline: "Turn AI adoption into the first operational move",
          before: "Inquiry, quoting, inventory, and reporting work are fragmented and manual.",
          after: "Identify the first workflow, expected time savings, required data, and operating screen.",
          ctaLabel: "Manual work -> AI ops",
        }
  }
  if (variant === "security") {
    return lang === "ja"
      ? {
          headline: "信頼の不安を画面上から消す",
          before: "SSL、HSTS、CSPなどの欠落が予約前の心理的ブレーキになる状態。",
          after: "ブラウザ表示、ヘッダー、フォーム周りを固め、安心して送信できる状態へ。",
          ctaLabel: "不安 -> 安心",
        }
      : {
          headline: "Remove trust friction before the form",
          before: "SSL, HSTS, and CSP gaps create hesitation before booking.",
          after: "Harden browser trust signals and form security so users can submit confidently.",
          ctaLabel: "Risk -> trust",
        }
  }
  return lang === "ja"
    ? {
        headline: "初見で価値、証拠、次の行動が伝わる導線へ",
        before: "価値提案、証拠、CTAが分散し、訪問者が判断前に離脱しやすい状態。",
        after: "ファーストビューに価値、信頼材料、予約/問い合わせCTAを再配置。",
        ctaLabel: "訪問 -> 相談",
      }
    : {
        headline: "Make value, proof, and action clear at first glance",
        before: "Value proposition, proof, and CTA are spread across the experience.",
        after: "Bring the value, trust proof, and booking/inquiry CTA into the first decision view.",
        ctaLabel: "Visit -> consult",
      }
}

function generatedAnnotations(input: {
  acts: DiagnosticAct[]
  sourceCoverage: SourceCoverageSnapshot
  templateVariant: TemplateVariant
  lang: string
}): VisualEvidenceAnnotation[] {
  const first = input.acts[0]
  const second = input.acts[1]
  const missing = input.sourceCoverage.missing
  const isJa = input.lang === "ja"
  const variantLabel =
    input.templateVariant === "meo"
      ? isJa ? "比較画面で弱く見える箇所" : "Weak point on comparison surface"
      : input.templateVariant === "video_subscription"
        ? isJa ? "実績から相談への接続" : "Proof-to-consult connection"
        : input.templateVariant === "outreach"
          ? isJa ? "送信後の初動" : "Post-submit response path"
          : isJa ? "最初の判断ポイント" : "First decision point"

  return [
    {
      id: "primary-friction",
      label: clean(first?.metric_label, isJa ? "主要な離脱要因" : "Primary friction", 38),
      body: clean(first?.headline, isJa ? "最初に直すべき画面上の摩擦です。" : "This is the first visible friction to fix.", 92),
      severity: first?.severity ?? "critical",
      x: 66,
      y: 28,
    },
    {
      id: "proof-gap",
      label: missing > 0 ? `${missing} missing signals` : isJa ? "証拠は取得済み" : "Evidence captured",
      body: clean(second?.headline, isJa ? "比較前に信頼材料を補強します。" : "Trust proof should appear before comparison starts.", 92),
      severity: second?.severity ?? "warning",
      x: 24,
      y: 66,
    },
    {
      id: "variant-action",
      label: variantLabel,
      body: isJa ? "この画面から次の行動までを短くすると依頼率が上がります。" : "Shortening the path from this screen to action improves conversion.",
      severity: "info",
      x: 78,
      y: 76,
    },
  ]
}

function journeyFor(input: {
  templateVariant: TemplateVariant
  preview: ImprovementPreview
  lang: string
  sourceCoverage: SourceCoverageSnapshot
}): VisitorJourneyStep[] {
  const isJa = input.lang === "ja"
  return [
    {
      id: "arrival",
      label: isJa ? "流入" : "Arrival",
      detail: isJa ? "検索/SNS/Mapsから最初の画面に到達" : "Visitor lands from search, social, or Maps",
      status: "ready",
    },
    {
      id: "decision",
      label: isJa ? "判断" : "Decision",
      detail: input.preview.before,
      status: input.sourceCoverage.score >= 70 ? "weak" : "blocked",
    },
    {
      id: "proof",
      label: isJa ? "信頼" : "Trust",
      detail: input.preview.after,
      status: "weak",
    },
    {
      id: "action",
      label: isJa ? "相談" : "Action",
      detail: input.preview.ctaLabel,
      status: "ready",
    },
  ]
}

export function buildVisualEvidenceStory(input: {
  meta: JsonRecord
  acts: DiagnosticAct[]
  sourceCoverage: SourceCoverageSnapshot
  templateVariant: TemplateVariant
  reportLocale: string
}): {
  visualAnnotations: VisualEvidenceAnnotation[]
  improvementPreview: ImprovementPreview
  visitorJourney: VisitorJourneyStep[]
} {
  const preview = variantCopy(input.templateVariant, input.reportLocale)
  const stored = readStoredAnnotations(input.meta)
  const generated = generatedAnnotations({
    acts: input.acts,
    sourceCoverage: input.sourceCoverage,
    templateVariant: input.templateVariant,
    lang: input.reportLocale,
  })
  const visualAnnotations = [...stored, ...generated].slice(0, 4)
  return {
    visualAnnotations,
    improvementPreview: preview,
    visitorJourney: journeyFor({
      templateVariant: input.templateVariant,
      preview,
      lang: input.reportLocale,
      sourceCoverage: input.sourceCoverage,
    }),
  }
}
