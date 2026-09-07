(() => {
  window.readEditorialChapters = () => {
    const raw = document.querySelector("#editorial-chapters").value.trim()
    if (!raw) return []
    let value
    try {
      value = JSON.parse(raw)
    } catch (error) {
      console.error("[editorial] JSON parse failed", error)
      throw new Error("章台本のJSON形式を確認してください")
    }
    if (!Array.isArray(value)) throw new Error("章台本は配列で指定してください")
    return value
  }
  const button = document.querySelector("#check-editorial-plan")
  const result = document.querySelector("#editorial-plan-result")
  let revision = 0
  document.querySelector("#video-form").addEventListener("input", () => {
    revision++
    result.textContent = "台本が変更されました。再検証してください。"
  })
  button.addEventListener("click", async () => {
    button.disabled = true
    result.textContent = "台本・タイムラインを検証中…"
    const checkedRevision = revision
    try {
      const manifest = await api("/v1/briefs/plan", {
        method: "POST", body: JSON.stringify(window.buildStudioBrief()),
      })
      if (checkedRevision !== revision) { result.textContent = "検証中に入力が変更されました。再検証してください。"; return }
      const chapters = manifest.metadata?.chapters || []
      result.replaceChildren()
      const summary = document.createElement("p")
      summary.textContent = `${chapters.length}章 / ${manifest.shots.length}ショット / ${manifest.duration_seconds}秒。構造検証のみ合格。音声・画質・権利・実行環境は別途確認します。`
      result.append(summary)
      chapters.forEach((chapter) => {
        const row = document.createElement("p")
        row.textContent = `${chapter.title}: ${chapter.start_seconds}〜${chapter.end_seconds}秒 (${chapter.shot_ids.length}ショット)`
        result.append(row)
      })
      toast("台本の構造と合計尺を確認しました")
    } catch (error) {
      console.error("[editorial] Plan validation failed", error)
      if (checkedRevision !== revision) { result.textContent = "検証中に入力が変更されました。再検証してください。"; return }
      result.textContent = error.message || "台本を検証できませんでした"
      toast(result.textContent, "error")
    } finally {
      button.disabled = false
    }
  })
})()
