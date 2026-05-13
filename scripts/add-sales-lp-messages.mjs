#!/usr/bin/env node
/**
 * add-sales-lp-messages.mjs — Sprint 10-D
 *
 * 役割: video / agency / diagnostic LP の visible text を 12 locale messages に追加.
 *       ja は完全翻訳・他 11 locale は ja 値で fill (Plan B: 後で DeepSeek 自動翻訳).
 */

import { readFileSync, writeFileSync } from "node:fs"

const LOCALES = ["ja", "en", "ko", "zh", "de", "fr", "es", "pt", "ru", "ar", "vi", "id"]

const JA_SALES_LP = {
  videoPage: {
    metaTitle: "月額動画サブスク | 制作会社に頼むより安く、月20本納品",
    metaDescription:
      "ComfyUI + Remotion + DeepSeek V4 PRO で動画制作を自動化。月額¥30万から、24-48 時間納品。Web/LP/SNS 用動画を月 20-100 本量産。",
    heroBadge: "月額動画サブスク",
    heroTitle: "制作会社に頼むより、安く・速く・量を量産する",
    heroHighlight: "月額 ¥30 万から",
    heroDesc:
      "ComfyUI + Remotion + DeepSeek V4 PRO のフル自動化パイプラインで、Web / LP / SNS 用動画を月 20-100 本納品。24-48 時間で 1 本完了。",
    comparisonEyebrow: "Comparison",
    comparisonTitle: "制作会社の限界と、Paradigm の解",
    pricingEyebrow: "Pricing",
    pricingTitle: "月額定額・本数で選ぶ 3 プラン",
    pricingDesc: "超過課金あり (1 本 +¥10,000)。年払い 20% OFF。\n全プラン解約自由・最低契約期間なし。",
    processEyebrow: "Process",
    processTitle: "発注から納品まで、全自動 4 ステップ",
    ctaButton: "まず話を聞く",
    popularLabel: "Most popular",
  },
  agencyPage: {
    metaTitle: "Agency White-Label | 動画案件を断らずに済む唯一の方法",
    metaDescription:
      "AI 動画制作パイプラインを御社ブランドで提供。クライアント数無制限・粗利率 85%+。Paradigm が裏方として全自動レンダリング。",
    heroBadge: "Agency White-Label",
    heroTitle: "動画案件を断るたびに、御社の利益が他社へ流れています",
    heroHighlight: "WL で取り返す",
    heroDesc:
      "月 2-3 件の動画案件を断っているなら、年 $72,000-$288,000 が素通りしています。Paradigm の AI パイプラインを御社ブランドで提供すれば、断らずに済みます。",
    roiEyebrow: "Loss Calculator",
    roiTitle: "御社は今月、いくら損していますか?",
    roiDesc: "動画案件を断る / 外注に出すたびに、利益が他社へ流れています。",
    roiQ1: "Q1. 月に動画案件を断る or 外注する件数は?",
    roiQ2: "Q2. 1 件あたりの平均受注金額は?",
    roiMonthly: "月間損失",
    roiAnnual: "年間損失",
    roiParadigm: "Paradigm 年間費",
    roiNetGain: "回収可能粗利 (年間)",
    roiNetGainDesc: "今、御社を素通りしている動画案件を WL で回収できる粗利です。",
    roiCta: "この損失を止める方法を 15 分で説明します",
    howItWorksEyebrow: "How it works",
    howItWorksTitle: "御社が表・Paradigm が裏方",
    pricingTitle: "WL 専用 2 プラン",
    pricingDesc: "超過課金: 1 本あたり $80。年払いで Agency 20%・White 25% OFF。",
    comparisonEyebrow: "Why WL",
    comparisonTitle: "外注の限界 vs WL の構造優位",
    faqEyebrow: "FAQ",
    faqTitle: "よくある質問",
    recommendedLabel: "Recommended",
  },
  diagnosticReport: {
    diagnosticBadge: "診断対象",
    estimatedMonthlyLoss: "ESTIMATED MONTHLY LOSS",
    lossDesc: "上記の課題による月間推定機会損失の合算です。\n改善により回収可能な損失として試算しています。",
    videoTeaser: "改善した場合の試算を2分で説明します",
    videoBranding: "専用の解説動画",
    videoPlaceholder: "※ HyperFrames / Loom 動画を埋め込み予定 (Sprint 11)",
    videoFooter: "御社サイトの診断結果と、具体的な改善シミュレーションをまとめました。まずは動画をご覧ください。",
    ctaEyebrow: "NEXT STEP",
    ctaTitle: "まず30分、話だけでも聞いてみてください",
    ctaDesc: "費用の話は一切しません。\n診断結果の詳細説明と、改善の優先順位をお伝えします。",
    ctaSubtext: "無料 · オンライン対応 · 30分",
    footerNote: "Paradigm Web Diagnostics · このレポートは {date} まで有効です",
    severityCritical: "緊急対応",
    severityWarning: "要対応",
    severityInfo: "推奨",
  },
}

for (const locale of LOCALES) {
  const path = `messages/${locale}.json`
  const obj = JSON.parse(readFileSync(path, "utf8"))
  // ja は完全な翻訳・他 11 locale は ja 値で fill (Plan B: 後で DeepSeek 自動翻訳)
  const sourceVal = JA_SALES_LP
  let added = 0
  for (const [k, v] of Object.entries(sourceVal)) {
    if (!obj[k]) {
      obj[k] = v
      added++
    } else {
      // 既存 namespace に新規 key だけ追加
      for (const [innerK, innerV] of Object.entries(v)) {
        if (obj[k][innerK] === undefined) {
          obj[k][innerK] = innerV
          added++
        }
      }
    }
  }
  writeFileSync(path, JSON.stringify(obj, null, 2) + "\n", "utf8")
  console.log(`[${locale}] added ${added} keys`)
}
console.log("\nDone. ja = 完全翻訳・他 11 locale = ja 値で fill (後で DeepSeek 自動翻訳).")
