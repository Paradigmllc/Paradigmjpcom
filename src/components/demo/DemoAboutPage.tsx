"use client"

import { motion } from "framer-motion"
import Image from "next/image"
import type { DemoAboutPage as DemoAboutPageData, DemoPremiumMedia } from "@/lib/sales/demo-site-types"
import type { DemoTemplate, AboutSectionId } from "@/lib/sales/demo-templates/registry"
import { headingSizeClass } from "@/lib/sales/demo-templates/registry"
import { StoryDefault, MissionBold, ValuesGrid, TeamNote } from "./about/AboutVariants"

interface Props {
  about: DemoAboutPageData
  companyName: string
  locale: string
  template?: DemoTemplate
  media?: DemoPremiumMedia
}

export function DemoAboutPage({ about, companyName: _companyName, locale, template, media }: Props) {
  const isJa = locale === "ja"
  const accent = about.accentColor || "#2563eb"
  const layout = template?.layout.about

  const renderSection = (sectionId: AboutSectionId) => {
    switch (sectionId) {
      case "hero":
        return <AboutHero about={about} isJa={isJa} accent={accent} template={template?.designTokens} media={media} />
      case "story":
        return <StoryDefault about={about} isJa={isJa} accent={accent} template={template?.designTokens} />
      case "mission":
        return <MissionBold about={about} isJa={isJa} accent={accent} template={template?.designTokens} />
      case "values":
        return <ValuesGrid about={about} isJa={isJa} accent={accent} template={template?.designTokens} />
      case "team":
        return <TeamNote about={about} isJa={isJa} accent={accent} />
      case "timeline":
        return null
      default:
        return null
    }
  }

  return (
    <div className="[--page-accent:var(--about-accent)]" style={{ "--about-accent": accent } as React.CSSProperties}>
      {(layout?.sections ?? defaultAboutSections).map((sectionId) => (
        <div key={sectionId}>
          {renderSection(sectionId)}
        </div>
      ))}
    </div>
  )
}

const defaultAboutSections: AboutSectionId[] = ["hero", "story", "mission", "values"]

/* ──────────── About Hero ──────────── */

function AboutHero({
  about, isJa, accent, template, media,
}: { about: DemoAboutPageData; isJa: boolean; accent: string; template?: DemoTemplate["designTokens"]; media?: DemoPremiumMedia }) {
  const size = headingSizeClass(template?.typography.scale ?? "normal")
  return (
    <section className={`relative overflow-hidden px-4 pb-20 pt-24 sm:px-6 sm:pb-24 sm:pt-28 lg:px-8 ${media ? "min-h-[520px] bg-[#251914] text-white" : "bg-gradient-to-br from-gray-50 via-white to-blue-50/50"}`}>
      {media?.kind === "image" && <Image src={media.src} alt={media.alt} fill priority sizes="100vw" className="object-cover" style={{ objectPosition: media.objectPosition ?? "center" }} />}
      {media?.kind === "video" && <video src={media.src} autoPlay muted loop playsInline className="absolute inset-0 h-full w-full object-cover" aria-label={media.alt} />}
      {media && <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/45 to-black/15" />}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] bg-[size:64px_64px]" />
      <div className={`relative mx-auto max-w-5xl ${media ? "pt-20 text-left sm:pt-28" : "text-center"}`}>
        <motion.h1
          className={`font-premium-serif ${media ? "max-w-3xl text-white" : "text-gray-900"} ${size.h1} ${template?.typography.headingWeight ?? "font-extrabold"} tracking-tight`}
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          {about.title}
        </motion.h1>
        <motion.p
          className={`${media ? "mr-auto text-white/75" : "mx-auto text-gray-500"} mt-6 max-w-2xl text-lg leading-relaxed sm:text-xl`}
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
          {about.subtitle}
        </motion.p>
        <motion.div
          className={`mt-6 flex items-center gap-3 text-sm ${media ? "justify-start text-white/55" : "justify-center text-gray-400"}`}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4, delay: 0.2 }}>
          <span className={`font-semibold ${media ? "text-white" : "text-gray-700"}`}>{about.companyName}</span>
          <span className="text-gray-300">•</span>
          <span>{about.industryLabel}</span>
          <span className="text-gray-300">•</span>
          <span>{about.locationLabel}</span>
        </motion.div>
      </div>
    </section>
  )
}
