"use client"
import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { BorderBeam } from "@/components/magicui/border-beam"
import type { SectionProps } from "./_types"

/**
 * Remotion video embed section.
 *
 * 動画は Pipeline 3 (パーソナライズ営業資料) で生成され diagnostic_videos
 * テーブルに保存される。lead_id でクエリし、status="ready" な動画を埋込み。
 * 未生成 / 生成中の場合は placeholder + auto-trigger ボタンを出す。
 */
export default function RemotionVideo({ data, theme, t }: SectionProps) {
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "queued" | "rendering" | "failed">("loading")
  const [duration, setDuration] = useState(60)

  useEffect(() => {
    if (!data.id) { setStatus("idle"); return }
    fetch("/api/sales-automation", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "get_diagnostic_video", prospect_id: data.id }),
    }).then(r => r.json()).then(d => {
      if (d.video_url && d.status === "ready") {
        setVideoUrl(d.video_url)
        setStatus("ready")
        if (d.duration_sec) setDuration(d.duration_sec)
      } else if (d.status === "queued" || d.status === "rendering") {
        setStatus(d.status)
      } else {
        setStatus("idle")
      }
    }).catch(() => setStatus("idle"))
  }, [data.id])

  if (status === "loading") return null

  return (
    <section id="video" style={{ padding: "72px 24px", background: theme.bgAlt }}>
      <div style={{ maxWidth: 920, margin: "0 auto" }}>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          style={{ textAlign: "center", marginBottom: 32 }}
        >
          <span style={{
            display: "inline-block", padding: "4px 10px", borderRadius: 999,
            background: theme.accentSoft, color: theme.accent,
            fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 16,
          }}>
            {t("video.label")}
          </span>
          <h2 style={{
            fontSize: "clamp(24px, 4vw, 36px)", fontWeight: 800,
            letterSpacing: "-0.02em", margin: "0 0 12px", color: theme.text,
          }}>
            {t("video.title")}
          </h2>
          <p style={{ fontSize: 15, color: theme.textMuted, maxWidth: 520, margin: "0 auto" }}>
            {t("video.subtitle")} · {t("video.duration", { seconds: duration })}
          </p>
        </motion.div>

        {/* 動画 or placeholder */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          style={{
            position: "relative",
            aspectRatio: "16 / 9",
            background: theme.surface,
            border: `1px solid ${theme.border}`,
            borderRadius: theme.radiusCard,
            overflow: "hidden",
            boxShadow: theme.shadow,
          }}
        >
          {status === "ready" && videoUrl ? (
            <video
              src={videoUrl}
              controls
              playsInline
              poster={`${videoUrl.replace(/\.(mp4|webm)$/, ".jpg")}`}
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
          ) : (
            <div style={{
              position: "absolute", inset: 0,
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              gap: 12, padding: 24,
            }}>
              <BorderBeam size={200} duration={8} colorFrom={theme.accent} colorTo={theme.warn} />
              <div style={{
                width: 64, height: 64, borderRadius: "50%",
                background: theme.accentSoft, color: theme.accent,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 32,
              }}>
                {status === "queued" || status === "rendering" ? "⏳" : "🎬"}
              </div>
              <div style={{ fontSize: 14, color: theme.textMuted, textAlign: "center", maxWidth: 400 }}>
                {t("video.not_ready")}
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </section>
  )
}
