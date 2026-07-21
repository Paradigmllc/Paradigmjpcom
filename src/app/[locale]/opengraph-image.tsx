/**
 * /[locale]/opengraph-image.tsx — locale-aware OG image
 *
 * Each /[locale] route gets its own OG image generated at build/runtime via
 * the Vercel OG ImageResponse. Tagline and service names switch per locale.
 *
 * Generated URL examples:
 *   /ja/opengraph-image — JP tagline, JP service names
 *   /en/opengraph-image — English tagline, English service names
 *   /ko, /zh, /de, ... — locale-specific copy with English fallback
 */

import { ImageResponse } from "next/og"

export const runtime = "edge"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

// `alt` is read by Next.js at build time for og:image:alt, so we keep it
// brand-neutral here. (For per-locale alt strings, they're emitted via the
// generateImageMetadata pattern — out of scope for this fast-fix.)
export const alt = "Paradigm — digital growth partner"

interface CopyBundle {
  brand: string
  tagline: string
  services: string[]
}

const COPY: Record<string, CopyBundle> = {
  ja: {
    brand: "Paradigm",
    tagline: "デジタルで、事業を加速する。",
    services: ["Web制作", "MEO対策", "SEO/GEO", "AI導入"],
  },
  en: {
    brand: "Paradigm",
    tagline: "Launch in Japan. Move this month.",
    services: [
      "$13K fixed",
      "14-business-day delivery guarantee",
      "6 months included for selected launch partners",
      "selected partners · continuation terms agreed separately",
    ],
  },
  ko: {
    brand: "Paradigm",
    tagline: "디지털로, 비즈니스를 가속화합니다.",
    services: ["웹 제작", "MEO", "SEO / GEO", "AI"],
  },
  zh: {
    brand: "Paradigm",
    tagline: "数字化加速业务增长。",
    services: ["建站", "MEO", "SEO / GEO", "AI"],
  },
  de: {
    brand: "Paradigm",
    tagline: "Digitales Wachstum, gemeinsam.",
    services: ["Web", "MEO", "SEO / GEO", "AI"],
  },
  fr: {
    brand: "Paradigm",
    tagline: "Votre partenaire de croissance digitale.",
    services: ["Web", "MEO", "SEO / GEO", "AI"],
  },
  es: {
    brand: "Paradigm",
    tagline: "Tu socio de crecimiento digital.",
    services: ["Web", "MEO", "SEO / GEO", "AI"],
  },
  pt: {
    brand: "Paradigm",
    tagline: "Seu parceiro de crescimento digital.",
    services: ["Web", "MEO", "SEO / GEO", "AI"],
  },
  ru: {
    brand: "Paradigm",
    tagline: "Цифровой партнёр для роста бизнеса.",
    services: ["Web", "MEO", "SEO / GEO", "AI"],
  },
  ar: {
    brand: "Paradigm",
    tagline: "شريكك للنمو الرقمي.",
    services: ["الويب", "MEO", "SEO / GEO", "AI"],
  },
  vi: {
    brand: "Paradigm",
    tagline: "Đối tác tăng trưởng số của bạn.",
    services: ["Web", "MEO", "SEO / GEO", "AI"],
  },
  id: {
    brand: "Paradigm",
    tagline: "Mitra pertumbuhan digital Anda.",
    services: ["Web", "MEO", "SEO / GEO", "AI"],
  },
}

export default async function Image({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const copy: CopyBundle = locale === "ja" ? COPY.ja : COPY.en

  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "sans-serif",
        }}
      >
        {/* Logo + brand */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            marginBottom: "40px",
          }}
        >
          <div
            style={{
              width: "64px",
              height: "64px",
              borderRadius: "16px",
              background: "linear-gradient(135deg, #4f46e5, #818cf8)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontSize: "32px",
              fontWeight: 800,
            }}
          >
            P
          </div>
          <span style={{ color: "white", fontSize: "36px", fontWeight: 700 }}>
            {copy.brand}
          </span>
        </div>

        {/* Locale-specific tagline */}
        <div
          style={{
            color: "white",
            fontSize: "56px",
            fontWeight: 800,
            textAlign: "center",
            lineHeight: 1.3,
            marginBottom: "24px",
            paddingLeft: "40px",
            paddingRight: "40px",
          }}
        >
          {copy.tagline}
        </div>

        {/* Locale-specific service names */}
        <div
          style={{
            display: "flex",
            gap: "16px",
            color: "#a5b4fc",
            fontSize: "20px",
          }}
        >
          {copy.services.map((s, i) => (
            <span key={s} style={{ display: "flex", gap: "16px" }}>
              <span>{s}</span>
              {i < copy.services.length - 1 && <span>·</span>}
            </span>
          ))}
        </div>

        {/* URL */}
        <div
          style={{
            position: "absolute",
            bottom: "32px",
            color: "#64748b",
            fontSize: "18px",
          }}
        >
          paradigmjp.com
        </div>
      </div>
    ),
    { ...size }
  )
}
