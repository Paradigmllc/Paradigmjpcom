function formatBytes(value) {
  const bytes = Number(value || 0)
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`
  return `${(bytes / 1024 ** 3).toFixed(1)} GB`
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
    console.error("[video-factory-console] artifact download failed", error)
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
      ${window.studioProjectToolsHtml ? window.studioProjectToolsHtml(detail) : ""}
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
    if (window.wireStudioProjectTools) window.wireStudioProjectTools(detail)
  } catch (error) {
    console.error("[video-factory-console] detail failed", error)
    target.innerHTML = `<div class="empty tall"><strong>案件を表示できません</strong><p>${escapeHtml(error.message)}</p></div>`
  }
}
