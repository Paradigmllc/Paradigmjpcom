/**
 * Dify Cloud workflow caller — B28 #11 永久ルール準拠.
 * customer-facing LLM output は必ず Dify 経由. DeepSeek 直叩き禁止.
 */

const DIFY_BASE = process.env.DIFY_API_BASE ?? "https://api.dify.ai/v1";

export type DifyWorkflowKey =
  | "templatePicker"
  | "karteToReport"
  | "formMessageGenerator"
  | "formViolationDetector";

const KEY_ENV: Record<DifyWorkflowKey, string> = {
  templatePicker: "DIFY_TEMPLATE_PICKER_KEY",
  karteToReport: "DIFY_KARTE_TO_REPORT_KEY",
  formMessageGenerator: "DIFY_FORM_MESSAGE_KEY",
  formViolationDetector: "DIFY_FORM_VIOLATION_KEY",
};

export interface DifyRunResult<T = unknown> {
  ok: boolean;
  outputs?: T;
  raw?: unknown;
  errorMessage?: string;
  workflowRunId?: string;
}

/**
 * Boilerplate DSL pattern: workflow は (system_prompt + user_payload) を入力に取り、
 * outputs.result に LLM 生 text を返す. caller は purpose ごとに system_prompt を
 * 切替えることで 1 boilerplate を 9+ workflow に再利用する.
 *
 * `~/.claude/knowledge/dify-cloud-automation.md` Hack 2 参照.
 */
export async function callDifyJson<T>(
  workflow: DifyWorkflowKey,
  systemPrompt: string,
  payload: Record<string, unknown>,
  opts?: { user?: string; timeoutMs?: number }
): Promise<DifyRunResult<T>> {
  const r = await callDify<{ result?: string }>(workflow, {
    system_prompt: systemPrompt,
    user_payload: JSON.stringify(payload),
  }, opts);
  if (!r.ok) return { ok: false, errorMessage: r.errorMessage, raw: r.raw };
  const text = r.outputs?.result ?? "";
  try {
    // tolerate ```json ... ``` wrapper if LLM disregards format rule
    const stripped = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
    const parsed = JSON.parse(stripped) as T;
    return { ok: true, outputs: parsed, raw: r.raw, workflowRunId: r.workflowRunId };
  } catch (e) {
    return {
      ok: false,
      errorMessage: `[dify ${workflow}] JSON parse failed: ${e instanceof Error ? e.message : String(e)} (raw head: ${text.slice(0, 200)})`,
      raw: r.raw,
    };
  }
}

export async function callDify<T = unknown>(
  workflow: DifyWorkflowKey,
  inputs: Record<string, unknown>,
  opts?: { user?: string; timeoutMs?: number }
): Promise<DifyRunResult<T>> {
  const envKey = KEY_ENV[workflow];
  const appKey = process.env[envKey];
  if (!appKey) {
    return { ok: false, errorMessage: `[dify] env ${envKey} missing` };
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), opts?.timeoutMs ?? 60_000);
  try {
    const res = await fetch(`${DIFY_BASE}/workflows/run`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${appKey}`,
      },
      body: JSON.stringify({
        inputs,
        response_mode: "blocking",
        user: opts?.user ?? `mvp-${workflow}`,
      }),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      return { ok: false, errorMessage: `[dify ${workflow}] ${res.status} ${errText}` };
    }
    const json = (await res.json()) as {
      data?: { outputs?: T; id?: string; status?: string; error?: string };
    };
    if (json.data?.status === "failed") {
      return { ok: false, errorMessage: json.data?.error ?? "dify failed" };
    }
    return {
      ok: true,
      outputs: json.data?.outputs,
      raw: json,
      workflowRunId: json.data?.id,
    };
  } catch (e) {
    clearTimeout(timer);
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, errorMessage: `[dify ${workflow}] ${msg}` };
  }
}
