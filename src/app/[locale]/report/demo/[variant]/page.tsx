"use client"

import { useParams } from "next/navigation"
import DiagnosticReport from "@/components/diagnostic/DiagnosticReport"
import type { DiagnosticReportData } from "@/lib/sales/diagnostic"
import type { SourceCoverageSnapshot } from "@/lib/sales/source-coverage"
import type { CompanyIntelligence } from "@/lib/sales/company-intelligence"

// ─── Sample data for full layout preview ───
function buildDemoData(variant: string, lang: string): DiagnosticReportData {
  const isJa = lang === "ja"

  // ─── Variant-specific demo data ───
  const variantData: Record<string, {
    companyName: { ja: string; en: string }
    industry: string
    hook: { ja: string; en: string }
    acts: DiagnosticReportData["acts"]
    totalLoss: string
    cta: { ja: string; en: string }
  }> = {
    japan_entry: {
      companyName: { ja: "GreenTech Solutions Inc.", en: "GreenTech Solutions Inc." },
      industry: "consulting",
      hook: {
        ja: "日本市場で御社の製品を購入しようとした消費者が、特商法表示の不備を理由に離脱しています。競合のEcoVantage社は半年前に弊社支援で日本参入し、すでに月商1,200万円を達成。御社の参入遅れは月間280万円の機会損失です。",
        en: "Japanese consumers attempting to purchase your product are abandoning due to missing commercial law disclosures. Competitor EcoVantage entered Japan 6 months ago through our support and is now generating $82,000/month. Your delay is costing ~$19,000/month in lost revenue.",
      },
      acts: [
        {
          type: "pain", icon: "TRUST", headline: isJa ? "日本市場で御社のブランドが信用されていない" : "Your brand lacks trust signals for Japanese consumers",
          body: isJa
            ? "日本消費者は購入前に必ず「特定商取引法に基づく表記」を確認します。これがないサイトからの購入率は8%以下。御社の現状では、せっかくの日本流入トラフィックの92%が信用不足で離脱しています。これは競合EcoVantageが獲得している月間1,200万円の売上を、そのまま取りこぼしている計算です。"
            : "Japanese consumers check Commercial Law disclosures before ANY purchase. Without them, conversion drops below 8%. Your current state means 92% of Japan-bound traffic leaves without buying. This is revenue EcoVantage is capturing instead — $82,000/month that should be yours.",
          metric_label: isJa ? "信頼スコア" : "Trust score",
          metric_value: "8/100",
          metric_unit: isJa ? "点" : "pts",
          metric_bench: isJa ? "最低限: 特商法 + プライバシーポリシー" : "Minimum: Commercial Law + Privacy Policy",
          severity: "critical",
        },
        {
          type: "fear", icon: "OPS", headline: isJa ? "このまま放置すると取り返しがつかない" : "Delay is compounding your competitive disadvantage",
          body: isJa
            ? "日本EC市場は年率12%で成長中（2026年市場規模22兆円）。EcoVantageに続き、同業3社が2026年下期の日本参入を計画しています。先発優位の窓はあと3〜6ヶ月。このタイミングを逃すと、後発として認知獲得コストが3倍になります。"
            : "Japan's e-commerce market is growing 12% YoY (¥22T in 2026). Three competitors are planning H2 2026 Japan entry, following EcoVantage. The first-mover window is 3-6 months. Missing it triples customer acquisition costs as a late entrant.",
          metric_label: isJa ? "残り猶予" : "Window remaining",
          metric_value: isJa ? "3-6ヶ月" : "3-6 months",
          metric_unit: "",
          metric_bench: isJa ? "今すぐ着手が最適" : "Start now for optimal timing",
          severity: "warning",
        },
        {
          type: "hope", icon: "REACH", headline: isJa ? "最短30日で日本参入・売上化が可能" : "Japan entry and revenue in 30 days is achievable",
          body: isJa
            ? "弊社の日本参入パッケージでは、特商法対応・決済導入・日本語サイト構築を全て並行して進め、最短30日で販売開始できます。EcoVantageの事例では、参入初月から月商320万円、3ヶ月目には1,200万円に到達。御社の製品力があれば、これを上回る成果が十分可能です。"
            : "Our Japan entry package handles commercial law compliance, payment integration, and Japanese site build in parallel — go live in 30 days. EcoVantage's case: $22K in month 1, $82K by month 3. With your product strength, exceeding this is entirely realistic.",
          metric_label: isJa ? "最短納期" : "Fastest delivery",
          metric_value: isJa ? "30日" : "30 days",
          metric_unit: "",
          metric_bench: isJa ? "通常3-6ヶ月 → 弊社なら30日" : "Typical 3-6 months → 30 days with us",
          severity: "info",
        },
      ],
      totalLoss: isJa ? "¥2,800,000" : "$19,000",
      cta: {
        ja: "まずは15分の無料診断で、御社の日本参入に必要な具体的ステップを明確にします。EcoVantageと同様の成果を、より早く達成するロードマップをお渡しします。",
        en: "In a 15-minute free assessment, we'll map your exact Japan entry steps. You'll get a roadmap to achieve — and exceed — EcoVantage-level results, faster.",
      },
    },
    website_diagnostic: {
      companyName: { ja: "株式会社サンプル美容室", en: "Sample Beauty Salon Inc." },
      industry: "beauty_salon",
      hook: {
        ja: "検索から予約までの導線で、訪問者の約60%が価値提案を見る前に離脱しています。",
        en: "About 60% of visitors leave before seeing your value proposition.",
      },
      acts: [
        {
          type: "pain", icon: "SPEED", headline: isJa ? "モバイル表示速度が機会損失を生んでいる" : "Mobile speed creating opportunity loss",
          body: isJa ? "モバイル表示速度38点は、美容室業界平均（71点）を大きく下回ります。訪問者の約6割が3秒以内に離脱し、月間約85万円相当の予約機会が競合に流出している計算です。" : "Mobile speed 38/100 is far below beauty industry average (71). ~60% leave within 3 seconds, losing ~$7,700/month in bookings.",
          metric_label: isJa ? "スマホ表示スコア" : "Mobile speed score", metric_value: "38", metric_unit: isJa ? "点" : "pts", metric_bench: isJa ? "目安: 75点以上" : "Target: 75+", severity: "critical",
        },
        {
          type: "fear", icon: "TRUST", headline: isJa ? "SSLとセキュリティ表示が信頼を損なう" : "SSL and security display eroding trust",
          body: isJa ? "SSLグレードBは、最新ブラウザで「保護された通信」と表示されず、B2B取引審査や予約フォームの離脱率を15%上昇させます。" : "SSL grade B doesn't show 'Secure' in modern browsers. This increases booking form abandonment by 15%.",
          metric_label: isJa ? "信頼表示リスク" : "Trust signal risk", metric_value: isJa ? "要確認" : "Verify", metric_unit: "", metric_bench: isJa ? "証明書とHTTPSが正常" : "HTTPS and certificate healthy", severity: "warning",
        },
        {
          type: "hope", icon: "SNS", headline: isJa ? "SNS共有プレビューの改善で集客力を上げる" : "Improve social previews for better reach",
          body: isJa ? "OGP設定がないため、LINEやInstagramでURLを共有しても文字化け表示になります。美容室の新規集客の60%がSNS経由であることを踏まえると、この改善だけで月間15件以上の新規予約獲得が期待できます。" : "Without OGP, shared URLs appear garbled. With 60% of beauty salon discovery via social, fixing this alone could bring 15+ new bookings/month.",
          metric_label: isJa ? "SNS共有の見え方" : "Social share preview", metric_value: isJa ? "未整備" : "Not set", metric_unit: "", metric_bench: isJa ? "タイトル、説明文、画像が整っている" : "Title, description, and image ready", severity: "info",
        },
      ],
      totalLoss: isJa ? "¥2,450,000" : "$22,000",
      cta: {
        ja: "診断結果をもとに、売上機会、信頼低下、問い合わせ導線、運用負荷のどこから直すべきかを30分で整理します。",
        en: "Based on this assessment, we will identify the highest-impact area to fix first.",
      },
    },
  }

  // Fallback for variants without specific demo data
  const data = variantData[variant] ?? variantData.website_diagnostic!
  const companyName = isJa ? data.companyName.ja : data.companyName.en

  const sourceCoverage: SourceCoverageSnapshot = {
    score: 72,
    collected: 18,
    configured: 5,
    missing: 8,
    items: [
      { slug: "pagespeed", label: "PageSpeed", category: "analysis", status: "collected", score: 85, detail: "Mobile 38/100", meaning: "Speed score proxy", missingConsequence: "", nextStep: "" },
      { slug: "ssl", label: "SSL Labs", category: "security", status: "collected", score: 75, detail: "Grade B", meaning: "TLS quality", missingConsequence: "", nextStep: "" },
      { slug: "wappalyzer", label: "Tech Stack", category: "analysis", status: "collected", score: 90, detail: "WordPress + Stripe", meaning: "Technology profile", missingConsequence: "", nextStep: "" },
      { slug: "dns", label: "DNS Records", category: "security", status: "collected", score: 65, detail: "No DMARC", meaning: "Email security", missingConsequence: "", nextStep: "" },
      { slug: "places", label: "Google Places", category: "company", status: "missing", score: 0, detail: "Not found", meaning: "Local presence", missingConsequence: "Missing local proof", nextStep: "Verify GMB" },
      { slug: "crtsh", label: "crt.sh", category: "security", status: "collected", score: 80, detail: "3 certs found", meaning: "Certificate history", missingConsequence: "", nextStep: "" },
      { slug: "radar", label: "Cloudflare Radar", category: "analysis", status: "collected", score: 70, detail: "Top 500k", meaning: "Traffic ranking", missingConsequence: "", nextStep: "" },
      { slug: "observatory", label: "Mozilla Observatory", category: "security", status: "collected", score: 55, detail: "Score 65/100", meaning: "Security posture", missingConsequence: "", nextStep: "" },
      { slug: "w3c", label: "W3C Validator", category: "analysis", status: "collected", score: 40, detail: "12 errors", meaning: "HTML quality", missingConsequence: "", nextStep: "" },
    ],
  }

  const intelligence: CompanyIntelligence = {
    signals: [
      { id: "speed", label: isJa ? "モバイル速度" : "Mobile speed", value: "38/100", source: "PageSpeed", category: "website", tone: "critical", detail: isJa ? "直帰率増加の主要原因" : "Primary cause of bounce", whyItMatters: isJa ? "訪問者の6割が表示前に離脱" : "60% leave before content loads" },
      { id: "ssl", label: isJa ? "SSL証明書" : "SSL Certificate", value: "Grade B", source: "SSL Labs", category: "security", tone: "warning", detail: isJa ? "A+まで改善余地あり" : "Room for A+ improvement", whyItMatters: isJa ? "ブラウザ警告リスク" : "Browser warning risk" },
      { id: "tech", label: isJa ? "技術スタック" : "Tech stack", value: "WordPress", source: "Wappalyzer", category: "website", tone: "warning", detail: isJa ? "保守・セキュリティリスク" : "Maintenance + security risk", whyItMatters: isJa ? "静的サイト移行で解決可能" : "Solve with static site migration" },
      { id: "ogp", label: "OGP", value: isJa ? "未設定" : "Not set", source: "HTML Scan", category: "seo", tone: "warning", detail: isJa ? "SNS共有プレビュー欠落" : "Missing social preview", whyItMatters: isJa ? "クリック率低下" : "Lower click-through" },
      { id: "dns", label: isJa ? "メールセキュリティ" : "Email security", value: isJa ? "DMARC未設定" : "No DMARC", source: "DNS", category: "security", tone: "warning", detail: isJa ? "なりすましリスク" : "Spoofing risk", whyItMatters: isJa ? "ドメイン評判に影響" : "Affects domain reputation" },
      { id: "form", label: isJa ? "問合せフォーム" : "Contact form", value: isJa ? "検出済み" : "Detected", source: "Crawlee", category: "outreach", tone: "good", detail: isJa ? "問合せ導線あり" : "Inquiry path exists", whyItMatters: isJa ? "営業自動化可能" : "Outreach ready" },
      { id: "ranking", label: isJa ? "トラフィック" : "Traffic", value: "Top 500k", source: "Cloudflare Radar", category: "seo", tone: "neutral", detail: isJa ? "グローバル評価" : "Global ranking", whyItMatters: isJa ? "市場規模の目安" : "Market size indicator" },
      { id: "history", label: isJa ? "サイト履歴" : "Site history", value: isJa ? "5年稼働" : "5yr active", source: "Wayback", category: "company", tone: "good", detail: isJa ? "長期運用の証" : "Proof of longevity", whyItMatters: isJa ? "信頼材料" : "Trust signal" },
      { id: "emailrep", label: isJa ? "メール評判" : "Email reputation", value: isJa ? "良好" : "Good", source: "EmailRep", category: "security", tone: "good", detail: isJa ? "ブラックリストなし" : "Not blacklisted", whyItMatters: isJa ? "送信到達率に影響" : "Affects deliverability" },
    ],
    painPoints: [
      { id: "speed", title: isJa ? "モバイル速度が業界平均を大きく下回る" : "Mobile speed significantly below average", severity: "critical", evidence: isJa ? "PageSpeed Mobile 38/100" : "PageSpeed Mobile 38/100", implication: isJa ? "訪問者の約6割が価値提案を見る前に離脱" : "~60% leave before seeing value proposition", recommendedAction: isJa ? "画像最適化・JS削減・Astro移行を提案" : "Propose image optimization, JS reduction, Astro migration" },
      { id: "ssl", title: isJa ? "SSLグレードがB — 信頼表示に改善余地" : "SSL grade B — trust display needs improvement", severity: "warning", evidence: isJa ? "SSL Labs Grade B" : "SSL Labs Grade B", implication: isJa ? "B2B審査や購買プロセスで減点対象" : "Deducted in B2B audits and procurement", recommendedAction: isJa ? "HSTS Preload + CSPヘッダー追加" : "Add HSTS Preload + CSP headers" },
      { id: "ogp", title: isJa ? "SNSプレビュー未設定 — 共有時の初回信頼が低下" : "Missing social previews hurt first-click trust", severity: "warning", evidence: isJa ? "OGP metadata 不在" : "No OGP metadata", implication: isJa ? "LINE/Slack/Xでの共有クリック率が業界平均の40%以下" : "Share click rate below 40% of average", recommendedAction: isJa ? "OGP画像 + title + description を設定" : "Configure OGP image + title + description" },
    ],
    nextActions: [
      isJa ? "PageSpeedスコア改善（画像圧縮・CDN導入）を最優先で実施" : "Prioritize PageSpeed improvement (image compression, CDN)",
      isJa ? "SSL証明書の更新とHSTS Preload設定" : "Update SSL cert and enable HSTS Preload",
      isJa ? "OGPメタデータの全ページ設定" : "Configure OGP metadata on all pages",
      isJa ? "診断レポートを添えて提案メールを送信" : "Send proposal email with diagnostic report attached",
      isJa ? "Astro移行デモサイトを作成し改善後の姿を見せる" : "Create Astro migration demo to show improved state",
    ],
  }

  return {
    company_name: companyName,
    report_locale: lang as any,
    target_country: "JP",
    template_variant: variant as any,
    industry: data.industry as any,
    prefecture: isJa ? "東京都渋谷区" : "Shibuya, Tokyo",
    expires_at: new Date(Date.now() + 30 * 86400000).toISOString(),
    hook: isJa ? data.hook.ja : data.hook.en,
    total_loss: data.totalLoss,
    acts: data.acts,
    cta_text: isJa ? data.cta.ja : data.cta.en,
    video_thumbnail: null,
    demo_url: "https://demo.paradigmjp.com",
    screenshot_url: null,
    source_coverage: sourceCoverage,
    intelligence,
    meta: {
      scan: { mobile_score: 38, desktop_score: 52, is_wordpress: true, hasHsts: false, hasCsp: false, copyrightYear: 2022 },
      tech: { stack: ["WordPress", "Stripe", "Google Analytics", "Cloudflare"] },
      ssl: { grade: "B", daysUntilExpiry: 45 },
      dns: { email_security_ok: false, hasDnssec: true, dkim_selectors: ["google"] },
      crtsh: { total_certs: 3, latest_cert: { issuer: "Let's Encrypt" } },
      place: { name: "サンプル美容室", rating: 4.2, address: "東京都渋谷区", reviewCount: 28 },
      mozilla_observatory: { score: 65, grade: "C+" },
      w3c_validation: { errors: 12, warnings: 5, is_clean: false },
      cloudflare_radar: { rank: 450000, rank_bucket: "top-500k" },
      wayback_machine: { total_snapshots: 48, first_snapshot: "2019-03", last_snapshot: "2024-11", years_active: 5 },
      email_reputation: { reputation: "good", suspicious: false },
      japan_market_audit: { tokushoho_missing: false, appi_missing: true, local_payments_missing: false },
      contact_form_url: "https://example.com/contact",
    },
    contactFormUrl: "https://example.com/contact",
    content_template: {
      title: isJa ? "美容室向けWeb成長診断テンプレート" : "Beauty Salon Web Growth Diagnostic",
      purpose: isJa ? "美容室のWeb集客改善の優先順位を明確にする" : "Clarify beauty salon web marketing priorities",
      quality_bar: isJa ? "すべての数値は実測データに基づくこと。推測や一般論は禁止。" : "All numbers must be based on measured data. No speculation.",
      dify_selection_rule: "industry=beauty_salon&variant=website_diagnostic",
      prompt_template: "",
      offer_code: "jp_web_production",
      appeal_angle: "speed_conversion",
    },
    report_url: `https://paradigmjp.com/${lang}/report/demo/${variant}`,
  }
}

export default function DemoReportPage() {
  const params = useParams()
  const variant = (params?.variant as string) || "website_diagnostic"
  const locale = (params?.locale as string) || "ja"

  const data = buildDemoData(variant, locale)
  const slug = `demo-${variant}`

  return (
    <>
      <div className="sticky top-0 z-50 flex items-center justify-between gap-3 bg-zinc-900 px-4 py-2 text-white">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold">🔍 デモプレビュー</span>
          <span className="rounded bg-white/10 px-2 py-0.5 text-[10px] font-mono">{variant}</span>
          <span className="rounded bg-white/10 px-2 py-0.5 text-[10px] font-mono">{locale}</span>
        </div>
        <div className="flex items-center gap-2">
          <a href="/ja/report/template-preview" className="text-[10px] text-zinc-400 hover:text-white underline">← テンプレート一覧に戻る</a>
        </div>
      </div>
      <DiagnosticReport data={data} trackingSlug={slug} locale={locale} />
    </>
  )
}
