export const diagnosticPlayerDomScript = `
(() => {
  if (window.__diagnosticHfDomControls) return;
  window.__diagnosticHfDomControls = true;
  const speeds = [1, 1.25, 1.5, 2];
  const formatTime = (value) => {
    const safe = Number.isFinite(value) ? Math.max(0, value) : 0;
    return Math.floor(safe / 60) + ":" + String(Math.floor(safe % 60)).padStart(2, "0");
  };
  const getTimeline = (root) => {
    const iframe = root.querySelector("iframe");
    try {
      return iframe?.contentWindow?.__timelines?.["diagnostic-report-video"] || null;
    } catch (error) {
      console.error("[diagnostic-report] iframe timeline access failed:", error);
      return null;
    }
  };
  const send = (root, payload) => root.querySelector("iframe")?.contentWindow?.postMessage({ source: "diagnostic-report-player", ...payload }, "*");
  const sync = (root) => {
    const timeline = getTimeline(root);
    if (!timeline) return;
    const time = Number(timeline.time?.() || 0);
    const duration = Number(timeline.duration?.() || 36);
    const active = Math.max(0, Math.min(4, Math.floor(time / 7)));
    root.querySelector("[data-hf-current-time]").textContent = formatTime(time);
    root.querySelector("[data-hf-duration]").textContent = formatTime(duration);
    const slider = root.querySelector('[data-hf-control="timeline"]');
    if (slider) { slider.max = String(duration); slider.value = String(Math.min(time, duration)); }
    root.querySelectorAll("[data-chapter-start]").forEach((button, index) => {
      const isActive = index === active;
      button.classList.toggle("border-sky-300", isActive);
      button.classList.toggle("bg-sky-300", isActive);
      button.classList.toggle("text-zinc-950", isActive);
      button.classList.toggle("border-white/10", !isActive);
      button.classList.toggle("bg-white/8", !isActive);
      button.classList.toggle("text-zinc-200", !isActive);
    });
  };
  document.addEventListener("click", (event) => {
    const target = event.target instanceof Element ? event.target.closest("[data-hf-control],[data-chapter-start]") : null;
    if (!target) return;
    const root = target.closest("[data-diagnostic-hf-root]");
    if (!root) return;
    const timeline = getTimeline(root);
    const chapterStart = target.getAttribute("data-chapter-start");
    if (chapterStart !== null) {
      const time = Number(chapterStart);
      timeline?.time?.(time); timeline?.play?.(); send(root, { type: "seek", time }); send(root, { type: "play" }); sync(root);
      return;
    }
    const control = target.getAttribute("data-hf-control");
    if (control === "toggle") { send(root, { type: "toggle" }); if (timeline?.paused?.()) timeline.play(); else timeline?.pause?.(); }
    if (control === "replay") { timeline?.time?.(0); timeline?.play?.(); send(root, { type: "replay" }); }
    if (control === "speed") {
      const current = Number(root.getAttribute("data-hf-speed") || "1");
      const next = speeds[(Math.max(0, speeds.indexOf(current)) + 1) % speeds.length];
      root.setAttribute("data-hf-speed", String(next));
      root.querySelector("[data-hf-speed-label]").textContent = next + "x";
      timeline?.timeScale?.(next); send(root, { type: "speed", speed: next });
    }
    sync(root);
  }, true);
  document.addEventListener("input", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement) || target.getAttribute("data-hf-control") !== "timeline") return;
    const root = target.closest("[data-diagnostic-hf-root]");
    if (!root) return;
    const time = Number(target.value);
    getTimeline(root)?.time?.(time); send(root, { type: "seek", time }); sync(root);
  }, true);
  window.setInterval(() => document.querySelectorAll("[data-diagnostic-hf-root]").forEach(sync), 250);
})();`
