import type { VideoTemplateFormatConfig } from "./video-template-format"

export function buildVideoTemplateScript(formatConfig: VideoTemplateFormatConfig): string {
  return `
    function fitComposition() {
      document.documentElement.style.setProperty("--hf-scale", String(Math.min(window.innerWidth / ${formatConfig.width}, window.innerHeight / ${formatConfig.height})));
    }
    fitComposition();
    window.addEventListener("resize", fitComposition);
    window.__timelines = window.__timelines || {};
    const DURATION = 36;
    const SCENE_LEN = 7;
    const SCENE_IDS = ["#scene-hero", "#scene-evidence", "#scene-loss", "#scene-demo", "#scene-cta"];

    function updateChapter(time) {
      const active = Math.max(0, Math.min(4, Math.floor(time / SCENE_LEN)));
      document.querySelectorAll(".chapter-pill").forEach(function (pill, index) {
        pill.classList.toggle("is-active", index === active);
      });
    }
    function dispatchSeek(time) {
      updateChapter(time);
      window.__hfThreeTime = time;
      window.dispatchEvent(new CustomEvent("hf-seek", { detail: { time: time } }));
    }

    var tl = gsap.timeline({
      paused: true,
      onUpdate: function () { dispatchSeek(tl.time()); },
      onStart: function () { dispatchSeek(tl.time()); }
    });

    gsap.set(SCENE_IDS, { autoAlpha: 0 });

    tl.to(".grid-bg", { scale: 1.08, x: -28, y: 16, duration: DURATION, ease: "none" }, 0);
    tl.to(".wash", { xPercent: 8, yPercent: -5, scale: 1.06, duration: DURATION, ease: "sine.inOut" }, 0);
    tl.fromTo(".data-node", { scale: .6, opacity: .12 }, { scale: 1.7, opacity: .55, duration: 2.4, ease: "power2.inOut", stagger: .28, yoyo: true, repeat: 10 }, 0);

    document.querySelector(".chapter-pill")?.classList.add("is-active");

    SCENE_IDS.forEach(function (sceneId, index) {
      var at = index * SCENE_LEN;
      var sceneEl = document.querySelector(sceneId);
      if (!sceneEl) return;

      tl.set(sceneEl, { autoAlpha: 1, opacity: 1 }, at);

      var kickerEl = sceneEl.querySelector(".kicker");
      var h1El = sceneEl.querySelector("h1");
      var pEl = sceneEl.querySelector("p");
      var captionEl = sceneEl.querySelector(".caption-band");
      var panelEl = sceneEl.querySelector(".panel, .cta-actions");

      if (kickerEl) tl.from(kickerEl, { y: 18, opacity: 0, duration: .55, ease: "power3.out" }, at + .05);
      if (h1El) tl.from(h1El, { y: 34, opacity: 0, duration: .75, ease: "power3.out" }, at + .15);
      if (pEl) tl.from(pEl, { y: 24, opacity: 0, duration: .65, ease: "power3.out" }, at + .3);
      if (captionEl) tl.from(captionEl, { clipPath: "inset(0 100% 0 0)", opacity: 0 }, { clipPath: "inset(0 0% 0 0)", opacity: 1, duration: .62, ease: "power3.out" }, at + .75);
      if (panelEl) tl.from(panelEl, { y: 34, opacity: 0, scale: .985, duration: .8, ease: "power3.out" }, at + .2);

      var bars = gsap.utils.toArray(sceneEl.querySelectorAll(".bar i"));
      if (bars.length) tl.to(bars, { height: function(_, el){ return el.style.getPropertyValue("--h") || "0%"; }, duration: .9, ease: "power2.out" }, at + 1);

      var meters = gsap.utils.toArray(sceneEl.querySelectorAll(".meter i"));
      if (meters.length) tl.to(meters, { width: function(_, el){ return el.style.width || "0%"; }, duration: .75, ease: "power2.out", stagger: .07 }, at + .95);

      var auditPins = gsap.utils.toArray(sceneEl.querySelectorAll(".audit-pin"));
      if (auditPins.length) tl.fromTo(auditPins, { scale: .74, opacity: 0, y: 12 }, { scale: 1, opacity: 1, y: 0, duration: .42, ease: "back.out(1.7)", stagger: .42 }, at + 1.1);

      var routeSteps = gsap.utils.toArray(sceneEl.querySelectorAll(".route-step"));
      if (routeSteps.length) tl.fromTo(routeSteps, { x: 28, opacity: 0 }, { x: 0, opacity: 1, duration: .44, ease: "power3.out", stagger: .18 }, at + 1.05);

      var evidenceRows = gsap.utils.toArray(sceneEl.querySelectorAll(".evidence-row"));
      evidenceRows.forEach(function(row, rowIndex) {
        tl.to(row, { x: -8, scale: 1.02, duration: .35, ease: "power2.out", onStart: function(){ row.classList.add("is-focus"); } }, at + 1.15 + rowIndex * .72);
        tl.to(row, { x: 0, scale: 1, duration: .35, ease: "power2.in", onComplete: function(){ row.classList.remove("is-focus"); } }, at + 1.6 + rowIndex * .72);
      });

      tl.to(".progress i", { width: ((index + 1) / SCENE_IDS.length * 100) + "%", duration: (SCENE_LEN - .4), ease: "none" }, at);

      if (index < SCENE_IDS.length - 1) {
        var nextId = SCENE_IDS[index + 1];
        var transAt = at + SCENE_LEN - .3;
        tl.to(sceneId, { opacity: 0, duration: .4, ease: "power2.inOut" }, transAt);
        tl.fromTo(nextId, { opacity: 0 }, { opacity: 1, duration: .4, ease: "power2.inOut" }, transAt);
        tl.set(sceneId, { autoAlpha: 0, opacity: 1 }, transAt + .41);
      }
    });

    tl.to("#scene-cta", { opacity: 0, duration: .5, ease: "power2.in" }, DURATION - .6);

    var countEl = document.querySelector(".count");
    if (countEl) {
      tl.to({ value: 0 }, {
        value: Number(countEl.dataset.count || "0"),
        duration: 1.2,
        ease: "power2.out",
        onUpdate: function () { countEl.textContent = Math.round(this.targets()[0].value) + "%"; }
      }, .9);
    }

    window.__timelines["diagnostic-report-video"] = tl;
    dispatchSeek(0);

    window.addEventListener("message", function(event) {
      var message = event.data || {};
      if (message.source !== "diagnostic-report-player") return;
      if (message.type === "seek" && Number.isFinite(message.time)) {
        tl.time(Math.max(0, Math.min(DURATION, Number(message.time))));
        dispatchSeek(tl.time());
      }
      if (message.type === "toggle") { tl.paused() ? tl.play() : tl.pause(); }
      if (message.type === "play") tl.play();
      if (message.type === "pause") tl.pause();
      if (message.type === "replay") tl.time(0).play();
      if (message.type === "speed" && Number.isFinite(message.speed)) {
        tl.timeScale(Math.max(.5, Math.min(2, Number(message.speed))));
      }
    });

    var params = new URLSearchParams(window.location.search);
    if (params.get("embedded") === "1") {
      var strip = document.querySelector(".chapter-strip");
      var footer = document.querySelector(".footer");
      if (strip) strip.style.display = "none";
      if (footer) footer.style.display = "none";
    }
    if (params.get("autoplay") === "1" && !window.__HYPERFRAMES_PLAYER__) {
      window.requestAnimationFrame(function(){ tl.play(0); });
    }
  `
}
