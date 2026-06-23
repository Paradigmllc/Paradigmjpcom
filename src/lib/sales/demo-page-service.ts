import { getServiceSalesSupabase } from "@/lib/supabase"
import { DB_TABLES } from "@/lib/sales/db-tables"
import { buildDemoPageData } from "./demo-page-builder"
import { buildDemoMultiPageData } from "./demo-multi-page-builder"
import type { DemoBlock, DemoGenerateOutput, DemoMultiPageData, DemoPageData } from "./demo-site-types"
import type { Industry, ReportLocale } from "./types"
import { selectTemplate, type CompanyProfile } from "./demo-template-selector"
import { buildPersonalizedDemoData } from "./demo-personalized-builder"
import type { DiagnosticReportData } from "./diagnostic"
import { getTemplateById } from "./demo-templates/registry"
import { enhanceDemoWithDeepSeek } from "./demo-deepseek-enhancer"

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
            primaryCta: { text: isJa ? "無料相談を予約" : "Book free consult", href: ctaUrl },
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
            title: isJa ? "無料相談を予約" : "Book free consult",
            subtitle: isJa ? "詳しくはお問い合わせください" : "Contact us for details",
            buttonText: isJa ? "15分無料相談を予約" : "Book 15min Free Consult",
            buttonHref: ctaUrl,
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

/**
 * Generate a full-stack Next.js demo site for a given company.
 * Saves to theme_demo_pages and updates the company's demo_site meta.
 * Returns the new demo URL in the format: demo.paradigmjp.com/[slug]
 */
export async function generateFullStackDemo(
  companyId: string,
  locale?: string,
  options?: { enhanceWithAI?: boolean },
): Promise<DemoGenerateOutput> {
  const sb = getServiceSalesSupabase()
  if (!sb) return { ok: false, demoUrl: null, slug: null, error: "Supabase service_role not configured" }

  const enhanceWithAI = options?.enhanceWithAI ?? true;

  try {
    // Fetch company
    const { data: company, error: companyError } = await sb
      .from(DB_TABLES.SALES_COMPANIES)
      .select("id, company_name, domain, slug, industry, prefecture, report_locale, tech_stack, pain_diagnosis, dify_result, visual_evidence, demo_site, meta")
      .eq("id", companyId)
      .maybeSingle()

    if (companyError || !company) {
      return { ok: false, demoUrl: null, slug: null, error: `Company not found: ${companyError?.message ?? "no rows"}` }
    }

    // Fetch diagnostic report
    const { fetchDiagnosticReport } = await import("./diagnostic")
    const { localeToRegion } = await import("./types")

    const effectiveLocale = locale ?? (company.report_locale ?? "ja")
    const region = localeToRegion(effectiveLocale)
    const diagnostic = await fetchDiagnosticReport({
      slug: company.slug ?? "",
      region,
      reportLocale: effectiveLocale,
    })

    if (!diagnostic) {
      return { ok: false, demoUrl: null, slug: null, error: "No diagnostic report found for this company" }
    }

    // Build page data with template selection + personalization
    const companyProfile: CompanyProfile = {
      industry: (company.industry ?? "consulting") as string,
      company_name: company.company_name,
      report_locale: effectiveLocale,
      tech_stack: company.tech_stack as Record<string, unknown> | null,
      meta: company.meta as Record<string, unknown> | null,
    }
    const template = selectTemplate(companyProfile, diagnostic)
    const pageData = buildPersonalizedDemoData(
      company as Record<string, unknown> as Parameters<typeof buildDemoMultiPageData>[0],
      diagnostic,
      template,
    )

    const slug = pageData.slug
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.ASTRO_DEMO_BASE_URL || "https://demo.paradigmjp.com"
    const cleanBase = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl
    const demoUrl = `${cleanBase}/${slug}`

    // Attempt AI enhancement via DeepSeek
    let enhancedPageData = pageData
    if (enhanceWithAI) {
      try {
        const aiOutput = await enhanceDemoWithDeepSeek(
          company as Record<string, unknown> as Parameters<typeof enhanceDemoWithDeepSeek>[0],
          diagnostic,
          template,
          effectiveLocale as ReportLocale,
        )
        if (aiOutput) {
          enhancedPageData = mergeDeepSeekOutput(pageData, aiOutput, effectiveLocale)
          console.warn(
            `[demo-generator] DeepSeek AI enhancement applied for ${slug}`,
          )
        }
      } catch (aiErr) {
        console.error(
          "[demo-generator] DeepSeek enhancement failed, using rules-based:",
          aiErr instanceof Error ? aiErr.message : String(aiErr),
        )
      }
    }

    // Save to theme_demo_pages — store full multi-page data
    const { error: upsertError } = await sb
      .from(DB_TABLES.THEME_DEMO_PAGES)
      .upsert({
        slug,
        theme: template.id,
        title: enhancedPageData.meta.title,
        blocks: enhancedPageData.pages as unknown as Record<string, unknown>[],
        meta: { ...enhancedPageData.meta, templateId: template.id } as unknown as Record<string, unknown>,
        company_id: companyId,
        is_published: true,
      }, { onConflict: "slug" })

    if (upsertError) {
      console.error("[demo-generator] generateFullStackDemo upsert failed:", upsertError.message)
      return { ok: false, demoUrl: null, slug: null, error: upsertError.message }
    }

    console.warn(`[demo-generator] full-stack demo saved: ${slug} → ${demoUrl} (engine=${enhancedPageData.meta.engine})`)

    // Update company demo_site meta
    try {
      const { error: metaError } = await sb.rpc("sales_atomic_meta_merge", {
        p_company_id: companyId,
        p_patch: {
          demo_site: {
            url: demoUrl,
            type: "nextjs_fullstack",
            slug,
            generated_at: new Date().toISOString(),
          },
        },
      })
      if (metaError) console.error("[demo-generator] generateFullStackDemo meta merge failed:", metaError.message)
    } catch (metaErr) {
      console.error("[demo-generator] generateFullStackDemo meta update failed:", metaErr)
    }

    // Also save to web_demos for compatibility
    try {
      await sb.from(DB_TABLES.WEB_DEMOS).upsert({
        company_id: companyId,
        slug,
        name: `${company.company_name} Full-Stack Demo`,
        html_content: JSON.stringify(enhancedPageData),
        source: "nextjs_fullstack",
        is_published: true,
        meta: {
          generator: "nextjs_fullstack",
          engine: enhancedPageData.meta.engine,
          demo_url: demoUrl,
          generated_at: new Date().toISOString(),
        },
      }, { onConflict: "slug" })
    } catch (e) {
      console.warn("[demo-generator] generateFullStackDemo web_demos save failed (non-critical):", e)
    }

    return { ok: true, demoUrl, slug }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("[demo-generator] generateFullStackDemo failed:", message)
    return { ok: false, demoUrl: null, slug: null, error: message }
  }
}

/**
 * Fetch multi-page demo data by slug. Reuses the same Supabase lookup
 * logic as fetchDemoPageData but returns DemoMultiPageData for the
 * multi-page website (Home/About/Services/Contact).
 */
export async function fetchDemoMultiPageData(slug: string): Promise<DemoMultiPageData | null> {
  const sb = getServiceSalesSupabase()
  if (!sb) {
    console.error("[demo-generator] fetchDemoMultiPageData: Supabase not configured")
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
          return buildPersonalizedDemoData(
            company as unknown as Parameters<typeof buildDemoMultiPageData>[0],
            diagnostic,
            selectTemplate(
              company as unknown as CompanyProfile,
              diagnostic,
            ),
          )
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

      return {
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
        },
        pages: {
          home: {
            hero: {
              title: `${name} | Web Improvement Demo`,
              subtitle: isJa ? "御社データに基づく改善デモサイトです" : "Improvement demo based on your data",
              tagline: isJa ? "改善デモ" : "Improvement Demo",
              companyName: name,
              industryLabel: isJa ? "改善事例" : "Improvement Case",
              locationLabel: "",
              primaryCta: { text: isJa ? "無料相談を予約" : "Book free consult", href: ctaUrl },
              secondaryCta: { text: isJa ? "改善ポイント" : "See improvements", href: "#features" },
              accentColor: accent,
              accentColorDark: accentDark,
            },
            features: [],
            stats: [],
            beforeAfter: [],
            totalLoss: "",
            cta: {
              title: isJa ? "無料相談を予約" : "Book free consult",
              subtitle: "",
              buttonText: isJa ? "15分無料相談を予約" : "Book 15min Free Consult",
              buttonHref: ctaUrl,
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
      }
    }

    return null
  } catch (err) {
    console.error("[demo-generator] fetchDemoMultiPageData failed:", err instanceof Error ? err.message : String(err))
    if (err instanceof Error && err.stack) console.error("[demo-generator] stack:", err.stack.slice(0, 1000))
    return null
  }
}

/**
 * Merge DeepSeek AI-enhanced output into the rules-based DemoMultiPageData.
 * AI copy takes priority for text content; rules-based structure is preserved.
 * This is a lightweight version of the merge in demo-personalized-builder.ts.
 */
function mergeDeepSeekOutput(
  base: DemoMultiPageData,
  ai: import("./demo-deepseek-enhancer").DeepSeekEnhancedOutput,
  effectiveLocale: string,
): DemoMultiPageData {
  const home = { ...base.pages.home };
  const about = { ...base.pages.about };
  const services = { ...base.pages.services };
  const contact = { ...base.pages.contact };

  // Home: hero title/subtitle
  if (ai.home.hero_title?.trim()) {
    home.hero = { ...home.hero, title: ai.home.hero_title };
  }
  if (ai.home.hero_subtitle?.trim()) {
    home.hero = { ...home.hero, subtitle: ai.home.hero_subtitle };
  }

  // Home: features (AI replaces rules-based if at least 2 AI features exist)
  if (ai.home.features && ai.home.features.length >= 2) {
    home.features = ai.home.features.map((f, i) => ({
      title: f.title || `Feature ${i + 1}`,
      description: f.description || "",
      icon: f.icon || "sparkles",
      metricLabel: f.metric_label || "",
      metricValue: f.metric_value || "",
      metricBench: "",
      severity: "info" as const,
    }));
  }

  // Home: testimonials (AI augments existing)
  if (ai.home.testimonials && ai.home.testimonials.length > 0) {
    const aiTestimonials = ai.home.testimonials.map((t, i) => ({
      id: `ai-testimonial-${i}`,
      quote: t.quote || "",
      author: t.author || "",
      role: "",
      avatarInitials: (t.author || "A").charAt(0).toUpperCase(),
    }));
    home.testimonials = [...(home.testimonials ?? []), ...aiTestimonials];
  }

  // Home: FAQ (AI replaces rules-based if at least 2 exist)
  if (ai.home.faq && ai.home.faq.length >= 2) {
    home.faq = ai.home.faq.map((f, i) => ({
      id: `ai-faq-${i}`,
      question: f.q || "",
      answer: f.a || "",
    }));
  }

  // About: story, mission, values
  if (ai.about.story?.trim()) about.story = ai.about.story;
  if (ai.about.mission?.trim()) about.mission = ai.about.mission;
  if (ai.about.values && ai.about.values.length >= 2) {
    about.values = ai.about.values.map((v) => ({
      title: v.title || "",
      description: v.description || "",
      icon: v.icon || "star",
    }));
  }

  // Services: intro, services list, process
  if (ai.services.intro?.trim()) services.subtitle = ai.services.intro;
  if (ai.services.services && ai.services.services.length >= 1) {
    services.services = ai.services.services.map((s) => ({
      title: s.title || "",
      description: s.description || "",
      icon: s.icon || "sparkles",
      features: s.features?.filter(Boolean) ?? [],
      priceNote: effectiveLocale === "ja" ? "お見積り無料" : "Free estimate",
    }));
  }
  if (ai.services.process && ai.services.process.length >= 2) {
    services.process = ai.services.process.map((p) => ({
      step: p.step || 1,
      title: p.title || "",
      description: p.description || "",
    }));
  }

  // Contact: intro, form note
  if (ai.contact.intro?.trim()) contact.subtitle = ai.contact.intro;
  if (ai.contact.form_note?.trim()) contact.formNote = ai.contact.form_note;

  return {
    ...base,
    meta: {
      ...base.meta,
      engine: "deepseek",
      generatedAt: ai.generatedAt,
    },
    pages: { home, about, services, contact },
  };
}
