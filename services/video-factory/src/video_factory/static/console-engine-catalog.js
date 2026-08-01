const engineCatalogState = {
  profiles: [],
  loading: false,
  error: null,
  events: [],
  worker: null,
}

function renderEngineEvents() {
  const target = $("#engine-event-list")
  if (!target) return
  target.innerHTML = engineCatalogState.events.length
    ? engineCatalogState.events.map((event) => {
      const failed = event.event_type === "profile_failed" || event.delivery_state === "failed"
      return `<div class="engine-event ${failed ? "error" : ""}">
        <span><strong>${escapeHtml(event.title || event.event_type)}</strong><small>${escapeHtml(event.profile_id || "profile未指定")}</small></span>
        ${statusBadge(event.state || event.event_type)}
        <span>${event.progress == null ? "—" : `${Number(event.progress)}%`}</span>
        <small>${formatTime(event.created_at)}</small>
      </div>`
    }).join("")
    : '<div class="empty compact">実行イベントはまだありません。</div>'
}

async function loadEngineEvents() {
  try {
    const payload = await api("/v1/engine-events?limit=50")
    engineCatalogState.events = payload.events || []
    renderEngineEvents()
  } catch (error) {
    console.error("[video-factory-engine-catalog] event load failed", error)
    const target = $("#engine-event-list")
    if (target) {
      target.innerHTML = `<div class="engine-error"><strong>実行イベントを取得できません</strong><p>${escapeHtml(error.message || "unknown error")}</p></div>`
    }
  }
}

const engineCategoryLabels = {
  composition: "合成・収録",
  video: "動画生成",
  image: "画像生成",
  people: "人物",
  audio: "音声",
  enhancement: "補正",
  three_d: "3D・図解",
}

function engineMatches(profile) {
  const category = $("#engine-category")?.value || "all"
  const readiness = $("#engine-readiness")?.value || "all"
  const query = ($("#engine-search")?.value || "").trim().toLowerCase()
  if (category !== "all" && profile.category !== category) return false
  if (readiness !== "all" && (profile.ready ? "ready" : "blocked") !== readiness) {
    return false
  }
  if (!query) return true
  const haystack = [
    profile.id,
    profile.display_name,
    profile.summary,
    ...(profile.capabilities || []),
  ].join(" ").toLowerCase()
  return haystack.includes(query)
}

function engineReasonList(profile) {
  const reasons = profile.reasons || []
  if (!reasons.length) return ""
  return `<ul class="engine-reasons">${reasons.map((reason) => (
    `<li>${escapeHtml(reason)}</li>`
  )).join("")}</ul>`
}

function renderEngineProfile(profile) {
  const vram = profile.gpu_required
    ? `${Number(profile.min_vram_gb).toFixed(0)}GB以上（推奨 ${Number(profile.recommended_vram_gb).toFixed(0)}GB）`
    : "GPU不要"
  const stateLabel = profile.ready ? "本番利用可" : "利用不可"
  const executionTarget = profile.execution_target === "managed_gpu"
    ? "管理GPU（ジョブ中だけ起動）"
    : "制御プレーン（GPU不要）"
  const capabilities = (profile.capabilities || [])
    .map((item) => `<span>${escapeHtml(item)}</span>`).join("")
  return `
    <article class="engine-card ${profile.ready ? "ready" : "blocked"}">
      <div class="engine-card-heading">
        <div><small>${escapeHtml(engineCategoryLabels[profile.category] || profile.category)}</small><h3>${escapeHtml(profile.display_name)}</h3></div>
        <span class="badge ${profile.ready ? "good" : "bad"}">${stateLabel}</span>
      </div>
      <p>${escapeHtml(profile.summary)}</p>
      <div class="engine-capabilities">${capabilities}</div>
      <dl class="engine-facts">
        <div><dt>実行</dt><dd>${escapeHtml(profile.runtime)} / ${escapeHtml(profile.install_mode)}</dd></div>
        <div><dt>実行場所</dt><dd>${escapeHtml(executionTarget)}</dd></div>
        <div><dt>adapter</dt><dd>${escapeHtml(profile.resolved_adapter || profile.adapter)}</dd></div>
        <div><dt>VRAM</dt><dd>${escapeHtml(vram)}</dd></div>
        <div><dt>コード</dt><dd>${escapeHtml(profile.code_license)}</dd></div>
        <div><dt>モデル</dt><dd>${escapeHtml(profile.model_license)}</dd></div>
        <div><dt>商用</dt><dd>${escapeHtml(profile.commercial_policy)}</dd></div>
        <div><dt>revision</dt><dd><code>${escapeHtml(profile.revision.slice(0, 12))}</code></dd></div>
      </dl>
      ${engineReasonList(profile)}
      <a class="text-button engine-source" href="${escapeHtml(profile.source_url)}" target="_blank" rel="noopener noreferrer">公式sourceを確認 →</a>
    </article>`
}

function renderEngineWorkerStatus() {
  const target = $("#engine-worker-status")
  if (!target) return
  const worker = engineCatalogState.worker
  if (!worker) {
    target.className = "badge neutral"
    target.textContent = "worker未確認"
    return
  }
  if (!worker.configured) {
    target.className = "badge warn"
    target.textContent = "worker未設定"
    return
  }
  if (!worker.reachable) {
    target.className = "badge neutral"
    target.textContent = "GPU停止中"
    return
  }
  const installed = (worker.profiles || [])
    .filter((profile) => profile.executable_available).length
  target.className = "badge good"
  target.textContent = `worker稼働 · ${installed}件導入済み`
}

async function loadEngineWorkerStatus() {
  try {
    engineCatalogState.worker = await api("/v1/engine-worker/status")
  } catch (error) {
    console.error("[video-factory-engine-catalog] worker status failed", error)
    engineCatalogState.worker = { configured: true, reachable: false, profiles: [] }
  }
  renderEngineWorkerStatus()
}

function populateEngineProfileSelectors() {
  const target = $("#engine-profile-selectors")
  if (!target) return
  const previous = Object.fromEntries(
    $$('[data-engine-shot-kind]', target).map((select) => [select.dataset.engineShotKind, select.value]),
  )
  const shotKindLabels = {
    text_motion: "文字・モーション",
    ui_capture: "Web・UI収録",
    chart: "図表・データ",
    generative: "生成素材",
    supplied_edit: "支給素材・音声・補正",
    three_d: "3D",
    technical_diagram: "技術図解",
    portrait_animation: "人物アニメ",
    lip_sync: "リップシンク",
    transition: "トランジション",
  }
  const readyProfiles = engineCatalogState.profiles.filter((profile) => profile.ready)
  target.innerHTML = Object.entries(shotKindLabels).map(([shotKind, label]) => {
    const options = readyProfiles.filter((profile) => (profile.shot_kinds || []).includes(shotKind))
    return `<label><span>${escapeHtml(label)}</span><select data-engine-shot-kind="${shotKind}">
      <option value="">自動</option>${options.map((profile) => (
        `<option value="${escapeHtml(profile.id)}">${escapeHtml(profile.display_name)}</option>`
      )).join("")}</select><small>${options.length ? `${options.length}件利用可` : "追加プロファイル承認待ち"}</small></label>`
  }).join("")
  $$('[data-engine-shot-kind]', target).forEach((select) => {
    if ([...select.options].some((option) => option.value === previous[select.dataset.engineShotKind])) {
      select.value = previous[select.dataset.engineShotKind]
    }
  })
}

function renderEngineCatalog() {
  const target = $("#engine-catalog-list")
  const status = $("#engine-catalog-status")
  const count = $("#engine-catalog-count")
  if (!target || !status || !count) return
  if (engineCatalogState.loading) {
    status.innerHTML = '<div class="empty">OSSエンジン台帳を読み込んでいます。</div>'
    target.innerHTML = ""
    count.className = "badge neutral"
    count.textContent = "読込中"
    return
  }
  if (engineCatalogState.error) {
    status.innerHTML = `<div class="engine-error"><strong>台帳を取得できません</strong><p>${escapeHtml(engineCatalogState.error)}</p></div>`
    target.innerHTML = ""
    count.className = "badge bad"
    count.textContent = "エラー"
    return
  }
  status.innerHTML = ""
  const profiles = engineCatalogState.profiles.filter(engineMatches)
  const ready = engineCatalogState.profiles.filter((profile) => profile.ready).length
  count.className = `badge ${ready ? "good" : "warn"}`
  count.textContent = `${ready}/${engineCatalogState.profiles.length} 利用可`
  target.innerHTML = profiles.length
    ? profiles.map(renderEngineProfile).join("")
    : '<div class="empty">条件に一致するエンジンがありません。</div>'
  populateEngineProfileSelectors()
}

window.renderEngineCatalogFromBootstrap = (payload) => {
  if (!payload || payload.ok !== true) {
    engineCatalogState.error = payload?.error || "エンジン台帳が利用できません"
    engineCatalogState.profiles = []
  } else {
    engineCatalogState.error = null
    engineCatalogState.profiles = payload.profiles || []
  }
  engineCatalogState.loading = false
  renderEngineCatalog()
}

window.loadEngineCatalog = async () => {
  if (!state.connected || engineCatalogState.loading) return
  engineCatalogState.loading = true
  renderEngineCatalog()
  try {
    const payload = await api("/v1/engine-profiles")
    window.renderEngineCatalogFromBootstrap(payload)
    await Promise.all([loadEngineEvents(), loadEngineWorkerStatus()])
  } catch (error) {
    console.error("[video-factory-engine-catalog] load failed", error)
    engineCatalogState.loading = false
    engineCatalogState.error = error.message || "エンジン台帳を取得できませんでした"
    renderEngineCatalog()
    toast(engineCatalogState.error, "error")
  }
}

window.selectedEngineProfileOverrides = () => {
  return Object.fromEntries(
    $$('[data-engine-shot-kind]')
      .filter((select) => select.value)
      .map((select) => [select.dataset.engineShotKind, select.value]),
  )
}

async function syncEngineCatalog() {
  const button = $("#sync-engines")
  if (!state.connected || !button) {
    toast("先にVideo Factoryへ接続してください", "warn")
    return
  }
  button.disabled = true
  button.textContent = "同期中…"
  try {
    const result = await api("/v1/engine-profiles/sync", { method: "POST" })
    toast(`${result.synced || 0}件をDBへ同期し、DBベルとSlackへ通知しました`)
  } catch (error) {
    console.error("[video-factory-engine-catalog] sync failed", error)
    toast(error.message || "エンジン台帳を同期できませんでした", "error")
  } finally {
    button.disabled = false
    button.textContent = "DBへ同期"
  }
}

document.addEventListener("DOMContentLoaded", () => {
  $("#refresh-engines")?.addEventListener("click", () => void window.loadEngineCatalog())
  $("#sync-engines")?.addEventListener("click", () => void syncEngineCatalog())
  $("#engine-category")?.addEventListener("change", renderEngineCatalog)
  $("#engine-readiness")?.addEventListener("change", renderEngineCatalog)
  $("#engine-search")?.addEventListener("input", renderEngineCatalog)
})
