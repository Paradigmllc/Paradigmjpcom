(() => {
  let managedLifecycleId = ""

  function applyManagedInstanceLocks() {
    if (!managedLifecycleId) return
    for (const button of document.querySelectorAll("[data-instance-id], [data-instance-destroy]")) {
      const buttonId = button.dataset.instanceId || button.dataset.instanceDestroy
      const blocked = buttonId === managedLifecycleId && (
        button.dataset.instanceState === "running"
        || Boolean(button.dataset.instanceDestroy)
      )
      if (blocked) {
        button.disabled = true
        button.title = "自動ライフサイクル管理中のGPUです"
      }
    }
  }

  function lifecycleBadge(phase, enabled) {
    if (!enabled) return ["無効", "bad"]
    if (phase === "ready" || phase === "in_use") return ["稼働中", "good"]
    if (phase === "stopped") return ["停止・待機", "good"]
    if (phase === "starting" || phase === "stopping") return ["切替中", "warn"]
    if (phase === "error") return ["要対応", "bad"]
    return ["確認待ち", "neutral"]
  }

  function renderLifecycle(lifecycle) {
    const phase = String(lifecycle.phase || "not_checked")
    const enabled = Boolean(lifecycle.enabled)
    const [label, kind] = lifecycleBadge(phase, enabled)
    const badge = document.querySelector("#gpu-lifecycle-badge")
    badge.textContent = label
    badge.className = `badge ${kind}`
    const activeRuns = Array.isArray(lifecycle.active_runs)
      ? lifecycle.active_runs
      : []
    const activeLeases = Array.isArray(lifecycle.active_gpu_leases)
      ? lifecycle.active_gpu_leases
      : []
    const activeCount = Math.max(activeRuns.length, activeLeases.length)
    const price = Number(lifecycle.hourly_price || lifecycle.instance?.dph_total || 0)
    const updated = lifecycle.updated_at ? formatTime(lifecycle.updated_at) : "—"
    const target = document.querySelector("#gpu-lifecycle-status")
    target.innerHTML = `
      <div class="lifecycle-stat"><span>自動制御</span><strong>${enabled ? "有効" : "無効"}</strong><small>イベント駆動</small></div>
      <div class="lifecycle-stat"><span>管理GPU</span><strong>${escapeHtml(lifecycle.managed_instance_id || "未接続")}</strong><small>既存1台のみ</small></div>
      <div class="lifecycle-stat"><span>状態</span><strong>${escapeHtml(phase)}</strong><small>${escapeHtml(lifecycle.action || "—")}</small></div>
      <div class="lifecycle-stat"><span>実行中ジョブ</span><strong>${activeCount}</strong><small>queued / running / lease</small></div>
      <div class="lifecycle-stat"><span>GPU単価</span><strong>${price ? `$${price.toFixed(3)}/h` : "—"}</strong><small>停止中はGPU計算課金なし</small></div>
      ${lifecycle.error ? `<div class="lifecycle-error"><strong>エラー:</strong> ${escapeHtml(lifecycle.error)}</div>` : ""}
      <div class="lifecycle-note">最終更新 ${escapeHtml(updated)}。停止中もVast.aiのストレージ料金は継続します。再開時はGPU空き状況によりscheduling待ちになる場合があります。</div>`

    const managed = enabled && Boolean(lifecycle.managed_instance_id)
    managedLifecycleId = managed ? String(lifecycle.managed_instance_id) : ""
    const market = document.querySelector(".gpu-market")
    market?.classList.toggle("lifecycle-locked", managed)
    for (const selector of ["#search-offers", "#search-templates"]) {
      const button = document.querySelector(selector)
      if (button) {
        button.disabled = managed
        button.title = managed ? "管理GPUが登録済みのため追加作成を停止中" : ""
      }
    }
    applyManagedInstanceLocks()
  }

  function renderRuns(runs, errors) {
    const target = document.querySelector("#gpu-run-list")
    if (errors.length) {
      target.innerHTML = `<div class="lifecycle-error">実行履歴の一部を読めません: ${escapeHtml(errors.join(" / "))}</div>`
      return
    }
    if (!runs.length) {
      target.innerHTML = '<div class="empty compact">実行履歴はまだありません。</div>'
      return
    }
    target.innerHTML = runs.map((run) => `
      <div class="gpu-run-row">
        <span><strong>${escapeHtml(run.project_id || run.run_id)}</strong><small>${escapeHtml(run.run_id)}</small></span>
        ${statusBadge(String(run.state || "unknown").toLowerCase())}
        <time>${escapeHtml(formatTime(run.updated))}</time>
      </div>`).join("")
  }

  async function loadGpuLifecycle() {
    if (!state.connected) return
    try {
      const [body, runBody] = await Promise.all([
        api("/v1/gpu-lifecycle"),
        api("/v1/runs?limit=10"),
      ])
      renderLifecycle(body.lifecycle || {})
      renderRuns(runBody.runs || [], runBody.errors || [])
    } catch (error) {
      console.error("[video-factory-gpu-lifecycle] status failed", error)
      const target = document.querySelector("#gpu-lifecycle-status")
      target.innerHTML = `<div class="lifecycle-error">${escapeHtml(error.message || "GPU状態を取得できませんでした")}</div>`
      const badge = document.querySelector("#gpu-lifecycle-badge")
      badge.textContent = "取得失敗"
      badge.className = "badge bad"
      toast(error.message || "GPU状態を取得できませんでした", "error")
    }
  }

  async function reconcileGpu() {
    const button = document.querySelector("#reconcile-gpu")
    button.disabled = true
    try {
      const body = await api("/v1/gpu-lifecycle/reconcile", { method: "POST" })
      renderLifecycle(body.lifecycle || {})
      if (body.ok) toast("GPU空き状態を再判定しました")
      else toast(body.lifecycle?.error || "GPU自動停止を確認できませんでした", "error")
    } catch (error) {
      console.error("[video-factory-gpu-lifecycle] reconciliation failed", error)
      toast(error.message || "GPU空き状態を再判定できませんでした", "error")
    } finally {
      button.disabled = false
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    document.querySelector("#reconcile-gpu")?.addEventListener("click", () => {
      void reconcileGpu()
    })
    window.addEventListener("hashchange", () => {
      if (window.location.hash === "#gpu") void loadGpuLifecycle()
    })
    document.querySelector('[data-view="gpu"]')?.addEventListener("click", () => {
      void loadGpuLifecycle()
    })
    const connectionDot = document.querySelector("#sidebar-status")
    if (connectionDot) {
      new MutationObserver(() => {
        if (connectionDot.classList.contains("online")) void loadGpuLifecycle()
      }).observe(connectionDot, { attributes: true, attributeFilter: ["class"] })
    }
    const instanceList = document.querySelector("#instance-list")
    if (instanceList) {
      new MutationObserver(applyManagedInstanceLocks).observe(instanceList, {
        childList: true,
        subtree: true,
      })
    }
    void loadGpuLifecycle()
  })
})()
