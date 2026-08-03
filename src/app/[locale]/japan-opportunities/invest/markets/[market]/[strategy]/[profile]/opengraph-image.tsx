import { ImageResponse } from "next/og"
import { getInvestorScenarioByPath } from "@/lib/investor-scenarios/repository"

export const alt = "Paradigm Greater Tokyo investment scenario"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

interface Props { params: Promise<{ market: string; strategy: string; profile: string }> }

const palettes = [
  ["#0b3b37", "#17a589", "#d7fff4"],
  ["#132a4a", "#4f8cff", "#e1edff"],
  ["#3b203f", "#b969c7", "#f8e3ff"],
  ["#42280e", "#e39a32", "#fff0d2"],
] as const

function paletteFor(value: string) {
  const index = [...value].reduce((total, character) => total + character.charCodeAt(0), 0) % palettes.length
  return palettes[index] ?? palettes[0]
}

export default async function InvestorScenarioOpenGraphImage({ params }: Props) {
  const { market, strategy, profile } = await params
  let scenario: Awaited<ReturnType<typeof getInvestorScenarioByPath>> = null
  try {
    scenario = await getInvestorScenarioByPath(market, strategy, profile)
  } catch (error: unknown) {
    console.error("[investor-scenario-og] Scenario lookup failed; rendering the path fallback.", error)
  }
  const title = scenario?.title ?? `${market} ${strategy} ${profile}`.replaceAll("-", " ")
  const summary = scenario?.summary ?? "Evidence-led Greater Tokyo real estate investment decision support."
  const marketLabel = scenario?.preview.marketLabel ?? market.replaceAll("-", " ")
  const strategyLabel = scenario?.preview.strategyLabel ?? strategy.replaceAll("-", " ")
  const profileLabel = scenario?.preview.investorProfileLabel ?? profile.replaceAll("-", " ")
  const [background, accent, tint] = paletteFor(`${market}:${strategy}:${profile}`)

  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", color: "#fff", background: `linear-gradient(135deg, ${background} 0%, #07131f 75%)`, padding: "58px 64px", fontFamily: "Arial, sans-serif", position: "relative", overflow: "hidden" }}>
      <div style={{ display: "flex", position: "absolute", width: 430, height: 430, border: `1px solid ${accent}`, borderRadius: 215, right: -100, top: -160, opacity: 0.45 }} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}><div style={{ display: "flex", width: 15, height: 15, borderRadius: 8, background: accent }} /><div style={{ display: "flex", fontSize: 24, fontWeight: 700, letterSpacing: "0.08em" }}>PARADIGM · TOKYO DECISION ATLAS</div></div>
        <div style={{ display: "flex", color: tint, fontSize: 19, padding: "10px 18px", border: `1px solid ${accent}`, borderRadius: 999 }}>{marketLabel}</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", width: 1000, gap: 22 }}>
        <div style={{ display: "flex", color: accent, fontSize: 22, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>{strategyLabel} × {profileLabel}</div>
        <div style={{ display: "flex", fontSize: title.length > 74 ? 48 : 56, fontWeight: 800, lineHeight: 1.06, letterSpacing: "-0.035em" }}>{title}</div>
        <div style={{ display: "flex", color: "#dbe6ed", fontSize: 23, lineHeight: 1.35, maxWidth: 980 }}>{summary.length > 190 ? `${summary.slice(0, 187)}…` : summary}</div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", color: "#c2d0d9", fontSize: 20 }}><div style={{ display: "flex" }}>Official evidence · linked stress · decision gates</div><div style={{ display: "flex", color: tint, fontWeight: 700 }}>paradigmjp.com</div></div>
    </div>,
    size,
  )
}
