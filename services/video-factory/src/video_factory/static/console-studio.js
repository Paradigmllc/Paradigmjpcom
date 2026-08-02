(() => {
  const fallbackTemplates = [
    ["kinetic-type", "Kinetic Type"],
    ["product-spotlight", "Product Spotlight"],
    ["ui-focus", "UI Focus"],
    ["data-proof", "Data Proof"],
    ["social-cta", "Social CTA"],
  ]
  let templates = []

  function selectedTemplateRows() {
    return templates.length
      ? templates.map((item) => [item.id, item.display_name])
      : fallbackTemplates
  }

  function renderTemplateCatalog() {
    const select = $("#creative-template")
    const catalog = $("#creative-template-catalog")
    if (!select || !catalog) return
    const current = select.value || "auto"
    select.innerHTML = '<option value="auto">シーンごとに自動選択</option>'
      + templates.map((item) => (
        `<option value="${escapeHtml(item.id)}">${escapeHtml(item.display_name)}</option>`
      )).join("")
    select.value = current
    catalog.innerHTML = templates.length
      ? templates.map((item) => `
        <button class="studio-template-card${current === item.id ? " active" : ""}" data-studio-template="${escapeHtml(item.id)}" type="button" role="listitem">
          <span class="studio-template-swatch template-${escapeHtml(item.id)}"></span>
          <strong>${escapeHtml(item.display_name)}</strong>
          <small>${escapeHtml(item.description)}</small>
        </button>`).join("")
      : '<div class="empty compact">テンプレートがありません。</div>'
    $$('[data-studio-template]', catalog).forEach((button) => {
      button.addEventListener("click", () => {
        select.value = button.dataset.studioTemplate
        renderTemplateCatalog()
      })
    })
  }

  async function loadStudioTemplates() {
    if (!state.connected) return
    try {
      const body = await api("/v1/studio/templates")
      templates = body.templates || []
      renderTemplateCatalog()
    } catch (error) {
      console.error("[video-factory-console] Studio templates failed", error)
      const catalog = $("#creative-template-catalog")
      if (catalog) catalog.innerHTML = '<div class="empty compact">テンプレートを取得できませんでした。</div>'
    }
  }

  function studioBrandFields() {
    return {
      kit_id: $("#brand-kit-id").value.trim(),
      secondary_color: $("#secondary-color-text").value.trim().toUpperCase(),
      text_color: $("#text-color-text").value.trim().toUpperCase(),
      motion_preset: $("#motion-preset").value,
      safe_margin_percent: Number($("#safe-margin").value),
    }
  }

  function studioBriefFields() {
    return {
      template_id: $("#creative-template").value,
      audio: {
        narration_path: $("#narration-path").value.trim() || null,
        music_path: $("#music-path").value.trim() || null,
        narration_volume: 1,
        music_volume: Number($("#music-volume").value),
        captions: $("#caption-mode").value,
      },
    }
  }

  function templateOptions(selected) {
    return selectedTemplateRows().map(([id, label]) => (
      `<option value="${escapeHtml(id)}"${id === selected ? " selected" : ""}>${escapeHtml(label)}</option>`
    )).join("")
  }

  function qaHtml(detail) {
    const qa = detail.qa
    if (!qa) return '<div class="studio-qa empty compact">QA結果はまだありません。</div>'
    const probe = qa.probe || {}
    const audio = probe.audio_peak_db == null ? "未検出" : `${Number(probe.audio_peak_db).toFixed(1)} dBFS`
    return `<div class="studio-qa ${qa.passed ? "passed" : "failed"}">
      <div><span>TECHNICAL QA</span><strong>${qa.passed ? "合格" : "要修正"}</strong></div>
      <small>${escapeHtml(probe.width || "—")}×${escapeHtml(probe.height || "—")} · ${escapeHtml(probe.fps || "—")}fps · Audio peak ${escapeHtml(audio)}</small>
    </div>`
  }

  function studioProjectToolsHtml(detail) {
    const shots = detail.manifest?.shots || []
    if (!shots.length) return '<div class="storyboard-section"><div class="empty compact">Storyboardはまだありません。</div></div>'
    const language = detail.manifest.primary_deliverable?.language || "ja"
    return `<section class="storyboard-section">
      <div class="panel-heading studio-heading"><div><p class="eyebrow">COMMERCIAL STUDIO</p><h2>Storyboard・シーン修正</h2></div><span class="badge neutral">${shots.length} scenes</span></div>
      ${qaHtml(detail)}
      <div class="storyboard-list" data-storyboard-language="${escapeHtml(language)}">
        ${shots.map((shot) => `<article class="storyboard-card" data-shot-editor="${escapeHtml(shot.id)}">
          <div class="storyboard-card-head"><span>${escapeHtml(shot.id)} · ${escapeHtml(shot.kind)}</span><strong>${escapeHtml(shot.title)}</strong><small>${escapeHtml(shot.duration_seconds)}s</small></div>
          <label><span>見出し</span><input data-shot-headline value="${escapeHtml(shot.headline)}" maxlength="500"></label>
          <label><span>本文</span><textarea data-shot-body rows="2" maxlength="2000">${escapeHtml(shot.body)}</textarea></label>
          <label><span>テンプレート</span><select data-shot-template>${templateOptions(shot.template_id)}</select></label>
          <div class="storyboard-actions"><button class="button secondary" data-save-shot type="button">保存</button><button class="button primary" data-rerender-shot type="button">保存して再生成</button></div>
        </article>`).join("")}
      </div>
    </section>`
  }

  async function saveShot(editor, detail, rerender) {
    const shotId = editor.dataset.shotEditor
    const buttons = $$('button', editor)
    buttons.forEach((button) => { button.disabled = true })
    try {
      await api(`/v1/projects/${encodeURIComponent(detail.project_id)}/shots/${encodeURIComponent(shotId)}`, {
        method: "PATCH",
        body: JSON.stringify({
          language: detail.manifest.primary_deliverable?.language || "ja",
          headline: $('[data-shot-headline]', editor).value.trim(),
          body: $('[data-shot-body]', editor).value.trim(),
          template_id: $('[data-shot-template]', editor).value,
          reviewer: state.bootstrap?.factory?.environment === "production" ? "Paradigm Producer" : "GUI Reviewer",
        }),
      })
      toast(`${shotId} を保存しました`)
      if (rerender) {
        const result = await api(`/v1/projects/${encodeURIComponent(detail.project_id)}/rerender`, {
          method: "POST",
          body: JSON.stringify({ shot_ids: [shotId] }),
        })
        if (result.run_id && window.watchVideoFactoryRun) window.watchVideoFactoryRun(result.run_id)
        toast(result.accepted ? "再生成をバックグラウンドで開始しました" : "再生成が完了しました")
      }
      await loadProjects(true)
      await loadProjectDetail(detail.project_id)
    } catch (error) {
      console.error("[video-factory-console] shot revision failed", error)
      toast(error.message || "シーンを更新できませんでした", "error")
    } finally {
      buttons.forEach((button) => { button.disabled = false })
    }
  }

  function wireStudioProjectTools(detail) {
    $$('[data-shot-editor]').forEach((editor) => {
      $('[data-save-shot]', editor).addEventListener("click", () => void saveShot(editor, detail, false))
      $('[data-rerender-shot]', editor).addEventListener("click", () => void saveShot(editor, detail, true))
    })
  }

  function wireColors() {
    [["#secondary-color", "#secondary-color-text"], ["#text-color", "#text-color-text"]]
      .forEach(([source, target]) => {
        $(source)?.addEventListener("input", () => { $(target).value = $(source).value.toUpperCase() })
      })
  }

  window.loadStudioTemplates = loadStudioTemplates
  window.studioBrandFields = studioBrandFields
  window.studioBriefFields = studioBriefFields
  window.studioProjectToolsHtml = studioProjectToolsHtml
  window.wireStudioProjectTools = wireStudioProjectTools
  document.addEventListener("DOMContentLoaded", () => {
    wireColors()
    void loadStudioTemplates()
  })
})()
