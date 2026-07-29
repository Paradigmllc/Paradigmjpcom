(() => {
  const activeRunKey = "videoFactoryActiveRun"
  const openProjectKey = "videoFactoryOpenProject"
  const originalFetch = window.fetch.bind(window)

  function notify(message, kind = "success") {
    if (typeof window.toast === "function") {
      window.toast(message, kind)
      return
    }
    console.info(`[video-factory-console] ${message}`)
  }

  async function pollRun(runId) {
    const apiKey = sessionStorage.getItem("videoFactoryApiKey") || ""
    const headers = new Headers()
    if (apiKey) headers.set("X-Api-Key", apiKey)
    try {
      const response = await originalFetch(`/v1/runs/${encodeURIComponent(runId)}`, {
        headers,
        cache: "no-store",
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.detail || `HTTP ${response.status}`)
      const status = String(payload.state || "").toLowerCase()
      if (["failed", "crashed", "cancelled", "canceled"].includes(status)) {
        sessionStorage.removeItem(activeRunKey)
        notify(payload.error || "制作ジョブが失敗しました", "error")
        return
      }
      if (["completed", "complete", "success", "finished"].includes(status)) {
        sessionStorage.removeItem(activeRunKey)
        const projectId = payload.project_id || payload.result?.project_id
        if (projectId) {
          sessionStorage.setItem(openProjectKey, projectId)
          notify("動画ドラフトが完成しました。確認画面を開きます。")
          window.location.hash = "projects"
          window.setTimeout(() => window.location.reload(), 700)
        } else {
          notify("制作ジョブが完了しました。案件一覧を更新してください。")
        }
        return
      }
      window.setTimeout(() => void pollRun(runId), 5000)
    } catch (error) {
      console.error("[video-factory-console] run polling failed", error)
      window.setTimeout(() => void pollRun(runId), 10000)
    }
  }

  window.fetch = async (input, init = {}) => {
    const response = await originalFetch(input, init)
    try {
      const url = typeof input === "string" ? input : input.url
      const method = String(init.method || (typeof input === "string" ? "GET" : input.method)).toUpperCase()
      const path = new URL(url, window.location.origin).pathname
      if (method === "POST" && path === "/v1/runs" && response.ok) {
        const payload = await response.clone().json()
        if (payload.run_id) {
          sessionStorage.setItem(activeRunKey, payload.run_id)
          notify("本番制作をバックグラウンドで開始しました。")
          void pollRun(payload.run_id)
        }
      }
    } catch (error) {
      console.error("[video-factory-console] response observer failed", error)
    }
    return response
  }

  function openCompletedProject() {
    const projectId = sessionStorage.getItem(openProjectKey)
    if (!projectId) return
    const selector = `[data-project-id="${CSS.escape(projectId)}"]`
    let attempts = 0
    const timer = window.setInterval(() => {
      const button = document.querySelector(selector)
      attempts += 1
      if (button) {
        sessionStorage.removeItem(openProjectKey)
        window.clearInterval(timer)
        button.click()
      } else if (attempts >= 30) {
        window.clearInterval(timer)
      }
    }, 500)
  }

  document.addEventListener("DOMContentLoaded", () => {
    const activeRun = sessionStorage.getItem(activeRunKey)
    if (activeRun) void pollRun(activeRun)
    openCompletedProject()
  })
})()
