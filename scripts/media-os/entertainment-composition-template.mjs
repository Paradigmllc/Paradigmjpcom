function escapeHtml(value) {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function compactText(value, maximum = 72) {
  const normalized = String(value ?? "").replaceAll(/\s+/g, " ").trim();
  return normalized.length <= maximum ? normalized : `${normalized.slice(0, maximum - 1)}…`;
}

export function entertainmentShotCompositionHtml(scene, blueprint, design, clipDuration, sceneIndex, visualAsset = null) {
  const index = String(scene.ordinal).padStart(2, "0");
  const id = `scene-${index}`;
  const hostClass = scene.hostMode === "fictional_host_pip" ? "host-pip" : scene.hostMode === "fictional_host_fullscreen" ? "host-fullscreen" : "story-plate";
  const source = scene.sourceLocator ?? (blueprint.language === "ja" ? "物語上の接続ショット" : "Editorial bridge shot");
  const headline = compactText(scene.onScreenCopy?.headline ?? scene.narrationExcerpt, blueprint.language === "ja" ? 34 : 58);
  const kicker = compactText(scene.onScreenCopy?.kicker ?? scene.storyFunction, 32);
  const variant = Number(scene.compositionVariant ?? ((sceneIndex % 4) + 1));
  const generatedMedia = visualAsset?.outputKind === "video"
    ? `<video id="${id}-generated-video" data-start="0" data-duration="${Number(clipDuration).toFixed(3)}" data-track-index="0" src="../${escapeHtml(visualAsset.relativePath)}" muted playsinline crossorigin="anonymous"></video>`
    : `<img src="../${escapeHtml(visualAsset?.relativePath)}" alt="Original synthetic ${escapeHtml(scene.visualMode)} for shot ${index}" crossorigin="anonymous">`;
  const image = visualAsset
    ? `<div class="visual-plate ${hostClass}" data-visual-element="primary-cinematic-plate">${generatedMedia}<span class="synthetic-label">SYNTHETIC · ORIGINAL CHARACTER / RECONSTRUCTION</span></div>`
    : `<div class="visual-plate generated-field ${hostClass}" data-visual-element="procedural-story-plate"><div class="document-fragment fragment-a"></div><div class="document-fragment fragment-b"></div><div class="document-fragment fragment-c"></div><div class="evidence-line"></div></div>`;
  const entrance = sceneIndex === 0 ? 0.12 : 0.22;
  const ambientDuration = Math.max(1.8, Math.min(clipDuration - 0.8, 4.2));
  const repeats = Math.max(0, Math.ceil((clipDuration - entrance) / ambientDuration) - 1);
  const drift = sceneIndex % 2 === 0 ? 1.035 : 1.025;
  return `<template id="${id}-template">
  <div class="entertainment-shot variant-${variant}" data-composition-id="${id}" data-width="1920" data-height="1080" data-scene-archetype="audience-first-${escapeHtml(scene.visualMode)}" data-motion-signature="${escapeHtml(scene.visualMode)}-${sceneIndex % 5}" data-claim-status="${escapeHtml(scene.claimStatus ?? "editorial")}">
    ${image}
    <div class="vignette" data-layout-ignore data-visual-element="cinematic-vignette"></div>
    <div class="grain" data-layout-ignore data-visual-element="film-grain"></div>
    <div class="light-slice" data-layout-ignore data-visual-element="moving-light"></div>
    <div class="shot-content">
      <div class="shot-rail" data-visual-element="shot-identity"><span>${index} / ${String(blueprint.scenes.length).padStart(2, "0")}</span><span>${escapeHtml(scene.storyFunction)}</span><span>${escapeHtml(scene.visualMode)}</span></div>
      <div class="narrative-anchor" data-visual-element="narrative-anchor"><small>${escapeHtml(kicker)}</small><p>${escapeHtml(headline)}</p></div>
      <div class="evidence-rail" data-visual-element="source-attribution"><span>${escapeHtml(scene.claimStatus ?? "EDITORIAL")}</span><span>${escapeHtml(compactText(source, 110))}</span></div>
      <div class="progress" data-visual-element="shot-progress"><span></span></div>
    </div>
    <style>
      *{box-sizing:border-box}.entertainment-shot{position:relative;width:1920px;height:1080px;overflow:hidden;color:${design.foreground};background:${design.background};font-family:"${design.bodyFont}",sans-serif}.visual-plate{position:absolute;inset:-26px;overflow:hidden;background:${design.surface}}.visual-plate img,.visual-plate video{width:100%;height:100%;object-fit:cover;filter:saturate(.86) contrast(1.12)}.visual-plate.host-pip{inset:110px 90px 130px auto;width:520px;border:4px solid ${design.accent};box-shadow:0 32px 100px #000}.visual-plate.host-pip img,.visual-plate.host-pip video{object-position:center top}.generated-field{background:radial-gradient(circle at 72% 38%,${design.surfaceRaised} 0,${design.surface} 42%,${design.background} 78%)}.document-fragment{position:absolute;width:38%;height:56%;border:3px solid ${design.muted};background:${design.surfaceRaised};box-shadow:0 35px 80px #000}.fragment-a{left:11%;top:18%;transform:rotate(-7deg)}.fragment-b{left:34%;top:9%;transform:rotate(4deg)}.fragment-c{right:8%;top:23%;transform:rotate(9deg)}.evidence-line{position:absolute;left:8%;right:8%;top:54%;height:8px;background:${design.accent};transform:rotate(-3deg)}.vignette{position:absolute;inset:0;background:radial-gradient(circle at 62% 40%,rgba(0,0,0,0) 22%,rgba(0,0,0,.32) 58%,rgba(0,0,0,.88) 100%)}.grain{position:absolute;inset:0;opacity:.16;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.82' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.45'/%3E%3C/svg%3E")}.light-slice{position:absolute;inset:-15%;background:linear-gradient(106deg,rgba(255,255,255,0) 38%,rgba(255,255,255,.16) 50%,rgba(255,255,255,0) 62%);transform:translateX(-42%)}.shot-content{position:relative;z-index:4;display:flex;flex-direction:column;justify-content:space-between;width:100%;height:100%;padding:54px 70px 50px;gap:24px}.shot-rail,.evidence-rail{display:flex;align-items:center;justify-content:space-between;gap:28px;font:800 17px/1.2 "${design.monoFont}",monospace;letter-spacing:.12em;text-transform:uppercase}.shot-rail{color:${design.foreground};text-shadow:0 3px 14px #000}.narrative-anchor{align-self:flex-start;margin-top:auto;max-width:1120px;padding:18px 26px;border-left:10px solid ${design.accent};background:rgba(0,0,0,.72);box-shadow:0 20px 70px rgba(0,0,0,.45)}.narrative-anchor small{display:block;margin-bottom:10px;color:${design.accent};font:900 15px/1 "${design.monoFont}",monospace;letter-spacing:.16em;text-transform:uppercase}.narrative-anchor p{margin:0;font:900 62px/1.13 "${design.displayFont}",serif;letter-spacing:-.035em;text-wrap:balance}.variant-2 .narrative-anchor{align-self:flex-end;border-left:0;border-right:10px solid ${design.accent};text-align:right}.variant-3 .narrative-anchor{max-width:880px;margin-left:7%;transform:rotate(-1.2deg)}.variant-4 .narrative-anchor{max-width:1320px;align-self:center;text-align:center;border-left:0;border-bottom:10px solid ${design.accent}}.variant-2 .visual-plate img,.variant-2 .visual-plate video{object-position:70% center}.variant-3 .visual-plate img,.variant-3 .visual-plate video{object-position:30% center}.evidence-rail{padding-top:15px;border-top:3px solid ${design.accent};color:${design.foreground};font-size:15px;text-shadow:0 2px 10px #000}.evidence-rail span:last-child{max-width:1280px;text-align:right}.progress{height:7px;background:${design.surfaceRaised}}.progress span{display:block;width:${((scene.ordinal / blueprint.scenes.length) * 100).toFixed(2)}%;height:100%;background:${design.accent}}.synthetic-label{position:absolute;right:26px;bottom:24px;padding:9px 12px;color:${design.foreground};background:rgba(0,0,0,.78);font:800 13px/1 "${design.monoFont}",monospace;letter-spacing:.09em}
    </style>
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
    <script>
      window.__timelines=window.__timelines||{};const tl=gsap.timeline({paused:true});const root='[data-composition-id="${id}"]';
      tl.fromTo(root+' .visual-plate',{opacity:0,scale:1.075},{opacity:1,scale:${drift},duration:${Math.max(1.2, clipDuration - .2).toFixed(3)},ease:'sine.out'},${entrance});
      tl.fromTo(root+' .shot-rail',{opacity:0,y:-34},{opacity:1,y:0,duration:.42,ease:'expo.out'},${entrance + .08});
      tl.fromTo(root+' .narrative-anchor',{opacity:0,x:-90},{opacity:1,x:0,duration:.58,ease:'power4.out'},${entrance + .18});
      tl.fromTo(root+' .evidence-rail',{opacity:0,y:32},{opacity:1,y:0,duration:.68,ease:'back.out(1.16)'},${entrance + .26});
      tl.fromTo(root+' .progress',{opacity:0,scaleX:0},{opacity:1,scaleX:1,duration:.54,ease:'power2.out',transformOrigin:'left center'},${entrance + .34});
      tl.to(root+' .light-slice',{xPercent:84,yoyo:true,repeat:${repeats},duration:${ambientDuration.toFixed(3)},ease:'sine.inOut'},${entrance + .42});
      window.__timelines["${id}"]=tl;
    </script>
  </div>
</template>\n`;
}
