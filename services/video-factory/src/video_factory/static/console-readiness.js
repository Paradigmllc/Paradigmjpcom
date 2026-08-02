(() => {
  const kindLabels = {
    text_motion: "文字・モーション",
    ui_capture: "Web・UI収録",
    chart: "図表・データ",
    generative: "生成Bロール",
    supplied_edit: "支給映像編集",
    three_d: "3D",
    technical_diagram: "技術図解",
    portrait_animation: "人物アニメ",
    lip_sync: "リップシンク",
    transition: "トランジション",
  }

  function stateLabel(value) {
    return { ready: "本番可", conditional: "条件付き", blocked: "未対応" }[value] || value
  }

  function badgeClass(value) {
    return { ready: "good", conditional: "warn", blocked: "bad" }[value] || "neutral"
  }

  function renderReadiness(snapshot) {
    const badge = $("#studio-readiness-badge")
    badge.textContent = stateLabel(snapshot.status)
    badge.className = `badge ${badgeClass(snapshot.status)}`
    $("#studio-readiness-score").textContent = `${snapshot.score}`
    $("#studio-template-count").textContent = `${snapshot.template_count}`
    $("#studio-capability-count").textContent = `${snapshot.ready_capabilities} / ${snapshot.capabilities.length}`
    $("#studio-safe-parallel").textContent = `${snapshot.capacity.safe_parallel_jobs}`
    $("#studio-readiness-time").textContent = formatTime(snapshot.generated_at)
    $("#studio-capability-list").innerHTML = snapshot.capabilities.map((item) => `
      <article class="readiness-capability ${escapeHtml(item.state)}">
        <div class="readiness-capability-head">
          <div><strong>${escapeHtml(kindLabels[item.shot_kind] || item.shot_kind)}</strong><small>${escapeHtml(item.shot_kind)}</small></div>
          <span class="badge ${badgeClass(item.state)}">${stateLabel(item.state)}</span>
        </div>
        <div class="readiness-route">
          <span>Primary <b>${escapeHtml(item.primary_engine)}</b></span>
          <span>Active <b>${escapeHtml(item.selected_engine || "なし")}</b></span>
          <span>Template <b>${item.dedicated_template ? `${item.template_ids.length}種` : "汎用"}</b></span>
        </div>
        <p>${escapeHtml(item.summary)}</p>
      </article>`).join("")
    $("#studio-check-list").innerHTML = snapshot.checks.map((item) => `
      <div class="readiness-check">
        <span class="readiness-check-icon ${item.passed ? "passed" : "failed"}">${item.passed ? "✓" : "!"}</span>
        <div><strong>${escapeHtml(item.label)}</strong><small>${escapeHtml(item.evidence)}</small></div>
      </div>`).join("")
    $("#studio-stage-list").innerHTML = snapshot.automated_stages.map((item, index) => `
      <li><span>${String(index + 1).padStart(2, "0")}</span>${escapeHtml(item)}</li>`).join("")
    $("#studio-human-gates").innerHTML = snapshot.human_gates.map((item) => `
      <li>${escapeHtml(item)}</li>`).join("")
    $("#studio-gap-list").innerHTML = snapshot.gaps.length
      ? snapshot.gaps.map((item) => `<li>${escapeHtml(item)}</li>`).join("")
      : "<li>現在の構成で未解決ギャップはありません。</li>"
  }

  async function loadStudioReadiness() {
    if (!state.connected) return
    const list = $("#studio-capability-list")
    if (list) list.innerHTML = '<div class="empty">実行環境から準備度を再計算しています。</div>'
    try {
      const body = await api("/v1/studio/readiness")
      renderReadiness(body)
    } catch (error) {
      console.error("[video-factory-console] Studio readiness failed", error)
      if (list) list.innerHTML = `<div class="empty"><strong>準備度を取得できませんでした</strong><p>${escapeHtml(error.message)}</p></div>`
      toast(error.message || "量産準備度を取得できませんでした", "error")
    }
  }

  function renderPreflight(result) {
    const target = $("#studio-preflight")
    if (!target) return
    const status = result.production_allowed ? "ready" : "blocked"
    const notes = result.blockers.length ? result.blockers : result.advisories
    target.className = `studio-preflight ${status}`
    target.innerHTML = `
      <div><span>PRODUCTION PREFLIGHT</span><strong>${result.production_allowed ? "本番投入可" : "本番投入停止"}</strong></div>
      <small>${result.deliverable_count}点 · ${result.render_waves} wave · 安全並列 ${result.safe_parallel_jobs}</small>
      ${notes.length ? `<ul>${notes.slice(0, 4).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>` : ""}`
  }

  async function preflightStudioBrief(brief) {
    const target = $("#studio-preflight")
    if (target) {
      target.className = "studio-preflight loading"
      target.innerHTML = "<small>対応範囲・実行環境・量産波を検証しています。</small>"
    }
    try {
      const result = await api("/v1/studio/preflight", {
        method: "POST",
        body: JSON.stringify(brief),
      })
      renderPreflight(result)
      return result
    } catch (error) {
      console.error("[video-factory-console] Studio preflight failed", error)
      if (target) {
        target.className = "studio-preflight blocked"
        target.innerHTML = `<strong>プリフライト失敗</strong><small>${escapeHtml(error.message)}</small>`
      }
      throw error
    }
  }

  async function syncStudioReadiness() {
    const button = $("#sync-studio-readiness")
    button.disabled = true
    try {
      await api("/v1/studio/readiness/sync", { method: "POST" })
      toast("量産準備度をDBへ保存し、運用通知を送信しました")
      await loadStudioReadiness()
    } catch (error) {
      console.error("[video-factory-console] Studio readiness sync failed", error)
      toast(error.message || "量産準備度を同期できませんでした", "error")
    } finally {
      button.disabled = false
    }
  }

  window.loadStudioReadiness = loadStudioReadiness
  window.preflightStudioBrief = preflightStudioBrief
  document.addEventListener("DOMContentLoaded", () => {
    $("#refresh-studio-readiness")?.addEventListener("click", () => void loadStudioReadiness())
    $("#sync-studio-readiness")?.addEventListener("click", () => void syncStudioReadiness())
  })
})()
