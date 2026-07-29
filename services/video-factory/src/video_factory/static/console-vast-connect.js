function enhanceVastInstanceCards() {
  document.querySelectorAll(".instance-card").forEach((card) => {
    if (card.querySelector("[data-use-comfyui]")) return
    const spans = [...card.querySelectorAll(".instance-meta span")]
    const host = spans[2]?.textContent?.trim()
    const portText = spans[3]?.textContent || ""
    const port = portText.match(/(\d{2,5})/)?.[1]
    if (!host || host === "IP loading" || !port) return
    const actions = card.querySelector(".instance-actions")
    if (!actions) return
    const button = document.createElement("button")
    button.className = "button primary"
    button.type = "button"
    button.dataset.useComfyui = "true"
    button.textContent = "接続候補として使用"
    button.addEventListener("click", () => {
      const input = document.querySelector("#comfyui-url")
      if (input) input.value = `http://${host}:${port}`
      document.querySelector('[data-view="gpu"]')?.click()
      input?.scrollIntoView({ behavior: "smooth", block: "center" })
      input?.focus()
    })
    actions.prepend(button)
  })
}

document.addEventListener("DOMContentLoaded", () => {
  enhanceVastInstanceCards()
  const target = document.querySelector("#instance-list")
  if (target) new MutationObserver(enhanceVastInstanceCards).observe(target, { childList: true, subtree: true })
})
