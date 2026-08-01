"use client"

import BlockRendererHero from "./BlockRendererHero"
import { SectionRender, CTARender, FAQRender, RichTextRender, SplitContentRender } from "./BlockRendererContent"
import { VideoRender, MarqueeRender, LogoCloudRender } from "./BlockRendererMedia"
import { CardGridRender, StatsRender, TestimonialsRender, ProcessRender, PricingRender, TimelineRender, ComparisonRender } from "./BlockRendererCards"

interface AnyBlock {
  blockType: string
  id?: string
  [key: string]: unknown
}

const RENDERERS: Record<string, React.ComponentType<{ block: AnyBlock }>> = {
  hero: BlockRendererHero,
  section: SectionRender,
  "card-grid": CardGridRender,
  cta: CTARender,
  faq: FAQRender,
  "rich-text": RichTextRender,
  stats: StatsRender,
  testimonials: TestimonialsRender,
  process: ProcessRender,
  marquee: MarqueeRender,
  pricing: PricingRender,
  "logo-cloud": LogoCloudRender,
  video: VideoRender,
  "split-content": SplitContentRender,
  timeline: TimelineRender,
  comparison: ComparisonRender,
}

export default function BlockRenderer({ blocks }: { blocks: AnyBlock[] }) {
  return (
    <>
      {blocks.map((b, i) => {
        const RenderComp = RENDERERS[b.blockType]
        if (!RenderComp) return null
        return <RenderComp key={b.id ?? i} block={b} />
      })}
    </>
  )
}
