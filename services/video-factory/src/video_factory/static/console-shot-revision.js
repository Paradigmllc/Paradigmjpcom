/* Existing authenticated console, one shot editor at a time even for long-form projects. */
(function () {
  const editable = new Set(["production", "qa_failed", "draft_review_required", "draft_approved", "failed"])

  function editorHtml(shot, detail, templates) {
    const metadata = shot.metadata || {}
    const generated = ["comfyui", "oss"].includes(shot.engine) || Boolean(metadata.prompt)
    const authored = detail.manifest.metadata?.planning_mode === "authored_chapters"
    return `<article class="storyboard-card" data-shot-editor="${escapeHtml(shot.id)}">
      <div class="storyboard-card-head"><span>${escapeHtml(shot.id)} · ${escapeHtml(shot.kind)}</span><strong>${escapeHtml(shot.title)}</strong><small>${escapeHtml(shot.duration_seconds)}s</small></div>
      <fieldset${editable.has(detail.state?.status) ? "" : " disabled"}>
        <label><span>見出し</span><input data-revision-field="headline" value="${escapeHtml(shot.headline || "")}" maxlength="500"></label>
        <label><span>本文</span><textarea aria-label="本文" data-revision-field="body" rows="2" maxlength="2000">${escapeHtml(shot.body || "")}</textarea></label>
        <label><span>テンプレート</span><select data-revision-field="template_id">${templates(shot.template_id)}</select></label>
        ${generated ? `<label><span>映像の生成指示</span><textarea aria-label="映像の生成指示" data-revision-field="prompt" rows="4" maxlength="4000">${escapeHtml(metadata.prompt || "")}</textarea></label>` : ""}
        ${authored ? `<label><span>ナレーション原稿</span><textarea aria-label="ナレーション原稿" data-revision-field="narration" rows="3" maxlength="2000">${escapeHtml(metadata.narration || "")}</textarea></label>
          <label><span>差し替える音声ファイル（サーバー上のパス）</span><input data-revision-field="narration_path" value="${escapeHtml(metadata.narration_path || "")}" maxlength="2000"></label>
          <p class="panel-lead">原稿を変えたら、対応する権利確認済み音声も指定してください。音声未指定・尺超過はGPU起動前に停止します。全編音源は台本側で差し替えてください。</p>` : ""}
        <label><span>修正担当者名（承認とは別）</span><input data-revision-reviewer minlength="2" maxlength="200" autocomplete="name"></label>
        <p class="panel-lead" data-revision-status role="status" aria-live="polite">保存すると旧承認では納品できなくなり、再生成後に再レビューが必要です。</p>
        <div class="storyboard-actions"><button class="button secondary" data-save-shot type="button">保存</button><button class="button primary" data-rerender-shot type="button">保存して再生成</button></div>
      </fieldset>
    </article>`
  }

  window.shotRevisionHtml = (detail, language, qa, templates) => {
    const shots = detail.manifest.shots
    return `<section class="storyboard-section">
      <div class="panel-heading studio-heading"><div><p class="eyebrow">SHOT REVIEW</p><h2>Storyboard・シーン修正</h2></div><span class="badge neutral">${shots.length} scenes</span></div>
      ${qa}
      <p class="panel-lead">選択したショットだけを再生成します。他の素材も検証し、完成動画・字幕・音声を再構成します。生成費用が発生する場合があります。未保存の変更はページを閉じると失われます。</p>
      <label><span>修正するショット</span><select data-revision-selection aria-label="修正するショット">${shots.map((shot, index) => `<option value="${index}">${escapeHtml(shot.id)} · ${escapeHtml(shot.title)}</option>`).join("")}</select></label>
      <div class="storyboard-list" data-storyboard-language="${escapeHtml(language)}">${editorHtml(shots[0], detail, templates)}</div>
    </section>`
  }

  window.wireShotRevision = (detail, templates) => {
    const selection = $('[data-revision-selection]')
    const list = $('[data-storyboard-language]')
    if (!selection || !list) return
    let index = 0
    let dirty = false
    let busy = false

    function wireEditor() {
      const editor = $('[data-shot-editor]', list)
      editor.addEventListener("input", () => {
        dirty = true
        $('[data-revision-status]', editor).textContent = "未保存の変更があります。切り替える前に保存してください。"
      })
      $('[data-save-shot]', editor).addEventListener("click", () => void save(false))
      $('[data-rerender-shot]', editor).addEventListener("click", () => void save(true))
    }

    async function save(rerender) {
      if (busy) return
      const editor = $('[data-shot-editor]', list)
      const shot = detail.manifest.shots[index]
      const reviewer = $('[data-revision-reviewer]', editor).value.trim()
      if (reviewer.length < 2) { toast("修正担当者名を2文字以上で入力してください", "error"); return }
      const patch = {}
      $$('[data-revision-field]', editor).forEach((field) => {
        const key = field.dataset.revisionField
        const previous = ["prompt", "narration", "narration_path"].includes(key) ? shot.metadata?.[key] : shot[key]
        if (field.value.trim() !== (previous || "")) patch[key] = field.value.trim()
      })
      if (!Object.keys(patch).length && !rerender) { dirty = false; toast("変更はありません"); return }
      busy = true
      selection.disabled = true
      $$('button, input, textarea, select', editor).forEach((node) => { node.disabled = true })
      const status = $('[data-revision-status]', editor)
      status.textContent = "修正を保存しています…"
      try {
        const base = `/v1/projects/${encodeURIComponent(detail.project_id)}`
        if (Object.keys(patch).length) {
          const saved = await api(`${base}/shots/${encodeURIComponent(shot.id)}`, {
            method: "PATCH", body: JSON.stringify({ language: detail.manifest.primary_deliverable?.language || "ja", reviewer, ...patch }),
          })
          detail.manifest.shots[index] = saved.shot
          // Keep the editor consistent if the backend cleared an obsolete voice recording.
          const audioPath = $('[data-revision-field="narration_path"]', editor)
          if (audioPath) audioPath.value = saved.shot.metadata?.narration_path || ""
          detail.state.status = "production"
          dirty = false
          $$('[data-project-action]').forEach((button) => { button.disabled = true })
          const qa = $(".studio-qa")
          if (qa) { qa.className = "studio-qa empty compact"; qa.textContent = "修正済み。表示中の動画とQAは前回版です。再生成・再レビューが必要です。" }
          toast(`${shot.id} を保存しました`)
        }
        if (rerender) {
          status.textContent = "再生成を受け付けています…"
          const result = await api(`${base}/rerender`, { method: "POST", body: JSON.stringify({ shot_ids: [shot.id] }) })
          if (result.result?.status === "failed") throw new Error("QA不合格です。成果物・QA結果を確認してください。")
          if (result.run_id && window.watchVideoFactoryRun) window.watchVideoFactoryRun(result.run_id)
          toast(result.accepted ? "再生成をキューに登録しました" : "再生成が完了しました。再レビューが必要です")
          await loadProjects(true)
          await loadProjectDetail(detail.project_id)
        }
        status.textContent = "保存済み。再生成・再レビューが必要です。"
      } catch (error) {
        console.error("[video-factory-console] shot revision failed", error)
        status.textContent = error.message || "修正に失敗しました。入力は保持しています。"
        toast(status.textContent, "error")
      } finally {
        busy = false
        selection.disabled = false
        $$('button, input, textarea, select', editor).forEach((node) => { node.disabled = false })
      }
    }

    selection.addEventListener("change", () => {
      if (dirty || busy) {
        selection.value = String(index)
        toast("ショットを切り替える前に変更を保存してください", "warn")
        return
      }
      index = Number(selection.value)
      list.innerHTML = editorHtml(detail.manifest.shots[index], detail, templates)
      wireEditor()
    })
    wireEditor()
  }
})()
