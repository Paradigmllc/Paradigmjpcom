export const diagnosticPlayerDomScript = `
(() => {
  if (window.__diagnosticHfControls) return;
  window.__diagnosticHfControls = true;
  const speeds = [1, 1.25, 1.5, 2];
  const formatTime = (value) => {
    const safe = Number.isFinite(value) ? Math.max(0, value) : 0;
    return Math.floor(safe / 60) + ":" + String(Math.floor(safe % 60)).padStart(2, "0");
  };
  const getTimeline = (root) => {
    try {
      return root.querySelector("iframe")?.contentWindow?.__timelines?.["diagnostic-report-video"] || null;
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
    const current = root.querySelector("[data-hf-current-time]");
    const total = root.querySelector("[data-hf-duration]");
    const range = root.querySelector('[data-hf-control="timeline"]');
    const label = root.querySelector("[data-hf-active-chapter]");
    if (current) current.textContent = formatTime(time);
    if (total) total.textContent = formatTime(duration);
    if (range) { range.max = String(duration); range.value = String(Math.min(time, duration)); }
    root.querySelectorAll("[data-chapter-start]").forEach((button, index) => {
      const isActive = index === active;
      button.classList.toggle("border-sky-300", isActive);
      button.classList.toggle("bg-sky-300", isActive);
      button.classList.toggle("text-zinc-950", isActive);
      button.classList.toggle("border-white/10", !isActive);
      button.classList.toggle("bg-white/8", !isActive);
      button.classList.toggle("text-zinc-200", !isActive);
      if (isActive && label) label.textContent = button.getAttribute("data-chapter-label") || "";
    });
  };
  document.addEventListener("click", (event) => {
    const target = event.target instanceof Element ? event.target.closest("[data-hf-control],[data-chapter-start]") : null;
    if (!target) return;
    const root = target.closest("[data-diagnostic-hf-root]");
    if (!root) return;
    event.preventDefault();
    event.stopPropagation();
    const timeline = getTimeline(root);
    const chapterStart = target.getAttribute("data-chapter-start");
    if (chapterStart !== null) {
      const time = Number(chapterStart);
      timeline?.time?.(time); timeline?.play?.();
      send(root, { type: "seek", time }); send(root, { type: "play" });
      sync(root);
      return;
    }
    const control = target.getAttribute("data-hf-control");
    if (control === "toggle") {
      if (timeline?.paused?.()) { timeline.play(); send(root, { type: "play" }); }
      else { timeline?.pause?.(); send(root, { type: "pause" }); }
    }
    if (control === "replay") { timeline?.time?.(0); timeline?.play?.(); send(root, { type: "replay" }); }
    if (control === "speed") {
      const current = Number(root.getAttribute("data-hf-speed") || "1");
      const next = speeds[(Math.max(0, speeds.indexOf(current)) + 1) % speeds.length];
      root.setAttribute("data-hf-speed", String(next));
      const label = root.querySelector("[data-hf-speed-label]");
      if (label) label.textContent = next + "x";
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
    const timeline = getTimeline(root);
    timeline?.time?.(time); send(root, { type: "seek", time }); sync(root);
  }, true);
  window.setInterval(() => document.querySelectorAll("[data-diagnostic-hf-root]").forEach(sync), 250);
})();`
