/**
 * report-i18n-ja.ts — Japanese (日本語)  |  ですます調
 */

import type { ReportLocaleData } from "./report-i18n-shared"
import { JAPAN_ENTRY_CTA_JA } from "@/lib/japan-entry-public-copy"

export const JA: ReportLocaleData = {
  ui: {
    brand: "Paradigm Revenue OS",
    privateReport: "経営診断レポート",
    validity: "有効期限",
    heroKicker: "非公開経営診断",
    heroLead:
      "公開データ、取得済みシグナル、改善デモをもとに、売上・信頼・問い合わせ導線のどこから直すべきかを整理しました。",
    evidenceReady: "取得済みデータ",
    sourceCoverage: "根拠カバレッジ",
    monthlyLoss: "推定月間機会損失",
    confidence: "根拠信頼度",
    currentState: "現在の摩擦",
    improvedState: "改善後の状態",
    diagnosticSurface: "診断サーフェス",
    priorityFindings: "優先所見",
    businessImpact: "事業インパクト",
    firstMove: "最初の一手",
    whyItMatters: "なぜ重要か",
    evidence: "根拠",
    recommendation: "推奨アクション",
    roadmap: "30日ロードマップ",
    dataAppendix: "データ台帳",
    sourceMeaning: "事業上の意味",
    sourceNext: "次に確認すること",
    sourceMissing: "未取得データは事実として扱わず、次回確認すべき仮説として扱います。",
    templateDirection: "提案方向",
    qualityBar: "品質基準",
    finalHeading: "30分で、最初に直すべき一点を決める",
    finalBody:
      "大きな作り直しの前に、売上機会・信頼形成・問い合わせ導線のどこが最も回収しやすいかを一緒に確認します。",
    emailSubject: "経営診断レポートについて",
    competitorBenchmark: "競合・業界ベンチマーク比較",
    yourSite: "御社サイト",
    industryAvg: "業界平均",
    topCompetitors: "競合上位平均",
    roiTitle: "予測ROI（投資対効果シミュレーション）",
    paybackPeriod: "想定回収期間",
    recoveredTwelveMonths: "12ヶ月の予測回収額",
    roiLabel: "予測ROI",
    faqTitle: "よくあるご質問",
    readMore: "詳細はこちらのレポートを参照",
  },
  cta: [
    "改善デモを見る",
    JAPAN_ENTRY_CTA_JA,
    "診断の続きを読む",
    "今すぐ改善を始める",
  ],
  faq: [
    {
      q: "既存のシステムやドメインを捨てる必要がありますか？",
      a: "いいえ。既存の環境はそのままで、改善した表示部分のみをステージング環境で構築・検証し、本番移行するためダウンタイムは発生しません。過去の制作実績でも、既存システムを一切変更せずにLighthouseスコアを40点台から90点台へ引き上げた事例が多数あります。",
    },
    {
      q: "Lighthouseの表示速度スコアは保証されますか？",
      a: "無条件のスコア保証は行いません。契約書面で測定方法、目標、前提条件を確認し、合意した基準に対して実測結果を報告します。",
    },
    {
      q: "どのようなプロセスで進めますか？また期間はどのくらいですか？",
      a: "現状分析（3日）→ Astro/Next.jsでのビジュアル制作（5〜7日）→ ステージング検証（3日）→ 本番切替（1日）の順で進行し、最短2週間で完了します。お客様側のご対応は、初回ヒアリングと最終確認の2回のみです。",
    },
    {
      q: "補助金や助成金は使えますか？",
      a: "制度の適用可否や申請は、対象事業者と専門家による確認が必要です。Paradigmは適格性や採択を保証せず、必要に応じて専門家との連携範囲を個別に確認します。",
    },
    {
      q: "SEO対策やMEO対策も含まれていますか？",
      a: "はい。Web制作パッケージには技術SEOの最適化（構造化データ、メタタグ、Core Web Vitals）が標準で含まれています。さらにMEO対策やコンテンツSEOが必要な場合は、追加プランとしてご提案いたします。",
    },
  ],
  reassurance: [
    "合意した範囲と測定方法を明文化",
    "実測結果と未取得データを分離",
    "人による確認を含む運用引き継ぎ",
    "補助金・法務・税務は専門家確認を前提",
  ],
  offerBadges: [
    "即効性のある改善",
    "ノーコードで更新可能",
    "スマホ最適化済み",
    "多言語対応",
    "適格性は個別確認",
  ],
  culturalNotes: {
    toneDescription:
      "ですます調の丁寧語を使用し、読み手に安心感と信頼感を与える。ビジネス文書としての格式を保ちつつ、中小企業経営者が理解しやすい平易な表現を選ぶ。",
    formalityLevel: "ですます調（丁寧体）",
    pronounPreference: "御社／貴社（文書により使い分け）",
  },
}
