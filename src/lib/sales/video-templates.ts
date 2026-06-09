/**
 * Executive diagnostic video composition for report embeds and MP4 rendering.
 *
 * The report video must feel like a client-ready sales asset, not a toy demo:
 * one message per scene, sourced evidence, restrained motion, and readable type.
 */
import type { DiagnosticAct, DiagnosticReportData } from "./diagnostic"

interface VideoTheme {
  bg: string
  panel: string
  panelSoft: string
  ink: string
  muted: string
  accent: string
  accentSoft: string
  danger: string
  rule: string
  grid: string
}

interface VideoScript {
  hook: string
  pain: string
  fear: string
  hope: string
  cta: string
}

const CORRUPT_TEXT = /邵ｺ|郢|隴|髫|陞|鬮|陟|騾|闔|髯|陋|隲|陷|繝|縺|譛|蛻|蜈|蜍|谺|ﾂ|・/

const SVG = {
  arrow: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13m-5-5 5 5-5 5"/></svg>',
  chart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19V5m0 14h16M8 16v-4m5 4V8m5 8v-7"/></svg>',
  check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 13 4 4L19 7"/></svg>',
  radar: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 21 8v8l-9 5-9-5V8l9-5Zm0 4v10m-5-7 10 6m0-6L7 16"/></svg>',
}

function esc(value: string | null | undefined): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function cleanText(value: string | null | undefined, fallback: string, max = 118): string {
  const text = String(value ?? "").replace(/\s+/g, " ").trim()
  if (!text || CORRUPT_TEXT.test(text)) return fallback
  return text.length > max ? `${text.slice(0, max - 1)}...` : text
}

function numberFrom(value: string | null | undefined): number {
  const text = String(value ?? "")
  const match = text.match(/[\d,.]+/)
  if (!match) return 0
  return Number.parseFloat(match[0].replace(/,/g, "")) || 0
}

function percent(value: string | null | undefined, fallback: number): number {
  const n = numberFrom(value)
  return Math.max(8, Math.min(100, n || fallback))
}

function themeForVariant(variant: string): VideoTheme {
  if (variant === "meo") {
    return {
      bg: "#07130d",
      panel: "#f4fbf6",
      panelSoft: "#e6f4ea",
      ink: "#102016",
      muted: "#5d7567",
      accent: "#15803d",
      accentSoft: "#bbf7d0",
      danger: "#b42318",
      rule: "rgba(21,128,61,.24)",
      grid: "rgba(187,247,208,.12)",
    }
  }
  if (variant === "security") {
    return {
      bg: "#140707",
      panel: "#fff7f4",
      panelSoft: "#fee4dc",
      ink: "#26100d",
      muted: "#82655f",
      accent: "#dc2626",
      accentSoft: "#fecaca",
      danger: "#991b1b",
      rule: "rgba(220,38,38,.24)",
      grid: "rgba(254,202,202,.13)",
    }
  }
  if (variant === "japan_entry") {
    return {
      bg: "#07111e",
      panel: "#f4f8ff",
      panelSoft: "#dbeafe",
      ink: "#0b1b33",
      muted: "#53677f",
      accent: "#2563eb",
      accentSoft: "#bfdbfe",
      danger: "#c2410c",
      rule: "rgba(37,99,235,.24)",
      grid: "rgba(191,219,254,.13)",
    }
  }
  if (variant === "video_subscription") {
    return {
      bg: "#100b16",
      panel: "#fbf7ff",
      panelSoft: "#ede9fe",
      ink: "#1d1427",
      muted: "#6f607c",
      accent: "#7c3aed",
      accentSoft: "#ddd6fe",
      danger: "#be123c",
      rule: "rgba(124,58,237,.24)",
      grid: "rgba(221,214,254,.13)",
    }
  }
  return {
    bg: "#081018",
    panel: "#f8fafc",
    panelSoft: "#e0f2fe",
    ink: "#0d1824",
    muted: "#587084",
    accent: "#0ea5e9",
    accentSoft: "#bae6fd",
    danger: "#d04f1f",
    rule: "rgba(14,165,233,.24)",
    grid: "rgba(186,230,253,.12)",
  }
}

function labels(locale: string) {
  const ja = locale === "ja"
  return {
    eyebrow: ja ? "公開データ診断" : "Public evidence brief",
    evidence: ja ? "確認できた根拠" : "Evidence found",
    coverage: ja ? "データ取得率" : "Data coverage",
    current: ja ? "現在" : "Current",
    target: ja ? "改善目安" : "Target",
    loss: ja ? "推定機会損失" : "Estimated leakage",
    monthly: ja ? "月間目安" : "Monthly estimate",
    annual: ja ? "年間換算" : "Annualized",
    demo: ja ? "改善後の見え方" : "Replacement demo",
    proof: ja ? "信頼材料" : "Proof",
    cta: ja ? "次の一手" : "Next action",
    generated: ja ? "診断レポートから自動生成" : "Generated from the diagnostic report",
    report: ja ? "レポート" : "Report",
    booking: ja ? "商談予約" : "Booking",
    play: ja ? "再生" : "Play",
    pause: ja ? "一時停止" : "Pause",
    replay: ja ? "最初から" : "Replay",
    timeline: ja ? "再生位置" : "Timeline",
    scenes: ja ? ["導入", "根拠", "損失", "改善後", "次の一手"] : ["Intro", "Evidence", "Leakage", "Demo", "Next"],
    defaultHook: ja ? "公開データから、改善優先度を60秒で整理します。" : "A 60-second view of what to fix first.",
    defaultPain: ja ? "検索、SNS、フォーム、表示速度の公開シグナルから、顧客が迷う箇所を特定しました。" : "Search, social, form, and speed signals show where buyers may hesitate.",
    defaultFear: ja ? "放置すると、小さな摩擦が毎月の機会損失として積み上がります。" : "Left alone, small points of friction compound into monthly leakage.",
    defaultHope: ja ? "信頼材料、導線、表示体験を整えると、比較検討中の離脱を減らせます。" : "Clear proof, a shorter path, and a better first view can reduce drop-off.",
    defaultCta: ja ? "詳細レポートと改善デモを見ながら、優先順位を確認しましょう。" : "Review the report and demo, then confirm the next priorities.",
  }
}

function actAt(data: DiagnosticReportData, index: number, fallback: string): DiagnosticAct | null {
  return data.acts[index] ?? data.acts.find((act) => !CORRUPT_TEXT.test(act.headline)) ?? null
}

export function buildVariantVideoHtml(data: DiagnosticReportData, script: VideoScript): string {
  const theme = themeForVariant(data.template_variant)
  const t = labels(data.report_locale)
  const company = cleanText(data.company_name, "Target company", 56)
  const hook = cleanText(script.hook || data.hook, t.defaultHook, 92)
  const pain = cleanText(script.pain, t.defaultPain, 104)
  const fear = cleanText(script.fear, t.defaultFear, 104)
  const hope = cleanText(script.hope, t.defaultHope, 104)
  const cta = cleanText(script.cta || data.cta_text, t.defaultCta, 104)
  const firstAct = actAt(data, 0, t.defaultPain)
  const secondAct = actAt(data, 1, t.defaultFear)
  const metricLabel = cleanText(firstAct?.metric_label, t.coverage, 34)
  const metricValue = cleanText(firstAct?.metric_value, `${data.source_coverage.score}`, 18)
  const currentScore = percent(firstAct?.metric_value, data.source_coverage.score || 38)
  const targetScore = Math.max(72, currentScore + 18)
  const lossValue = cleanText(data.total_loss, data.report_locale === "ja" ? "要確認" : "TBD", 24)
  const monthlyLoss = numberFrom(data.total_loss)
  const annualLoss = monthlyLoss > 0 ? monthlyLoss * 12 : 0
  const annualLabel = annualLoss > 0
    ? data.report_locale === "ja"
      ? `約${Math.round(annualLoss).toLocaleString("ja-JP")}`
      : `$${Math.round(annualLoss / 150).toLocaleString("en-US")}`
    : data.report_locale === "ja" ? "要精査" : "To verify"
  const reportUrl = cleanText(data.report_url, "paradigmjp.com", 74)
  const demoUrl = data.demo_url ? cleanText(data.demo_url, "", 74) : ""
  const signals = data.source_coverage.items
    .filter((item) => item.score > 0)
    .slice(0, 4)
    .map((item) => ({
      category: cleanText(item.category, "Signal", 16),
      label: cleanText(item.label, "Evidence", 42),
      score: Math.max(8, Math.min(100, item.score)),
    }))
  const evidenceRows = signals.length > 0
    ? signals
    : [
        { category: "SEO", label: data.report_locale === "ja" ? "検索導線" : "Search path", score: data.source_coverage.score || 42 },
        { category: "UX", label: data.report_locale === "ja" ? "問い合わせ導線" : "Inquiry path", score: 54 },
        { category: "Proof", label: data.report_locale === "ja" ? "信頼材料" : "Trust proof", score: 46 },
      ]

  const evidenceHtml = evidenceRows.map((row, index) => `
    <div class="evidence-row" style="--delay:${index * 0.08}s">
      <div>
        <span>${esc(row.category)}</span>
        <strong>${esc(row.label)}</strong>
      </div>
      <div class="meter"><i style="width:${row.score}%"></i></div>
      <b>${row.score}</b>
    </div>
  `).join("")

  return `<!doctype html>
<html lang="${esc(data.report_locale)}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline'; img-src * data:; font-src * data:;" />
  <title>${esc(company)} - Paradigm Diagnostic Film</title>
  <style>
    *{box-sizing:border-box} html,body{width:100%;height:100%;margin:0;overflow:hidden;background:${theme.bg};}
    body{font-family:Inter,"Noto Sans JP",system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:${theme.panel};}
    svg{width:1em;height:1em;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
    [data-composition-id]{width:100vw;height:100vh;position:relative;overflow:hidden;background:${theme.bg};}
    .grid-bg{position:absolute;inset:0;background-image:linear-gradient(${theme.grid} 1px,transparent 1px),linear-gradient(90deg,${theme.grid} 1px,transparent 1px);background-size:72px 72px;mask-image:linear-gradient(90deg,transparent,black 18%,black 82%,transparent);opacity:.8}
    .wash{position:absolute;inset:-20%;background:radial-gradient(circle at 18% 18%,${theme.accentSoft}33 0,transparent 22%),radial-gradient(circle at 82% 72%,${theme.accent}30 0,transparent 25%),linear-gradient(135deg,rgba(255,255,255,.06),transparent 45%);filter:blur(3px)}
    .frame{position:absolute;inset:52px;border:1px solid ${theme.rule};border-radius:34px;overflow:hidden;background:linear-gradient(135deg,rgba(255,255,255,.06),rgba(255,255,255,.015));box-shadow:0 28px 90px rgba(0,0,0,.34)}
    .brand{position:absolute;top:34px;left:44px;right:44px;display:flex;align-items:center;justify-content:space-between;font-size:13px;font-weight:800;letter-spacing:.15em;text-transform:uppercase;color:rgba(255,255,255,.58);z-index:20}
    .brand b{color:${theme.accentSoft}}
    .scene{position:absolute;inset:0;padding:112px 108px 92px;display:grid;grid-template-columns:minmax(0,1.08fr) minmax(420px,.92fr);gap:64px;align-items:center;opacity:0;visibility:hidden}
    .scene.full{grid-template-columns:1fr;text-align:center;place-items:center}
    .kicker{display:inline-flex;align-items:center;gap:10px;margin-bottom:22px;color:${theme.accentSoft};font-size:16px;font-weight:850;letter-spacing:.14em;text-transform:uppercase}
    .kicker::before{content:"";width:38px;height:2px;background:${theme.accentSoft};border-radius:999px}
    h1{max-width:780px;margin:0;color:#fff;font-size:56px;line-height:1.1;letter-spacing:0;font-weight:830;text-wrap:balance}
    h2{margin:0;color:${theme.ink};font-size:38px;line-height:1.08;letter-spacing:0;font-weight:820;text-wrap:balance}
    p{margin:0;color:rgba(255,255,255,.68);font-size:22px;line-height:1.58;letter-spacing:0;text-wrap:pretty}
    .panel p{color:${theme.muted};font-size:18px;line-height:1.7}
    .lead{max-width:760px;margin-top:26px}
    .panel{background:${theme.panel};color:${theme.ink};border-radius:28px;padding:34px;border:1px solid rgba(255,255,255,.72);box-shadow:0 32px 90px rgba(0,0,0,.26)}
    .panel.dark{background:rgba(255,255,255,.08);border-color:${theme.rule};backdrop-filter:blur(16px);color:white}
    .panel.dark p{color:rgba(255,255,255,.64)}
    .score-card{min-height:456px;display:flex;flex-direction:column;justify-content:space-between}
    .score-main{display:grid;grid-template-columns:1fr auto;gap:22px;align-items:end}
    .score-main strong{font-size:82px;line-height:.88;color:${theme.accent};letter-spacing:0}
    .score-main span{color:${theme.muted};font-size:15px;font-weight:760;text-transform:uppercase;letter-spacing:.08em}
    .bar-duo{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:30px}
    .bar{height:178px;border-radius:18px;background:${theme.panelSoft};display:flex;align-items:end;padding:12px;position:relative;overflow:hidden}
    .bar i{display:block;width:100%;height:0;border-radius:12px;background:${theme.accent}}
    .bar.target i{background:repeating-linear-gradient(45deg,${theme.ink} 0 8px,${theme.accent} 8px 16px)}
    .bar label{position:absolute;left:14px;top:14px;color:${theme.muted};font-size:14px;font-weight:800}
    .evidence-list{display:grid;gap:14px;margin-top:24px}
    .evidence-row{display:grid;grid-template-columns:1.1fr 1fr 42px;gap:18px;align-items:center;padding:17px 18px;border:1px solid rgba(13,24,36,.1);border-radius:18px;background:rgba(255,255,255,.58)}
    .evidence-row span{display:block;color:${theme.accent};font-size:12px;font-weight:850;letter-spacing:.08em;text-transform:uppercase}
    .evidence-row strong{display:block;margin-top:4px;color:${theme.ink};font-size:17px;line-height:1.25}
    .meter{height:8px;background:${theme.panelSoft};border-radius:999px;overflow:hidden}.meter i{display:block;height:100%;background:${theme.accent};border-radius:999px;width:0}
    .metric-stack{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:24px}
    .metric{padding:24px;border-radius:22px;background:${theme.panelSoft};min-height:158px}.metric span{display:block;color:${theme.muted};font-size:14px;font-weight:800;text-transform:uppercase}.metric strong{display:block;margin-top:16px;font-size:42px;line-height:1;color:${theme.ink}}
    .loss-number{font-size:72px;line-height:.98;color:${theme.danger};font-weight:850;letter-spacing:0;margin-top:24px}
    .demo-window{overflow:hidden;padding:0}.browser-bar{height:48px;background:${theme.panelSoft};display:flex;align-items:center;gap:9px;padding:0 18px}.dot{width:12px;height:12px;border-radius:50%;background:${theme.accent}}.dot:nth-child(2){opacity:.55}.dot:nth-child(3){opacity:.3}
    .demo-body{padding:34px;display:grid;gap:22px}.demo-hero{height:126px;border-radius:22px;background:linear-gradient(135deg,${theme.ink},${theme.accent});padding:25px;color:white}.demo-hero b{display:block;width:70%;height:18px;background:white;border-radius:999px;opacity:.92}.demo-hero i{display:block;width:48%;height:12px;background:white;border-radius:999px;opacity:.42;margin-top:18px}
    .demo-cards{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}.demo-cards span{height:100px;border-radius:18px;background:${theme.panelSoft};border:1px solid rgba(13,24,36,.08)}
    .cta-box{max-width:1040px}.cta-box h1{max-width:1040px;font-size:58px}.cta-actions{display:flex;justify-content:center;gap:16px;margin-top:36px}.action{display:inline-flex;align-items:center;gap:12px;border:1px solid ${theme.rule};border-radius:999px;padding:15px 20px;background:rgba(255,255,255,.1);font-size:17px;font-weight:800;color:white}.action.primary{background:${theme.panel};color:${theme.ink};border-color:transparent}
    .footer{position:absolute;left:44px;right:44px;bottom:30px;z-index:20;display:grid;grid-template-columns:1fr auto 1fr;align-items:center;color:rgba(255,255,255,.42);font-size:13px;font-weight:720;letter-spacing:.08em;text-transform:uppercase}.footer div:nth-child(3){text-align:right}.progress{height:4px;background:rgba(255,255,255,.12);border-radius:999px;overflow:hidden}.progress i{display:block;width:0;height:100%;background:${theme.accentSoft}}
    @media (max-width:900px){.frame{inset:18px;border-radius:22px}.brand{top:18px;left:22px;right:22px;font-size:10px}.scene{padding:74px 28px 58px;grid-template-columns:1fr;gap:24px}h1{font-size:38px}h2{font-size:30px}p{font-size:17px}.score-card{min-height:360px}.score-main strong{font-size:60px}.loss-number{font-size:48px}.footer{left:22px;right:22px;bottom:18px;font-size:10px}.scene.full{padding:64px 26px}.cta-box h1{font-size:34px}.cta-actions{flex-wrap:wrap}.panel{border-radius:22px;padding:22px}.demo-cards{grid-template-columns:1fr 1fr}.evidence-row{grid-template-columns:1fr}.metric-stack{grid-template-columns:1fr}}
  </style>
</head>
<body>
  <div
    data-composition-id="diagnostic-report-video"
    data-start="0"
    data-duration="60"
    data-width="1920"
    data-height="1080"
    data-hf-frameworks="hyperframes-player gsap css catalog:data-chart catalog:shimmer-sweep catalog:caption-highlight catalog:flash-through-white catalog:transitions-blur"
  >
    <div class="clip wash" data-start="0" data-duration="60" data-track-index="0"></div>
    <div class="clip grid-bg" data-start="0" data-duration="60" data-track-index="0"></div>
    <div class="clip frame" data-start="0" data-duration="60" data-track-index="0"></div>
    <div class="clip brand" data-start="0" data-duration="60" data-track-index="3"><span><b>PARADIGM</b> DIAGNOSTIC</span><span>${esc(t.generated)}</span></div>

    <section id="scene-hero" class="clip scene scene-hero" data-start="0" data-duration="11.5" data-track-index="1">
      <div>
        <div class="kicker">${esc(t.eyebrow)}</div>
        <h1>${esc(hook)}</h1>
        <p class="lead">${esc(company)}</p>
      </div>
      <div class="panel score-card">
        <div>
          <h2>${esc(metricLabel)}</h2>
          <p>${esc(pain)}</p>
        </div>
        <div>
          <div class="score-main"><span>${esc(t.coverage)}</span><strong class="count" data-count="${data.source_coverage.score}">0</strong></div>
          <div class="bar-duo">
            <div><div class="bar current"><label>${esc(t.current)}</label><i style="--h:${currentScore}%"></i></div></div>
            <div><div class="bar target"><label>${esc(t.target)}</label><i style="--h:${targetScore}%"></i></div></div>
          </div>
        </div>
      </div>
    </section>

    <section id="scene-evidence" class="clip scene scene-evidence" data-start="11.5" data-duration="11.5" data-track-index="1">
      <div>
        <div class="kicker">${esc(t.evidence)}</div>
        <h1>${esc(cleanText(firstAct?.headline, pain, 88))}</h1>
        <p class="lead">${esc(cleanText(firstAct?.body, pain, 150))}</p>
      </div>
      <div class="panel">
        <h2>${esc(t.proof)}</h2>
        <div class="evidence-list">${evidenceHtml}</div>
      </div>
    </section>

    <section id="scene-loss" class="clip scene scene-loss" data-start="23" data-duration="11.5" data-track-index="1">
      <div>
        <div class="kicker">${esc(t.loss)}</div>
        <h1>${esc(cleanText(secondAct?.headline, fear, 88))}</h1>
        <p class="lead">${esc(cleanText(secondAct?.body, fear, 150))}</p>
      </div>
      <div class="panel">
        <h2>${esc(t.loss)}</h2>
        <div class="loss-number">${esc(lossValue)}</div>
        <div class="metric-stack">
          <div class="metric"><span>${esc(t.monthly)}</span><strong>${esc(lossValue)}</strong></div>
          <div class="metric"><span>${esc(t.annual)}</span><strong>${esc(annualLabel)}</strong></div>
        </div>
      </div>
    </section>

    <section id="scene-demo" class="clip scene scene-demo" data-start="34.5" data-duration="11.5" data-track-index="1">
      <div>
        <div class="kicker">${esc(t.demo)}</div>
        <h1>${esc(hope)}</h1>
        <p class="lead">${esc(demoUrl || reportUrl)}</p>
      </div>
      <div class="panel demo-window">
        <div class="browser-bar"><span class="dot"></span><span class="dot"></span><span class="dot"></span></div>
        <div class="demo-body">
          <div class="demo-hero"><b></b><i></i></div>
          <div class="demo-cards"><span></span><span></span><span></span></div>
          <div class="evidence-row">
            <div><span>${esc(t.cta)}</span><strong>${esc(cta)}</strong></div>
            <div class="meter"><i style="width:86%"></i></div>
            <b>${SVG.arrow}</b>
          </div>
        </div>
      </div>
    </section>

    <section id="scene-cta" class="clip scene scene-cta full" data-start="46" data-duration="14" data-track-index="1">
      <div class="cta-box">
        <div class="kicker">${esc(t.cta)}</div>
        <h1>${esc(cta)}</h1>
        <p class="lead">${esc(reportUrl)}</p>
        <div class="cta-actions">
          <span class="action primary">${SVG.chart}${esc(t.report)}</span>
          <span class="action">${SVG.check}${esc(t.booking)}</span>
          <span class="action">${SVG.radar}HyperFrames</span>
        </div>
      </div>
    </section>

    <div class="clip footer" data-start="0" data-duration="60" data-track-index="3"><div>${esc(company)}</div><div class="progress"><i></i></div><div>${esc(reportUrl)}</div></div>
  </div>
  <script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js"></script>
  <script>
    window.__timelines = window.__timelines || {};
    const tl = gsap.timeline({ paused: true });
    const scenes = [".scene-hero", ".scene-evidence", ".scene-loss", ".scene-demo", ".scene-cta"];
    gsap.set(scenes, { autoAlpha: 0 });
    scenes.forEach((scene, index) => {
      const at = index * 11.5;
      tl.set(scene, { autoAlpha: 1 }, at);
      tl.fromTo(scene + " .kicker", { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: .55, ease: "power3.out" }, at);
      tl.fromTo(scene + " h1", { y: 34, opacity: 0 }, { y: 0, opacity: 1, duration: .75, ease: "power3.out" }, at + .1);
      tl.fromTo(scene + " p", { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: .65, ease: "power3.out" }, at + .26);
      tl.fromTo(scene + " .panel, " + scene + " .cta-actions", { y: 34, opacity: 0, scale: .985 }, { y: 0, opacity: 1, scale: 1, duration: .8, ease: "power3.out" }, at + .16);
      const bars = gsap.utils.toArray(scene + " .bar i");
      if (bars.length) {
        tl.to(bars, { height: function(_, el){ return el.style.getPropertyValue("--h") || "0%"; }, duration: .9, ease: "power2.out" }, at + .96);
      }
      const meters = gsap.utils.toArray(scene + " .meter i");
      if (meters.length) {
        tl.to(meters, { width: function(_, el){ return el.style.width || "0%"; }, duration: .75, ease: "power2.out", stagger: .07 }, at + .9);
      }
      tl.to(".progress i", { width: ((index + 1) / scenes.length * 100) + "%", duration: 10.5, ease: "none" }, at);
      if (index < scenes.length - 1) {
        tl.to(scene + " h1, " + scene + " p, " + scene + " .panel, " + scene + " .cta-actions, " + scene + " .kicker", { y: -18, opacity: 0, duration: .42, ease: "power2.in" }, at + 10.65);
        tl.set(scene, { autoAlpha: 0 }, at + 11.15);
      }
    });
    tl.to(".scene-cta", { opacity: 0, duration: .7, ease: "power2.in" }, 59.2);
    const countEl = document.querySelector(".count");
    if (countEl) {
      tl.to({ value: 0 }, {
        value: Number(countEl.dataset.count || "0"),
        duration: 1.2,
        ease: "power2.out",
        onUpdate: function () { countEl.textContent = Math.round(this.targets()[0].value) + "%"; }
      }, .9);
    }
    window.__timelines["diagnostic-report-video"] = tl;
    const params = new URLSearchParams(window.location.search);
    if (params.get("autoplay") === "1" && !window.__HYPERFRAMES_PLAYER__) {
      window.requestAnimationFrame(function(){ tl.play(0); });
    }
  </script>
</body>
</html>`
}

export function buildWebsiteVideoHtml(data: DiagnosticReportData, script: VideoScript): string {
  return buildVariantVideoHtml(data, script)
}

export function buildMeoVideoHtml(data: DiagnosticReportData, script: VideoScript): string {
  return buildVariantVideoHtml({ ...data, template_variant: "meo" }, script)
}

export function buildSecurityVideoHtml(data: DiagnosticReportData, script: VideoScript): string {
  return buildVariantVideoHtml({ ...data, template_variant: "security" }, script)
}

export function buildJapanEntryVideoHtml(data: DiagnosticReportData, script: VideoScript): string {
  return buildVariantVideoHtml({ ...data, template_variant: "japan_entry" }, script)
}
