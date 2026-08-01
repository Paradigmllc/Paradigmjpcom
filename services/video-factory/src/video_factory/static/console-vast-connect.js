async function adoptVastInstance(instanceId, button) {
  const previous = button.textContent
  button.disabled = true
  button.textContent = "認証プロキシを確認中…"
  try {
    const result = await api(`/v1/vast/instances/${instanceId}/adopt`, {
      method: "POST",
    })
    const phase = result.provisioning?.phase || "接続済み"
    const ready = Boolean(result.provisioning?.ready)
    toast(
      ready
        ? "既存GPUをVideo Factoryへ安全に接続しました"
        : `既存GPUを回収しました。準備状態: ${phase}`,
      ready ? "success" : "warn",
    )
    button.textContent = ready ? "接続済み" : "回収済み・準備中"
    await loadBootstrap()
    await loadRuntimeAndGpu()
  } catch (error) {
    console.error("[video-factory-vast-connect] adoption failed", error)
    const message = error instanceof Error
      ? error.message
      : "既存GPUを回収できませんでした"
    toast(message, "error")
    button.textContent = "回収に失敗"
  } finally {
    setTimeout(() => {
      button.disabled = false
      button.textContent = previous
    }, 3500)
  }
}

function enhanceVastInstanceCards() {
  document.querySelectorAll(".instance-card").forEach((card) => {
    if (card.querySelector("[data-adopt-comfyui]")) return
    const idButton = card.querySelector("[data-instance-id], [data-instance-destroy]")
    const instanceId = idButton?.dataset.instanceId || idButton?.dataset.instanceDestroy
    if (!instanceId) return
    const actions = card.querySelector(".instance-actions")
    if (!actions) return
    const button = document.createElement("button")
    button.className = "button primary"
    button.type = "button"
    button.dataset.adoptComfyui = instanceId
    button.textContent = "既存GPUを安全に回収"
    button.setAttribute("aria-label", `Vast.ai Instance ${instanceId}をVideo Factoryへ接続`)
    button.addEventListener("click", () => {
      void adoptVastInstance(instanceId, button)
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
