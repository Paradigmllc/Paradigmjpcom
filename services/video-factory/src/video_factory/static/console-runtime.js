async function loadRuntimeAndGpu() {
  if (!state.connected) return
  try {
    const body = await api("/v1/runtime")
    $("#comfyui-url").value = body.effective_comfyui?.base_url || ""
    $("#vast-template-hash").value = body.runtime?.vast_template_hash
      || body.vast?.default_template_hash
      || state.selectedTemplate
      || ""
    const configured = body.vast?.configured
      || body.effective_comfyui?.api_key_configured
    $("#runtime-badge").textContent = configured ? "設定済み" : "要設定"
    $("#runtime-badge").className = `badge ${configured ? "good" : "warn"}`
    await loadInstances(true)
  } catch (error) {
    console.error("[video-factory-console] runtime failed", error)
    toast(error.message || "設定を取得できませんでした", "error")
  }
}

async function saveRuntime() {
  const body = {}
  const vastKey = $("#vast-api-key").value.trim()
  const comfyKey = $("#comfyui-api-key").value.trim()
  const comfyUrl = $("#comfyui-url").value.trim()
  const templateHash = $("#vast-template-hash").value.trim()
  if (vastKey) body.vast_api_key = vastKey
  if (comfyKey) body.comfyui_api_key = comfyKey
  if (comfyUrl) body.comfyui_base_url = comfyUrl
  if (templateHash) body.vast_template_hash = templateHash
  try {
    await api("/v1/runtime", {
      method: "PUT",
      body: JSON.stringify(body),
    })
    $("#vast-api-key").value = ""
    $("#comfyui-api-key").value = ""
    toast("接続設定を安全に保存しました")
    await loadBootstrap()
    await loadRuntimeAndGpu()
  } catch (error) {
    console.error("[video-factory-console] runtime save failed", error)
    toast(error.message || "設定を保存できませんでした", "error")
  }
}

async function searchTemplates() {
  try {
    const query = encodeURIComponent(
      $("#template-query").value.trim() || "ComfyUI",
    )
    const body = await api(
      `/v1/vast/templates?query=${query}&recommended_only=true&ssh_only=true`,
    )
    const templates = body.templates || []
    $("#template-list").innerHTML = templates.length
      ? templates.map((item) => {
        const hash = item.hash_id || item.hash || ""
        return `<button class="template-chip ${state.selectedTemplate === hash ? "active" : ""}" data-template-hash="${escapeHtml(hash)}" type="button"><strong>${escapeHtml(item.name || item.image || "Template")}</strong><small>${escapeHtml(hash || "hash unavailable")}</small></button>`
      }).join("")
      : '<div class="empty compact">該当テンプレートがありません。</div>'
    $$('[data-template-hash]').forEach((button) => {
      button.addEventListener("click", () => {
        state.selectedTemplate = button.dataset.templateHash
        sessionStorage.setItem(
          "videoFactoryTemplateHash",
          state.selectedTemplate,
        )
        $("#vast-template-hash").value = state.selectedTemplate
        $$('[data-template-hash]').forEach((item) => {
          item.classList.toggle("active", item === button)
        })
        toast("起動テンプレートを選択しました")
      })
    })
  } catch (error) {
    console.error("[video-factory-console] template search failed", error)
    toast(error.message || "テンプレートを検索できませんでした", "error")
  }
}

function offerPrice(item) {
  return Number(item.dph_total ?? item.search?.totalHour ?? item.min_bid ?? 0)
}

async function searchOffers() {
  const target = $("#offer-list")
  target.innerHTML = '<div class="empty">Vast.aiから空きGPUを取得しています。</div>'
  try {
    const body = await api("/v1/vast/offers/search", {
      method: "POST",
      body: JSON.stringify({
        gpu_names: [$("#gpu-model").value],
        min_gpu_ram_gb: Number($("#gpu-vram").value),
        min_reliability: Number($("#gpu-reliability").value),
        verified: true,
        instance_type: "on-demand",
        max_hourly_price: Number($("#gpu-max-price").value) || null,
        limit: 30,
      }),
    })
    const offers = body.offers || []
    target.innerHTML = offers.length
      ? offers.map((item) => {
        const price = offerPrice(item)
        const ram = Number(item.gpu_ram || 0) / 1024
        const reliability = Number(item.reliability || 0) * 100
        return `<article class="offer-card"><div class="instance-head"><h3>${escapeHtml(item.gpu_name || "GPU")}</h3><span class="badge good">Verified</span></div><div class="offer-price">$${price.toFixed(3)}<small>/hour</small></div><div class="offer-stats"><span>VRAM ${ram.toFixed(0)} GB</span><span>信頼性 ${reliability.toFixed(1)}%</span><span>DLPerf ${Number(item.dlperf || 0).toFixed(1)}</span><span>${escapeHtml(item.geolocation || item.country || "Location —")}</span></div><button class="button dark full" data-launch-offer="${escapeHtml(item.id || item.ask_contract_id)}" data-offer-price="${price}" type="button">このGPUを起動</button></article>`
      }).join("")
      : '<div class="empty">条件に合うGPUがありません。価格上限か信頼性を調整してください。</div>'
    $$('[data-launch-offer]').forEach((button) => {
      button.addEventListener("click", () => {
        void launchOffer(
          button.dataset.launchOffer,
          button.dataset.offerPrice,
        )
      })
    })
  } catch (error) {
    console.error("[video-factory-console] GPU search failed", error)
    target.innerHTML = `<div class="empty"><strong>GPU検索に失敗しました</strong><p>${escapeHtml(error.message)}</p></div>`
  }
}

async function launchOffer(offerId, price) {
  const template = $("#vast-template-hash").value.trim()
    || state.selectedTemplate
  if (!template) {
    toast("先にComfyUIテンプレートを選択してください", "warn")
    return
  }
  const accepted = await confirmAction(
    `Offer ${offerId} を $${Number(price).toFixed(3)}/h で起動します。GPU利用料が発生します。`,
  )
  if (!accepted) return
  try {
    await api("/v1/vast/instances", {
      method: "POST",
      body: JSON.stringify({
        offer_id: Number(offerId),
        template_hash_id: template,
        label: `paradigm-comfyui-${Date.now().toString().slice(-6)}`,
        disk_gb: 80,
        target_state: "running",
        mount_path: "/workspace",
      }),
    })
    toast("Vast.aiインスタンスを作成しました")
    await loadInstances()
  } catch (error) {
    console.error("[video-factory-console] GPU launch failed", error)
    toast(error.message || "GPUを起動できませんでした", "error")
  }
}

async function loadInstances(quiet = false) {
  if (!state.connected) return
  const target = $("#instance-list")
  try {
    const body = await api("/v1/vast/instances")
    const instances = body.instances || []
    target.innerHTML = instances.length
      ? instances.map((item) => {
        const id = item.id || item.instance_id
        const status = item.actual_status || item.status || "unknown"
        const price = Number(item.dph_total || item.total_hour || 0)
        const port = item.ports?.["8188/tcp"]?.[0]?.HostPort
          || item.direct_port_start
          || "—"
        return `<div class="instance-card"><div class="instance-head"><strong>${escapeHtml(item.label || `Instance ${id}`)}</strong>${statusBadge(status)}</div><div class="instance-meta"><span>${escapeHtml(item.gpu_name || "GPU")}</span><span>$${price.toFixed(3)}/h</span><span>${escapeHtml(item.public_ipaddr || item.ssh_host || "IP loading")}</span><span>ComfyUI port ${escapeHtml(port)}</span></div><div class="instance-actions">${status === "running" ? `<button class="button secondary" data-instance-state="stopped" data-instance-id="${id}" type="button">停止</button>` : `<button class="button secondary" data-instance-state="running" data-instance-id="${id}" type="button">開始</button>`}<button class="button danger" data-instance-destroy="${id}" type="button">破棄</button></div></div>`
      }).join("")
      : '<div class="empty compact">稼働中のGPUインスタンスはありません。</div>'
    $$('[data-instance-state]').forEach((button) => {
      button.addEventListener("click", () => {
        void changeInstanceState(
          button.dataset.instanceId,
          button.dataset.instanceState,
        )
      })
    })
    $$('[data-instance-destroy]').forEach((button) => {
      button.addEventListener("click", () => {
        void destroyInstance(button.dataset.instanceDestroy)
      })
    })
  } catch (error) {
    console.error("[video-factory-console] instance load failed", error)
    if (!quiet) {
      toast(error.message || "インスタンスを取得できませんでした", "error")
    }
    target.innerHTML = `<div class="empty compact">${escapeHtml(error.message || "Vast.ai APIキーを設定してください。")}</div>`
  }
}

async function changeInstanceState(id, status) {
  try {
    await api(`/v1/vast/instances/${id}/state`, {
      method: "POST",
      body: JSON.stringify({ state: status }),
    })
    toast(status === "running" ? "GPUを開始しました" : "GPUを停止しました")
    await loadInstances()
  } catch (error) {
    console.error("[video-factory-console] instance state failed", error)
    toast(error.message || "状態を変更できませんでした", "error")
  }
}

async function destroyInstance(id) {
  const accepted = await confirmAction(
    `Instance ${id} を完全に破棄します。コンテナストレージは失われます。`,
    true,
  )
  if (!accepted) return
  try {
    await api(`/v1/vast/instances/${id}`, { method: "DELETE" })
    toast("GPUインスタンスを破棄しました")
    await loadInstances()
  } catch (error) {
    console.error("[video-factory-console] instance destroy failed", error)
    toast(error.message || "インスタンスを破棄できませんでした", "error")
  }
}
