(() => {
  const raw = $("#editorial-chapters")
  const host = $("#chapter-editor")
  const status = $("#chapter-editor-status")
  const add = $("#add-editorial-chapter")
  const undo = $("#undo-editorial-change")
  const kinds = { text_motion: "文字・モーション", ui_capture: "画面収録", chart: "図表", generative: "生成映像", supplied_edit: "支給映像", three_d: "3D", technical_diagram: "技術図解", portrait_animation: "人物アニメ", lip_sync: "リップシンク", transition: "トランジション" }
  let publishing = false
  let previous = null
  let selectedChapter = 0
  let selectedShot = 0

  function read() {
    const chapters = window.readEditorialChapters()
    if (chapters.length > 60 || chapters.some((chapter) => !chapter || typeof chapter !== "object" || Array.isArray(chapter) || !Array.isArray(chapter.shots) || chapter.shots.length > 200 || chapter.shots.some((shot) => !shot || typeof shot !== "object" || Array.isArray(shot)))) {
      throw new Error("フォームで扱う章は最大60、各章のshots配列は最大200件のオブジェクトにしてください")
    }
    if (chapters.reduce((sum, chapter) => sum + chapter.shots.length, 0) > 999) throw new Error("全体のショット数は999件以内にしてください")
    return chapters
  }
  function publish(chapters) {
    publishing = true
    raw.value = JSON.stringify(chapters, null, 2)
    raw.dispatchEvent(new Event("input", { bubbles: true }))
    publishing = false
    updateTotal(chapters)
  }
  function updateTotal(chapters) {
    const shots = chapters.flatMap((chapter) => chapter.shots)
    const valid = shots.every((shot) => typeof shot.duration_seconds === "number" && Number.isFinite(shot.duration_seconds) && shot.duration_seconds >= 0.5 && shot.duration_seconds <= 30)
    const total = valid ? Math.round(shots.reduce((sum, shot) => sum + shot.duration_seconds, 0) * 1000) / 1000 : null
    const matches = total !== null && Math.abs(total - Number($("#duration").value)) <= 0.01
    status.textContent = shots.length ? `${chapters.length}章・${shots.length}ショット / 合計 ${total === null ? "尺の入力を確認" : `${total}秒`} / ${matches ? "完成尺と一致" : "完成尺と不一致"}。構造・権利・品質は未検証です。` : chapters.length ? `${chapters.length}章・0ショット。各章にショットを追加してください。` : "章台本は未作成です。短尺の標準構成を使う場合は空欄のままにできます。"
    const chapterPicker = host.querySelector('[aria-label="編集する章"]')
    chapters.forEach((item, index) => { if (chapterPicker?.options[index]) chapterPicker.options[index].textContent = `章${index + 1}: ${item.title || "タイトル未入力"}` })
    const chapter = chapters[selectedChapter]
    const shotPicker = host.querySelector('[aria-label="編集するショット"]')
    chapter?.shots.forEach((item, index) => { if (shotPicker?.options[index]) shotPicker.options[index].textContent = `ショット${index + 1}: ${item.title || "タイトル未入力"}` })
    const chapterTitle = host.querySelector(".chapter-editor-card > summary")
    if (chapterTitle && chapter) chapterTitle.textContent = `章 ${selectedChapter + 1}: ${chapter.title || "タイトル未入力"} (${chapter.shots.length}ショット)`
    const shotTitle = host.querySelector(".chapter-editor-shot > summary")
    if (shotTitle && chapter?.shots[selectedShot]) shotTitle.textContent = `ショット ${selectedShot + 1}: ${chapter.shots[selectedShot].title || "タイトル未入力"}`
  }
  function mutate(change) {
    try {
      const chapters = read()
      previous = raw.value
      const oldChapter = chapters[selectedChapter]
      const oldShot = oldChapter?.shots[selectedShot]
      const priorChapterIndex = selectedChapter
      const priorShotIndex = selectedShot
      change(chapters)
      if (selectedChapter === priorChapterIndex && chapters.includes(oldChapter)) selectedChapter = chapters.indexOf(oldChapter)
      if (selectedShot === priorShotIndex && chapters[selectedChapter]?.shots.includes(oldShot)) selectedShot = chapters[selectedChapter].shots.indexOf(oldShot)
      publish(chapters)
      undo.disabled = false
      render()
    } catch (error) {
      console.error("[chapter-editor] edit failed", error)
      toast(error.message || "台本を変更できませんでした", "error")
    }
  }
  function element(tag, text, className) {
    const node = document.createElement(tag)
    if (text) node.textContent = text
    if (className) node.className = className
    return node
  }
  function button(label, action, disabled = false) {
    const node = element("button", label, "button secondary")
    node.type = "button"; node.disabled = disabled; node.setAttribute("aria-label", label)
    node.addEventListener("click", action)
    return node
  }
  function field(label, value, update, options = {}) {
    const wrapper = element("label", null, "field")
    wrapper.append(element("span", label))
    const input = element(options.select ? "select" : options.multiline ? "textarea" : "input")
    input.setAttribute("aria-label", label)
    if (options.select) {
      for (const [key, name] of Object.entries(kinds)) {
        const item = element("option", name); item.value = key; input.append(item)
      }
      if (value && !Object.hasOwn(kinds, value)) { const item = element("option", `要確認: ${value}`); item.value = value; input.append(item) }
    } else if (options.number) { input.type = "number"; input.min = "0.5"; input.max = "30"; input.step = "0.1" }
    else if (options.multiline) input.rows = 3
    input.value = value ?? ""
    input.addEventListener("input", () => {
      try { const chapters = read(); update(chapters, options.number ? (input.value === "" ? null : Number(input.value)) : input.value); previous = null; undo.disabled = true; publish(chapters) }
      catch (error) { console.error("[chapter-editor] field edit failed", error); toast(error.message || "入力を反映できませんでした", "error") }
    })
    wrapper.append(input)
    return wrapper
  }
  function render() {
    host.replaceChildren()
    let chapters
    try { chapters = read(); add.disabled = chapters.length >= 60 }
    catch (error) {
      console.error("[chapter-editor] cannot load JSON", error)
      status.textContent = "JSONをフォームに読み込めません。下の詳細JSONを修正してください。元の入力は保持しています。"
      add.disabled = true
      return
    }
    updateTotal(chapters)
    selectedChapter = Math.min(selectedChapter, Math.max(0, chapters.length - 1))
    if (chapters.length) {
      const picker = element("select"); picker.setAttribute("aria-label", "編集する章")
      chapters.forEach((chapter, index) => { const option = element("option", `章${index + 1}: ${chapter.title || "タイトル未入力"}`); option.value = String(index); picker.append(option) })
      picker.value = String(selectedChapter)
      picker.addEventListener("change", () => { selectedChapter = Number(picker.value); selectedShot = 0; render() })
      host.append(picker)
    }
    chapters.forEach((chapter, c) => {
      if (c !== selectedChapter) return
      const panel = element("details", null, "chapter-editor-card")
      panel.open = true
      panel.append(element("summary", `章 ${c + 1}: ${chapter.title || "タイトル未入力"} (${chapter.shots.length}ショット)`))
      const fields = element("div", null, "field-grid")
      fields.append(field(`章${c + 1}のID`, chapter.id, (items, value) => { items[c].id = value }), field(`章${c + 1}のタイトル`, chapter.title, (items, value) => { items[c].title = value }))
      panel.append(fields)
      const actions = element("div", null, "button-row")
      actions.append(button(`章${c + 1}を上へ`, () => mutate((items) => { [items[c - 1], items[c]] = [items[c], items[c - 1]] }), c === 0), button(`章${c + 1}を下へ`, () => mutate((items) => { [items[c + 1], items[c]] = [items[c], items[c + 1]] }), c === chapters.length - 1), button(`章${c + 1}を削除`, () => mutate((items) => items.splice(c, 1))))
      panel.append(actions)
      selectedShot = Math.min(selectedShot, Math.max(0, chapter.shots.length - 1))
      if (chapter.shots.length) {
        const picker = element("select"); picker.setAttribute("aria-label", "編集するショット")
        chapter.shots.forEach((shot, index) => { const option = element("option", `ショット${index + 1}: ${shot.title || "タイトル未入力"}`); option.value = String(index); picker.append(option) })
        picker.value = String(selectedShot)
        picker.addEventListener("change", () => { selectedShot = Number(picker.value); render() })
        panel.append(picker)
      }
      chapter.shots.forEach((shot, s) => {
        if (s !== selectedShot) return
        const shotPanel = element("details", null, "chapter-editor-shot")
        shotPanel.open = true
        shotPanel.append(element("summary", `ショット ${s + 1}: ${shot.title || "タイトル未入力"}`))
        const grid = element("div", null, "field-grid")
        for (const [key, label, options] of [
          ["title", "タイトル", {}], ["kind", "表現", { select: true }], ["duration_seconds", "秒数", { number: true }],
          ["visual_direction", "映像指示", { multiline: true }], ["headline", "見出し", {}], ["body", "画面本文", { multiline: true }],
          ["narration", "ナレーション", { multiline: true }], ["narration_path", "音声素材パス", {}],
        ]) grid.append(field(`章${c + 1}ショット${s + 1} ${label}`, shot[key], (items, value) => { items[c].shots[s][key] = key === "narration_path" && value === "" ? null : value }, options))
        shotPanel.append(grid)
        const shotActions = element("div", null, "button-row")
        shotActions.append(button(`章${c + 1}ショット${s + 1}を上へ`, () => mutate((items) => { const shots = items[c].shots; [shots[s - 1], shots[s]] = [shots[s], shots[s - 1]] }), s === 0), button(`章${c + 1}ショット${s + 1}を下へ`, () => mutate((items) => { const shots = items[c].shots; [shots[s + 1], shots[s]] = [shots[s], shots[s + 1]] }), s === chapter.shots.length - 1), button(`章${c + 1}ショット${s + 1}を削除`, () => mutate((items) => items[c].shots.splice(s, 1))))
        shotPanel.append(shotActions); panel.append(shotPanel)
      })
      panel.append(button(`章${c + 1}にショットを追加`, () => mutate((items) => { items[c].shots.push({ title: "", kind: "text_motion", duration_seconds: 5, visual_direction: "" }); selectedShot = items[c].shots.length - 1 }), chapter.shots.length >= 200 || chapters.reduce((sum, item) => sum + item.shots.length, 0) >= 999))
      host.append(panel)
    })
  }
  add.addEventListener("click", () => mutate((chapters) => {
    let id = 1
    while (chapters.some((chapter) => chapter.id === `chapter-${id}`)) id++
    chapters.push({ id: `chapter-${id}`, title: "", shots: [] })
    selectedChapter = chapters.length - 1; selectedShot = 0
  }))
  undo.addEventListener("click", () => {
    if (previous === null) return
    raw.value = previous; previous = null; undo.disabled = true
    raw.dispatchEvent(new Event("input", { bubbles: true }))
  })
  raw.addEventListener("input", () => { if (!publishing) { previous = null; undo.disabled = true; render() } })
  $("#duration").addEventListener("input", () => { try { updateTotal(read()) } catch (error) { console.error("[chapter-editor] timeline unavailable", error); status.textContent = "JSON形式を修正すると合計尺を表示します。" } })
  render()
})()
