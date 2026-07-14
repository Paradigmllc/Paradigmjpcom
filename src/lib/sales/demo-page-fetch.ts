import { getServiceSalesSupabase } from "@/lib/supabase"
import { DB_TABLES } from "@/lib/sales/db-tables"
import { buildDemoPageData } from "./demo-page-builder"
import { buildDemoMultiPageData } from "./demo-multi-page-builder"
import { buildPersonalizedDemoData } from "./demo-personalized-builder"
import { applyDemoAdminOverrides } from "./artifact-admin-overrides"
import type { DemoBlock, DemoMultiPageData, DemoPageData } from "./demo-site-types"
import { selectTemplate, type CompanyProfile } from "./demo-template-selector"
import type { Industry, ReportLocale } from "./types"
import { JAPAN_ENTRY_CTA_EN, JAPAN_ENTRY_CTA_JA } from "@/lib/japan-entry-public-copy"
import { isTemporaryUnlistedDemoActive, verifyDemoPreviewToken, type DemoAssetReview } from "./demo-private-access"
import { buildPremiumAssetNote } from "./demo-asset-note"
import { applyIndustryPresentation } from "./demo-industry-presentation"
import { upgradeDemoToPremiumV3 } from "./demo-premium-v3"

/**
 * Fetch demo page data by slug from the theme_demo_pages table,
 * falling back to building from sales_companies data.
 */
export async function fetchDemoPageData(slug: string): Promise<DemoPageData | null> {
  const sb = getServiceSalesSupabase()
  if (!sb) {
    console.error("[demo-generator] fetchDemoPageData: Supabase not configured")
    return null
  }

  try {
    // Try theme_demo_pages first
    const { data: themePage, error: themeError } = await sb
      .from(DB_TABLES.THEME_DEMO_PAGES)
      .select("slug, company_id, title, blocks, meta")
      .eq("slug", slug)
      .eq("is_published", true)
      .maybeSingle()

    if (themePage && !themeError) {
      const meta = (themePage.meta ?? {}) as Record<string, unknown>

      const blocks = (themePage.blocks ?? []) as Array<{ id: string; type: string; props: Record<string, unknown> }>

      // Fetch associated company for full data
      const { data: company } = await sb
        .from(DB_TABLES.SALES_COMPANIES)
        .select("id, company_name, domain, slug, industry, prefecture, report_locale, tech_stack, pain_diagnosis, dify_result, visual_evidence, demo_site, meta")
        .eq("id", themePage.company_id)
        .maybeSingle()

      if (company) {
        // Build from theme data + company data using the existing builder
        const { fetchDiagnosticReport } = await import("./diagnostic")
        const { localeToRegion } = await import("./types")

        const locale = (company.report_locale ?? meta.locale ?? "ja") as string
        const region = localeToRegion(locale)
        let diagnostic = null
        try {
          diagnostic = await fetchDiagnosticReport({ slug: company.slug ?? themePage.slug, region, reportLocale: locale })
        } catch (diagErr) {
          console.error("[demo-generator] fetchDiagnosticReport threw:", diagErr instanceof Error ? diagErr.message : String(diagErr))
        }

        if (diagnostic) {
          return buildDemoPageData(
            company as Record<string, unknown> as Parameters<typeof buildDemoPageData>[0],
            diagnostic,
          )
        }

        // Fallback: build minimal data from meta
        const isJa = locale === "ja"
        const name = String(meta.company_name ?? company.company_name ?? "Company")
        const ctaUrl = String(meta.calBookingUrl ?? "https://cal.com/paradigm-jp/15min")
        const accentColor = String(meta.accentColor ?? "#7c3aed")
        const accentColorDark = String(meta.accentColorDark ?? "#5b21b6")

        return {
          slug,
          companyId: String(themePage.company_id),
          companyName: name,
          locale: locale as ReportLocale,
          industry: (meta.industry ?? company.industry ?? "consulting") as Industry,
          industryLabel: isJa ? "改善デモ" : "Improvement Demo",
          locationLabel: "",
          hero: {
            title: String(meta.title ?? `${name} Web改善デモ`),
            subtitle: String(meta.description ?? ""),
            tagline: isJa ? "改善デモ" : "Improvement Demo",
            companyName: name,
            industryLabel: isJa ? "改善デモ" : "Improvement Demo",
            locationLabel: "",
            primaryCta: { text: isJa ? JAPAN_ENTRY_CTA_JA : JAPAN_ENTRY_CTA_EN, href: "https://paradigmjp.com/en/contact?intent=japan-entry" },
            secondaryCta: { text: isJa ? "改善ポイントを見る" : "See improvements", href: "#features" },
            accentColor,
            accentColorDark,
          },
          navigation: isJa
            ? [{ label: "特徴", href: "#features" }, { label: "お問い合わせ", href: "#contact" }]
            : [{ label: "Features", href: "#features" }, { label: "Contact", href: "#contact" }],
          features: [],
          stats: [],
          beforeAfter: [],
          cta: {
            title: isJa ? JAPAN_ENTRY_CTA_JA : JAPAN_ENTRY_CTA_EN,
            subtitle: isJa ? "詳しくはお問い合わせください" : "Contact us for details",
            buttonText: isJa ? JAPAN_ENTRY_CTA_JA : JAPAN_ENTRY_CTA_EN,
            buttonHref: "https://paradigmjp.com/en/contact?intent=japan-entry",
            accentColor,
            accentColorDark,
          },
          totalLoss: "",
          meta: {
            title: String(meta.title ?? `${name} | Web改善デモ`),
            description: String(meta.description ?? ""),
            ogImage: "",
            industry: (meta.industry as Industry) ?? "consulting",
            locale: locale as ReportLocale,
            companyName: name,
            accentColor,
            accentColorDark,
            calBookingUrl: ctaUrl,
            generatedAt: String(meta.generated_at ?? new Date().toISOString()),
            engine: "theme_demo_pages",
          },
          blocks: blocks as DemoBlock[],
        }
      }
    }

    // Fallback: try direct sales_companies lookup
    const { data: companyBySlug } = await sb
      .from(DB_TABLES.SALES_COMPANIES)
      .select("id, company_name, domain, slug, industry, prefecture, report_locale, tech_stack, pain_diagnosis, dify_result, visual_evidence, demo_site, meta")
      .eq("slug", slug.replace(/-demo$/, ""))
      .maybeSingle()

    if (companyBySlug) {
      const { fetchDiagnosticReport } = await import("./diagnostic")
      const { localeToRegion } = await import("./types")

      const locale = (companyBySlug.report_locale ?? "ja") as string
      const region = localeToRegion(locale)
      let diagnostic = null
      try {
        diagnostic = await fetchDiagnosticReport({
          slug: companyBySlug.slug ?? slug.replace(/-demo$/, ""),
          region,
          reportLocale: locale,
        })
      } catch (diagErr) {
        console.error("[demo-generator] fetchDiagnosticReport (fallback) threw:", diagErr instanceof Error ? diagErr.message : String(diagErr))
      }

      if (diagnostic) {
        return buildDemoPageData(
          companyBySlug as Record<string, unknown> as Parameters<typeof buildDemoPageData>[0],
          diagnostic,
        )
      }
    }

    return null
  } catch (err) {
    console.error("[demo-generator] fetchDemoPageData failed:", err instanceof Error ? err.message : String(err))
    if (err instanceof Error && err.stack) console.error("[demo-generator] stack:", err.stack.slice(0, 1000))
    return null
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function isDemoMultiPageData(value: unknown): value is DemoMultiPageData {
  if (!isRecord(value) || !isRecord(value.pages)) return false
  return typeof value.slug === "string"
    && typeof value.companyName === "string"
    && isRecord(value.meta)
    && isRecord(value.pages.home)
    && isRecord(value.pages.about)
    && isRecord(value.pages.services)
    && isRecord(value.pages.contact)
}

/**
 * Fetch multi-page demo data by slug. Reuses the same Supabase lookup
 * logic as fetchDemoPageData but returns DemoMultiPageData for the
 * multi-page website (Home/About/Services/Contact).
 */
export async function fetchDemoMultiPageData(
  slug: string,
  options: { previewToken?: string } = {},
): Promise<DemoMultiPageData | null> {
  const sb = getServiceSalesSupabase()
  if (!sb) {
    console.error("[demo-generator] fetchDemoMultiPageData: Supabase not configured")
    return null
  }

  try {
    // Try theme_demo_pages first
    const { data: themePage, error: themeError } = await sb
      .from(DB_TABLES.THEME_DEMO_PAGES)
      .select("slug, company_id, title, blocks, meta, site_payload, design_recipe, quality_report, rights_manifest, publication_status, is_published, access_mode, preview_expires_at, asset_approval_status, asset_review")
      .eq("slug", slug)
      .maybeSingle()

    if (themeError) {
      console.error(`[demo-generator] theme lookup failed for ${slug}:`, themeError.message)
      return null
    }

    let isPrivatePreview = false
    if (themePage?.access_mode === "signed_private") {
      const verification = options.previewToken
        ? await verifyDemoPreviewToken(slug, options.previewToken)
        : { ok: false, expiresAt: themePage.preview_expires_at as string | null }
      if (!verification.ok) return null
      isPrivatePreview = true
    } else if (themePage?.access_mode === "temporary_unlisted") {
      if (!isTemporaryUnlistedDemoActive(themePage.access_mode, themePage.preview_expires_at)) return null
      isPrivatePreview = true
    } else if (themePage && !themePage.is_published) {
      return null
    }

    if (themePage) {
      const meta = (themePage.meta ?? {}) as Record<string, unknown>

      if (isDemoMultiPageData(themePage.site_payload)) {
        const review = isRecord(themePage.asset_review)
          ? themePage.asset_review as unknown as DemoAssetReview
          : null
        const logo = review?.assets.find((asset) => asset.kind === "logo")
        const approvedMedia = review?.assets
          .filter((asset) => asset.kind !== "logo")
          .map((asset) => ({
            src: asset.sourceUrl,
            alt: asset.alt,
            kind: asset.kind === "video" ? "video" as const : "image" as const,
            width: asset.width,
            height: asset.height,
            caption: asset.useBasis === "generated" ? "生成イメージ" : asset.notes || asset.ownerLabel,
          })) ?? []
        const premium = themePage.site_payload.premium && approvedMedia.length > 0
          ? {
              ...themePage.site_payload.premium,
              style: "premium-v2" as const,
              heroMedia: approvedMedia.slice(0, 3),
              gallery: approvedMedia.length >= 3 ? approvedMedia : [...approvedMedia, ...themePage.site_payload.premium.gallery].slice(0, 5),
              intro: {
                ...themePage.site_payload.premium.intro,
                note: buildPremiumAssetNote(
                  review,
                  themePage.asset_approval_status as "unreviewed" | "private_proposal" | "consented" | "blocked",
                ),
              },
            }
          : themePage.site_payload.premium
        return applyDemoAdminOverrides(upgradeDemoToPremiumV3(applyIndustryPresentation({
          ...themePage.site_payload,
          premium,
          designRecipe: isRecord(themePage.design_recipe)
            ? themePage.design_recipe as unknown as DemoMultiPageData["designRecipe"]
            : themePage.site_payload.designRecipe,
          quality: isRecord(themePage.quality_report)
            ? themePage.quality_report as unknown as DemoMultiPageData["quality"]
            : themePage.site_payload.quality,
          rightsManifest: isRecord(themePage.rights_manifest)
            ? themePage.rights_manifest as unknown as DemoMultiPageData["rightsManifest"]
            : themePage.site_payload.rightsManifest,
          publicationStatus: themePage.publication_status as DemoMultiPageData["publicationStatus"],
          privatePreview: isPrivatePreview && themePage.preview_expires_at
            ? {
                expiresAt: themePage.preview_expires_at,
                assetStatus: themePage.asset_approval_status as NonNullable<DemoMultiPageData["privatePreview"]>["assetStatus"],
              }
            : undefined,
          meta: {
            ...themePage.site_payload.meta,
            brandLogoUrl: logo?.sourceUrl ?? themePage.site_payload.meta.brandLogoUrl,
            artifact_admin: meta.artifact_admin,
          } as DemoMultiPageData["meta"],
        })))
      }

      const { data: company } = await sb
        .from(DB_TABLES.SALES_COMPANIES)
        .select("id, company_name, domain, slug, industry, prefecture, report_locale, tech_stack, pain_diagnosis, dify_result, visual_evidence, demo_site, meta")
        .eq("id", themePage.company_id)
        .maybeSingle()

      if (company) {
        const { fetchDiagnosticReport } = await import("./diagnostic")
        const { localeToRegion } = await import("./types")

        const locale = (company.report_locale ?? meta.locale ?? "ja") as string
        const region = localeToRegion(locale)
        let diagnostic = null
        try {
          diagnostic = await fetchDiagnosticReport({ slug: company.slug ?? themePage.slug, region, reportLocale: locale })
        } catch (diagErr) {
          console.error("[demo-generator] fetchDiagnosticReport threw:", diagErr instanceof Error ? diagErr.message : String(diagErr))
        }

        if (diagnostic) {
          const generated = buildPersonalizedDemoData(
            company as unknown as Parameters<typeof buildDemoMultiPageData>[0],
            diagnostic,
            selectTemplate(
              company as unknown as CompanyProfile,
              diagnostic,
            ),
          )
          return applyDemoAdminOverrides({
            ...generated,
            meta: { ...generated.meta, artifact_admin: meta.artifact_admin } as DemoMultiPageData["meta"],
          })
        }
      }
    }

    // Fallback: try direct sales_companies lookup
    const { data: companyBySlug } = await sb
      .from(DB_TABLES.SALES_COMPANIES)
      .select("id, company_name, domain, slug, industry, prefecture, report_locale, tech_stack, pain_diagnosis, dify_result, visual_evidence, demo_site, meta")
      .eq("slug", slug.replace(/-demo$/, ""))
      .maybeSingle()

    if (companyBySlug) {
      const { fetchDiagnosticReport } = await import("./diagnostic")
      const { localeToRegion } = await import("./types")

      const locale = (companyBySlug.report_locale ?? "ja") as string
      const region = localeToRegion(locale)
      let diagnostic = null
      try {
        diagnostic = await fetchDiagnosticReport({
          slug: companyBySlug.slug ?? slug.replace(/-demo$/, ""),
          region,
          reportLocale: locale,
        })
      } catch (diagErr) {
        console.error("[demo-generator] fetchDiagnosticReport (fallback) threw:", diagErr instanceof Error ? diagErr.message : String(diagErr))
      }

      if (diagnostic) {
        return buildPersonalizedDemoData(
          companyBySlug as unknown as Parameters<typeof buildDemoMultiPageData>[0],
          diagnostic,
          selectTemplate(
            companyBySlug as unknown as CompanyProfile,
            diagnostic,
          ),
        )
      }
    }

    // Last-resort fallback: build minimal multi-page data from theme_demo_pages meta
    if (themePage) {
      const meta = (themePage.meta ?? {}) as Record<string, unknown>
      const { data: company } = await sb
        .from(DB_TABLES.SALES_COMPANIES)
        .select("id, company_name, domain, slug, industry, prefecture, report_locale")
        .eq("id", themePage.company_id)
        .maybeSingle()

      const locale = ((company?.report_locale ?? meta.locale ?? "en") as string)
      const isJa = locale === "ja"
      const name = String(meta.companyName ?? company?.company_name ?? "Company")
      const accent = String(meta.accentColor ?? "#2563eb")
      const accentDark = String(meta.accentColorDark ?? "#1e40af")
      const ctaUrl = String(meta.calBookingUrl ?? "https://cal.com/paradigm-jp/15min")

      return applyDemoAdminOverrides({
        slug,
        companyId: String(themePage.company_id),
        companyName: name,
        locale: locale as import("./types").ReportLocale,
        industry: (meta.industry ?? company?.industry ?? "consulting") as import("./types").Industry,
        meta: {
          title: `${name} | ${isJa ? "Web改善デモサイト" : "Web Improvement Demo"}`,
          description: String(meta.description ?? ""),
          ogImage: "",
          industry: (meta.industry as import("./types").Industry) ?? "consulting",
          locale: locale as import("./types").ReportLocale,
          companyName: name,
          accentColor: accent,
          accentColorDark: accentDark,
          calBookingUrl: ctaUrl,
          generatedAt: String(meta.generatedAt ?? new Date().toISOString()),
          engine: "fallback",
          artifact_admin: meta.artifact_admin,
        } as DemoMultiPageData["meta"],
        pages: {
          home: {
            hero: {
              title: `${name} | Web Improvement Demo`,
              subtitle: isJa ? "御社データに基づく改善デモサイトです" : "Improvement demo based on your data",
              tagline: isJa ? "改善デモ" : "Improvement Demo",
              companyName: name,
              industryLabel: isJa ? "改善事例" : "Improvement Case",
              locationLabel: "",
              primaryCta: { text: isJa ? JAPAN_ENTRY_CTA_JA : JAPAN_ENTRY_CTA_EN, href: "https://paradigmjp.com/en/contact?intent=japan-entry" },
              secondaryCta: { text: isJa ? "改善ポイント" : "See improvements", href: "#features" },
              accentColor: accent,
              accentColorDark: accentDark,
            },
            features: [],
            stats: [],
            beforeAfter: [],
            totalLoss: "",
            cta: {
              title: isJa ? JAPAN_ENTRY_CTA_JA : JAPAN_ENTRY_CTA_EN,
              subtitle: "",
              buttonText: isJa ? JAPAN_ENTRY_CTA_JA : JAPAN_ENTRY_CTA_EN,
              buttonHref: "https://paradigmjp.com/en/contact?intent=japan-entry",
              accentColor: accent,
              accentColorDark: accentDark,
            },
          },
          about: {
            title: name,
            subtitle: isJa ? "事業概要" : "Business Overview",
            companyName: name,
            industryLabel: String(meta.industry ?? ""),
            locationLabel: "",
            story: isJa ? `${name}の事業概要です` : `Overview of ${name}`,
            mission: "",
            values: [],
            teamNote: "",
            accentColor: accent,
          },
          services: {
            title: isJa ? "サービス内容" : "Our Services",
            subtitle: "",
            services: [],
            process: [],
            accentColor: accent,
          },
          contact: {
            title: isJa ? "お問い合わせ" : "Contact Us",
            subtitle: "",
            companyName: name,
            email: "contact@paradigmjp.com",
            address: "Tokyo, Japan",
            calBookingUrl: ctaUrl,
            accentColor: accent,
          },
        },
      })
    }

    return null
  } catch (err) {
    console.error("[demo-generator] fetchDemoMultiPageData failed:", err instanceof Error ? err.message : String(err))
    if (err instanceof Error && err.stack) console.error("[demo-generator] stack:", err.stack.slice(0, 1000))
    return null
  }
}
