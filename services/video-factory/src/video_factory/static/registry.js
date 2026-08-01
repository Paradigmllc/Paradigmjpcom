const state = {
  apiKey: sessionStorage.getItem("videoFactoryApiKey") || "",
  registry: null,
}

const $ = (selector, root = document) => root.querySelector(selector)
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)]

function toast(message, kind = "success") {
  const region = $("#toast-region")
  const item = document.createElement("div")
  item.className = `toast ${kind}`
  item.textContent = message
  region.append(item)
  setTimeout(() => item.remove(), 5000)
}

function confirmAction(message) {
  const dialog = $("#registry-confirm-dialog")
  $("#registry-confirm-message").textContent = message
  return new Promise((resolve) => {
    const close = () => {
      dialog.removeEventListener("close", close)
      resolve(dialog.returnValue === "confirm")
    }
    dialog.addEventListener("close", close)
    dialog.showModal()
  })
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;")
}

async function api(path, options = {}) {
  const headers = new Headers(options.headers || {})
  if (state.apiKey) headers.set("X-Api-Key", state.apiKey)
  if (options.body) headers.set("Content-Type", "application/json")
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

function commaValues(value) {
  return [...new Set(
    String(value).split(/[,、\n]/).map((item) => item.trim()).filter(Boolean),
  )]
}

function parseBindings(value) {
  const result = {}
  for (const line of String(value).split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed) continue
    const separator = trimmed.indexOf("=")
    if (separator <= 0 || separator === trimmed.length - 1) {
      throw new Error(`モデル割当の形式が不正です: ${trimmed}`)
    }
    const key = trimmed.slice(0, separator).trim()
    const artifact = trimmed.slice(separator + 1).trim()
    if (!key || !artifact) throw new Error(`モデル割当の形式が不正です: ${trimmed}`)
    result[key] = artifact
  }
  return result
}

function badge(value, ready = false) {
  const kind = ready ? "good" : value === "prohibited" || value === "disabled" ? "bad" : "warn"
  return `<span class="badge ${kind}">${escapeHtml(value)}</span>`
}

function renderSummary() {
  const models = state.registry?.models || {}
  const workflows = state.registry?.workflows || {}
  const comfy = state.registry?.comfyui_configured
  $("#registry-summary").innerHTML = [
    `<span class="badge ${models.ready ? "good" : "warn"}">Models ${models.approved || 0}/${models.total || 0}</span>`,
    `<span class="badge ${workflows.ready ? "good" : "warn"}">Workflows ${workflows.enabled || 0}/${workflows.total || 0}</span>`,
    `<span class="badge ${comfy ? "good" : "warn"}">ComfyUI ${comfy ? "connected" : "not set"}</span>`,
    `<span class="badge neutral">Region ${escapeHtml(state.registry?.production_region || "unset")}</span>`,
  ].join("")
}

function renderModels() {
  const rows = state.registry?.models?.models || []
  const target = $("#model-list")
  target.innerHTML = rows.length
    ? rows.map((item) => `
      <article class="registry-card">
        <header><div><h3>${escapeHtml(item.id)}</h3><small>${escapeHtml(item.model_family || item.artifact)}</small></div>${badge(item.commercial_use, item.commercial_use === "approved")}</header>
        <dl>
          <dt>Artifact</dt><dd>${escapeHtml(item.artifact)}</dd>
          <dt>Code / model</dt><dd>${escapeHtml(item.code_license || "—")} / ${escapeHtml(item.model_license || "—")}</dd>
          <dt>Regions</dt><dd>${escapeHtml((item.regions || []).join(", ") || "all recorded regions")}</dd>
          <dt>Workflows</dt><dd>${escapeHtml((item.approved_workflows || []).join(", ") || "—")}</dd>
          <dt>Reviewer</dt><dd>${escapeHtml(item.reviewed_by || "—")} · ${escapeHtml(item.reviewed_at || "—")}</dd>
        </dl>
      </article>`).join("")
    : '<div class="empty">承認済みモデルはまだありません。</div>'
}

function renderWorkflows() {
  const rows = state.registry?.contracts || []
  const target = $("#workflow-list")
  target.innerHTML = rows.length
    ? rows.map((item) => `
      <article class="registry-card">
        <header><div><h3>${escapeHtml(item.id)}</h3><small>${escapeHtml(item.purpose)}</small></div>${badge(item.enabled ? "enabled" : item.approval, item.enabled && item.workflow_valid)}</header>
        <dl>
          <dt>Media / risk</dt><dd>${escapeHtml(item.media_kind)} / ${escapeHtml(item.risk)}</dd>
          <dt>Models</dt><dd>${escapeHtml(JSON.stringify(item.model_bindings || {}))}</dd>
          <dt>SHA</dt><dd>${escapeHtml(item.workflow_sha256 || "—")}</dd>
          <dt>Reviewer</dt><dd>${escapeHtml(item.reviewed_by || "—")} · ${escapeHtml(item.reviewed_at || "—")}</dd>
          <dt>Validation</dt><dd>${escapeHtml(item.error || (item.workflow_valid ? "valid" : "not bound"))}</dd>
        </dl>
        ${item.enabled ? `<div class="registry-actions" style="margin-top:12px"><button class="button secondary" data-disable-workflow="${escapeHtml(item.id)}" type="button">無効化</button></div>` : ""}
      </article>`).join("")
    : '<div class="empty">Workflow契約がありません。</div>'

  $$('[data-disable-workflow]', target).forEach((button) => {
    button.addEventListener("click", async () => {
      if (!await confirmAction(`${button.dataset.disableWorkflow} を無効化しますか？`)) return
      try {
        await api(`/v1/registry/workflows/${encodeURIComponent(button.dataset.disableWorkflow)}/disable`, { method: "POST" })
        toast("Workflowを無効化しました")
        await loadRegistry()
      } catch (error) {
        toast(error.message || "Workflowを無効化できませんでした", "error")
      }
    })
  })
}

function renderWorkflowOptions() {
  const select = $("#workflow-id")
  const current = select.value
  const contracts = state.registry?.contracts || []
  select.innerHTML = contracts.map((item) => `
    <option value="${escapeHtml(item.id)}">${escapeHtml(item.id)} — ${escapeHtml(item.purpose)}</option>`).join("")
  if (contracts.some((item) => item.id === current)) select.value = current
  syncWorkflowBindings()
}

function syncWorkflowBindings() {
  const selected = (state.registry?.contracts || []).find((item) => item.id === $("#workflow-id").value)
  if (!selected) return
  const bindings = selected.model_bindings || {}
  if (Object.keys(bindings).length && !$("#workflow-bindings").value.trim()) {
    $("#workflow-bindings").value = Object.entries(bindings)
      .map(([key, value]) => `${key}=${value}`)
      .join("\n")
  }
  const modelWorkflows = state.registry?.models?.models || []
  const candidate = modelWorkflows.find((model) => (model.approved_workflows || []).includes(selected.id))
  if (candidate && !$("#workflow-bindings").value.trim()) {
    const slots = selected.required_models || []
    $("#workflow-bindings").value = slots.length
      ? slots.map((slot) => `${slot}=${candidate.artifact}`).join("\n")
      : `approved-video-checkpoint=${candidate.artifact}`
  }
}

async function loadRegistry() {
  try {
    state.registry = await api("/v1/registry")
    renderSummary()
    renderModels()
    renderWorkflows()
    renderWorkflowOptions()
  } catch (error) {
    console.error("[registry] load failed", error)
    toast(error.message || "台帳を取得できませんでした", "error")
  }
}

async function submitModel(event) {
  event.preventDefault()
  const button = event.submitter
  button.disabled = true
  try {
    const body = {
      id: $("#model-id").value.trim(),
      engine: "comfyui",
      model_family: $("#model-family").value.trim(),
      exact_artifact: $("#model-artifact").value.trim(),
      sha256: $("#model-sha").value.trim().toLowerCase(),
      code_license: $("#code-license").value.trim(),
      model_license: $("#model-license").value.trim(),
      commercial_use: $("#model-commercial").value,
      regions: commaValues($("#model-regions").value),
      approved_workflows: commaValues($("#model-workflows").value),
      reviewed_by: $("#model-reviewer").value.trim() || null,
      source_url: $("#model-source").value.trim() || null,
      notes: $("#model-notes").value.trim() || null,
      confirm_license_review: $("#model-confirm").checked,
    }
    await api("/v1/registry/models", { method: "POST", body: JSON.stringify(body) })
    toast("モデル台帳を保存しました")
    $("#model-confirm").checked = false
    await loadRegistry()
  } catch (error) {
    toast(error.message || "モデルを保存できませんでした", "error")
  } finally {
    button.disabled = false
  }
}

async function submitWorkflow(event) {
  event.preventDefault()
  const button = event.submitter
  button.disabled = true
  try {
    let workflowJson
    try {
      workflowJson = JSON.parse($("#workflow-json").value)
    } catch (error) {
      console.error("[registry] workflow JSON parse failed", error)
      throw new Error("Workflow JSONを解析できません", { cause: error })
    }
    const id = $("#workflow-id").value
    const body = {
      workflow_json: workflowJson,
      reviewed_by: $("#workflow-reviewer").value.trim(),
      model_bindings: parseBindings($("#workflow-bindings").value),
      confirm_license_review: $("#workflow-confirm").checked,
    }
    await api(`/v1/registry/workflows/${encodeURIComponent(id)}/bind`, {
      method: "POST",
      body: JSON.stringify(body),
    })
    toast("Workflowを実機検証して有効化しました")
    $("#workflow-confirm").checked = false
    await loadRegistry()
  } catch (error) {
    toast(error.message || "Workflowを有効化できませんでした", "error")
  } finally {
    button.disabled = false
  }
}

function init() {
  $("#refresh-registry").addEventListener("click", () => void loadRegistry())
  $("#model-form").addEventListener("submit", submitModel)
  $("#workflow-form").addEventListener("submit", submitWorkflow)
  $("#workflow-id").addEventListener("change", syncWorkflowBindings)
  void loadRegistry()
}

document.addEventListener("DOMContentLoaded", init)
