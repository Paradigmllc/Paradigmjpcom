import type { VideoTheme } from "./video-template-theme"
import type { VideoTemplateFormatConfig } from "./video-template-format"

export function buildVideoTemplateCss(theme: VideoTheme, formatConfig: VideoTemplateFormatConfig): string {
  return `
    *{box-sizing:border-box}     html{--hf-scale:0.001;width:100%;height:100%;overflow:hidden;background:${theme.bg};} body{width:100%;height:100%;margin:0;overflow:hidden;background:${theme.bg};}
    body{font-family:Inter,"Noto Sans JP",system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:${theme.panel};}
    svg{width:1em;height:1em;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
    [data-composition-id]{width:${formatConfig.width}px;height:${formatConfig.height}px;position:relative;overflow:hidden;background:${theme.bg};transform:scale(var(--hf-scale));-webkit-transform:scale(var(--hf-scale));transform-origin:0 0;-webkit-transform-origin:0 0;will-change:transform;contain:layout style paint}
    #three-layer{position:absolute;inset:0;width:100%;height:100%;display:block;opacity:.8;mix-blend-mode:screen;isolation:isolate}
    .grid-bg{position:absolute;inset:0;background-image:linear-gradient(${theme.grid} 1px,transparent 1px),linear-gradient(90deg,${theme.grid} 1px,transparent 1px);background-size:72px 72px;mask-image:linear-gradient(90deg,transparent,black 18%,black 82%,transparent);opacity:.72;transform-origin:center}
    .wash{position:absolute;inset:-20%;background:radial-gradient(circle at 18% 18%,${theme.accentSoft}33 0,transparent 22%),radial-gradient(circle at 82% 72%,${theme.accent}30 0,transparent 25%),linear-gradient(135deg,rgba(255,255,255,.06),transparent 45%);filter:blur(3px)}
    .scan-beam{position:absolute;inset:0;background:linear-gradient(100deg,transparent 0 38%,rgba(255,255,255,.18) 48%,transparent 58%);transform:translateX(-70%);mix-blend-mode:screen;opacity:.55;isolation:isolate}
    .grain{position:absolute;inset:0;opacity:.16;background-image:radial-gradient(circle at 20% 30%,rgba(255,255,255,.22) 0 1px,transparent 1px),radial-gradient(circle at 70% 60%,rgba(255,255,255,.12) 0 1px,transparent 1px);background-size:18px 18px,23px 23px;mix-blend-mode:overlay;isolation:isolate}
    .data-node{position:absolute;left:var(--x);top:var(--y);width:var(--s);height:var(--s);border:1px solid ${theme.accentSoft};border-radius:50%;box-shadow:0 0 28px ${theme.accentSoft};opacity:.42}
    .data-node::after{content:"";position:absolute;inset:-18px;border:1px solid ${theme.rule};border-radius:50%}
    .chapter-strip{position:absolute;top:78px;left:92px;right:92px;z-index:18;display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px}
    .chapter-pill{min-width:0;display:flex;align-items:center;gap:9px;border:1px solid rgba(255,255,255,.12);border-radius:999px;background:rgba(255,255,255,.12);padding:9px 12px;color:rgba(255,255,255,.62);font-size:12px;font-weight:850;letter-spacing:.06em;text-transform:uppercase}
    @supports (backdrop-filter:blur(1px)){.chapter-pill{background:rgba(255,255,255,.07);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px)}}
    .chapter-pill i{width:8px;height:8px;border-radius:50%;background:rgba(255,255,255,.28);box-shadow:0 0 0 rgba(255,255,255,0)}
    .chapter-pill b{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .chapter-pill.is-active{background:${theme.panel};border-color:transparent;color:${theme.ink};box-shadow:0 18px 54px rgba(0,0,0,.24)}
    .chapter-pill.is-active i{background:${theme.accent};box-shadow:0 0 22px ${theme.accent}}
    .frame{position:absolute;inset:52px;border:1px solid ${theme.rule};border-radius:34px;overflow:hidden;background:linear-gradient(135deg,rgba(255,255,255,.06),rgba(255,255,255,.015));box-shadow:0 28px 90px rgba(0,0,0,.34)}
    .brand{position:absolute;top:34px;left:44px;right:44px;display:flex;align-items:center;justify-content:space-between;font-size:13px;font-weight:800;letter-spacing:.15em;text-transform:uppercase;color:rgba(255,255,255,.58);z-index:20}
    .brand b{color:${theme.accentSoft}}
    .scene{position:absolute;inset:0;padding:132px 92px 84px;display:grid;grid-template-columns:minmax(0,1fr) minmax(340px,420px);gap:42px;align-items:center;opacity:0;visibility:hidden}
    .scene.full{grid-template-columns:1fr;text-align:center;place-items:center}
    .kicker{display:inline-flex;align-items:center;gap:10px;margin-bottom:22px;color:${theme.accentSoft};font-size:16px;font-weight:850;letter-spacing:.14em;text-transform:uppercase}
    .kicker::before{content:"";width:38px;height:2px;background:${theme.accentSoft};border-radius:999px}
    h1{max-width:680px;margin:0;color:#fff;font-size:44px;line-height:1.12;letter-spacing:0;font-weight:830;text-wrap:balance}
    h2{margin:0;color:${theme.ink};font-size:30px;line-height:1.14;letter-spacing:0;font-weight:820;text-wrap:balance}
    p{margin:0;color:rgba(255,255,255,.7);font-size:18px;line-height:1.55;letter-spacing:0;text-wrap:pretty}
    .panel p{color:${theme.muted};font-size:16px;line-height:1.6}
    .lead{max-width:680px;margin-top:20px}
    .caption-band{display:inline-flex;max-width:660px;margin-top:18px;border-left:3px solid ${theme.accentSoft};padding:10px 14px;background:rgba(255,255,255,.08);color:rgba(255,255,255,.76);font-size:15px;font-weight:760;line-height:1.5;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px)}
    .panel{max-width:100%;overflow:hidden;background:${theme.panel};color:${theme.ink};border-radius:24px;padding:28px;border:1px solid rgba(255,255,255,.72);box-shadow:0 32px 90px rgba(0,0,0,.26)}
    .panel.dark{background:rgba(255,255,255,.08);border-color:${theme.rule};backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);color:white}
    .panel.dark p{color:rgba(255,255,255,.64)}
    .score-card{min-height:392px;display:flex;flex-direction:column;justify-content:space-between}
    .score-main{display:grid;grid-template-columns:1fr auto;gap:22px;align-items:end}
    .score-main strong{font-size:62px;line-height:.92;color:${theme.accent};letter-spacing:0}
    .score-main span{color:${theme.muted};font-size:13px;font-weight:760;text-transform:uppercase;letter-spacing:.08em}
    .bar-duo{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:24px}
    .bar{height:132px;border-radius:16px;background:${theme.panelSoft};display:flex;align-items:end;padding:12px;position:relative;overflow:hidden}
    .bar i{display:block;width:100%;height:0;border-radius:12px;background:${theme.accent}}
    .bar.target i{background:repeating-linear-gradient(45deg,${theme.ink} 0 8px,${theme.accent} 8px 16px)}
    .bar label{position:absolute;left:14px;top:14px;color:${theme.muted};font-size:14px;font-weight:800}
    .evidence-list{display:grid;gap:12px;margin-top:20px}
    .evidence-row{position:relative;display:grid;grid-template-columns:minmax(0,1.1fr) minmax(96px,.9fr) 36px;gap:14px;align-items:center;padding:14px 16px;border:1px solid rgba(13,24,36,.1);border-radius:16px;background:rgba(255,255,255,.58);overflow:hidden}
    .evidence-row::before{content:"";position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(255,255,255,.72),transparent);transform:translateX(-120%);opacity:.7}
    .evidence-row.is-focus{border-color:${theme.accent};box-shadow:0 18px 48px rgba(0,0,0,.16);transform:translateX(-8px) scale(1.02)}
    .evidence-row span{display:block;color:${theme.accent};font-size:12px;font-weight:850;letter-spacing:.08em;text-transform:uppercase}
    .evidence-row strong{display:block;margin-top:4px;color:${theme.ink};font-size:17px;line-height:1.25}
    .meter{height:8px;background:${theme.panelSoft};border-radius:999px;overflow:hidden}.meter i{display:block;height:100%;background:${theme.accent};border-radius:999px;width:0}
    .metric-stack{display:grid;grid-template-columns:1fr;gap:12px;margin-top:22px}
    .metric{padding:18px;border-radius:18px;background:${theme.panelSoft};min-height:104px}.metric span{display:block;color:${theme.muted};font-size:13px;font-weight:800;text-transform:uppercase}.metric strong{display:block;margin-top:12px;font-size:34px;line-height:1.08;color:${theme.ink};overflow-wrap:anywhere}
    .loss-number{font-size:58px;line-height:.98;color:${theme.danger};font-weight:850;letter-spacing:0;margin-top:22px;overflow-wrap:anywhere}
    .browser-bar{height:48px;background:${theme.panelSoft};display:flex;align-items:center;gap:9px;padding:0 18px}.dot{width:12px;height:12px;border-radius:50%;background:${theme.accent}}.dot:nth-child(2){opacity:.55}.dot:nth-child(3){opacity:.3}
    .browser-bar b{margin-left:auto;color:${theme.muted};font-size:12px;font-weight:850;letter-spacing:.08em;text-transform:uppercase}
    .site-panel{overflow:hidden;padding:0}.site-shot-wrap{position:relative;height:344px;background:${theme.panelSoft};overflow:hidden}.site-shot{width:100%;height:100%;object-fit:cover;object-position:top;display:block;filter:saturate(.92) contrast(1.02)}.site-shot-wrap::after{content:"";position:absolute;inset:0;border:2px solid ${theme.accent};opacity:.18;pointer-events:none}.shot-callout{position:absolute;right:20px;bottom:20px;max-width:220px;border-radius:18px;background:${theme.panel};padding:15px 18px;box-shadow:0 22px 58px rgba(0,0,0,.26)}.shot-callout span{display:block;color:${theme.muted};font-size:12px;font-weight:850;text-transform:uppercase}.shot-callout strong{display:block;margin-top:8px;color:${theme.accent};font-size:34px;line-height:1}
    .audit-pin{position:absolute;transform:translate(-50%,-50%);display:flex;align-items:center;gap:10px;max-width:250px}.audit-pin b{display:grid;place-items:center;width:34px;height:34px;border:3px solid white;border-radius:50%;background:${theme.danger};color:white;font-size:14px;box-shadow:0 18px 42px rgba(0,0,0,.35)}.audit-pin span{display:block;border:1px solid rgba(255,255,255,.65);border-radius:14px;background:rgba(255,255,255,.94);padding:10px 12px;color:${theme.ink};box-shadow:0 18px 42px rgba(0,0,0,.24)}.audit-pin strong{display:block;font-size:12px;line-height:1.2}.audit-pin em{display:block;margin-top:4px;color:${theme.muted};font-size:10px;line-height:1.35;font-style:normal}
    .proof-grid{display:grid;grid-template-columns:minmax(0,1fr) 132px;gap:18px;align-items:stretch}.phone-shot{border:8px solid ${theme.ink};border-radius:28px;background:${theme.ink};overflow:hidden;min-height:300px;box-shadow:0 24px 64px rgba(0,0,0,.22)}.phone-shot img{width:100%;height:100%;object-fit:cover;object-position:top;display:block}
    .demo-body{padding:28px;display:grid;gap:18px}.demo-hero{height:108px;border-radius:20px;background:linear-gradient(135deg,${theme.ink},${theme.accent});padding:22px;color:white}.demo-hero b{display:block;width:70%;height:16px;background:white;border-radius:999px;opacity:.92}.demo-hero i{display:block;width:48%;height:10px;background:white;border-radius:999px;opacity:.42;margin-top:16px}
    .demo-cards{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.demo-cards span{height:78px;border-radius:16px;background:${theme.panelSoft};border:1px solid rgba(13,24,36,.08)}
    .after-preview{display:grid;grid-template-columns:.8fr 1fr;gap:12px;padding:18px}.before-pane,.after-pane{min-height:170px;border-radius:18px;padding:16px}.before-pane{background:#fff1f2;border:1px solid #fecdd3;color:#9f1239}.after-pane{background:${theme.panelSoft};border:1px solid ${theme.rule};color:${theme.ink}}.before-pane span,.after-pane span{display:block;font-size:11px;font-weight:850;letter-spacing:.12em;text-transform:uppercase}.before-pane p,.after-pane p{margin-top:10px;color:inherit;font-size:13px;line-height:1.45}.after-pane strong{display:block;margin-top:8px;font-size:20px;line-height:1.14}.after-pane b{display:inline-flex;margin-top:12px;border-radius:999px;background:${theme.accent};padding:8px 11px;color:white;font-size:12px}.route-replay{display:grid;gap:10px;padding:0 18px 18px}.route-step{display:grid;grid-template-columns:28px minmax(0,1fr);gap:10px;align-items:start;border:1px solid rgba(13,24,36,.09);border-radius:14px;background:white;padding:10px 12px}.route-step>b{display:grid;place-items:center;width:26px;height:26px;border-radius:50%;background:${theme.ink};color:white;font-size:11px}.route-step strong{display:block;color:${theme.ink};font-size:13px}.route-step em{display:block;margin-top:3px;color:${theme.muted};font-size:11px;line-height:1.3;font-style:normal}
    .cta-box{max-width:920px}.cta-box h1{max-width:920px;font-size:48px}.cta-actions{display:flex;justify-content:center;gap:14px;margin-top:30px}.action{display:inline-flex;align-items:center;gap:10px;border:1px solid ${theme.rule};border-radius:999px;padding:13px 18px;background:rgba(255,255,255,.1);font-size:15px;font-weight:800;color:white}.action.primary{background:${theme.panel};color:${theme.ink};border-color:transparent}
    .footer{position:absolute;left:44px;right:44px;bottom:30px;z-index:20;display:grid;grid-template-columns:1fr auto 1fr;align-items:center;color:rgba(255,255,255,.42);font-size:13px;font-weight:720;letter-spacing:.08em;text-transform:uppercase}.footer div:nth-child(3){text-align:right}.progress{height:4px;background:rgba(255,255,255,.12);border-radius:999px;overflow:hidden}.progress i{display:block;width:0;height:100%;background:${theme.accentSoft}}
    ${formatConfig.extraCss}
  `
}
