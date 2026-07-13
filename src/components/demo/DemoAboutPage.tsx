"use client"

import { motion } from "framer-motion"
import type { DemoAboutPage as DemoAboutPageData } from "@/lib/sales/demo-site-types"
import type { DemoTemplate, AboutSectionId } from "@/lib/sales/demo-templates/registry"
import { headingSizeClass } from "@/lib/sales/demo-templates/registry"
import { StoryDefault, MissionBold, ValuesGrid, TeamNote } from "./about/AboutVariants"

interface Props {
  about: DemoAboutPageData
  companyName: string
  locale: string
  template?: DemoTemplate
}

export function DemoAboutPage({ about, companyName: _companyName, locale, template }: Props) {
  const isJa = locale === "ja"
  const accent = about.accentColor || "#2563eb"
  const layout = template?.layout.about

  const renderSection = (sectionId: AboutSectionId) => {
    switch (sectionId) {
      case "hero":
        return <AboutHero about={about} isJa={isJa} accent={accent} template={template?.designTokens} />
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
  about, isJa, accent, template,
}: { about: DemoAboutPageData; isJa: boolean; accent: string; template?: DemoTemplate["designTokens"] }) {
  const size = headingSizeClass(template?.typography.scale ?? "normal")
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-gray-50 via-white to-blue-50/50 px-4 pb-16 pt-20 sm:px-6 lg:px-8">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] bg-[size:64px_64px]" />
      <div className="relative mx-auto max-w-4xl text-center">
        <motion.h1
          className={`font-display ${size.h1} ${template?.typography.headingWeight ?? "font-extrabold"} tracking-tight text-gray-900`}
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          {about.title}
        </motion.h1>
        <motion.p
          className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-gray-500 sm:text-xl"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
          {about.subtitle}
        </motion.p>
        <motion.div
          className="mt-6 flex items-center justify-center gap-3 text-sm text-gray-400"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4, delay: 0.2 }}>
          <span className="font-semibold text-gray-700">{about.companyName}</span>
          <span className="text-gray-300">•</span>
          <span>{about.industryLabel}</span>
          <span className="text-gray-300">•</span>
          <span>{about.locationLabel}</span>
        </motion.div>
      </div>
    </section>
  )
}
