import { ImageResponse } from "next/og"
import { getInvestorBrief } from "@/lib/investor-briefs/repository"

export const alt = "Paradigm Japan investor decision brief"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

interface Props {
  params: Promise<{ locale: string; slug: string }>
}

const palettes = [
  ["#0b3b37", "#17a589", "#d7fff4"],
  ["#132a4a", "#4f8cff", "#e1edff"],
  ["#3b203f", "#b969c7", "#f8e3ff"],
  ["#42280e", "#e39a32", "#fff0d2"],
] as const

function paletteFor(slug: string) {
  const index = [...slug].reduce((total, character) => total + character.charCodeAt(0), 0) % palettes.length
  return palettes[index] ?? palettes[0]
}

export default async function InvestorBriefOpenGraphImage({ params }: Props) {
  const { slug } = await params
  let brief: Awaited<ReturnType<typeof getInvestorBrief>> = null
  try {
    brief = await getInvestorBrief(slug)
  } catch (error: unknown) {
    console.error("[investor-brief-og] Brief lookup failed; rendering the slug fallback.", error)
  }
  const title = brief?.title ?? slug.split("-").map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`).join(" ")
  const summary = brief?.summary ?? "Evidence-led market intelligence for investing and operating in Japan."
  const category = brief?.preview.category ?? "Japan investment"
  const region = brief?.preview.region ?? "Japan"
  const sourceCount = brief?.payload.sources.length ?? 0
  const [background, accent, tint] = paletteFor(slug)

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          color: "#ffffff",
          background: `linear-gradient(135deg, ${background} 0%, #07131f 72%)`,
          padding: "58px 64px",
          fontFamily: "Arial, sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            position: "absolute",
            width: 420,
            height: 420,
            border: `1px solid ${accent}`,
            borderRadius: 210,
            right: -90,
            top: -150,
            opacity: 0.42,
          }}
        />
        <div
          style={{
            display: "flex",
            position: "absolute",
            width: 260,
            height: 260,
            background: accent,
            borderRadius: 130,
            right: -70,
            bottom: -145,
            opacity: 0.18,
          }}
        />

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ display: "flex", width: 15, height: 15, borderRadius: 8, background: accent }} />
            <div style={{ display: "flex", fontSize: 24, fontWeight: 700, letterSpacing: "0.08em" }}>
              PARADIGM · JAPAN INTELLIGENCE
            </div>
          </div>
          <div
            style={{
              display: "flex",
              color: tint,
              fontSize: 20,
              padding: "10px 18px",
              border: `1px solid ${accent}`,
              borderRadius: 999,
            }}
          >
            {region}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", width: 970, gap: 22 }}>
          <div style={{ display: "flex", color: accent, fontSize: 23, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em" }}>
            {category} · Decision brief
          </div>
          <div style={{ display: "flex", fontSize: title.length > 68 ? 50 : 58, fontWeight: 800, lineHeight: 1.06, letterSpacing: "-0.035em" }}>
            {title}
          </div>
          <div style={{ display: "flex", color: "#dbe6ed", fontSize: 24, lineHeight: 1.35, maxWidth: 980 }}>
            {summary.length > 190 ? `${summary.slice(0, 187)}…` : summary}
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "#c2d0d9", fontSize: 20 }}>
          <div style={{ display: "flex" }}>Evidence → risks → decision gates → execution</div>
          <div style={{ display: "flex", color: tint, fontWeight: 700 }}>
            {sourceCount > 0 ? `${sourceCount} primary sources · ` : ""}paradigmjp.com
          </div>
        </div>
      </div>
    ),
    size,
  )
}
