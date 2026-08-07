import { renderSceneArchetype } from "./hyperframes-scene-archetypes.mjs";
import { professionalSceneCss } from "./hyperframes-scene-styles.mjs";
import { entertainmentShotCompositionHtml } from "./entertainment-composition-template.mjs";

const JA_BEATS = {
  hook: "最初の矛盾",
  mechanism: "数字を動かした仕組み",
  baseline: "確認できる基準線",
  evidence: "一次資料の照合",
  timeline: "時間軸を固定する",
  counterclaim: "別の説明を検証する",
  human_impact: "数字の外側に残った影響",
  document: "記録が示したこと",
  reversal: "見え方が反転する地点",
  implications: "この事件から残る問い",
  method: "検証方法を公開する",
  outro: "記録から結論へ",
  authority: "権限の境界",
  testimony: "証言と記録",
  response: "制度はどう応答したか",
  gap: "残された空白"
};

function escapeHtml(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

function beatLabel(beat, language) {
  if (language === "ja") return JA_BEATS[beat] ?? beat.replaceAll("_", "・");
  return beat.replaceAll("_", " ").toUpperCase();
}

function sceneBody(scene, blueprint) {
  if (scene.beat === "hook") return blueprint.narrative.keyQuestion;
  if (scene.beat === "counterclaim") return blueprint.narrative.counterpoint;
  if (["implications", "outro"].includes(scene.beat)) return blueprint.narrative.takeaway;
  if (scene.beat === "method") return blueprint.editorialDna.promise;
  return `${scene.visualWorld} / ${scene.evidenceMode}`;
}

function designMarkdown(design) {
  return `---
name: ${design.name}
colors:
  background: "${design.background}"
  foreground: "${design.foreground}"
  surface: "${design.surface}"
  surfaceRaised: "${design.surfaceRaised}"
  accent: "${design.accent}"
  alleged: "${design.alleged}"
  muted: "${design.muted}"
typography:
  display: "${design.displayFont}"
  body: "${design.bodyFont}"
  evidence: "${design.monoFont}"
motion:
  energy: moderate
  primaryTransition: editorial-cover
  ambient: one-per-scene
---

# ${design.name}

${design.mood}. Layout signature: ${design.layoutSignature}. Texture: ${design.texture}.

## Do

- Keep claim status and source locator visible at evidence beats.
- Use three depth layers and eight to ten purposeful elements per scene.
- Use the accent for focal evidence and the alleged color only for allegations.

## Do not

- Do not fabricate quotations, dialogue, documents, people, or events.
- Do not use real-person likenesses or synthetic expert personas.
- Do not use generic AI imagery or per-scene palette invention.
`;
}

function expandedPrompt(blueprint, design, scenes, duration) {
  const sceneSections = scenes.map((scene) => `## Scene ${String(scene.ordinal).padStart(2, "0")} — ${beatLabel(scene.beat, blueprint.language)}

- Concept: Turn ${scene.visualWorld} into an evidentiary world for ${scene.beat}; the viewer should feel guided, not overwhelmed.
- Mood: ${design.mood}; ${design.texture}.
- Depth: BG atmospheric field and ghost index; MG headline and ${scene.evidenceMode}; FG claim status, locator, progress rail, and registration details.
- Choreography: ${scene.choreographyVerb}; stagger display, evidence, metadata, and structural rule with three distinct eases.
- Transition: ${scene.transitionOut}; use the project editorial-cover handoff so outgoing content remains visible until covered.
- Timing: ${scene.startSeconds.toFixed(2)}s–${(scene.startSeconds + scene.durationSeconds).toFixed(2)}s.
`).join("\n");
  return `# ${blueprint.title}

## Style

- Design: ${design.name}
- Palette: ${design.background}, ${design.foreground}, ${design.accent}, ${design.alleged}, ${design.muted}
- Type: ${design.displayFont} / ${design.bodyFont} / ${design.monoFont}
- Mood: ${design.mood}
- Duration: ${duration}s across ${scenes.length} scenes

## Rhythm

${blueprint.narrative.rhythmDeclaration}

## Global rules

- Three depth layers and 8–10 authored elements per scene.
- One finite, seekable ambient motion per scene.
- Every scene has a complete entrance choreography; no pre-transition exit animation.
- Claim status and source locators remain readable.
- Non-photoreal abstract reconstruction only; no real-person likeness.

${sceneSections}
## Recurring motifs

${design.texture}; claim-status color; source-index rail; deterministic scene counter.

## Negative prompt

No generic AI imagery, invented quotes, photoreal reenactments, hooded hackers, matrix rain, glossy SaaS cards, jump cuts, or unreadable citations.
`;
}

export function legacySceneCompositionHtml(scene, blueprint, design, clipDuration, sceneIndex) {
  const index = String(scene.ordinal).padStart(2, "0");
  const id = `scene-${index}`;
  const status = scene.claimStatus ? scene.claimStatus.toUpperCase() : "EDITORIAL";
  const statusColor = scene.claimStatus === "alleged" ? design.alleged : design.accent;
  const source = scene.sourceLocator ?? (blueprint.language === "ja" ? "検証方法と出典一覧は概要欄に記載" : "Method and complete source manifest in description");
  const entrance = sceneIndex === 0 ? 0.15 : 0.60;
  const layout = (sceneIndex % 6) + 1;
  const layoutStyles = {
    1: { hero: "", headline: "", card: "" },
    2: { hero: "grid-template-columns:minmax(430px,.72fr) minmax(0,1.28fr)", headline: "order:2", card: "order:1" },
    3: { hero: "grid-template-columns:minmax(0,1fr) minmax(0,1fr)", headline: "", card: "" },
    4: { hero: "grid-template-columns:1fr;grid-template-rows:auto auto;align-content:center;gap:38px", headline: "max-width:1380px", card: "min-height:180px;flex-direction:row;align-items:center" },
    5: { hero: "grid-template-columns:minmax(430px,.55fr) minmax(0,1.45fr)", headline: "order:2", card: `order:1;min-height:520px;border-left-width:12px;box-shadow:-20px 24px 0 ${design.surfaceRaised}` },
    6: { hero: "grid-template-columns:1fr;justify-items:center;text-align:center;gap:42px", headline: "max-width:1380px", card: "width:82%;min-height:170px;flex-direction:row;align-items:center;text-align:left" }
  }[layout];
  const ambientDuration = Math.max(2, Math.min(clipDuration - entrance - 1.1, 8));
  const repeats = Math.max(0, Math.ceil((clipDuration - entrance - 1.1) / ambientDuration) - 1);
  const driftX = sceneIndex % 2 === 0 ? 38 : -38;
  const driftY = (sceneIndex % 3 - 1) * 22;
  return `<template id="${id}-template">
  <div class="scene-frame layout-${layout}" data-composition-id="${id}" data-width="1920" data-height="1080">
    <div class="grid-field" data-layout-ignore></div>
    <div class="orb-wrap" data-layout-ignore><div class="orb"></div></div>
    <div class="ghost-index" data-layout-ignore>${index}</div>
    <div class="scene-content">
      <div class="top-rail"><span class="file-index">FILE ${index} / ${escapeHtml(scene.beat.toUpperCase())}</span><span>${escapeHtml(scene.visualWorld)}</span></div>
      <div class="hero-zone" style="${layoutStyles.hero}">
        <div class="headline-block" style="${layoutStyles.headline}"><p class="eyebrow" style="color:${statusColor}">${escapeHtml(status)}</p><h2>${escapeHtml(scene.ordinal === 1 ? blueprint.title : beatLabel(scene.beat, blueprint.language))}</h2><p class="scene-body">${escapeHtml(sceneBody(scene, blueprint))}</p></div>
        <article class="evidence-card" style="border-color:${statusColor};${layoutStyles.card}"><span class="evidence-mode">${escapeHtml(scene.evidenceMode)}</span><strong style="color:${statusColor}">${escapeHtml(status)}</strong><p>${escapeHtml(source)}</p></article>
      </div>
      <div class="bottom-rail"><span>${escapeHtml(design.layoutSignature)} / L${layout}</span><span>${escapeHtml(scene.choreographyVerb)} / ${escapeHtml(scene.transitionOut)}</span><span>${index} / ${String(blueprint.scenes.length).padStart(2, "0")}</span></div>
      <div class="progress-rule"><span style="width:${((scene.ordinal / blueprint.scenes.length) * 100).toFixed(2)}%;background:${design.accent}"></span></div>
    </div>
    <style>
      * { box-sizing: border-box; }
      .scene-frame { position:relative; width:1920px; height:1080px; overflow:hidden; color:${design.foreground}; background:${design.background}; font-family:"${design.bodyFont}",sans-serif; }
      .scene-content { position:relative; z-index:3; display:flex; flex-direction:column; justify-content:space-between; width:100%; height:100%; padding:70px 92px 62px; gap:30px; }
      .grid-field { position:absolute; inset:0; opacity:.42; background-image:linear-gradient(${design.surfaceRaised} 2px,transparent 2px),linear-gradient(90deg,${design.surfaceRaised} 2px,transparent 2px); background-size:96px 96px; mask-image:radial-gradient(circle at 64% 42%,#000 0%,rgba(0,0,0,.55) 48%,transparent 82%); }
      .orb-wrap { position:absolute; right:120px; top:130px; width:620px; height:620px; }
      .orb { width:100%; height:100%; border:4px solid ${design.accent}; border-radius:50%; opacity:.22; box-shadow:inset 0 0 120px ${design.surfaceRaised},0 0 110px ${design.surfaceRaised}; }
      .ghost-index { position:absolute; right:60px; bottom:-140px; color:${design.accent}; opacity:.16; font:900 520px/1 "${design.displayFont}",serif; letter-spacing:-.08em; }
      .top-rail,.bottom-rail { display:flex; align-items:center; justify-content:space-between; gap:32px; color:${design.muted}; font:600 20px/1.25 "${design.monoFont}",monospace; letter-spacing:.09em; text-transform:uppercase; }
      .top-rail { padding-bottom:20px; border-bottom:3px solid ${design.surfaceRaised}; } .file-index { color:${design.accent}; }
      .hero-zone { display:grid; grid-template-columns:minmax(0,1.35fr) minmax(420px,.65fr); align-items:center; gap:72px; flex:1; }
      .layout-2 .hero-zone { grid-template-columns:minmax(430px,.72fr) minmax(0,1.28fr); } .layout-2 .headline-block { order:2; } .layout-2 .evidence-card { order:1; }
      .layout-3 .hero-zone { grid-template-columns:minmax(0,1fr) minmax(0,1fr); } .headline-block { max-width:1080px; }
      .layout-4 .hero-zone { grid-template-columns:1fr; grid-template-rows:auto auto; align-content:center; gap:38px; } .layout-4 .evidence-card { min-height:180px; flex-direction:row; align-items:center; } .layout-4 .evidence-card p { max-width:620px; }
      .layout-5 .hero-zone { grid-template-columns:minmax(430px,.55fr) minmax(0,1.45fr); } .layout-5 .headline-block { order:2; } .layout-5 .evidence-card { order:1; min-height:520px; border-left-width:12px; box-shadow:-20px 24px 0 ${design.surfaceRaised}; }
      .layout-6 .hero-zone { grid-template-columns:1fr; justify-items:center; text-align:center; gap:42px; } .layout-6 .headline-block { max-width:1380px; } .layout-6 .evidence-card { width:82%; min-height:170px; flex-direction:row; align-items:center; text-align:left; } .layout-6 .evidence-card p { max-width:620px; }
      .eyebrow { margin:0 0 20px; font:700 22px/1 "${design.monoFont}",monospace; letter-spacing:.18em; }
      h2 { margin:0; max-width:1180px; color:${design.foreground}; background-color:${design.background}; font:900 94px/1.04 "${design.displayFont}",serif; letter-spacing:-.035em; text-wrap:balance; }
      .scene-body { margin:28px 0 0; max-width:1080px; color:${design.muted}; font-size:31px; line-height:1.62; font-weight:350; }
      .evidence-card { min-height:360px; display:flex; flex-direction:column; justify-content:space-between; gap:30px; padding:42px; border:4px solid ${design.accent}; border-radius:2px; background:${design.surface}; box-shadow:24px 28px 0 ${design.surfaceRaised}; }
      .evidence-mode { color:${design.muted}; font:600 19px/1.4 "${design.monoFont}",monospace; text-transform:uppercase; letter-spacing:.08em; }
      .evidence-card strong { font:900 44px/1 "${design.displayFont}",serif; letter-spacing:.02em; } .evidence-card p { margin:0; color:${design.foreground}; font:500 22px/1.55 "${design.monoFont}",monospace; overflow-wrap:anywhere; }
      .bottom-rail { padding-top:18px; border-top:3px solid ${design.surfaceRaised}; font-size:17px; } .progress-rule { width:100%; height:8px; background:${design.surfaceRaised}; transform-origin:left center; } .progress-rule span { display:block; height:100%; }
    </style>
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
    <script>
      window.__timelines = window.__timelines || {};
      const tl = gsap.timeline({ paused: true });
      const root = '[data-composition-id="${id}"]';
      tl.fromTo(root+' .grid-field',{opacity:0},{opacity:.42,duration:.8,ease:'sine.out'},${entrance.toFixed(3)});
      tl.fromTo(root+' .orb-wrap',{opacity:0,scale:.72},{opacity:1,scale:1,duration:.95,ease:'expo.out'},${(entrance + 0.05).toFixed(3)});
      tl.fromTo(root+' .ghost-index',{opacity:0,x:90},{opacity:.16,x:0,duration:.72,ease:'power4.out'},${(entrance + 0.12).toFixed(3)});
      tl.fromTo(root+' .top-rail',{opacity:0,y:-34},{opacity:1,y:0,duration:.48,ease:'back.out(1.25)'},${(entrance + 0.18).toFixed(3)});
      tl.fromTo(root+' .headline-block',{opacity:0,x:-72},{opacity:1,x:0,duration:.68,ease:'expo.out'},${(entrance + 0.25).toFixed(3)});
      tl.fromTo(root+' .evidence-card',{opacity:0,y:68,rotation:${sceneIndex % 2 ? -1.4 : 1.4}},{opacity:1,y:0,rotation:0,duration:.78,ease:'power3.out'},${(entrance + 0.38).toFixed(3)});
      tl.fromTo(root+' .bottom-rail',{opacity:0,x:46},{opacity:1,x:0,duration:.52,ease:'sine.out'},${(entrance + 0.48).toFixed(3)});
      tl.fromTo(root+' .progress-rule',{opacity:0,scaleX:0},{opacity:1,scaleX:1,duration:.62,ease:'power2.out',transformOrigin:'left center'},${(entrance + 0.55).toFixed(3)});
      tl.to(root+' .orb',{x:${driftX},y:${driftY},rotation:${sceneIndex % 2 ? -7 : 7},yoyo:true,repeat:${repeats},duration:${ambientDuration.toFixed(2)},ease:'sine.inOut'},${(entrance + 1).toFixed(3)});
      window.__timelines["${id}"] = tl;
    </script>
  </div>
</template>
`;
}

function professionalSceneCompositionHtml(scene, blueprint, design, clipDuration, sceneIndex, visualAsset = null) {
  const index = String(scene.ordinal).padStart(2, "0");
  const id = `scene-${index}`;
  const status = scene.claimStatus ? scene.claimStatus.toUpperCase() : "EDITORIAL";
  const statusColor = scene.claimStatus === "alleged" ? design.alleged : design.accent;
  const source = scene.sourceLocator ?? (blueprint.language === "ja" ? "検証方法と出典一覧は概要欄に記載" : "Method and complete source manifest in description");
  const entrance = sceneIndex === 0 ? 0.15 : 0.60;
  const headline = scene.ordinal === 1 ? blueprint.title : beatLabel(scene.beat, blueprint.language);
  const world = renderSceneArchetype({
    scene,
    design,
    index,
    status: escapeHtml(status),
    statusColor,
    source: escapeHtml(source),
    headline: escapeHtml(headline),
    body: escapeHtml(sceneBody(scene, blueprint)),
    evidenceMode: escapeHtml(scene.evidenceMode),
  });
  const ambientDuration = Math.max(2, Math.min(clipDuration - entrance - 1.1, 8));
  const repeats = Math.max(0, Math.ceil((clipDuration - entrance - 1.1) / ambientDuration) - 1);
  const variants = [
    { primaryX: -84, primaryY: 12, secondaryX: 58, secondaryY: 34, primaryEase: "expo.out", secondaryEase: "power3.out", driftX: 34, driftY: -18 },
    { primaryX: 0, primaryY: 72, secondaryX: -66, secondaryY: 0, primaryEase: "power4.out", secondaryEase: "back.out(1.18)", driftX: -28, driftY: 22 },
    { primaryX: 66, primaryY: -12, secondaryX: 0, secondaryY: 64, primaryEase: "back.out(1.22)", secondaryEase: "expo.out", driftX: 18, driftY: 30 },
    { primaryX: -34, primaryY: 48, secondaryX: 78, secondaryY: -18, primaryEase: "power3.out", secondaryEase: "sine.out", driftX: -36, driftY: -12 },
  ];
  const motion = variants[sceneIndex % variants.length];
  const generatedVisual = visualAsset ? `<div class="generated-visual" data-visual-element="synthetic-abstract-reconstruction"><img src="../${escapeHtml(visualAsset.relativePath)}" alt="Abstract AI-generated reconstruction for scene ${index}" crossorigin="anonymous"><span>SYNTHETIC ABSTRACT RECONSTRUCTION</span></div>` : "";
  const generatedVisualTween = visualAsset ? `tl.fromTo(root+' .generated-visual',{opacity:0,scale:1.05},{opacity:.32,scale:1,duration:1.1,ease:'sine.out'},${(entrance + 0.08).toFixed(3)});` : "";
  return `<template id="${id}-template">
  <div class="scene-frame" data-composition-id="${id}" data-width="1920" data-height="1080" data-motion-signature="${world.motionSignature}" data-claim-status="${escapeHtml(status.toLowerCase())}">
    <div class="texture-field" data-layout-ignore data-visual-element="background-texture"></div>
    ${generatedVisual}
    <div class="atmosphere-wrap" data-layout-ignore data-visual-element="atmospheric-depth"><div class="atmosphere-ring"></div></div>
    <div class="ghost-index" data-layout-ignore data-visual-element="scene-index">${index}</div>
    <div class="scene-content">
      <div class="top-rail" data-visual-element="editorial-rail"><span class="file-index">FILE ${index} / ${escapeHtml(scene.beat.toUpperCase())}</span><span>${escapeHtml(scene.visualWorld)}</span></div>
      ${world.markup}
      <div class="bottom-rail" data-visual-element="provenance-rail"><span>${escapeHtml(design.layoutSignature)} / ${escapeHtml(world.archetype)}</span><span>${escapeHtml(scene.choreographyVerb)} / ${escapeHtml(scene.transitionOut)}</span><span>${index} / ${String(blueprint.scenes.length).padStart(2, "0")}</span></div>
      <div class="progress-rule" data-visual-element="chapter-progress"><span style="width:${((scene.ordinal / blueprint.scenes.length) * 100).toFixed(2)}%;background:${design.accent}"></span></div>
    </div>
    <style>
      * { box-sizing:border-box; }
      .scene-frame { position:relative; width:1920px; height:1080px; overflow:hidden; color:${design.foreground}; background:${design.background}; font-family:"${design.bodyFont}",sans-serif; }
      .scene-content { position:relative; z-index:3; display:flex; flex-direction:column; justify-content:space-between; width:100%; height:100%; padding:54px 72px 48px; gap:22px; }
      .texture-field { position:absolute; inset:0; opacity:.46; background-image:linear-gradient(${design.surfaceRaised} 2px,rgba(0,0,0,0) 2px),linear-gradient(90deg,${design.surfaceRaised} 2px,rgba(0,0,0,0) 2px); background-size:96px 96px; mask-image:radial-gradient(circle at 64% 42%,#000 0%,rgba(0,0,0,.55) 48%,rgba(0,0,0,0) 82%); }
      .generated-visual { position:absolute; z-index:1; right:2.5%; top:12%; width:46%; height:68%; overflow:hidden; border:3px solid ${design.surfaceRaised}; opacity:.32; mix-blend-mode:luminosity; }
      .generated-visual img { width:100%; height:100%; object-fit:cover; filter:contrast(1.08) saturate(.72); }
      .generated-visual span { position:absolute; right:18px; bottom:14px; padding:8px 10px; color:${design.foreground}; background:${design.background}; font:700 14px/1.2 "${design.monoFont}",monospace; letter-spacing:.08em; }
      .atmosphere-wrap { position:absolute; right:80px; top:90px; width:680px; height:680px; }
      .atmosphere-ring { width:100%; height:100%; border:4px solid ${design.accent}; border-radius:50%; opacity:.18; box-shadow:inset 0 0 140px ${design.surfaceRaised},0 0 120px ${design.surfaceRaised}; }
      .ghost-index { position:absolute; right:40px; bottom:-150px; color:${design.accent}; opacity:.14; font:900 520px/1 "${design.displayFont}",serif; letter-spacing:-.08em; }
      .top-rail,.bottom-rail { display:flex; align-items:center; justify-content:space-between; gap:32px; color:${design.muted}; font:600 18px/1.25 "${design.monoFont}",monospace; letter-spacing:.09em; text-transform:uppercase; }
      .top-rail { padding-bottom:16px; border-bottom:3px solid ${design.surfaceRaised}; }.file-index{color:${design.accent}}
      .eyebrow { margin:0 0 18px; font:700 20px/1 "${design.monoFont}",monospace; letter-spacing:.18em; }
      h2 { margin:0; max-width:1080px; color:${design.foreground}; background-color:${design.background}; font:900 82px/1.04 "${design.displayFont}",serif; letter-spacing:-.035em; text-wrap:balance; }
      .scene-body { margin:22px 0 0; max-width:980px; color:${design.muted}; font-size:28px; line-height:1.55; font-weight:350; }
      .bottom-rail { padding-top:14px; border-top:3px solid ${design.surfaceRaised}; font-size:15px; }.progress-rule{width:100%;height:7px;background:${design.surfaceRaised};transform-origin:left center}.progress-rule span{display:block;height:100%}
${professionalSceneCss(design)}
    </style>
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
    <script>
      window.__timelines = window.__timelines || {};
      const tl = gsap.timeline({ paused:true });
      const root = '[data-composition-id="${id}"]';
      tl.fromTo(root+' .texture-field',{opacity:0},{opacity:.46,duration:.84,ease:'sine.out'},${entrance.toFixed(3)});
      ${generatedVisualTween}
      tl.fromTo(root+' .atmosphere-wrap',{opacity:0,scale:.72},{opacity:1,scale:1,duration:1.05,ease:'expo.out'},${(entrance + 0.05).toFixed(3)});
      tl.fromTo(root+' .ghost-index',{opacity:0,x:90},{opacity:.14,x:0,duration:.72,ease:'power4.out'},${(entrance + 0.12).toFixed(3)});
      tl.fromTo(root+' .top-rail',{opacity:0,y:-34},{opacity:1,y:0,duration:.48,ease:'back.out(1.25)'},${(entrance + 0.18).toFixed(3)});
      tl.fromTo(root+' .world-primary',{opacity:0,x:${motion.primaryX},y:${motion.primaryY}},{opacity:1,x:0,y:0,duration:.76,ease:'${motion.primaryEase}'},${(entrance + 0.25).toFixed(3)});
      tl.fromTo(root+' .world-secondary',{opacity:0,x:${motion.secondaryX},y:${motion.secondaryY}},{opacity:1,x:0,y:0,duration:.88,ease:'${motion.secondaryEase}',stagger:.08},${(entrance + 0.36).toFixed(3)});
      tl.fromTo(root+' .bottom-rail',{opacity:0,x:46},{opacity:1,x:0,duration:.52,ease:'sine.out'},${(entrance + 0.48).toFixed(3)});
      tl.fromTo(root+' .progress-rule',{opacity:0,scaleX:0},{opacity:1,scaleX:1,duration:.62,ease:'power2.out',transformOrigin:'left center'},${(entrance + 0.55).toFixed(3)});
      tl.to(root+' .atmosphere-ring',{x:${motion.driftX},y:${motion.driftY},rotation:${sceneIndex % 2 ? -7 : 7},yoyo:true,repeat:${repeats},duration:${ambientDuration.toFixed(2)},ease:'sine.inOut'},${(entrance + 1).toFixed(3)});
      window.__timelines["${id}"] = tl;
    </script>
  </div>
</template>
`;
}

function clipTiming(scenes, duration, index) {
  const scene = scenes[index];
  const start = index === 0 ? 0 : Math.max(0, scene.startSeconds - 0.45);
  const end = index === scenes.length - 1 ? duration : Math.min(duration, scene.startSeconds + scene.durationSeconds + 0.45);
  return { start, duration: Number((end - start).toFixed(3)) };
}

function transitionFamily(index) {
  if (index > 0 && index % 7 === 0) return "blackout";
  if (index > 0 && index % 5 === 0) return "shutter";
  return "editorial-cover";
}

function rootTimeline(scenes, duration, captions) {
  const lines = ["      window.__timelines = window.__timelines || {};", "      const tl = gsap.timeline({ paused: true });", "      tl.set('#transition-cover',{xPercent:-110},0);", "      tl.set('#transition-shutter',{scaleY:0},0);", "      tl.set('#transition-blackout',{opacity:0},0);", "      tl.set('.scene-mount',{visibility:'hidden'},0);", "      tl.set('#scene-01',{visibility:'visible'},0);", "      tl.set('.caption-group',{opacity:0,visibility:'hidden'},0);"];
  scenes.slice(1).forEach((scene, offset) => {
    const index = offset + 1;
    const current = `#scene-${String(scene.ordinal).padStart(2, "0")}`;
    const prior = `#scene-${String(scenes[index - 1].ordinal).padStart(2, "0")}`;
    const direction = index % 2 === 0 ? 1 : -1;
    const start = scene.startSeconds;
    const family = transitionFamily(index);
    if (family === "shutter") {
      lines.push(`      tl.fromTo('#transition-shutter',{scaleY:0,transformOrigin:'center center'},{scaleY:1,duration:.34,ease:'power4.in',overwrite:'auto'},${(start - 0.35).toFixed(3)});`);
    } else if (family === "blackout") {
      lines.push(`      tl.fromTo('#transition-blackout',{opacity:0},{opacity:1,duration:.52,ease:'sine.in',overwrite:'auto'},${(start - 0.53).toFixed(3)});`);
    } else {
      lines.push(`      tl.fromTo('#transition-cover',{xPercent:${-110 * direction},skewX:${6 * direction}},{xPercent:0,skewX:0,duration:.44,ease:'power3.in',overwrite:'auto'},${(start - 0.45).toFixed(3)});`);
    }
    lines.push(`      tl.set('${prior}',{visibility:'hidden'},${start.toFixed(3)});`);
    lines.push(`      tl.set('${current}',{visibility:'visible'},${start.toFixed(3)});`);
    if (family === "shutter") {
      lines.push(`      tl.to('#transition-shutter',{scaleY:0,transformOrigin:'center center',duration:.42,ease:'expo.out',overwrite:'auto'},${(start + 0.01).toFixed(3)});`);
    } else if (family === "blackout") {
      lines.push(`      tl.to('#transition-blackout',{opacity:0,duration:.62,ease:'sine.out',overwrite:'auto'},${(start + 0.01).toFixed(3)});`);
    } else {
      lines.push(`      tl.to('#transition-cover',{xPercent:${110 * direction},duration:.44,ease:'power3.out',overwrite:'auto'},${(start + 0.01).toFixed(3)});`);
    }
  });
  const captionAnimations = [];
  captions.forEach((caption, index) => {
    const selector = `#caption-${String(index + 1).padStart(3, "0")}`;
    const start = Math.max(0, caption.start);
    const end = Math.min(duration, caption.end);
    const span = Math.max(0.03, end - start);
    const entranceDuration = Math.min(0.22, span * 0.4);
    const exitDuration = Math.min(0.14, span * 0.35);
    const exitStart = Math.max(start + entranceDuration, end - exitDuration);
    captionAnimations.push(`tl.set('${selector}',{visibility:'visible'},${start.toFixed(3)});`);
    captionAnimations.push(`tl.fromTo('${selector}',{opacity:0,y:22},{opacity:1,y:0,duration:${entranceDuration.toFixed(3)},ease:'power3.out',overwrite:'auto'},${start.toFixed(3)});`);
    captionAnimations.push(`tl.to('${selector}',{opacity:0,y:-12,duration:${exitDuration.toFixed(3)},ease:'power2.in',overwrite:'auto'},${exitStart.toFixed(3)});`);
    captionAnimations.push(`tl.set('${selector}',{opacity:0,visibility:'hidden'},${end.toFixed(3)});`);
  });
  lines.push(`      ${captionAnimations.join("")}`);
  const last = `#scene-${String(scenes.at(-1).ordinal).padStart(2, "0")}`;
  lines.push(`      tl.to('${last}',{opacity:0,duration:.8,ease:'power2.in'},${(duration - 0.8).toFixed(3)});`);
  lines.push('      window.__timelines["main"] = tl;');
  return lines.join("\n");
}

function normalizedCaptions(media, duration) {
  if (!Array.isArray(media?.captions)) return [];
  return media.captions
    .filter((caption) => Number.isFinite(caption.start) && Number.isFinite(caption.end) && caption.end > caption.start && caption.start < duration)
    .map((caption) => ({ ...caption, end: Math.min(duration, caption.end), text: String(caption.text).replaceAll("\\N", " ") }));
}

function indexHtml(blueprint, design, scenes, duration, compilerVersion, media) {
  const captions = normalizedCaptions(media, duration);
  const clips = scenes.map((scene, index) => {
    const clip = clipTiming(scenes, duration, index);
    const id = `scene-${String(scene.ordinal).padStart(2, "0")}`;
    const transition = index < scenes.length - 1 ? ` data-transition-family="${transitionFamily(index + 1)}"` : "";
    return `      <div id="${id}" class="scene-mount" style="visibility:${index === 0 ? "visible" : "hidden"}" data-composition-id="${id}" data-composition-src="compositions/${id}.html" data-start="${clip.start}" data-duration="${clip.duration}" data-width="1920" data-height="1080" data-track-index="${index % 2}"${transition}></div>`;
  }).join("\n");
  const captionHtml = captions.map((caption, index) => `<div id="caption-${String(index + 1).padStart(3, "0")}" class="caption-group" data-caption-group="${escapeHtml(caption.id ?? String(index + 1))}" data-layout-allow-overflow>${escapeHtml(caption.text)}</div>`).join("");
  const narrationHtml = media?.narrationRelativePath && media.narrationDurationSeconds > 0
    ? `      <audio id="narration-track" data-role="narration" src="${escapeHtml(media.narrationRelativePath)}" data-start="0" data-duration="${Math.min(duration, media.narrationDurationSeconds).toFixed(3)}" data-track-index="8" data-volume="1"></audio>`
    : "";
  return `<!doctype html>
<html lang="${blueprint.language}">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(blueprint.title)}</title>
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
    <style>
      * { box-sizing:border-box; } html,body { margin:0; width:100%; height:100%; overflow:hidden; background:${design.background}; }
      #root { position:relative; width:1920px; height:1080px; overflow:hidden; background:${design.background}; }
      .scene-mount { position:absolute; inset:0; width:1920px; height:1080px; overflow:hidden; }
      #transition-cover { position:absolute; z-index:20; inset:0; width:1920px; height:1080px; border-left:22px solid ${design.accent}; border-right:22px solid ${design.accent}; background:${design.surfaceRaised}; box-shadow:0 0 120px ${design.accent}; }
      #transition-shutter { position:absolute; z-index:21; inset:0; background:repeating-linear-gradient(0deg,${design.surfaceRaised} 0 54px,${design.accent} 54px 60px); }
      #transition-blackout { position:absolute; z-index:22; inset:0; background:${design.background}; }
      .caption-group { position:absolute; z-index:30; left:160px; right:160px; bottom:70px; padding:16px 28px; color:${design.foreground}; background:rgba(0,0,0,.82); border-left:8px solid ${design.accent}; font:800 48px/1.25 "${design.bodyFont}",sans-serif; text-align:center; text-wrap:balance; text-shadow:0 3px 12px #000; }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="${duration}" data-width="1920" data-height="1080" data-compiler-version="${compilerVersion}">
${clips}
${captionHtml}
${narrationHtml}
      <div id="transition-cover" data-layout-ignore></div>
      <div id="transition-shutter" data-layout-ignore></div>
      <div id="transition-blackout" data-layout-ignore></div>
    </div>
    <script>
${rootTimeline(scenes, duration, captions)}
    </script>
  </body>
</html>
`;
}

export function buildCompilationFiles({ blueprint, design, scenes, duration, previewSeconds, compilerVersion, media = null }) {
  const files = {
    "design.md": designMarkdown(design),
    ".hyperframes/expanded-prompt.md": expandedPrompt(blueprint, design, scenes, duration),
    "index.html": indexHtml(blueprint, design, scenes, duration, compilerVersion, media),
    "caption-overrides.json": "[]\n",
    "hyperframes.json": `${JSON.stringify({ $schema: "https://hyperframes.heygen.com/schema/hyperframes.json", registry: "https://raw.githubusercontent.com/heygen-com/hyperframes/main/registry", paths: { blocks: "compositions", components: "compositions/components", assets: "assets" } }, null, 2)}\n`,
    "meta.json": `${JSON.stringify({ id: `${blueprint.episodeId}${previewSeconds ? "-preview" : "-master"}`, name: blueprint.title, createdAt: "2026-08-02T00:00:00.000Z" }, null, 2)}\n`,
    "package.json": `${JSON.stringify({ name: `${blueprint.episodeId}${previewSeconds ? "-preview" : "-master"}`, private: true, type: "module", scripts: { check: "npx --yes hyperframes@0.4.45 lint && npx --yes hyperframes@0.4.45 validate && npx --yes hyperframes@0.4.45 inspect", render: "npx --yes hyperframes@0.4.45 render" } }, null, 2)}\n`
  };
  scenes.forEach((scene, index) => {
    const id = `scene-${String(scene.ordinal).padStart(2, "0")}`;
    const visualAsset = media?.visualAssets?.find((asset) => asset.sceneOrdinal === scene.ordinal) ?? null;
    files[`compositions/${id}.html`] = scene.entertainmentShot
      ? entertainmentShotCompositionHtml(scene, blueprint, design, clipTiming(scenes, duration, index).duration, index, visualAsset)
      : professionalSceneCompositionHtml(scene, blueprint, design, clipTiming(scenes, duration, index).duration, index, visualAsset);
  });
  return files;
}
