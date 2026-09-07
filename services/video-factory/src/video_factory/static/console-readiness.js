(() => {
  let latestRequest = 0
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
    return { ready: "実行条件OK", conditional: "条件付き", blocked: "要対応" }[value] || value
  }

  function badgeClass(value) {
    return { ready: "good", conditional: "warn", blocked: "bad" }[value] || "neutral"
  }

  function renderReadiness(snapshot) {
    const counts = ["ready", "conditional", "blocked"].map((status) => ({
      status, count: snapshot.capabilities.filter((item) => item.state === status).length,
    }))
    const gaps = [...new Set([
      ...snapshot.checks.filter((item) => !item.passed).map((item) => `${item.label}: ${item.evidence}`),
      ...snapshot.gaps,
    ])]
    $("#dashboard-readiness").innerHTML = `
      <div class="dashboard-capability-counts">${counts.map((item) => `<div><span>${stateLabel(item.status)}</span><strong>${item.count}種</strong></div>`).join("")}</div>
      <p class="dashboard-check-time">環境確認: ${escapeHtml(formatTime(snapshot.generated_at))} · 実映像の品質合格は案件ごとのレビューで確認</p>
      <ul class="readiness-gaps">${gaps.length ? gaps.slice(0, 4).map((item) => `<li>${escapeHtml(item)}</li>`).join("") : "<li>この環境チェックで未解決項目はありません。作品の品質・権利・納品承認は別途必要です。</li>"}</ul>
      ${gaps.length > 4 ? `<p class="dashboard-check-time">ほか ${gaps.length - 4} 件。「対応状況を詳しく見る」で確認できます。</p>` : ""}`
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
    const request = ++latestRequest
    $("#dashboard-readiness").innerHTML = '<div class="empty compact">実行条件を確認中…</div>'
    const list = $("#studio-capability-list")
    if (list) list.innerHTML = '<div class="empty">実行環境から準備度を再計算しています。</div>'
    try {
      const body = await api("/v1/studio/readiness")
      if (request !== latestRequest || !state.connected) return
      renderReadiness(body)
    } catch (error) {
      if (request !== latestRequest || !state.connected) return
      console.error("[video-factory-console] Studio readiness failed", error)
      $("#dashboard-readiness").innerHTML = '<div class="empty compact">確認失敗 — 現在の対応状況は不明です。上の更新ボタンで再試行してください。</div>'
      $("#studio-readiness-badge").textContent = "確認失敗"
      $("#studio-readiness-badge").className = "badge bad"
      for (const id of ["studio-readiness-score", "studio-template-count", "studio-capability-count", "studio-safe-parallel"]) $("#" + id).textContent = "—"
      $("#studio-readiness-time").textContent = "取得失敗・以前の判定は無効"
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
