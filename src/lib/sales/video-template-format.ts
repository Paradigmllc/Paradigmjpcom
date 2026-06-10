import type { VideoTheme } from "./video-template-theme"

export type VideoTemplateFormat = "landscape" | "portrait"

export interface VideoTemplateFormatConfig {
  width: number
  height: number
  className: string
  extraCss: string
}

export function videoTemplateFormat(format: VideoTemplateFormat | undefined, theme: VideoTheme): VideoTemplateFormatConfig {
  if (format !== "portrait") {
    return {
      width: 1920,
      height: 1080,
      className: "is-landscape",
      extraCss: "",
    }
  }

  return {
    width: 1080,
    height: 1920,
    className: "is-portrait",
    extraCss: `
    .is-portrait .chapter-strip{top:52px;left:40px;right:40px;gap:7px}
    .is-portrait .chapter-pill{gap:6px;padding:9px 8px;font-size:10px;letter-spacing:.04em}
    .is-portrait .chapter-pill i{width:7px;height:7px}
    .is-portrait .frame{inset:28px;border-radius:28px}
    .is-portrait .brand{top:24px;left:34px;right:34px;font-size:11px;letter-spacing:.12em}
    .is-portrait .scene{padding:150px 54px 118px;grid-template-columns:1fr;gap:34px;align-content:center;align-items:stretch}
    .is-portrait .scene.full{padding-inline:64px}
    .is-portrait .kicker{margin-bottom:18px;font-size:17px}
    .is-portrait .kicker::before{width:34px}
    .is-portrait h1{max-width:920px;font-size:58px;line-height:1.08}
    .is-portrait h2{font-size:36px}
    .is-portrait p{font-size:27px;line-height:1.45}
    .is-portrait .panel p{font-size:22px;line-height:1.48}
    .is-portrait .lead{max-width:910px;margin-top:22px}
    .is-portrait .caption-band{max-width:900px;margin-top:22px;padding:14px 18px;font-size:22px}
    .is-portrait .panel{border-radius:24px;padding:24px}
    .is-portrait .score-card{min-height:520px}
    .is-portrait .score-main strong{font-size:82px}
    .is-portrait .bar{height:174px}
    .is-portrait .evidence-list{gap:16px;margin-top:24px}
    .is-portrait .evidence-row{grid-template-columns:minmax(0,1fr) minmax(120px,.58fr) 44px;padding:18px;border-radius:18px}
    .is-portrait .evidence-row span{font-size:13px}
    .is-portrait .evidence-row strong{font-size:22px}
    .is-portrait .loss-number{font-size:74px}
    .is-portrait .metric{min-height:128px}.is-portrait .metric strong{font-size:42px}
    .is-portrait .browser-bar{height:54px}
    .is-portrait .site-shot-wrap{height:620px}
    .is-portrait .shot-callout{right:18px;bottom:18px;max-width:280px}
    .is-portrait .shot-callout strong{font-size:42px}
    .is-portrait .audit-pin{max-width:310px;gap:9px}
    .is-portrait .audit-pin span{padding:11px 13px}
    .is-portrait .audit-pin strong{font-size:14px}.is-portrait .audit-pin em{font-size:12px}
    .is-portrait .proof-grid{grid-template-columns:1fr;gap:18px}
    .is-portrait .phone-shot{display:none}
    .is-portrait .demo-body{padding:24px}.is-portrait .demo-hero{height:142px}
    .is-portrait .after-preview{grid-template-columns:1fr;gap:14px;padding:22px}
    .is-portrait .before-pane,.is-portrait .after-pane{min-height:auto;padding:20px}
    .is-portrait .before-pane p,.is-portrait .after-pane p{font-size:18px}
    .is-portrait .after-pane strong{font-size:28px}
    .is-portrait .after-pane b{font-size:16px}
    .is-portrait .route-replay{gap:12px;padding:0 22px 22px}
    .is-portrait .route-step{grid-template-columns:34px minmax(0,1fr);padding:14px 16px}
    .is-portrait .route-step>b{width:32px;height:32px;font-size:13px}
    .is-portrait .route-step strong{font-size:17px}.is-portrait .route-step em{font-size:14px}
    .is-portrait .cta-box h1{max-width:920px;font-size:58px}
    .is-portrait .cta-actions{flex-wrap:wrap}
    .is-portrait .action{font-size:18px}
    .is-portrait .footer{left:36px;right:36px;bottom:26px;font-size:11px}
    .is-portrait .progress{height:5px}
    .is-portrait .meter i{background:${theme.accent}}
  `,
  }
}
