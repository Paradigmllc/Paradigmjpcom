/**
 * proposal/sections/_registry.ts — SectionId → component mapping
 *
 * 永久ルール: 新セクション追加 = ファイル作成 + ここに 1 行追加
 *   業種知識・region 知識を持たない component が条件。
 */
import type { ComponentType } from "react"
import type { SectionId } from "@/lib/proposal/manifest"
import type { SectionProps } from "./_types"

import Nav from "./Nav"
import Hero from "./Hero"
import KpiCards from "./KpiCards"
import Diagnosis from "./Diagnosis"
import Pain from "./Pain"
import RemotionVideo from "./RemotionVideo"
import Demo from "./Demo"
import Reciprocity from "./Reciprocity"
import MarketTrend from "./MarketTrend"
import CaseStudies from "./CaseStudies"
import WhyUs from "./WhyUs"
import Cta from "./Cta"
import Footer from "./Footer"

export const SECTION_REGISTRY: Record<SectionId, ComponentType<SectionProps> | null> = {
  "nav": Nav,
  "hero": Hero,
  "kpi-cards": KpiCards,
  "diagnosis": Diagnosis,
  "pain": Pain,
  "remotion-video": RemotionVideo,
  "demo": Demo,
  "reciprocity": Reciprocity,
  "market-trend": MarketTrend,
  "case-studies": CaseStudies,
  "why-us": WhyUs,
  "faq": null, // 未実装 (将来)
  "cta": Cta,
  "footer": Footer,
}

export function resolveSection(id: SectionId): ComponentType<SectionProps> | null {
  return SECTION_REGISTRY[id] ?? null
}
