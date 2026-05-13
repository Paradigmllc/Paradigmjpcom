/**
 * /[locale]/report/[slug]/video — 診断動画 HTML プレビュー (Sprint 14)
 *
 * 役割: HyperFrames MP4 サーバー未構築時の代替. 5 scene (60s) を CSS animation で
 *       auto-play する HTML 動画。顧客に送る URL は MP4 と同じ価値 (URL 共有完結).
 *
 * 後段: HyperFrames API or Remotion lambda が構築されたら本ページの content を
 *       <video src={mp4_url} autoplay /> に置き換える.
 *
 * AE-PHP-4 準拠.
 */

import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { fetchDiagnosticReport } from "@/lib/sales/diagnostic"
import {
  generateNarrationScript,
  type NarrationScript,
} from "@/lib/sales/video-generator"
import VideoPlayer from "@/components/diagnostic/VideoPlayer"
import { localeToRegion } from "@/lib/sales/types"

export const dynamic = "force-dynamic"
export const revalidate = 300 // 5 min cache (narration DeepSeek call は重い)

interface Props {
  params: Promise<{ locale: string; slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  return {
    title: "Paradigm Web診断レポート (動画版)",
    description: "御社サイトの 60 秒診断動画",
    robots: {
      index: false,
      follow: false,
      nocache: true,
      googleBot: { index: false, follow: false },
    },
    alternates: { canonical: `/report/${slug}/video` },
  }
}

/** narration がエラーになっても再生できるよう fallback を用意 */
function fallbackScript(data: {
  company_name: string
  hook: string
  total_loss: string
  acts: { headline: string; body: string }[]
  cta_text: string
}): NarrationScript {
  return {
    hook: data.hook.split("\n")[0].slice(0, 40),
    pain: data.acts[0]?.body?.slice(0, 90) ?? "サイト速度の課題を検出しました",
    fear: data.acts[1]?.body?.slice(0, 90) ?? "離脱率が業界平均より高くなっています",
    hope: `月間 ${data.total_loss} の機会損失。改善案を準備しています。`,
    cta: `${data.company_name} 様、30 分の無料診断ミーティングはいかがでしょうか。`,
  }
}

export default async function ReportVideoPage({ params }: Props) {
  const { locale, slug } = await params
  const region = localeToRegion(locale) // Sprint 16: jp / global 分離
  const data = await fetchDiagnosticReport({ slug, region })
  if (!data) notFound()

  // narration 生成 (DeepSeek V4 PRO・失敗時 fallback)
  const narration = await generateNarrationScript(data)
  const script = narration.ok && narration.script ? narration.script : fallbackScript(data)

  return <VideoPlayer data={data} script={script} trackingSlug={slug} />
}
