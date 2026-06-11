import type { DiagnosticAct, DiagnosticReportData } from "./diagnostic"
import type { SalesCompany } from "./types"
import { compactText, escapeHtml, labelForIndustry } from "./render-quality"

export type FullSiteDemoTemplateId =
  | "premium_corporate_hp"
  | "local_booking_site"
  | "commerce_storefront"
  | "japan_entry_commerce"
  | "dx_ai_business_site"

export interface FullSiteDemoTemplate {
  id: FullSiteDemoTemplateId
  label: string
  siteType: "corporate" | "booking" | "commerce" | "dx"
  bestFor: string[]
  featurePack: string[]
  compliancePack: string[]
  pageMap: string[]
  designIntent: string
}

export type FullSiteDemoCompany = Pick<
  SalesCompany,
  "id" | "industry" | "template_variant" | "target_country" | "report_locale" | "company_name" | "domain" | "prefecture" | "meta"
>

export const FULLSITE_DEMO_TEMPLATES: FullSiteDemoTemplate[] = [
  {
    id: "premium_corporate_hp",
    label: "Premium Corporate HP",
    siteType: "corporate",
    bestFor: ["consulting", "construction", "accounting"],
    featurePack: ["資料請求", "実績検索", "問い合わせ", "採用導線", "KPIダッシュボード", "CMS更新"],
    compliancePack: ["privacy_jp", "company_profile", "security_notice"],
    pageMap: ["Home", "Services", "Cases", "Pricing", "Contact", "Privacy"],
    designIntent: "日本企業向けの信頼感、実績、問い合わせ導線を重視したモダンなコーポレートサイト。",
  },
  {
    id: "local_booking_site",
    label: "Local Service Booking",
    siteType: "booking",
    bestFor: ["beauty_salon", "dental", "restaurant", "cleaning"],
    featurePack: ["予約カレンダー", "メニュー", "スタッフ", "口コミ", "Google Map", "LINE CTA"],
    compliancePack: ["privacy_jp", "booking_policy", "cancellation_policy"],
    pageMap: ["Home", "Menu", "Staff", "Booking", "Access", "Policy"],
    designIntent: "地域集客、予約率、口コミ信頼を最大化するサービス業向けフルサイト。",
  },
  {
    id: "commerce_storefront",
    label: "Commerce Storefront",
    siteType: "commerce",
    bestFor: ["retail", "restaurant"],
    featurePack: ["商品一覧", "商品詳細", "カート", "チェックアウト", "配送/返品", "在庫表示"],
    compliancePack: ["tokushoho_jp", "privacy_jp", "returns_shipping", "tax_included_price"],
    pageMap: ["Home", "Products", "Cart", "Checkout", "Guide", "Law"],
    designIntent: "日本向けECに必要な購入導線、税込価格、配送返品、特商法まで含むストアフロント。",
  },
  {
    id: "japan_entry_commerce",
    label: "Japan Entry Commerce",
    siteType: "commerce",
    bestFor: ["consulting", "retail"],
    featurePack: ["日本語UX", "税込価格", "国内決済", "配送/返品", "代理店問い合わせ", "FAQ"],
    compliancePack: ["tokushoho_jp", "privacy_jp", "appi_jp", "local_payment_notice"],
    pageMap: ["Home", "Products", "Japan Guide", "Cart", "Partner", "Law"],
    designIntent: "海外企業が日本市場で信頼されるための商品訴求、法務、決済導線を組み込んだサイト。",
  },
  {
    id: "dx_ai_business_site",
    label: "DX / AI Business System",
    siteType: "dx",
    bestFor: ["consulting", "construction", "accounting"],
    featurePack: ["業務診断", "ROI試算", "ダッシュボード", "自動化フロー", "無料相談", "導入ロードマップ"],
    compliancePack: ["privacy_jp", "security_notice", "data_processing_notice"],
    pageMap: ["Home", "Workflow", "Dashboard", "Pricing", "Security", "Contact"],
    designIntent: "テック系・DX案件向けに、動き、分析、業務改善ダッシュボードを前面に出すサイト。",
  },
]

const CORRUPT = /邵ｺ|郢|隴|髫|陞|鬮|陟|闔|髯|陋|隲|陷|・ｽ/

function esc(value: string): string {
  return escapeHtml(value)
}

function clean(value: string | number | null | undefined, fallback: string, max = 180): string {
  const text = String(value ?? "").replace(/\s+/g, " ").trim()
  if (!text || CORRUPT.test(text)) return fallback
  return compactText(text, fallback, max)
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function readString(meta: Record<string, unknown>, paths: readonly (readonly string[])[]): string | null {
  for (const path of paths) {
    let current: unknown = meta
    for (const segment of path) current = asRecord(current)[segment]
    if (typeof current === "string" && current.trim()) return current.trim()
  }
  return null
}

function initials(name: string): string {
  const chars = Array.from(name.replace(/\s+/g, ""))
  return chars.slice(0, 2).join("").toUpperCase() || "P"
}

export function selectFullSiteDemoTemplate(company: Pick<SalesCompany, "industry" | "template_variant" | "target_country">): FullSiteDemoTemplate {
  if (company.template_variant === "japan_entry") return FULLSITE_DEMO_TEMPLATES.find((t) => t.id === "japan_entry_commerce")!
  if (company.template_variant === "dx_ai_package") return FULLSITE_DEMO_TEMPLATES.find((t) => t.id === "dx_ai_business_site")!
  if (company.industry === "retail") return FULLSITE_DEMO_TEMPLATES.find((t) => t.id === "commerce_storefront")!
  if (["beauty_salon", "dental", "restaurant", "cleaning"].includes(company.industry ?? "")) {
    return FULLSITE_DEMO_TEMPLATES.find((t) => t.id === "local_booking_site")!
  }
  return FULLSITE_DEMO_TEMPLATES.find((t) => t.id === "premium_corporate_hp")!
}

function topActs(acts: DiagnosticAct[]): DiagnosticAct[] {
  return acts.length ? acts.slice(0, 3) : []
}

function metricCards(report: DiagnosticReportData, ja: boolean): string {
  const fallbacks = ja
    ? [
        ["表示速度", "85+", "Core Web Vitals改善"],
        ["信頼導線", "A", "実績、口コミ、FAQを再配置"],
        ["CV導線", "2.4x", "問い合わせまでの摩擦を削減"],
      ]
    : [
        ["Speed", "85+", "Core Web Vitals ready"],
        ["Trust", "A", "Proof, reviews, and FAQ structure"],
        ["Conversion", "2.4x", "Shorter inquiry path"],
      ]
  const acts = topActs(report.acts)
  return fallbacks.map((fallback, index) => {
    const act = acts[index]
    const label = clean(act?.metric_label, fallback[0], 34)
    const value = clean(act?.metric_value, fallback[1], 18)
    const detail = clean(act?.metric_bench, fallback[2], 64)
    return `<article class="metric-card">
      <span>${esc(label)}</span>
      <strong>${esc(value)}</strong>
      <p>${esc(detail)}</p>
    </article>`
  }).join("")
}

function issueCards(report: DiagnosticReportData, ja: boolean): string {
  const defaults = ja
    ? ["ファーストビューで選ばれる理由が伝わりきらない", "予約・問い合わせまでの導線が長い", "信頼材料が分散して比較時に弱い"]
    : ["Value is unclear above the fold", "Inquiry path is too long", "Trust proof is scattered"]
  const actions = ja
    ? ["事業価値と実績を最初の5秒に集約", "予約・資料請求・相談を1クリック導線へ", "実績、口コミ、保証、FAQを購入直前に配置"]
    : ["Condense value and proof into the first five seconds", "Make booking and inquiry one-click actions", "Place proof, reviews, guarantees, and FAQ near conversion"]
  return defaults.map((fallback, index) => {
    const act = report.acts[index]
    return `<article class="bento-card" data-feature-card="diagnostic-${index + 1}">
      <div class="step">0${index + 1}</div>
      <h3>${esc(clean(act?.headline, fallback, 82))}</h3>
      <p>${esc(clean(act?.body, actions[index], 190))}</p>
      <small>${esc(actions[index])}</small>
    </article>`
  }).join("")
}

function serviceCards(template: FullSiteDemoTemplate, industryLabel: string, ja: boolean): string {
  const base = ja
    ? [
        [`${industryLabel}向けサイト刷新`, "現サイトの強みを残しながら、情報設計、速度、信頼表示、問い合わせ導線を再構成します。"],
        ["予約・問い合わせ機能", "Cal.com、LINE、フォーム、電話、営業通知を業種に合わせて配置します。"],
        ["運用しやすいCMS設計", "実績、メニュー、商品、FAQをKeystaticやHeadless CMSで更新できる構成にします。"],
      ]
    : [
        [`${industryLabel} website rebuild`, "Restructure information, speed, trust proof, and conversion paths while preserving brand equity."],
        ["Booking and inquiry system", "Fit Cal.com, LINE, forms, phone, and lead notifications to the business model."],
        ["CMS-ready operations", "Keep cases, menus, products, and FAQ editable through a governed CMS workflow."],
      ]
  if (template.siteType === "commerce") {
    base[1] = ja
      ? ["EC・カート機能", "商品一覧、商品詳細、カート、チェックアウト、配送、返品、特商法まで揃えます。"]
      : ["Commerce and cart", "Products, detail pages, cart, checkout, delivery, returns, and commerce disclosure."]
  }
  if (template.siteType === "booking") {
    base[1] = ja
      ? ["予約・メニュー機能", "空き枠、スタッフ、メニュー、口コミ、Google Mapを一体化します。"]
      : ["Booking and menu system", "Slots, staff, menus, reviews, and maps in one booking flow."]
  }
  return base.map((item, index) => `<article class="service-card" data-feature-card="service-${index + 1}">
    <div class="service-icon">${["01", "02", "03"][index]}</div>
    <h3>${esc(item[0])}</h3>
    <p>${esc(item[1])}</p>
  </article>`).join("")
}

function featureDemo(template: FullSiteDemoTemplate, ja: boolean): string {
  if (template.siteType === "commerce") {
    return `<div class="feature-panel" data-commerce-cart>
      <div class="section-head"><span>Commerce</span><h2>${ja ? "商品、カート、決済まで動くECデモ" : "Commerce demo with products, cart, and checkout"}</h2></div>
      <div class="commerce-grid">
        ${["スターターセット", "プロフェッショナルプラン", "保守・運用パック"].map((name, index) => `<article class="product-card" data-feature-card="commerce-${index + 1}">
          <div class="product-image">Product ${index + 1}</div>
          <h3>${esc(ja ? name : ["Starter Kit", "Professional Plan", "Maintenance Pack"][index])}</h3>
          <p>${esc(ja ? "税込価格、在庫、配送目安、返品条件を明記します。" : "Tax-included price, stock, delivery, and returns are visible.")}</p>
          <strong>¥${["19,800", "98,000", "35,000"][index]}</strong>
          <button type="button" data-cart="${index + 1}">${ja ? "カートに入れる" : "Add to cart"}</button>
        </article>`).join("")}
      </div>
      <aside class="checkout-card"><strong>${ja ? "カート" : "Cart"}</strong><p id="cart-count">0 items</p><button type="button">${ja ? "チェックアウトへ進む" : "Proceed to checkout"}</button></aside>
    </div>`
  }

  if (template.siteType === "booking") {
    return `<div class="feature-panel" data-booking-panel>
      <div class="section-head"><span>Booking</span><h2>${ja ? "予約、メニュー、口コミを一体化" : "Booking, menu, and reviews in one flow"}</h2></div>
      <div class="booking-grid">
        <div class="calendar-card" data-feature-card="booking-slots"><h3>${ja ? "今週の空き枠" : "Open slots"}</h3>${["10:00", "13:30", "16:00", "18:30"].map((time) => `<button type="button">${time}</button>`).join("")}</div>
        <div class="menu-card" data-feature-card="booking-menu"><h3>${ja ? "人気メニュー" : "Popular menu"}</h3><p>${ja ? "初回相談、スタンダード、プレミアムを明確に比較できます。" : "Clear comparison for trial, standard, and premium options."}</p><strong>¥6,600〜</strong></div>
        <div class="review-card" data-feature-card="booking-review"><h3>★★★★★ 4.8</h3><p>${ja ? "口コミ、写真、アクセスを予約直前で確認できます。" : "Reviews, photos, and access are visible right before booking."}</p></div>
      </div>
    </div>`
  }

  return `<div class="feature-panel" data-crm-panel>
    <div class="section-head"><span>System</span><h2>${ja ? "グラフと表で改善後の運用まで見える化" : "Charts and tables show post-launch operations"}</h2></div>
    <div class="dashboard-grid">
      <div class="chart-card" data-feature-card="dashboard-chart"><h3>${ja ? "問い合わせ予測" : "Inquiry forecast"}</h3><svg viewBox="0 0 420 180" role="img" aria-label="line chart"><polyline points="10,145 80,118 150,130 220,82 300,54 400,28" fill="none" stroke="#14b8a6" stroke-width="8" stroke-linecap="round"/><polyline points="10,150 80,145 150,138 220,135 300,128 400,122" fill="none" stroke="#64748b" stroke-width="4" stroke-dasharray="8 8"/></svg></div>
      <div class="table-card" data-feature-card="dashboard-roadmap"><h3>${ja ? "優先改善ロードマップ" : "Priority roadmap"}</h3><table><tbody><tr><td>01</td><td>Core Web Vitals</td><td>7 days</td></tr><tr><td>02</td><td>CTA / Form</td><td>5 days</td></tr><tr><td>03</td><td>CMS / Legal</td><td>4 days</td></tr></tbody></table></div>
    </div>
  </div>`
}

function legalPage(template: FullSiteDemoTemplate, companyName: string, ja: boolean): string {
  const lawTitle = template.compliancePack.includes("tokushoho_jp") ? "特定商取引法に基づく表記" : "プライバシーポリシー / 会社情報"
  const rows = ja
    ? [
        ["事業者名", companyName],
        ["所在地", "東京都内、または登録所在地をSSOTから反映"],
        ["販売価格", "各商品・サービスページに税込価格で表示"],
        ["支払方法", "クレジットカード、銀行振込、請求書払い"],
        ["返品・キャンセル", "商品または予約種別ごとに明記"],
        ["個人情報", "問い合わせ・予約情報は利用目的を明示して管理"],
      ]
    : [
        ["Business", companyName],
        ["Address", "Pulled from SSOT or verified business profile"],
        ["Pricing", "Tax-inclusive pricing shown per product or plan"],
        ["Payment", "Card, bank transfer, and invoice"],
        ["Returns / cancellation", "Shown per product or booking type"],
        ["Privacy", "Personal data use is disclosed and controlled"],
      ]
  return `<div class="feature-panel">
    <div class="section-head"><span>Compliance</span><h2>${esc(ja ? lawTitle : "Legal, privacy, and commercial disclosures")}</h2></div>
    <div class="legal-card"><table><tbody>${rows.map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join("")}</tbody></table></div>
  </div>`
}

function pageButtons(template: FullSiteDemoTemplate, ja: boolean): string {
  const labels = template.pageMap.map((page, index) => {
    const target = index === 0 ? "top" : page.toLowerCase().replace(/[^a-z]+/g, "-")
    return `<button type="button" data-nav-link="${esc(target)}" data-nav="${esc(target)}">${esc(page)}</button>`
  })
  labels.push(`<button type="button" data-nav-link="legal" data-nav="legal">${ja ? "法務" : "Legal"}</button>`)
  return labels.join("")
}

export function buildFullSiteDemoHtml(company: FullSiteDemoCompany, report: DiagnosticReportData, templateTitle: string): string {
  const template = selectFullSiteDemoTemplate(company)
  const loc = company.report_locale ?? report.report_locale ?? "ja"
  const ja = loc === "ja"
  const meta = asRecord(company.meta)
  const companyName = clean(company.company_name, ja ? "株式会社サンプル" : "Sample Inc.", 70)
  const location = clean(company.prefecture, ja ? "日本" : "Japan", 34)
  const industryLabel = labelForIndustry(company.industry, loc)
  const siteLabel = ja ? "改善後フルサイトデモ" : "Improved full-site demo"
  const hook = clean(report.hook, ja ? "選ばれる理由が一目で伝わるWebサイトへ刷新" : "A full-site rebuild that makes the reason to choose you obvious", 64)
  const rawCta = clean(report.cta_text, ja ? "無料相談を予約" : "Book a free consult", 30)
  const cta = rawCta.length > 24 ? (ja ? "無料相談を予約" : "Book a consult") : rawCta
  const screenshot =
    readString(meta, [["visual_evidence", "screenshots", "desktop", "url"], ["screenshot_url"]]) ??
    report.screenshot_url ??
    report.evidence_screenshot_url ??
    null
  const screenshotMarkup = screenshot
    ? `<img src="${esc(screenshot)}" alt="${esc(companyName)} current website screenshot" loading="lazy"/>`
    : `<div class="shot-placeholder"><span>${esc(companyName)}</span><strong>${ja ? "改善前サイト分析中" : "Current site analysis"}</strong><p>${esc(company.domain)}</p></div>`

  const pageNav = pageButtons(template, ja)
  const featureChips = template.featurePack.map((feature) => `<span>${esc(feature)}</span>`).join("")
  const complianceChips = template.compliancePack.map((pack) => `<span>${esc(pack)}</span>`).join("")

  return `<!doctype html>
<html lang="${esc(loc)}">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<meta name="robots" content="noindex,nofollow"/>
<title>${esc(companyName)} | ${esc(siteLabel)}</title>
<meta name="description" content="${esc(hook)}"/>
<style>
  :root{--ink:#101828;--muted:#667085;--line:#e4e7ec;--soft:#f8fafc;--primary:#155eef;--secondary:#14b8a6;--accent:#f97316}
  *{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:#fff;color:var(--ink);font-family:Inter,"Noto Sans JP",system-ui,sans-serif;letter-spacing:0}a{color:inherit;text-decoration:none}button{font:inherit}
  .topbar{height:38px;background:#0b1220;color:#d0d5dd;font-size:12px;display:flex;align-items:center;justify-content:center;padding:0 18px}.nav{position:sticky;top:0;z-index:50;background:rgba(255,255,255,.88);backdrop-filter:blur(18px);border-bottom:1px solid rgba(16,24,40,.08)}.nav-inner{max-width:1180px;margin:auto;display:flex;align-items:center;justify-content:space-between;gap:20px;padding:15px 22px}.brand{display:flex;align-items:center;gap:12px;min-width:0}.brand-mark{display:grid;place-items:center;width:42px;height:42px;border-radius:12px;background:linear-gradient(135deg,var(--primary),var(--secondary));color:#fff;font-weight:900}.brand small{display:block;color:var(--muted);font-size:11px}.brand span{display:block;font-weight:850;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:280px}.nav-links{display:flex;gap:4px;overflow:auto}.nav-links button{border:0;background:transparent;padding:9px 10px;border-radius:10px;color:#475467;font-weight:750;font-size:12px;cursor:pointer}.nav-links button:hover{background:#f2f4f7;color:#101828}.nav-cta{display:flex;gap:10px;align-items:center}.button-primary,.button-secondary{display:inline-flex;align-items:center;justify-content:center;min-height:42px;border-radius:999px;padding:0 18px;font-weight:850;font-size:13px}.button-primary{background:#101828;color:#fff}.button-secondary{background:#fff;color:#101828;border:1px solid var(--line)}
  .hero{max-width:1180px;margin:auto;padding:64px 22px 42px;display:grid;grid-template-columns:1.02fr .98fr;gap:34px;align-items:center}.eyebrow{display:inline-flex;gap:8px;align-items:center;border:1px solid #d0d5dd;border-radius:999px;padding:8px 12px;color:#475467;font-size:12px;font-weight:800}.eyebrow i{width:8px;height:8px;border-radius:50%;background:var(--secondary)}h1{font-size:56px;line-height:1.08;margin:20px 0 18px;max-width:760px}.lead{font-size:18px;line-height:1.78;color:#475467;max-width:660px}.hero-actions{display:flex;flex-wrap:wrap;gap:12px;margin:26px 0}.proof-row{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-top:26px}.metric-card{border:1px solid var(--line);border-radius:18px;padding:16px;background:#fff;box-shadow:0 12px 34px rgba(16,24,40,.06)}.metric-card span{display:block;color:var(--muted);font-size:11px;font-weight:850}.metric-card strong{display:block;font-size:28px;margin:4px 0}.metric-card p{margin:0;color:#667085;font-size:12px;line-height:1.5}.browser{border:1px solid var(--line);border-radius:22px;background:#fff;box-shadow:0 30px 90px rgba(16,24,40,.12);overflow:hidden}.browser-bar{height:42px;background:#f8fafc;border-bottom:1px solid var(--line);display:flex;align-items:center;gap:8px;padding:0 14px}.dot{width:10px;height:10px;border-radius:50%;background:#f04438}.dot:nth-child(2){background:#f79009}.dot:nth-child(3){background:#12b76a}.screen{min-height:430px;background:linear-gradient(135deg,#f8fafc,#eef4ff);padding:18px;display:grid;place-items:center}.screen img{width:100%;height:100%;max-height:420px;object-fit:cover;border-radius:16px;border:1px solid #e4e7ec}.shot-placeholder{width:100%;min-height:390px;border-radius:18px;border:1px dashed #98a2b3;background:linear-gradient(135deg,#fff,#eef4ff);display:grid;align-content:center;gap:10px;text-align:center;color:#475467}.shot-placeholder span{font-weight:900;font-size:24px;color:#101828}.shot-placeholder strong{font-size:34px}
  .section{max-width:1180px;margin:auto;padding:58px 22px}.section-head{max-width:790px;margin-bottom:24px}.section-head span{display:inline-block;color:var(--secondary);font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:.16em}.section-head h2{font-size:38px;line-height:1.16;margin:10px 0 0}.chip-row{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 22px}.chip-row span{border:1px solid var(--line);border-radius:999px;background:#fff;padding:8px 11px;color:#475467;font-size:12px;font-weight:800}.chip-row.compliance span{background:#ecfdf3;border-color:#abefc6;color:#027a48}.service-grid,.commerce-grid,.booking-grid,.dashboard-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}.dashboard-grid{grid-template-columns:1.2fr .8fr}.service-card,.legal-card,.chart-card,.table-card,.calendar-card,.menu-card,.review-card,.checkout-card,.product-card,.bento-card{background:#fff;border:1px solid var(--line);border-radius:20px;padding:22px;box-shadow:0 18px 60px rgba(16,24,40,.06)}.service-icon,.step{display:grid;place-items:center;width:42px;height:42px;border-radius:14px;background:#ecfeff;color:#0f766e;font-weight:900}.service-card h3,.bento-card h3{margin:16px 0 8px;font-size:20px}.service-card p,.bento-card p{color:#667085;line-height:1.75}.bento{display:grid;grid-template-columns:1.1fr .9fr 1fr;gap:16px}.bento-card:first-child{grid-row:span 2;background:#101828;color:#fff}.bento-card:first-child p{color:#cbd5e1}.bento-card small{display:block;margin-top:18px;color:#0f766e;font-weight:800}.bento-card:first-child small{color:#5eead4}.product-image{height:130px;border-radius:16px;background:linear-gradient(135deg,#f8fafc,#e0f2fe);display:grid;place-items:center;color:#475467;font-weight:900}.product-card strong,.menu-card strong{display:block;margin:14px 0;font-size:24px}.product-card button,.calendar-card button,.checkout-card button{border:0;border-radius:12px;background:#101828;color:#fff;padding:11px 14px;font-weight:850;cursor:pointer}.calendar-card{display:grid;gap:10px}.calendar-card button{background:#ecfdf3;color:#027a48}.review-card{background:#fffbeb}.chart-card svg{width:100%;height:180px;background:#f8fafc;border-radius:16px}.table-card table,.legal-card table{width:100%;border-collapse:collapse}.table-card td,.legal-card th,.legal-card td{border-bottom:1px solid var(--line);padding:12px;text-align:left;font-size:13px}.legal-card th{width:32%;color:#475467}.feature-panel{display:block}.footer{border-top:1px solid var(--line);background:#fff;margin-top:50px}.footer-inner{max-width:1180px;margin:auto;display:flex;justify-content:space-between;gap:20px;padding:26px 22px;color:#667085;font-size:12px}
  @media(max-width:900px){.hero{grid-template-columns:1fr;padding-top:42px}.nav-inner{align-items:flex-start;flex-direction:column}.nav-cta{width:100%}h1{font-size:38px}.section-head h2{font-size:30px}.proof-row,.bento,.service-grid,.commerce-grid,.booking-grid,.dashboard-grid{grid-template-columns:1fr}.bento-card:first-child{grid-row:auto}.footer-inner{flex-direction:column}.shot-placeholder strong{font-size:28px}}
</style>
</head>
<body>
  <div class="topbar">${esc(ja ? "RevenueOSで生成された送付前デモ。SSOT、診断、Keystaticテンプレートを反映。" : "Generated by RevenueOS from SSOT, diagnostics, and managed templates.")}</div>
  <nav class="nav"><div class="nav-inner"><div class="brand"><div class="brand-mark">${esc(initials(companyName))}</div><div><span>${esc(companyName)}</span><small>${esc(industryLabel)} · ${esc(location)}</small></div></div><div class="nav-links">${pageNav}</div><div class="nav-cta"><a class="button-secondary" href="#cases">${ja ? "改善根拠" : "Evidence"}</a><a class="button-primary" href="#contact">${esc(cta)}</a></div></div></nav>
  <main>
    <section class="hero" id="top" data-section="section-hero">
      <div>
        <div class="eyebrow"><i></i>${esc(siteLabel)} · ${esc(templateTitle || template.designIntent)}</div>
        <h1>${esc(hook)}</h1>
        <p class="lead">${esc(ja ? "単なるLPではなく、トップ、サービス、実績、料金、問い合わせ、法務、予約やカートなどの機能デモまで含む納品初稿レベルのフルサイトです。" : "Not a landing page: this prototype includes home, services, cases, pricing, contact, legal, and operational feature flows.")}</p>
        <div class="hero-actions"><a class="button-primary" href="#services">${ja ? "サイト全体を見る" : "Explore the site"}</a><a class="button-secondary" href="#contact">${ja ? "この構成で相談する" : "Discuss this build"}</a></div>
        <div class="proof-row">${metricCards(report, ja)}</div>
      </div>
      <div class="browser" aria-label="website preview"><div class="browser-bar"><span class="dot"></span><span class="dot"></span><span class="dot"></span></div><div class="screen">${screenshotMarkup}</div></div>
    </section>
    <section class="section" id="services" data-section="section-services"><div class="section-head"><span>Architecture</span><h2>${ja ? "業種と市場に合わせたフルサイト構成" : "A full-site architecture matched to market and industry"}</h2></div><div class="chip-row">${featureChips}</div><div class="service-grid">${serviceCards(template, industryLabel, ja)}</div></section>
    <section class="section" id="cases" data-section="section-cases"><div class="section-head"><span>Before / After</span><h2>${ja ? "診断結果から改善後の体験へつなぐ" : "From diagnostic evidence to the improved experience"}</h2></div><div class="bento">${issueCards(report, ja)}</div></section>
    <section class="section" id="pricing" data-section="section-pricing"><div class="section-head"><span>Plan</span><h2>${ja ? "発注判断しやすいプラン比較" : "Plan comparison built for buying decisions"}</h2></div><div class="service-grid">${["Launch", "Growth", "Operate"].map((plan, index) => `<article class="service-card" data-feature-card="plan-${index + 1}"><div class="service-icon">${index + 1}</div><h3>${plan}</h3><p>${esc(ja ? ["初期公開に必要なページと法務を整備。", "予約/EC/CRMなどの機能を追加。", "更新、分析、改善、保守を継続。"][index] : ["Pages and legal basics for launch.", "Add booking, commerce, CRM, and automation.", "Ongoing updates, analytics, optimization, and care."][index])}</p><strong>${["¥300,000〜", "¥800,000〜", "¥80,000/月〜"][index]}</strong></article>`).join("")}</div></section>
    <section class="section" id="dashboard" data-section="section-operations">${featureDemo(template, ja)}</section>
    <section class="section" id="legal" data-section="section-compliance"><div class="chip-row compliance">${complianceChips}</div>${legalPage(template, companyName, ja)}</section>
    <section class="section" id="contact" data-section="section-contact"><div class="section-head"><span>Conversion</span><h2>${ja ? "問い合わせ・予約・購入に直結する導線" : "Conversion paths for inquiry, booking, or purchase"}</h2></div><div class="service-grid"><article class="service-card" data-feature-card="contact-consult"><h3>${ja ? "無料相談" : "Free consult"}</h3><p>${ja ? "Cal.comやLINE、フォーム送信を営業通知へつなげます。" : "Connect calendar, forms, and notifications to sales follow-up."}</p><a class="button-primary" href="https://cal.com/paradigm-jp/15min" target="_blank" rel="noopener noreferrer">${esc(cta)}</a></article><article class="service-card" data-feature-card="contact-download"><h3>${ja ? "資料請求" : "Download request"}</h3><p>${ja ? "PDF、料金表、診断レポートを送付し、CRMに履歴を残します。" : "Send PDF, pricing, and report while logging CRM history."}</p><button type="button" class="button-secondary">${ja ? "資料を受け取る" : "Request materials"}</button></article><article class="service-card" data-feature-card="contact-cms"><h3>${ja ? "Keystatic管理" : "Keystatic management"}</h3><p>${ja ? "デモテンプレ、文言、実績、FAQをRevenueOS/Keystaticで確認・編集できます。" : "Templates, copy, cases, and FAQ are manageable in RevenueOS and Keystatic."}</p></article></div></section>
  </main>
  <footer class="footer"><div class="footer-inner"><span>© 2026 Paradigm LLC</span><span>${esc(template.label)} · ${esc(template.pageMap.join(" / "))}</span></div></footer>
<script>
  document.querySelectorAll("[data-nav]").forEach((button)=>button.addEventListener("click",()=>{const id=button.getAttribute("data-nav");document.getElementById(id)?.scrollIntoView({behavior:"smooth",block:"start"});}));
  let cart=0;document.querySelectorAll("[data-cart]").forEach((button)=>button.addEventListener("click",()=>{cart+=1;const count=document.getElementById("cart-count");if(count)count.textContent=cart+" items";button.textContent="${ja ? "追加済み" : "Added"}";}));
</script>
</body>
</html>`
}
