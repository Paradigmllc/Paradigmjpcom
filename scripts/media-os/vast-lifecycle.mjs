const API_ROOT = "https://console.vast.ai/api/v0/";

async function vastRequest(path, options, apiKey) {
  const response = await fetch(new URL(path, API_ROOT), {
    ...options,
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", ...options.headers },
  });
  const body = response.status === 204 ? {} : await response.json();
  if (!response.ok) throw new Error(`Vast.ai HTTP ${response.status}: ${JSON.stringify(body).slice(0, 1000)}`);
  return body;
}

export async function createVastComfyInstance(config) {
  if (!/^\d+$/.test(String(config.offerId ?? ""))) throw new Error("VAST_OFFER_ID must be configured.");
  if (!config.image) throw new Error("VAST_COMFYUI_IMAGE must be configured.");
  const body = await vastRequest(`asks/${config.offerId}/`, {
    method: "PUT",
    body: JSON.stringify({
      image: config.image,
      disk: config.diskGb,
      runtype: "args",
      target_state: "running",
      label: config.label,
      env: "-p 8188:8188",
      args: ["bash", "-lc", config.startCommand],
    }),
  }, config.apiKey);
  if (!body.success || !body.new_contract) throw new Error("Vast.ai did not return a new instance contract.");
  return String(body.new_contract);
}

export async function destroyVastInstance(instanceId, apiKey) {
  await vastRequest(`instances/${encodeURIComponent(instanceId)}/`, { method: "DELETE" }, apiKey);
}

export async function withVastComfyInstance(config, action) {
  const instanceId = await createVastComfyInstance(config);
  try {
    if (!config.urlTemplate?.includes("{instanceId}")) throw new Error("VAST_COMFYUI_URL_TEMPLATE must contain {instanceId}.");
    return await action({ instanceId, endpoint: config.urlTemplate.replace("{instanceId}", instanceId) });
  } finally {
    try {
      await destroyVastInstance(instanceId, config.apiKey);
    } catch (error) {
      console.error(`[vast] CRITICAL: teardown failed for instance ${instanceId}`, error);
      throw error;
    }
  }
}
