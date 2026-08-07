export function professionalSceneCss(design) {
  return `
      .story-world { display:grid; grid-template-columns:minmax(0,1.12fr) minmax(520px,.88fr); align-items:center; gap:64px; min-height:710px; flex:1; }
      .world-copy { position:relative; z-index:2; max-width:1040px; }
      .world-copy-column { display:flex; flex-direction:column; gap:34px; }
      .world-copy-column .source-block { margin-top:0; }
      .world-primary,.world-secondary { position:relative; }
      .source-block { position:relative; display:grid; grid-template-columns:150px 1fr; align-items:start; gap:24px; margin-top:28px; padding:22px 28px; border:2px solid ${design.surfaceRaised}; background:${design.surface}; box-shadow:12px 14px 0 ${design.surfaceRaised}; }
      .source-block span { color:${design.accent}; font:700 17px/1.3 "${design.monoFont}",monospace; letter-spacing:.12em; }
      .source-block p { margin:0; color:${design.foreground}; font:500 18px/1.45 "${design.monoFont}",monospace; overflow-wrap:anywhere; }
      .source-block i { position:absolute; left:0; top:0; width:8px; height:100%; }
      .ledger-viz { display:grid; grid-template-columns:1fr 1fr; align-items:end; gap:36px; height:520px; padding:46px 52px; border:3px solid ${design.surfaceRaised}; background:${design.surface}; }
      .ledger-column { display:flex; flex-direction:column; justify-content:flex-end; height:100%; gap:16px; color:${design.muted}; font:700 18px "${design.monoFont}",monospace; letter-spacing:.1em; }
      .ledger-column b { display:block; min-height:30px; box-shadow:12px 12px 0 ${design.surfaceRaised}; }
      .ledger-zero { position:absolute; right:-22px; top:42%; padding:14px 18px; color:${design.background}; background:${design.foreground}; font:900 26px "${design.monoFont}",monospace; transform:rotate(3deg); }
      .flow-viz { height:500px; display:grid; grid-template-columns:1fr 60px 1fr 60px 1fr; align-items:center; gap:10px; padding:40px; border:3px solid ${design.surfaceRaised}; background:${design.surface}; overflow:hidden; }
      .flow-viz svg { position:absolute; inset:145px 20px auto; width:calc(100% - 40px); height:220px; opacity:.65; }
      .flow-node { position:relative; z-index:2; display:grid; place-items:center; height:120px; border:3px solid ${design.muted}; background:${design.background}; color:${design.foreground}; font:800 23px "${design.monoFont}",monospace; }
      .flow-viz>i { height:3px; background:${design.muted}; }
      .timeline-viz { height:460px; display:grid; grid-template-columns:1fr 1fr 1fr; align-items:center; gap:0; padding:70px 30px; border:3px solid ${design.surfaceRaised}; background:${design.surface}; }
      .timeline-line { position:absolute; left:8%; right:8%; top:50%; height:5px; background:${design.muted}; }
      .timeline-point { position:relative; z-index:2; display:grid; place-items:center; width:160px; height:160px; justify-self:center; border:5px solid ${design.surfaceRaised}; border-radius:50%; background:${design.background}; color:${design.foreground}; font:800 18px "${design.monoFont}",monospace; }
      .timeline-point.is-focus { width:210px; height:210px; font-size:24px; box-shadow:0 0 80px ${design.surfaceRaised}; }
      .timeline-date { position:absolute; right:34px; bottom:44px; font:900 132px/.85 "${design.displayFont}",serif; opacity:.22; }
      .document-viz { position:relative; height:570px; perspective:1200px; }
      .paper { position:absolute; inset:30px 50px; padding:46px; border:4px solid ${design.surfaceRaised}; background:${design.foreground}; box-shadow:28px 34px 0 rgba(0,0,0,.35); }
      .paper-back { transform:rotate(-7deg) translate(-28px,18px); opacity:.24; }
      .paper-mid { transform:rotate(5deg) translate(28px,-8px); opacity:.42; }
      .paper-front { display:flex; flex-direction:column; gap:26px; color:${design.background}; transform:rotate(-1.5deg); }
      .paper-front span,.paper-front em { font:800 18px "${design.monoFont}",monospace; letter-spacing:.12em; text-transform:uppercase; }
      .paper-front b { width:100%; height:22px; background:${design.background}; opacity:.72; }
      .paper-front b.short { width:58%; }
      .paper-front em { margin-top:auto; font-style:normal; opacity:.75; }
      .network-viz { height:650px; padding:20px; border:3px solid ${design.surfaceRaised}; background:radial-gradient(circle at 50% 48%,${design.surface} 0%,${design.background} 72%); }
      .network-viz svg { width:100%; height:100%; }
      .network-label { position:absolute; left:50%; top:49%; z-index:2; padding:8px 12px; color:${design.foreground}; background:${design.surface}; font:800 25px/1 "${design.monoFont}",monospace; transform:translate(-50%,-50%); }
      .ladder-viz { display:flex; flex-direction:column; justify-content:center; gap:22px; height:520px; padding:50px; border:3px solid ${design.surfaceRaised}; background:${design.surface}; }
      .ladder-viz>div { display:flex; align-items:center; justify-content:space-between; min-height:78px; padding:0 26px; border:3px solid ${design.muted}; background:${design.background}; }
      .ladder-viz span { color:${design.muted}; font:700 17px "${design.monoFont}",monospace; }.ladder-viz b { color:${design.foreground}; font:900 27px "${design.displayFont}",serif; }
      .split-viz { display:grid; grid-template-columns:1fr 74px 1fr; align-items:center; gap:22px; height:520px; }
      .split-viz article { display:flex; flex-direction:column; gap:30px; height:100%; padding:42px; border:3px solid ${design.surfaceRaised}; background:${design.surface}; }
      .split-viz article span { margin-bottom:auto; color:${design.foreground}; font:900 30px "${design.displayFont}",serif; }
      .split-viz article b { height:24px; background:${design.muted}; opacity:.65; }.split-viz article b.marked { opacity:1; }
      .versus { font:900 34px "${design.monoFont}",monospace; text-align:center; }
      .balance-viz { position:relative; height:630px; border:3px solid ${design.surfaceRaised}; background:${design.surface}; }
      .balance-beam { position:absolute; left:12%; right:12%; top:42%; height:12px; background:${design.foreground}; transform:rotate(-4deg); }
      .balance-stem { position:absolute; left:49%; top:42%; width:18px; height:290px; background:${design.foreground}; clip-path:polygon(45% 0,55% 0,100% 100%,0 100%); }
      .balance-pan { position:absolute; top:26%; display:grid; place-items:center; width:220px; height:150px; border:5px solid ${design.muted}; border-radius:0 0 110px 110px; color:${design.foreground}; font:900 24px "${design.monoFont}",monospace; }
      .balance-pan.is-left { left:8%; }.balance-pan.is-right { right:8%; top:18%; }
      .gap-viz { display:grid; grid-template-columns:auto 1fr 220px 1fr auto; align-items:center; gap:22px; height:390px; padding:56px; border:3px solid ${design.surfaceRaised}; background:${design.surface}; }
      .gap-viz>span { color:${design.muted}; font:800 18px "${design.monoFont}",monospace; }.signal-left,.signal-right { height:6px; background:${design.foreground}; }
      .gap-space { display:grid; place-items:center; height:230px; border:5px dashed; color:${design.foreground}; font:900 20px "${design.monoFont}",monospace; text-align:center; }
      .pulse-viz { height:470px; padding:38px; border:3px solid ${design.surfaceRaised}; background:${design.surface}; }
      .pulse-viz svg { width:100%; height:100%; }.pulse-viz strong { position:absolute; right:34px; top:20px; color:${design.foreground}; font:900 96px "${design.displayFont}",serif; opacity:.16; }
      .radar-viz { position:relative; height:650px; border:3px solid ${design.surfaceRaised}; background:${design.surface}; overflow:hidden; }
      .radar-viz>i { position:absolute; left:50%; top:50%; border:3px solid ${design.muted}; border-radius:50%; transform:translate(-50%,-50%); opacity:.45; }
      .radar-viz>i:nth-child(1){width:520px;height:520px}.radar-viz>i:nth-child(2){width:350px;height:350px}.radar-viz>i:nth-child(3){width:180px;height:180px}
      .radar-viz>b { position:absolute; left:50%; top:50%; width:18px; height:18px; border-radius:50%; transform:translate(-50%,-50%); box-shadow:0 0 60px currentColor; }
      .radar-node { position:absolute; padding:12px 16px; border:2px solid ${design.muted}; background:${design.background}; color:${design.foreground}; font:700 16px "${design.monoFont}",monospace; }.radar-node.n1{left:12%;top:18%}.radar-node.n2{right:10%;top:38%}.radar-node.n3{left:22%;bottom:12%}
      .matrix-viz { display:flex; flex-direction:column; gap:18px; height:480px; padding:46px; border:3px solid ${design.surfaceRaised}; background:${design.surface}; }
      .matrix-viz>div { display:grid; grid-template-columns:180px 1fr; align-items:center; gap:24px; flex:1; border-bottom:2px solid ${design.surfaceRaised}; }
      .matrix-viz span { color:${design.foreground}; font:700 18px "${design.monoFont}",monospace; }.matrix-viz b { display:block; height:18px; opacity:.75; }
      .manifest-viz { position:relative; display:grid; place-items:center; height:650px; border:4px solid ${design.surfaceRaised}; background:${design.surface}; }
      .manifest-viz>span { position:absolute; left:34px; top:34px; color:${design.muted}; font:700 17px "${design.monoFont}",monospace; letter-spacing:.12em; }.manifest-viz>strong { font:900 260px/1 "${design.displayFont}",serif; opacity:.2; }
      .stamp { position:absolute; display:grid; place-items:center; width:270px; height:170px; border:8px double; font:900 28px/1.2 "${design.monoFont}",monospace; text-align:center; transform:rotate(-9deg); }
      .canvas-viz { display:grid; place-items:center; height:520px; border:3px solid ${design.surfaceRaised}; background:${design.surface}; }.canvas-viz span{font:900 40px "${design.displayFont}",serif}.canvas-viz b{width:70%;height:55%;border:5px solid}.canvas-viz i{width:45%;height:8px;background:${design.muted};}
  `;
}
