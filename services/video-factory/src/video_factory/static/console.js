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
    engines: "OSSエンジン",
    gpu: "GPU・接続設定",
  }
  $("#page-title").textContent = titles[name] || "Video Factory"
  history.replaceState(null, "", `#${name}`)
  if (name === "projects") void loadProjects()
  if (name === "engines" && window.loadEngineCatalog) void window.loadEngineCatalog()
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
  if (window.renderEngineCatalogFromBootstrap) {
    window.renderEngineCatalogFromBootstrap(body.engine_catalog)
  }
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
    engine_profile_overrides: window.selectedEngineProfileOverrides
      ? window.selectedEngineProfileOverrides()
      : {},
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
  setView(["dashboard", "create", "projects", "engines", "gpu"].includes(initialView)
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
