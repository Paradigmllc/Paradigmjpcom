const BEAT_ARCHETYPES = Object.freeze({
  hook: "kinetic-ledger",
  mechanism: "mechanism-flow",
  baseline: "temporal-axis",
  timeline: "temporal-axis",
  authority: "authority-network",
  boundary: "authority-network",
  oversight: "corroboration-ladder",
  collection: "document-stack",
  evidence: "document-stack",
  document: "document-stack",
  testimony: "testimony-split",
  counterclaim: "counterclaim-balance",
  corroboration: "corroboration-ladder",
  gap: "signal-gap",
  response: "mechanism-flow",
  reversal: "data-pulse",
  human_impact: "implication-radar",
  implications: "implication-radar",
  method: "source-matrix",
  outro: "manifest-close",
});

const VISUALIZATION_MODES = Object.freeze({
  "kinetic-ledger": "data-comparison",
  "mechanism-flow": "process-diagram",
  "temporal-axis": "verified-timeline",
  "document-stack": "source-document",
  "authority-network": "relationship-map",
  "corroboration-ladder": "evidence-ladder",
  "testimony-split": "record-comparison",
  "counterclaim-balance": "argument-balance",
  "signal-gap": "negative-space-analysis",
  "data-pulse": "data-chart",
  "implication-radar": "systems-radar",
  "source-matrix": "source-matrix",
  "manifest-close": "review-manifest",
  "evidence-canvas": "evidence-canvas",
});

export function sceneArchetypeFor(scene) {
  return BEAT_ARCHETYPES[scene.beat] ?? "evidence-canvas";
}

function sourceBlock(source, status, statusColor) {
  return `<div class="source-block world-secondary" data-visual-element="source-locator" data-source-locator>
    <span>${status}</span><p>${source}</p><i style="background:${statusColor}"></i>
  </div>`;
}

function headlineBlock(headline, body, status, statusColor) {
  return `<div class="world-copy world-primary" data-visual-element="editorial-copy">
    <p class="eyebrow" style="color:${statusColor}">${status}</p>
    <h2>${headline}</h2><p class="scene-body">${body}</p>
  </div>`;
}

function worldFrame(archetype, content) {
  return `<div class="story-world story-world--${archetype}" data-scene-archetype="${archetype}" data-visualization-mode="${VISUALIZATION_MODES[archetype]}">${content}</div>`;
}

function renderKineticLedger(input) {
  return worldFrame("kinetic-ledger", `${headlineBlock(input.headline, input.body, input.status, input.statusColor)}
    <div class="ledger-viz world-secondary" data-visual-element="ledger-comparison">
      <div class="ledger-column"><span>REPORTED</span><b style="height:88%;background:${input.design.accent}"></b></div>
      <div class="ledger-column"><span>CASH</span><b style="height:32%;background:${input.design.alleged}"></b></div>
      <div class="ledger-zero" data-visual-element="cash-gap">GAP</div>
    </div>${sourceBlock(input.source, input.status, input.statusColor)}`);
}

function renderMechanismFlow(input) {
  return worldFrame("mechanism-flow", `${headlineBlock(input.headline, input.body, input.status, input.statusColor)}
    <div class="flow-viz world-secondary" data-visual-element="mechanism-diagram">
      <span class="flow-node">ENTITY</span><i></i><span class="flow-node">REPORT</span><i></i><span class="flow-node">MARKET</span>
      <svg viewBox="0 0 720 190" aria-hidden="true"><path d="M30 145 C180 20 330 220 690 55" fill="none" stroke="${input.statusColor}" stroke-width="7"/><path d="M618 40 L690 55 L653 116" fill="none" stroke="${input.statusColor}" stroke-width="7"/></svg>
    </div>${sourceBlock(input.source, input.status, input.statusColor)}`);
}

function renderTemporalAxis(input) {
  return worldFrame("temporal-axis", `${headlineBlock(input.headline, input.body, input.status, input.statusColor)}
    <div class="timeline-viz world-secondary" data-visual-element="verified-timeline">
      <div class="timeline-line"></div>
      <span class="timeline-point is-past">BEFORE</span><span class="timeline-point is-focus" style="border-color:${input.statusColor}">RECORD</span><span class="timeline-point is-after">AFTER</span>
      <div class="timeline-date" style="color:${input.statusColor}">${input.index}</div>
    </div>${sourceBlock(input.source, input.status, input.statusColor)}`);
}

function renderDocumentStack(input) {
  return worldFrame("document-stack", `${headlineBlock(input.headline, input.body, input.status, input.statusColor)}
    <div class="document-viz world-secondary" data-visual-element="source-document">
      <article class="paper paper-back"></article><article class="paper paper-mid"></article>
      <article class="paper paper-front" style="border-color:${input.statusColor}"><span>SOURCE ${input.index}</span><b></b><b></b><b class="short"></b><em>${input.evidenceMode}</em></article>
    </div>${sourceBlock(input.source, input.status, input.statusColor)}`);
}

function renderAuthorityNetwork(input) {
  return worldFrame("authority-network", `<div class="network-viz world-primary" data-visual-element="authority-network">
      <svg viewBox="0 0 760 650" aria-label="Authority relationship diagram"><g stroke="${input.design.muted}" stroke-width="3" opacity=".7"><path d="M110 120L380 310L650 95M380 310L620 520M380 310L135 540"/></g><g fill="${input.design.surface}" stroke="${input.statusColor}" stroke-width="5"><circle cx="110" cy="120" r="55"/><circle cx="650" cy="95" r="55"/><circle cx="380" cy="310" r="92"/><circle cx="620" cy="520" r="55"/><circle cx="135" cy="540" r="55"/></g></svg><span class="network-label">RECORD</span>
    </div><div class="world-copy-column">${headlineBlock(input.headline, input.body, input.status, input.statusColor)}${sourceBlock(input.source, input.status, input.statusColor)}</div>`);
}

function renderCorroborationLadder(input) {
  return worldFrame("corroboration-ladder", `${headlineBlock(input.headline, input.body, input.status, input.statusColor)}
    <div class="ladder-viz world-secondary" data-visual-element="corroboration-ladder">
      ${["CLAIM", "SOURCE", "RECORD", "OUTCOME"].map((label, index) => `<div style="width:${52 + index * 14}%;border-color:${index === 3 ? input.statusColor : input.design.muted}"><span>0${index + 1}</span><b>${label}</b></div>`).join("")}
    </div>${sourceBlock(input.source, input.status, input.statusColor)}`);
}

function renderTestimonySplit(input) {
  return worldFrame("testimony-split", `${headlineBlock(input.headline, input.body, input.status, input.statusColor)}
    <div class="split-viz world-secondary" data-visual-element="testimony-comparison">
      <article><span>TESTIMONY</span><b></b><b></b><b></b></article><div class="versus" style="color:${input.statusColor}">VS</div><article><span>RECORD</span><b></b><b></b><b class="marked" style="background:${input.statusColor}"></b></article>
    </div>${sourceBlock(input.source, input.status, input.statusColor)}`);
}

function renderCounterclaimBalance(input) {
  return worldFrame("counterclaim-balance", `<div class="balance-viz world-primary" data-visual-element="counterclaim-balance">
      <div class="balance-beam"></div><div class="balance-stem"></div><div class="balance-pan is-left"><span>CLAIM</span></div><div class="balance-pan is-right" style="border-color:${input.statusColor}"><span>RECORD</span></div>
    </div><div class="world-copy-column">${headlineBlock(input.headline, input.body, input.status, input.statusColor)}${sourceBlock(input.source, input.status, input.statusColor)}</div>`);
}

function renderSignalGap(input) {
  return worldFrame("signal-gap", `${headlineBlock(input.headline, input.body, input.status, input.statusColor)}
    <div class="gap-viz world-secondary" data-visual-element="evidence-gap"><span>KNOWN</span><div class="signal-left"></div><div class="gap-space" style="border-color:${input.statusColor}">MISSING LINK</div><div class="signal-right"></div><span>PROVEN</span></div>
    ${sourceBlock(input.source, input.status, input.statusColor)}`);
}

function renderDataPulse(input) {
  return worldFrame("data-pulse", `${headlineBlock(input.headline, input.body, input.status, input.statusColor)}
    <div class="pulse-viz world-secondary" data-visual-element="data-reversal"><svg viewBox="0 0 760 330" aria-label="Reversal chart"><path d="M20 280L180 220L315 238L455 90L590 160L735 35" fill="none" stroke="${input.statusColor}" stroke-width="10"/><path d="M20 280L180 220L315 238L455 90L590 160L735 35L735 330L20 330Z" fill="${input.statusColor}" opacity=".12"/></svg><strong>${input.index}</strong></div>
    ${sourceBlock(input.source, input.status, input.statusColor)}`);
}

function renderImplicationRadar(input) {
  return worldFrame("implication-radar", `<div class="radar-viz world-primary" data-visual-element="implication-radar">
      <i></i><i></i><i></i><span class="radar-node n1">CONTROL</span><span class="radar-node n2">CASH</span><span class="radar-node n3">DISCLOSURE</span><b style="background:${input.statusColor}"></b>
    </div><div class="world-copy-column">${headlineBlock(input.headline, input.body, input.status, input.statusColor)}${sourceBlock(input.source, input.status, input.statusColor)}</div>`);
}

function renderSourceMatrix(input) {
  return worldFrame("source-matrix", `${headlineBlock(input.headline, input.body, input.status, input.statusColor)}
    <div class="matrix-viz world-secondary" data-visual-element="source-matrix">${["CLAIM", "AUTHORITY", "LOCATOR", "STATUS"].map((label, index) => `<div><span>${label}</span><b style="width:${62 + index * 9}%;background:${index === 3 ? input.statusColor : input.design.muted}"></b></div>`).join("")}</div>
    ${sourceBlock(input.source, input.status, input.statusColor)}`);
}

function renderManifestClose(input) {
  return worldFrame("manifest-close", `<div class="manifest-viz world-primary" data-visual-element="review-manifest"><span>HUMAN REVIEW REQUIRED</span><strong style="color:${input.statusColor}">${input.index}</strong><div class="stamp" style="border-color:${input.statusColor};color:${input.statusColor}">SOURCE<br/>CHECKED</div></div>
    <div class="world-copy-column">${headlineBlock(input.headline, input.body, input.status, input.statusColor)}${sourceBlock(input.source, input.status, input.statusColor)}</div>`);
}

function renderEvidenceCanvas(input) {
  return worldFrame("evidence-canvas", `${headlineBlock(input.headline, input.body, input.status, input.statusColor)}<div class="canvas-viz world-secondary" data-visual-element="evidence-canvas"><span>${input.evidenceMode}</span><b style="border-color:${input.statusColor}"></b><i></i></div>${sourceBlock(input.source, input.status, input.statusColor)}`);
}

const RENDERERS = Object.freeze({
  "kinetic-ledger": renderKineticLedger,
  "mechanism-flow": renderMechanismFlow,
  "temporal-axis": renderTemporalAxis,
  "document-stack": renderDocumentStack,
  "authority-network": renderAuthorityNetwork,
  "corroboration-ladder": renderCorroborationLadder,
  "testimony-split": renderTestimonySplit,
  "counterclaim-balance": renderCounterclaimBalance,
  "signal-gap": renderSignalGap,
  "data-pulse": renderDataPulse,
  "implication-radar": renderImplicationRadar,
  "source-matrix": renderSourceMatrix,
  "manifest-close": renderManifestClose,
  "evidence-canvas": renderEvidenceCanvas,
});

export function renderSceneArchetype(input) {
  const archetype = sceneArchetypeFor(input.scene);
  return {
    archetype,
    motionSignature: `${archetype}-${(input.scene.ordinal % 4) + 1}`,
    markup: RENDERERS[archetype](input),
  };
}
