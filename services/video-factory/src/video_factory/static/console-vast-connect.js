function vastApiHeaders() {
  const headers = new Headers()
  const apiKey = sessionStorage.getItem("videoFactoryApiKey") || ""
  if (apiKey) headers.set("X-Api-Key", apiKey)
  return headers
}

function mappedComfyPort(instance) {
  const ports = instance?.ports && typeof instance.ports === "object" ? instance.ports : {}
  const preferred = ["8188/tcp", "18188/tcp"]
  for (const key of preferred) {
    const mappings = ports[key]
    const value = Array.isArray(mappings) ? mappings[0]?.HostPort : null
    if (value) return String(value)
  }
  for (const [key, mappings] of Object.entries(ports)) {
    if (!key.startsWith("8188/") && !key.startsWith("18188/")) continue
    const value = Array.isArray(mappings) ? mappings[0]?.HostPort : null
    if (value) return String(value)
  }
  return instance?.direct_port_start ? String(instance.direct_port_start) : ""
}

async function loadVastInstance(instanceId) {
  const response = await fetch("/v1/vast/instances", {
    headers: vastApiHeaders(),
    cache: "no-store",
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(body.detail || body.error || `HTTP ${response.status}`)
  }
  return (body.instances || []).find((item) => String(item.id || item.instance_id) === String(instanceId))
}

async function useVastInstanceAsComfyUI(instanceId, button) {
  const previous = button.textContent
  button.disabled = true
  button.textContent = "接続情報を取得中…"
  try {
    const instance = await loadVastInstance(instanceId)
    if (!instance) throw new Error("Vast.aiインスタンスを取得できませんでした")
    const host = instance.public_ipaddr || instance.ssh_host || instance.public_ip || ""
    const port = mappedComfyPort(instance)
    if (!host || !port) {
      throw new Error("ComfyUIの公開ポートがまだ準備されていません。起動完了後に再試行してください")
    }
    const token = instance.open_button_token
      || instance.jupyter_token
      || instance.portal_token
      || ""
    const urlInput = document.querySelector("#comfyui-url")
    const keyInput = document.querySelector("#comfyui-api-key")
    if (urlInput) urlInput.value = `http://${host}:${port}`
    if (keyInput && token) keyInput.value = token
    document.querySelector('[data-view="gpu"]')?.click()
    urlInput?.scrollIntoView({ behavior: "smooth", block: "center" })
    urlInput?.focus()
    button.textContent = token ? "接続候補を設定済み" : "URLを設定済み・トークン要確認"
  } catch (error) {
    console.error("[video-factory-vast-connect] selection failed", error)
    button.textContent = error instanceof Error ? error.message : "接続候補を設定できませんでした"
  } finally {
    setTimeout(() => {
      button.disabled = false
      button.textContent = previous
    }, 3500)
  }
}

function enhanceVastInstanceCards() {
  document.querySelectorAll(".instance-card").forEach((card) => {
    if (card.querySelector("[data-use-comfyui]")) return
    const idButton = card.querySelector("[data-instance-id], [data-instance-destroy]")
    const instanceId = idButton?.dataset.instanceId || idButton?.dataset.instanceDestroy
    if (!instanceId) return
    const actions = card.querySelector(".instance-actions")
    if (!actions) return
    const button = document.createElement("button")
    button.className = "button primary"
    button.type = "button"
    button.dataset.useComfyui = instanceId
    button.textContent = "ComfyUI接続に使用"
    button.addEventListener("click", () => {
      void useVastInstanceAsComfyUI(instanceId, button)
    })
    actions.prepend(button)
  })
}

document.addEventListener("DOMContentLoaded", () => {
  enhanceVastInstanceCards()
  const target = document.querySelector("#instance-list")
  if (target) {
    new MutationObserver(enhanceVastInstanceCards).observe(target, {
      childList: true,
      subtree: true,
    })
  }
})
