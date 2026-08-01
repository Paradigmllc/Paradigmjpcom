function installSourceAssetUploader() {
  const sourceTextarea = document.querySelector("#source-assets")
  if (!sourceTextarea || document.querySelector("#source-upload-panel")) return

  const panel = document.createElement("div")
  panel.id = "source-upload-panel"
  panel.className = "source-upload-panel"
  panel.innerHTML = `
    <div class="source-upload-copy">
      <strong>素材をブラウザから追加</strong>
      <small>動画・画像・音声を選択すると、永続ワークスペースへ安全に保存して上の素材欄へ追加します。1ファイル最大250 MB、同時20件まで。</small>
    </div>
    <input id="source-upload-input" type="file" multiple accept="video/*,audio/*,image/*,.svg,.mkv,.m4a,.aac,.flac">
    <div class="source-upload-actions">
      <button id="source-upload-button" class="button secondary" type="button">選択した素材をアップロード</button>
      <span id="source-upload-status" role="status" aria-live="polite"></span>
    </div>`
  sourceTextarea.closest("label")?.insertAdjacentElement("afterend", panel)

  const style = document.createElement("style")
  style.textContent = `
    .source-upload-panel{grid-column:1/-1;border:1px dashed #94a3b8;border-radius:14px;background:#f8fafc;padding:14px;display:grid;gap:10px}
    .source-upload-copy{display:grid;gap:3px}.source-upload-copy strong{font-size:13px}.source-upload-copy small{color:#64748b;line-height:1.55}
    .source-upload-actions{display:flex;align-items:center;gap:12px;flex-wrap:wrap}.source-upload-actions span{font-size:12px;color:#475569}
    #source-upload-input{width:100%;font-size:12px;color:#334155}
  `
  document.head.append(style)

  const input = document.querySelector("#source-upload-input")
  const button = document.querySelector("#source-upload-button")
  const status = document.querySelector("#source-upload-status")

  button?.addEventListener("click", async () => {
    const files = [...(input?.files || [])]
    if (!files.length) {
      status.textContent = "ファイルを選択してください。"
      return
    }
    if (files.length > 20) {
      status.textContent = "一度に選択できるのは20件までです。"
      return
    }

    const form = new FormData()
    files.forEach((file) => form.append("files", file, file.name))
    button.disabled = true
    status.textContent = `${files.length}件をアップロード中…`
    try {
      const headers = new Headers()
      const apiKey = sessionStorage.getItem("videoFactoryApiKey") || ""
      if (apiKey) headers.set("X-Api-Key", apiKey)
      const response = await fetch("/v1/uploads", {
        method: "POST",
        headers,
        body: form,
        cache: "no-store",
      })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) {
        const detail = body.detail || body.error || `HTTP ${response.status}`
        throw new Error(typeof detail === "string" ? detail : JSON.stringify(detail))
      }
      const paths = (body.uploads || []).map((item) => item.path).filter(Boolean)
      const current = sourceTextarea.value.trim()
      sourceTextarea.value = [current, ...paths].filter(Boolean).join("\n")
      sourceTextarea.dispatchEvent(new Event("input", { bubbles: true }))
      status.textContent = `${paths.length}件を追加しました。`
      input.value = ""
    } catch (error) {
      console.error("[video-factory-upload] upload failed", error)
      status.textContent = error instanceof Error ? error.message : "アップロードに失敗しました。"
    } finally {
      button.disabled = false
    }
  })
}

document.addEventListener("DOMContentLoaded", installSourceAssetUploader)
