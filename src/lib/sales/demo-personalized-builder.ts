/**
 * lib/sales/demo-personalized-builder.ts — Template-Aware Personalized Demo Builder
 *
 * Wraps buildDemoMultiPageData() with template awareness:
 * - Generates content that reflects the template's section choices
 * - If template has 'testimonials' section → generate testimonial content
 * - If template has 'trustedBy' → generate from industry peers
 * - Features arranged per template's featureLayout
 *
 * v1 (2026-06-23): Initial — refactored from demo-multi-page-builder.ts
 */

import { buildDemoMultiPageData } from "./demo-multi-page-builder"
import type { DemoTemplate } from "./demo-templates/registry"
import type {
  DemoMultiPageData,
  DemoHomePage,
  DemoTestimonial,
  DemoTrustedByItem,
} from "./demo-site-types"
import type { DiagnosticReportData } from "./diagnostic"

/** Testimonial generated from company context */
export interface GeneratedTestimonial {
  id: string
  quote: string
  author: string
  role: string
  avatarInitials: string
}

/** Trusted-by logo item */
export interface GeneratedTrustedBy {
  id: string
  name: string
  initials: string
}

/**
 * Build personalized multi-page demo data with template awareness.
 * Extends the base data with template-specific content like
 * testimonials, trusted-by logos, and rearranged sections.
 */
export function buildPersonalizedDemoData(
  company: Parameters<typeof buildDemoMultiPageData>[0],
  report: DiagnosticReportData,
  template: DemoTemplate,
): DemoMultiPageData {
  // Build base data
  const base = buildDemoMultiPageData(company, report)

  // Clone the home page to add template-specific content
  const homePage = { ...base.pages.home }

  // Add testimonials if template requires them
  if (template.layout.home.sections.includes("testimonials")) {
    const testimonials = generateTestimonials(company, report, base.locale)
    homePage.testimonials = testimonials
  }

  // Add trusted-by section if template requires it
  if (template.layout.home.sections.includes("trustedBy")) {
    const trustedBy = generateTrustedBy(company, report, base.locale)
    homePage.trustedBy = trustedBy
  }

  // Add template metadata
  const result: DemoMultiPageData = {
    ...base,
    templateId: template.id,
    designTokens: template.designTokens,
    pages: {
      ...base.pages,
      home: homePage,
    },
  }

  return result
}

/**
 * Generate testimonial content based on company data.
 * Falls back to industry-appropriate generic testimonials.
 */
function generateTestimonials(
  company: Parameters<typeof buildDemoMultiPageData>[0],
  _report: DiagnosticReportData,
  locale: string,
): DemoTestimonial[] {
  const isJa = locale === "ja"
  const industry = company.industry ?? "consulting"
  const name = company.company_name || "Company"

  // Industry-specific testimonial templates
  const templates: Record<string, Array<{ quoteJa: string; quoteEn: string; authorJa: string; authorEn: string; roleJa: string; roleEn: string; initials: string }>> = {
    consulting: [
      {
        quoteJa: `${name}さんの分析は非常に的確で、改善後のサイトは問い合わせが2倍に増えました。`,
        quoteEn: `${name}'s analysis was spot-on. Inquiries doubled after the site improvements.`,
        authorJa: "A社 代表", authorEn: "CEO, Company A",
        roleJa: "経営コンサルタント", roleEn: "Management Consultant",
        initials: "A",
      },
      {
        quoteJa: "PageSpeedが改善され、お客様からの「サイトが遅い」というクレームがなくなりました。",
        quoteEn: "PageSpeed improved and complaints about slow site disappeared entirely.",
        authorJa: "B社 マーケ部長", authorEn: "Marketing Director, Company B",
        roleJa: "マーケティング責任者", roleEn: "Marketing Lead",
        initials: "B",
      },
    ],
    dental: [
      {
        quoteJa: "予約フォームが使いやすくなり、新規患者数が30%増加しました。",
        quoteEn: "The booking form is much easier to use — new patient numbers are up 30%.",
        authorJa: "C歯科医院 院長", authorEn: "Director, Clinic C",
        roleJa: "歯科医師", roleEn: "Dentist",
        initials: "C",
      },
    ],
    restaurant: [
      {
        quoteJa: "サイトの写真が綺麗になり、予約数が明らかに増えました。",
        quoteEn: "The site photos look great now, and reservations have clearly increased.",
        authorJa: "Dレストラン オーナー", authorEn: "Owner, Restaurant D",
        roleJa: "オーナーシェフ", roleEn: "Owner Chef",
        initials: "D",
      },
    ],
    retail: [
      {
        quoteJa: "商品ページの表示速度が改善され、直帰率が大幅に下がりました。",
        quoteEn: "Product page speed improved and bounce rate dropped significantly.",
        authorJa: "Eストア 代表", authorEn: "CEO, Store E",
        roleJa: "EC事業責任者", roleEn: "E-commerce Lead",
        initials: "E",
      },
    ],
    construction: [
      {
        quoteJa: "施工事例がわかりやすく整理され、問い合わせが倍増しました。",
        quoteEn: "Project case studies are now clearly organized, and inquiries doubled.",
        authorJa: "F建設 営業部長", authorEn: "Sales Director, Construction F",
        roleJa: "営業責任者", roleEn: "Sales Lead",
        initials: "F",
      },
    ],
    beauty_salon: [
      {
        quoteJa: "インスタと連携したサイトで、新規のお客様が毎日来店されています。",
        quoteEn: "With the Instagram-integrated site, new customers visit every day.",
        authorJa: "Gサロン オーナー", authorEn: "Owner, Salon G",
        roleJa: "美容師", roleEn: "Stylist",
        initials: "G",
      },
    ],
    accounting: [
      {
        quoteJa: "お問い合わせフォームがわかりやすくなり、相談件数が1.5倍に。",
        quoteEn: "The contact form is much clearer — consultation requests are up 1.5x.",
        authorJa: "H会計事務所 所長", authorEn: "Director, Accounting H",
        roleJa: "税理士", roleEn: "Tax Accountant",
        initials: "H",
      },
    ],
    cleaning: [
      {
        quoteJa: "料金表の見やすさとお問い合わせのしやすさで、新規受注が増えました。",
        quoteEn: "Clear pricing and easy contact options led to more new orders.",
        authorJa: "I清掃 代表", authorEn: "CEO, Cleaning I",
        roleJa: "代表取締役", roleEn: "Managing Director",
        initials: "I",
      },
    ],
  }

  const industryData = templates[industry] ?? templates.consulting

  return industryData.map((t, i) => ({
    id: `testimonial-${i}`,
    quote: isJa ? t.quoteJa : t.quoteEn,
    author: isJa ? t.authorJa : t.authorEn,
    role: isJa ? t.roleJa : t.roleEn,
    avatarInitials: t.initials,
  }))
}

/**
 * Generate trusted-by logos from industry peer archetypes.
 */
function generateTrustedBy(
  company: Parameters<typeof buildDemoMultiPageData>[0],
  _report: DiagnosticReportData,
  locale: string,
): DemoTrustedByItem[] {
  const isJa = locale === "ja"
  const industry = company.industry ?? "consulting"

  const peers: Record<string, Array<{ nameJa: string; nameEn: string; initials: string }>> = {
    consulting: [
      { nameJa: "株式会社ABCコンサル", nameEn: "ABC Consulting Inc.", initials: "ABC" },
      { nameJa: "デジタル戦略パートナーズ", nameEn: "Digital Strategy Partners", initials: "DSP" },
      { nameJa: "グローバルビジネス研究所", nameEn: "Global Business Institute", initials: "GBI" },
    ],
    dental: [
      { nameJa: "スマイル歯科クリニック", nameEn: "Smile Dental Clinic", initials: "SDC" },
      { nameJa: "ホワイト歯科医院", nameEn: "White Dental Office", initials: "WDO" },
    ],
    restaurant: [
      { nameJa: "創作料理 和", nameEn: "Sosaku Ryori Wa", initials: "WA" },
      { nameJa: "ビストロ・ルミエール", nameEn: "Bistro Lumiere", initials: "BL" },
    ],
    retail: [
      { nameJa: "セレクトショップ ミューズ", nameEn: "Select Shop Muse", initials: "SSM" },
      { nameJa: "ナチュラルライフストア", nameEn: "Natural Life Store", initials: "NLS" },
    ],
    construction: [
      { nameJa: "大和建設株式会社", nameEn: "Yamato Construction Co.", initials: "YC" },
      { nameJa: "都市開発パートナーズ", nameEn: "Urban Development Partners", initials: "UDP" },
    ],
    beauty_salon: [
      { nameJa: "美容室 ルーチェ", nameEn: "Salon Luce", initials: "SL" },
      { nameJa: "ネイルサロン フィオーレ", nameEn: "Nail Salon Fiore", initials: "NF" },
    ],
    accounting: [
      { nameJa: "山田会計事務所", nameEn: "Yamada Accounting Office", initials: "YA" },
      { nameJa: "税理士法人 中央", nameEn: "Tax Corporation Chuo", initials: "TC" },
    ],
    cleaning: [
      { nameJa: "クリーンサービス匠", nameEn: "Clean Service Takumi", initials: "CT" },
      { nameJa: "環境メンテナンス協会", nameEn: "Environment Maintenance Assoc.", initials: "EMA" },
    ],
  }

  const peerList = peers[industry] ?? peers.consulting

  return peerList.map((p, i) => ({
    id: `trusted-${i}`,
    name: isJa ? p.nameJa : p.nameEn,
    initials: p.initials,
  }))
}
