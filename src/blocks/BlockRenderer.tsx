/**
 * BlockRenderer.tsx — Pages collection layout の dispatcher (Aesop voice)
 *
 * 役割:
 *   payload.find({ collection: "pages" }) 結果の `layout` (Block array) を
 *   block の slug ごとに該当 React component に dispatch して render する。
 *
 * 永久ルール: 新 Block 追加 = src/blocks/{NewBlock}.ts (config) +
 *            ここに block.slug → render 関数 を 1 行追加 のみで完結
 *
 * P18-D-3 followup rewrite: 全 block を Aesop tokens (paradigm-paper /
 * paper-deep / ink) + font-display + paradigm-eyebrow + hairline borders
 * へ書き換え。violet/indigo gradients を排除して brand 統一。
 */

import BlockRendererHero from "./BlockRendererHero"
import { SectionRender, CTARender, FAQRender, RichTextRender, SplitContentRender } from "./BlockRendererContent"
import { VideoRender, MarqueeRender, LogoCloudRender } from "./BlockRendererMedia"
import { CardGridRender, StatsRender, TestimonialsRender, ProcessRender, PricingRender, TimelineRender, ComparisonRender } from "./BlockRendererCards"

interface AnyBlock {
  blockType: string
  id?: string
  [key: string]: unknown
}

const RENDERERS: Record<string, (b: AnyBlock) => React.ReactNode> = {
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
        const Render = RENDERERS[b.blockType]
        if (!Render) {
          if (process.env.NODE_ENV !== "production") {
            return (
              <div key={i} className="p-4 paradigm-eyebrow text-paradigm-accent bg-paradigm-paper-deep border-b border-paradigm-line">
                Unknown block: {b.blockType}
              </div>
            )
          }
          return null
        }
        return <div key={(b.id as string) ?? i}>{Render(b)}</div>
      })}
    </>
  )
}
