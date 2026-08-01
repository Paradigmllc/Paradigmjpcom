import type { Metadata } from "next"
import { notFound } from "next/navigation"
import PageHero from "@/components/PageHero"
import RichCtaBand from "@/components/aesop/RichCtaBand"
import { pageAlternates } from "@/lib/page-metadata"
import VideoServiceOperations from "./VideoServiceOperations"
import VideoServicePricing from "./VideoServicePricing"

interface Props {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params

  if (locale === "ja") {
    return {
      title: "Video as a Service | 月額制・継続型動画制作",
      description:
        "月額1,500ドルから。広告、SNS、プロダクトデモ、説明動画、モーション、日英ローカライズを、明確な制作キューと同時進行枠で継続納品します。",
      alternates: pageAlternates("ja", "/video-as-a-service"),
    }
  }

  if (locale === "en") {
    return {
      title: "Video Production Subscription | Video as a Service",
      description:
        "Monthly video production from $1,500. Queue ads, social video, demos, explainers, motion graphics, and EN/JA localization with clear active-production capacity.",
      alternates: pageAlternates("en", "/video-as-a-service"),
    }
  }

  return {}
}

export default async function VideoAsAServicePage({ params }: Props) {
  const { locale } = await params
  if (locale !== "ja" && locale !== "en") notFound()
  const isJa = locale === "ja"

  return (
    <>
      <PageHero
        badge="VIDEO AS A SERVICE"
        title={
          isJa
            ? "動画制作チームを、採用せずに。"
            : "Your on-demand video production team."
        }
        highlight={isJa ? "採用せずに" : "on-demand"}
        desc={
          isJa
            ? "広告、SNS、デモ、説明動画、モーション、日英ローカライズまで。依頼をキューへ追加し、月額固定の外部制作チームとして継続的に納品します。"
            : "Queue ads, social content, demos, explainers, motion graphics, and EN/JA localization. Paradigm provides recurring production capacity through one clear monthly workflow."
        }
        asideText={
          isJa
            ? "すべての標準依頼は、ブリーフと必要素材が揃いReadyになってから原則2営業日以内に着手します。"
            : "Standard requests normally begin within two business days after the complete brief and assets make the request Ready."
        }
        asideCta={{
          label: isJa
            ? "Unlimitedに申し込む — $3,500"
            : "Apply for Unlimited — $3,500",
          href: "/contact?intent=video-as-a-service&plan=unlimited",
        }}
      />

      <VideoServicePricing locale={locale} />
      <VideoServiceOperations locale={locale} />

      <RichCtaBand
        eyebrow="START WITH A CLEAR PLAN"
        title={
          isJa
            ? "最初の依頼を決めて、制作キューを開始する。"
            : "Define the first request and start the production queue."
        }
        highlight={isJa ? "制作キュー" : "production queue"}
        desc={
          isJa
            ? "会社情報、月間需要、素材状況、希望プラン、最初に作りたい動画を送信してください。原則1営業日以内に適合可否と次の手順を回答します。"
            : "Share your company, monthly demand, asset readiness, preferred plan, and first video. We normally respond with fit and next steps within one business day."
        }
        buttonLabel={
          isJa
            ? "Unlimitedに申し込む — $3,500"
            : "Apply for Unlimited — $3,500"
        }
        buttonHref="/contact?intent=video-as-a-service&plan=unlimited"
        bullets={
          isJa
            ? [
                "月額・前払い",
                "Ready後2営業日以内に着手",
                "Service Orderで範囲を確定",
              ]
            : [
                "Monthly and prepaid",
                "Ready requests start within two business days",
                "Scope fixed in a Service Order",
              ]
        }
        analyticsSource="video-as-a-service"
      />
    </>
  )
}
