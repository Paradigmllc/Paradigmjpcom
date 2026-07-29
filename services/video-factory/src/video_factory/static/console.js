const state = {
  apiKey: sessionStorage.getItem("videoFactoryApiKey") || "",
  connected: false,
  bootstrap: null,
  projects: [],
  activeProjectId: null,
  selectedTemplate: sessionStorage.getItem("videoFactoryTemplateHash") || "",
  previewObjectUrl: null,
  projectPoll: null,
}

const $ = (selector, root = document) => root.querySelector(selector)
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)]

function toast(message, kind = "success") {
  const region = $("#toast-region")
  const item = document.createElement("div")
  item.className = `toast ${kind}`
  item.textContent = message
  region.append(item)
  setTimeout(() => item.remove(), 4500)
}

function confirmAction(message, destructive = false) {
  const dialog = $("#confirm-dialog")
  $("#confirm-message").textContent = message
  const accept = $("#confirm-accept")
  accept.className = `button ${destructive ? "danger" : "primary"}`
  return new Promise((resolve) => {
    const close = () => {
      dialog.removeEventListener("close", close)
      resolve(dialog.returnValue === "confirm")
    }
    dialog.addEventListener("close", close)
    dialog.showModal()
  })
}

async function api(path, options = {}) {
  const headers = new Headers(options.headers || {})
  if (state.apiKey) headers.set("X-Api-Key", state.apiKey)
  if (options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json")
  }
  const response = await fetch(path, { ...options, headers, cache: "no-store" })
  const contentType = response.headers.get("content-type") || ""
  const body = contentType.includes("application/json")
    ? await response.json()
    : await response.text()
  if (!response.ok) {
    const detail = typeof body === "object" && body
      ? body.detail || body.error
      : body
    throw new Error(typeof detail === "string" ? detail : JSON.stringify(detail))
  }
  return body
}

function setView(name) {
  $$(".nav-item").forEach((item) => {
    item.classList.toggle("active", item.dataset.view === name)
  })
  $$(".view").forEach((item) => {
    item.classList.toggle("active", item.dataset.viewPanel === name)
  })
  const titles = {
    dashboard: "ダッシュボード",
    create: "新しい動画",
    projects: "制作案件",
    gpu: "GPU・接続設定",
  }
  $("#page-title").textContent = titles[name] || "Video Factory"
  history.replaceState(null, "", `#${name}`)
  if (name === "projects") void loadProjects()
  if (name === "gpu") void loadRuntimeAndGpu()
}

function setConnection(connected) {
  state.connected = connected
  $("#sidebar-status").className = `dot ${connected ? "online" : "offline"}`
  $("#sidebar-status-text").textContent = connected
    ? "Factory connected"
    : "未接続"
  $("#metric-factory").textContent = connected ? "Ready" : "Offline"
  $("#metric-factory-note").textContent = connected
    ? "API応答正常"
    : "API接続が必要"
  $("#auth-panel").classList.toggle("hidden", connected)
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;")
}

function statusBadge(status) {
  const value = String(status || "unknown")
  const good = [
    "delivered", "final_approved", "draft_approved", "running", "ready", "completed",
  ]
  const warn = [
    "production", "finalizing", "draft_review_required", "final_review_required",
    "queued", "loading", "stopped",
  ]
  const bad = ["failed", "qa_failed", "error", "destroyed"]
  const kind = good.includes(value)
    ? "good"
    : bad.includes(value)
      ? "bad"
      : warn.includes(value)
        ? "warn"
        : "neutral"
  return `<span class="badge ${kind}">${escapeHtml(value)}</span>`
}

function formatTime(value) {
  if (!value) return "—"
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? String(value)
    : new Intl.DateTimeFormat("ja-JP", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(date)
}

function formatBytes(value) {
  const bytes = Number(value || 0)
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`
  return `${(bytes / 1024 ** 3).toFixed(1)} GB`
}

function flattenHealth(doctor) {
  if (!doctor || typeof doctor !== "object") return []
  return Object.entries(doctor).map(([name, value]) => {
    if (typeof value === "boolean") {
      return { name, ready: value, note: value ? "ready" : "not ready" }
    }
    if (value && typeof value === "object") {
      const ready = value.ready ?? value.configured ?? value.ok ?? value.available
      const note = value.error
        || value.note
        || value.status
        || (ready ? "ready" : "check required")
      return { name, ready: Boolean(ready), note: String(note) }
    }
    return {
      name,
      ready: Boolean(value),
      note: String(value ?? "not configured"),
    }
  })
}

function renderHealth() {
  const rows = flattenHealth(state.bootstrap?.doctor)
  $("#health-list").innerHTML = rows.length
    ? rows.map((row) => `
      <div class="health-row">
        <span><i class="dot ${row.ready ? "online" : "offline"}"></i>${escapeHtml(row.name)}</span>
        <b>${escapeHtml(row.note)}</b>
      </div>`).join("")
    : '<div class="empty compact">環境情報がありません。</div>'
}

async function connect() {
  state.apiKey = $("#factory-api-key").value.trim()
  if (state.apiKey) sessionStorage.setItem("videoFactoryApiKey", state.apiKey)
  else sessionStorage.removeItem("videoFactoryApiKey")
  try {
    await loadBootstrap()
    toast("Video Factoryへ接続しました")
  } catch (error) {
    console.error("[video-factory-console] connect failed", error)
    setConnection(false)
    toast(error.message || "接続できませんでした", "error")
  }
}

async function loadBootstrap() {
  const body = await api("/v1/console/bootstrap")
  state.bootstrap = body
  setConnection(true)
  $("#metric-projects").textContent = String(body.project_count ?? 0)
  const comfy = body.runtime?.comfyui_base_url || body.factory?.comfyui_base_url
  $("#metric-comfy").textContent = comfy ? "Connected" : "Not set"
  $("#metric-comfy-note").textContent = comfy || "GPUなしプレビューのみ"
  $("#metric-vast").textContent = body.vast?.configured ? "Ready" : "Not set"
  $("#metric-vast-note").textContent = body.vast?.configured
    ? "GPUをGUIから操作可能"
    : "APIキー未設定"
  $("#setup-banner").classList.toggle(
    "hidden",
    Boolean(comfy && body.vast?.configured),
  )
  renderHealth()
  await loadProjects(true)
  if (!state.projectPoll) {
    state.projectPoll = setInterval(
      () => state.connected && loadProjects(true),
      15000,
    )
  }
}

function renderProjects(target, projects, limit = projects.length) {
  const rows = projects.slice(0, limit)
  if (!rows.length) {
    target.innerHTML = '<div class="empty">まだ制作案件がありません。</div>'
    return
  }
  target.innerHTML = rows.map((project) => `
    <button class="project-card ${state.activeProjectId === project.project_id ? "active" : ""}" data-project-id="${escapeHtml(project.project_id)}" type="button">
      <span><strong>${escapeHtml(project.project_name)}</strong><small>${escapeHtml(project.project_id)} · ${formatTime(project.updated_at)}</small></span>
      ${statusBadge(project.status)}
    </button>`).join("")
  $$("[data-project-id]", target).forEach((button) => {
    button.addEventListener("click", () => {
      state.activeProjectId = button.dataset.projectId
      setView("projects")
      renderProjects($("#project-list"), state.projects)
      void loadProjectDetail(state.activeProjectId)
    })
  })
}

function renderRecentProjects() {
  const target = $("#recent-projects")
  if (!state.projects.length) {
    target.innerHTML = '<div class="empty">まだ制作案件がありません。</div>'
    return
  }
  target.innerHTML = state.projects.slice(0, 6).map((project) => `
    <div class="table-row" data-recent-project="${escapeHtml(project.project_id)}">
      <span><strong>${escapeHtml(project.project_name)}</strong><small>${escapeHtml(project.project_id)}</small></span>
      ${statusBadge(project.status)}
      <span>${project.duration_seconds ? `${project.duration_seconds}s` : "—"}</span>
      <small>${formatTime(project.updated_at)}</small>
    </div>`).join("")
  $$('[data-recent-project]', target).forEach((row) => {
    row.addEventListener("click", () => {
      state.activeProjectId = row.dataset.recentProject
      setView("projects")
      void loadProjectDetail(state.activeProjectId)
    })
  })
}

async function loadProjects(quiet = false) {
  if (!state.connected) return
  try {
    const body = await api("/v1/projects?limit=200")
    state.projects = body.projects || []
    $("#metric-projects").textContent = String(state.projects.length)
    renderProjects($("#project-list"), state.projects)
    renderRecentProjects()
    if (state.activeProjectId && !quiet) {
      await loadProjectDetail(state.activeProjectId)
    }
  } catch (error) {
    console.error("[video-factory-console] projects failed", error)
    if (!quiet) toast(error.message || "案件を取得できませんでした", "error")
  }
}

function selectedValues(container) {
  return $$('input[type="checkbox"]:checked', container).map((item) => item.value)
}

function lines(value) {
  return [...new Set(
    String(value).split(/\r?\n/).map((item) => item.trim()).filter(Boolean),
  )]
}

function commaValues(value) {
  return [...new Set(
    String(value).split(/[,、]/).map((item) => item.trim()).filter(Boolean),
  )]
}

function dimensions(ratio) {
  return {
    "16:9": [1920, 1080],
    "9:16": [1080, 1920],
    "1:1": [1080, 1080],
    "4:5": [1080, 1350],
  }[ratio]
}

function syncColor(source, target) {
  $(target).value = $(source).value.toUpperCase()
}

function updateDeliverableSummary() {
  const languages = commaValues($("#languages").value)
    .map((item) => item.toLowerCase())
  const ratios = selectedValues($("#ratios"))
  const count = languages.length * ratios.length
  $("#deliverable-summary").innerHTML = `
    <strong>${count || 0}点を生成</strong><br>
    ${escapeHtml(languages.join(" / ") || "言語未選択")} ×
    ${escapeHtml(ratios.join(" / ") || "比率未選択")}`
}

function buildBrief() {
  const languages = commaValues($("#languages").value)
    .map((item) => item.toLowerCase())
  const ratios = selectedValues($("#ratios"))
  if (!languages.length || !ratios.length) {
    throw new Error("言語とアスペクト比を1件以上選択してください")
  }
  const objective = $("#objective").value.trim()
  const cta = $("#cta").value.trim()
  const deliverables = []
  for (const language of languages) {
    for (const ratio of ratios) {
      const [width, height] = dimensions(ratio)
      deliverables.push({
        name: `${language}-${ratio.replace(":", "x")}`.toLowerCase(),
        language,
        aspect_ratio: ratio,
        width,
        height,
        fps: 30,
        format: "mp4",
      })
    }
  }
  const localizations = {}
  for (const language of languages.slice(1)) {
    localizations[language] = {
      objective: `Localized ${language} version: ${objective}`,
      cta,
      segment_overrides: {},
      reviewer: $("#approver-name").value.trim(),
    }
  }
  const likeness = $("#rights-likeness").checked
    ? "granted"
    : "not_applicable"
  const voice = $("#rights-voice").checked
    ? "granted"
    : "not_applicable"
  return {
    project_name: $("#project-name").value.trim(),
    objective,
    audience: $("#audience").value.trim(),
    platforms: commaValues($("#platforms").value),
    duration_seconds: Number($("#duration").value),
    languages,
    brand: {
      name: $("#brand-name").value.trim(),
      primary_color: $("#primary-color-text").value.trim().toUpperCase(),
      accent_color: $("#accent-color-text").value.trim().toUpperCase(),
      text_color: "#FFFFFF",
      font_family: $("#font-family").value.trim() || "Inter",
      logo_path: lines($("#source-assets").value)
        .find((item) => /logo/i.test(item)) || null,
    },
    source_assets: lines($("#source-assets").value),
    reference_urls: lines($("#reference-urls").value),
    rights: {
      source_assets_cleared: $("#rights-assets").checked,
      ai_generation_allowed: $("#rights-ai").checked,
      likeness_consent: likeness,
      voice_consent: voice,
      claims_approved_by_client: $("#rights-claims").checked,
      notes: "Declared in the Video Factory GUI.",
    },
    approver: {
      name: $("#approver-name").value.trim(),
      email: $("#approver-email").value.trim(),
    },
    deliverables,
    localizations,
    requested_shot_kinds: selectedValues($("#shot-kinds")),
    notes: `${$("#notes").value.trim()}\nCTA: ${cta}`.trim(),
  }
}

async function submitVideo(event) {
  event.preventDefault()
  if (!state.connected) {
    toast("先にVideo Factoryへ接続してください", "warn")
    return
  }
  const button = $("#submit-video")
  button.disabled = true
  button.textContent = "検証・投入中…"
  try {
    const brief = buildBrief()
    const validation = await api("/v1/briefs/validate", {
      method: "POST",
      body: JSON.stringify(brief),
    })
    if (!validation.valid) {
      const messages = (validation.findings || [])
        .filter((item) => item.severity === "error")
        .map((item) => item.message)
      throw new Error(messages.join(" / ") || "ブリーフに不足があります")
    }
    const mode = $('input[name="run-mode"]:checked').value
    const request = {
      brief,
      dry_run: mode === "preview",
      planner_provider: $("#planner-provider").value,
      auto_approve: false,
      delivery_target: "local",
    }
    const endpoint = mode === "preview" ? "/v1/runs/sync" : "/v1/runs"
    const result = await api(endpoint, {
      method: "POST",
      body: JSON.stringify(request),
    })
    toast(mode === "preview"
      ? "プレビューを生成しました"
      : "本番制作キューへ登録しました")
    if (result.project_id) state.activeProjectId = result.project_id
    await loadProjects()
    setView("projects")
    if (state.activeProjectId) await loadProjectDetail(state.activeProjectId)
  } catch (error) {
    console.error("[video-factory-console] run failed", error)
    toast(error.message || "制作を開始できませんでした", "error")
  } finally {
    button.disabled = false
    button.textContent = "制作を開始する"
  }
}

async function fetchArtifactBlob(url) {
  const headers = new Headers()
  if (state.apiKey) headers.set("X-Api-Key", state.apiKey)
  const response = await fetch(url, { headers, cache: "no-store" })
  if (!response.ok) throw new Error(`Artifact HTTP ${response.status}`)
  return response.blob()
}

async function showPreview(url) {
  if (state.previewObjectUrl) URL.revokeObjectURL(state.previewObjectUrl)
  const blob = await fetchArtifactBlob(url)
  state.previewObjectUrl = URL.createObjectURL(blob)
  const video = $("#project-preview")
  if (video) {
    video.src = state.previewObjectUrl
    video.load()
  }
}

async function downloadArtifact(url, name) {
  try {
    const blob = await fetchArtifactBlob(url)
    const objectUrl = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = objectUrl
    link.download = name
    link.click()
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
  } catch (error) {
    toast(error.message || "ダウンロードできませんでした", "error")
  }
}

function currentStatus(detail) {
  return detail?.state?.status || "unknown"
}

async function projectAction(path, body = null, successMessage = "更新しました") {
  if (!state.activeProjectId) return
  try {
    await api(`/v1/projects/${state.activeProjectId}${path}`, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    })
    toast(successMessage)
    await loadProjects(true)
    await loadProjectDetail(state.activeProjectId)
  } catch (error) {
    console.error("[video-factory-console] project action failed", error)
    toast(error.message || "操作に失敗しました", "error")
  }
}

function reviewControls(status) {
  if (status === "draft_review_required") {
    return `<div class="review-form"><textarea id="review-notes" rows="2" placeholder="承認コメントまたは修正内容"></textarea><div class="button-row"><button class="button primary" data-project-action="approve-draft" type="button">ドラフト承認</button><button class="button secondary" data-project-action="change-draft" type="button">修正を依頼</button></div></div>`
  }
  if (status === "draft_approved") {
    return '<div class="project-actions"><button class="button primary" data-project-action="finalize" type="button">最終版を生成</button></div>'
  }
  if (status === "final_review_required") {
    return `<div class="review-form"><textarea id="review-notes" rows="2" placeholder="最終承認コメントまたは修正内容"></textarea><div class="button-row"><button class="button primary" data-project-action="approve-final" type="button">最終版を承認</button><button class="button secondary" data-project-action="change-final" type="button">修正を依頼</button></div></div>`
  }
  if (status === "final_approved") {
    return '<div class="project-actions"><button class="button primary" data-project-action="deliver-local" type="button">ローカル納品</button><button class="button secondary" data-project-action="deliver-rclone" type="button">Drive / rclone納品</button><button class="button secondary" data-project-action="deliver-frameio" type="button">Frame.io納品</button></div>'
  }
  return ""
}

function wireProjectActions() {
  $$('[data-project-action]').forEach((button) => {
    button.addEventListener("click", async () => {
      const notes = $("#review-notes")?.value.trim() || null
      const reviewer = state.bootstrap?.factory?.environment === "production"
        ? "Paradigm Producer"
        : "GUI Reviewer"
      const actions = {
        "approve-draft": [
          "/reviews/draft/approve",
          { reviewer, notes },
          "ドラフトを承認しました",
        ],
        "change-draft": [
          "/reviews/draft/request-changes",
          { reviewer, notes },
          "ドラフトを差し戻しました",
        ],
        finalize: ["/finalize", null, "最終版を生成しました"],
        "approve-final": [
          "/reviews/final/approve",
          { reviewer, notes },
          "最終版を承認しました",
        ],
        "change-final": [
          "/reviews/final/request-changes",
          { reviewer, notes },
          "最終版を差し戻しました",
        ],
        "deliver-local": [
          "/deliver", { target: "local" }, "ローカル納品を完了しました",
        ],
        "deliver-rclone": [
          "/deliver", { target: "rclone" }, "Drive納品を開始しました",
        ],
        "deliver-frameio": [
          "/deliver", { target: "frameio" }, "Frame.io納品を開始しました",
        ],
      }
      const selected = actions[button.dataset.projectAction]
      if (!selected) return
      if (button.dataset.projectAction.startsWith("change-") && !notes) {
        toast("修正内容を入力してください", "warn")
        return
      }
      await projectAction(selected[0], selected[1], selected[2])
    })
  })
}

async function loadProjectDetail(projectId) {
  if (!projectId) return
  const target = $("#project-detail")
  target.innerHTML = '<div class="empty tall">案件を読み込んでいます。</div>'
  try {
    const [detail, artifactBody] = await Promise.all([
      api(`/v1/projects/${projectId}`),
      api(`/v1/projects/${projectId}/artifacts`),
    ])
    const artifacts = artifactBody.artifacts || []
    const videos = artifacts.filter((item) => {
      return String(item.media_type).startsWith("video/")
    })
    const status = currentStatus(detail)
    target.innerHTML = `
      <div class="project-detail-header">
        <p class="eyebrow">${escapeHtml(projectId)}</p>
        <h2>${escapeHtml(detail.manifest?.project_name || projectId)}</h2>
        <div class="project-meta">${statusBadge(status)}<span class="badge neutral">${escapeHtml(detail.manifest?.duration_seconds || "—")}s</span><span class="badge neutral">${artifacts.length} files</span></div>
      </div>
      ${videos.length
        ? '<div class="preview-wrap"><video id="project-preview" controls playsinline></video></div>'
        : '<div class="empty compact">プレビュー動画はまだありません。</div>'}
      ${reviewControls(status)}
      <div class="artifact-list">
        <div class="panel-heading" style="padding:8px 0 14px;border:0"><div><p class="eyebrow">ARTIFACTS</p><h2>成果物・証跡</h2></div></div>
        ${artifacts.length
          ? artifacts.map((item) => `<div class="artifact-row"><span><strong>${escapeHtml(item.path)}</strong><small>${escapeHtml(item.media_type)} · ${formatBytes(item.size)}</small></span><button data-download-url="${escapeHtml(item.url)}" data-download-name="${escapeHtml(item.name)}" type="button">保存</button></div>`).join("")
          : '<div class="empty compact">成果物はありません。</div>'}
      </div>`
    if (videos.length) await showPreview(videos.at(-1).url)
    $$('[data-download-url]', target).forEach((button) => {
      button.addEventListener("click", () => {
        void downloadArtifact(
          button.dataset.downloadUrl,
          button.dataset.downloadName,
        )
      })
    })
    wireProjectActions()
  } catch (error) {
    console.error("[video-factory-console] detail failed", error)
    target.innerHTML = `<div class="empty tall"><strong>案件を表示できません</strong><p>${escapeHtml(error.message)}</p></div>`
  }
}

async function loadRuntimeAndGpu() {
  if (!state.connected) return
  try {
    const body = await api("/v1/runtime")
    $("#comfyui-url").value = body.effective_comfyui?.base_url || ""
    $("#vast-template-hash").value = body.runtime?.vast_template_hash
      || body.vast?.default_template_hash
      || state.selectedTemplate
      || ""
    const configured = body.vast?.configured
      || body.effective_comfyui?.api_key_configured
    $("#runtime-badge").textContent = configured ? "設定済み" : "要設定"
    $("#runtime-badge").className = `badge ${configured ? "good" : "warn"}`
    await loadInstances(true)
  } catch (error) {
    console.error("[video-factory-console] runtime failed", error)
    toast(error.message || "設定を取得できませんでした", "error")
  }
}

async function saveRuntime() {
  const body = {}
  const vastKey = $("#vast-api-key").value.trim()
  const comfyKey = $("#comfyui-api-key").value.trim()
  const comfyUrl = $("#comfyui-url").value.trim()
  const templateHash = $("#vast-template-hash").value.trim()
  if (vastKey) body.vast_api_key = vastKey
  if (comfyKey) body.comfyui_api_key = comfyKey
  if (comfyUrl) body.comfyui_base_url = comfyUrl
  if (templateHash) body.vast_template_hash = templateHash
  try {
    await api("/v1/runtime", {
      method: "PUT",
      body: JSON.stringify(body),
    })
    $("#vast-api-key").value = ""
    $("#comfyui-api-key").value = ""
    toast("接続設定を安全に保存しました")
    await loadBootstrap()
    await loadRuntimeAndGpu()
  } catch (error) {
    toast(error.message || "設定を保存できませんでした", "error")
  }
}

async function searchTemplates() {
  try {
    const query = encodeURIComponent(
      $("#template-query").value.trim() || "ComfyUI",
    )
    const body = await api(
      `/v1/vast/templates?query=${query}&recommended_only=true&ssh_only=true`,
    )
    const templates = body.templates || []
    $("#template-list").innerHTML = templates.length
      ? templates.map((item) => {
        const hash = item.hash_id || item.hash || ""
        return `<button class="template-chip ${state.selectedTemplate === hash ? "active" : ""}" data-template-hash="${escapeHtml(hash)}" type="button"><strong>${escapeHtml(item.name || item.image || "Template")}</strong><small>${escapeHtml(hash || "hash unavailable")}</small></button>`
      }).join("")
      : '<div class="empty compact">該当テンプレートがありません。</div>'
    $$('[data-template-hash]').forEach((button) => {
      button.addEventListener("click", () => {
        state.selectedTemplate = button.dataset.templateHash
        sessionStorage.setItem(
          "videoFactoryTemplateHash",
          state.selectedTemplate,
        )
        $("#vast-template-hash").value = state.selectedTemplate
        $$('[data-template-hash]').forEach((item) => {
          item.classList.toggle("active", item === button)
        })
        toast("起動テンプレートを選択しました")
      })
    })
  } catch (error) {
    toast(error.message || "テンプレートを検索できませんでした", "error")
  }
}

function offerPrice(item) {
  return Number(item.dph_total ?? item.search?.totalHour ?? item.min_bid ?? 0)
}

async function searchOffers() {
  const target = $("#offer-list")
  target.innerHTML = '<div class="empty">Vast.aiから空きGPUを取得しています。</div>'
  try {
    const body = await api("/v1/vast/offers/search", {
      method: "POST",
      body: JSON.stringify({
        gpu_names: [$("#gpu-model").value],
        min_gpu_ram_gb: Number($("#gpu-vram").value),
        min_reliability: Number($("#gpu-reliability").value),
        verified: true,
        instance_type: "on-demand",
        max_hourly_price: Number($("#gpu-max-price").value) || null,
        limit: 30,
      }),
    })
    const offers = body.offers || []
    target.innerHTML = offers.length
      ? offers.map((item) => {
        const price = offerPrice(item)
        const ram = Number(item.gpu_ram || 0) / 1024
        const reliability = Number(item.reliability || 0) * 100
        return `<article class="offer-card"><div class="instance-head"><h3>${escapeHtml(item.gpu_name || "GPU")}</h3><span class="badge good">Verified</span></div><div class="offer-price">$${price.toFixed(3)}<small>/hour</small></div><div class="offer-stats"><span>VRAM ${ram.toFixed(0)} GB</span><span>信頼性 ${reliability.toFixed(1)}%</span><span>DLPerf ${Number(item.dlperf || 0).toFixed(1)}</span><span>${escapeHtml(item.geolocation || item.country || "Location —")}</span></div><button class="button dark full" data-launch-offer="${escapeHtml(item.id || item.ask_contract_id)}" data-offer-price="${price}" type="button">このGPUを起動</button></article>`
      }).join("")
      : '<div class="empty">条件に合うGPUがありません。価格上限か信頼性を調整してください。</div>'
    $$('[data-launch-offer]').forEach((button) => {
      button.addEventListener("click", () => {
        void launchOffer(
          button.dataset.launchOffer,
          button.dataset.offerPrice,
        )
      })
    })
  } catch (error) {
    target.innerHTML = `<div class="empty"><strong>GPU検索に失敗しました</strong><p>${escapeHtml(error.message)}</p></div>`
  }
}

async function launchOffer(offerId, price) {
  const template = $("#vast-template-hash").value.trim()
    || state.selectedTemplate
  if (!template) {
    toast("先にComfyUIテンプレートを選択してください", "warn")
    return
  }
  const accepted = await confirmAction(
    `Offer ${offerId} を $${Number(price).toFixed(3)}/h で起動します。GPU利用料が発生します。`,
  )
  if (!accepted) return
  try {
    await api("/v1/vast/instances", {
      method: "POST",
      body: JSON.stringify({
        offer_id: Number(offerId),
        template_hash_id: template,
        label: `paradigm-comfyui-${Date.now().toString().slice(-6)}`,
        disk_gb: 80,
        target_state: "running",
        mount_path: "/workspace",
      }),
    })
    toast("Vast.aiインスタンスを作成しました")
    await loadInstances()
  } catch (error) {
    toast(error.message || "GPUを起動できませんでした", "error")
  }
}

async function loadInstances(quiet = false) {
  if (!state.connected) return
  const target = $("#instance-list")
  try {
    const body = await api("/v1/vast/instances")
    const instances = body.instances || []
    target.innerHTML = instances.length
      ? instances.map((item) => {
        const id = item.id || item.instance_id
        const status = item.actual_status || item.status || "unknown"
        const price = Number(item.dph_total || item.total_hour || 0)
        const port = item.ports?.["8188/tcp"]?.[0]?.HostPort
          || item.direct_port_start
          || "—"
        return `<div class="instance-card"><div class="instance-head"><strong>${escapeHtml(item.label || `Instance ${id}`)}</strong>${statusBadge(status)}</div><div class="instance-meta"><span>${escapeHtml(item.gpu_name || "GPU")}</span><span>$${price.toFixed(3)}/h</span><span>${escapeHtml(item.public_ipaddr || item.ssh_host || "IP loading")}</span><span>ComfyUI port ${escapeHtml(port)}</span></div><div class="instance-actions">${status === "running" ? `<button class="button secondary" data-instance-state="stopped" data-instance-id="${id}" type="button">停止</button>` : `<button class="button secondary" data-instance-state="running" data-instance-id="${id}" type="button">開始</button>`}<button class="button danger" data-instance-destroy="${id}" type="button">破棄</button></div></div>`
      }).join("")
      : '<div class="empty compact">稼働中のGPUインスタンスはありません。</div>'
    $$('[data-instance-state]').forEach((button) => {
      button.addEventListener("click", () => {
        void changeInstanceState(
          button.dataset.instanceId,
          button.dataset.instanceState,
        )
      })
    })
    $$('[data-instance-destroy]').forEach((button) => {
      button.addEventListener("click", () => {
        void destroyInstance(button.dataset.instanceDestroy)
      })
    })
  } catch (error) {
    if (!quiet) {
      toast(error.message || "インスタンスを取得できませんでした", "error")
    }
    target.innerHTML = `<div class="empty compact">${escapeHtml(error.message || "Vast.ai APIキーを設定してください。")}</div>`
  }
}

async function changeInstanceState(id, status) {
  try {
    await api(`/v1/vast/instances/${id}/state`, {
      method: "POST",
      body: JSON.stringify({ state: status }),
    })
    toast(status === "running" ? "GPUを開始しました" : "GPUを停止しました")
    await loadInstances()
  } catch (error) {
    toast(error.message || "状態を変更できませんでした", "error")
  }
}

async function destroyInstance(id) {
  const accepted = await confirmAction(
    `Instance ${id} を完全に破棄します。コンテナストレージは失われます。`,
    true,
  )
  if (!accepted) return
  try {
    await api(`/v1/vast/instances/${id}`, { method: "DELETE" })
    toast("GPUインスタンスを破棄しました")
    await loadInstances()
  } catch (error) {
    toast(error.message || "インスタンスを破棄できませんでした", "error")
  }
}

function wireEvents() {
  $$(".nav-item").forEach((button) => {
    button.addEventListener("click", () => setView(button.dataset.view))
  })
  $$('[data-go]').forEach((button) => {
    button.addEventListener("click", () => setView(button.dataset.go))
  })
  $("#open-auth").addEventListener("click", () => {
    $("#auth-panel").classList.toggle("hidden")
  })
  $("#connect-factory").addEventListener("click", () => void connect())
  $("#factory-api-key").addEventListener("keydown", (event) => {
    if (event.key === "Enter") void connect()
  })
  $("#refresh-all").addEventListener("click", () => {
    void loadBootstrap().catch((error) => toast(error.message, "error"))
  })
  $("#refresh-health").addEventListener("click", () => {
    void loadBootstrap().catch((error) => toast(error.message, "error"))
  })
  $("#refresh-projects").addEventListener("click", () => void loadProjects())
  $("#video-form").addEventListener("submit", submitVideo)
  $("#languages").addEventListener("input", updateDeliverableSummary)
  $("#ratios").addEventListener("change", updateDeliverableSummary)
  $("#primary-color").addEventListener("input", () => {
    syncColor("#primary-color", "#primary-color-text")
  })
  $("#accent-color").addEventListener("input", () => {
    syncColor("#accent-color", "#accent-color-text")
  })
  $("#save-runtime").addEventListener("click", () => void saveRuntime())
  $("#test-runtime").addEventListener("click", () => {
    void loadBootstrap()
      .then(() => toast("接続状態を更新しました"))
      .catch((error) => toast(error.message, "error"))
  })
  $("#search-templates").addEventListener("click", () => void searchTemplates())
  $("#search-offers").addEventListener("click", () => void searchOffers())
  $("#refresh-instances").addEventListener("click", () => void loadInstances())
}

async function init() {
  wireEvents()
  updateDeliverableSummary()
  const initialView = location.hash.replace("#", "") || "dashboard"
  setView(["dashboard", "create", "projects", "gpu"].includes(initialView)
    ? initialView
    : "dashboard")
  $("#factory-api-key").value = state.apiKey
  try {
    await loadBootstrap()
  } catch (error) {
    console.info("[video-factory-console] awaiting API key", error)
    setConnection(false)
  }
}

document.addEventListener("DOMContentLoaded", () => void init())
