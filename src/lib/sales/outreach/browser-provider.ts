/**
 * lib/sales/outreach/browser-provider.ts — ブラウザ実行の抽象化 (Phase 3)
 *
 * 役割: 「重い Chromium をどこで動かすか」を 1 枚の interface で隠蔽する。
 *       Next.js (serverless) は実ブラウザを持たず、provider 越しに submit を委譲。
 *
 * これにより 案1(リモートブラウザ) ⇄ 案2(scale-to-zero 自前 worker) を
 * env `OUTREACH_BROWSER_PROVIDER` の切替だけで行き来でき、アーキを賭けない。
 *
 *   - "dry"    : DryRunProvider — Chromium 不要・実送信しない (default・監査/CI 用)
 *   - "remote" : RemoteWorkerProvider — worker の HTTP endpoint に委譲
 *                (worker 内部で local Chromium=案2 か remote CDP=案1 を選ぶ)
 *
 * ディスク安全: Next アプリ側に playwright/crawlee 依存を一切持たない。
 */

import type { SubmitFormInput, SubmitFormResult } from "./types"

export interface BrowserProvider {
  readonly name: string
  /** フォーム送信 (dryRun=true なら検証のみ) */
  submitForm(input: SubmitFormInput): Promise<SubmitFormResult>
  /** Layer C: SPA フォーム発見 (未対応 provider は undefined) */
  discoverSpaForm?(homeUrl: string): Promise<string | null>
}

/**
 * DryRunProvider: ブラウザを起動せず、実送信もしない。
 * serverless / 監査 / CI のデフォルト。常に "uncertain"(未送信) を返す。
 */
export class DryRunProvider implements BrowserProvider {
  readonly name = "dry"

  async submitForm(input: SubmitFormInput): Promise<SubmitFormResult> {
    return {
      ok: true,
      outcome: "uncertain",
      detail: `dry-run: provider=dry・実送信なし (form=${input.formUrl}, chars=${input.message.length})`,
      evidenceUrl: null,
    }
  }
}

/**
 * RemoteWorkerProvider: 別コンテナの worker (Playwright+Crawlee) に HTTP 委譲。
 * worker 側で stealth submit を実行し結果を返す。Next アプリには Chromium 不要。
 */
export class RemoteWorkerProvider implements BrowserProvider {
  readonly name = "remote"

  constructor(
    private readonly endpoint: string,
    private readonly secret: string,
  ) {}

  async submitForm(input: SubmitFormInput): Promise<SubmitFormResult> {
    try {
      const res = await fetch(`${this.endpoint}/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Worker-Secret": this.secret,
        },
        body: JSON.stringify(input),
        signal: AbortSignal.timeout(input.timeoutMs ?? 120_000),
      })
      if (!res.ok) {
        const text = await res.text().catch(() => "")
        return { ok: false, outcome: "failed", detail: `worker HTTP ${res.status}: ${text.slice(0, 200)}` }
      }
      return (await res.json()) as SubmitFormResult
    } catch (e) {
      return {
        ok: false,
        outcome: "failed",
        detail: `worker unreachable: ${e instanceof Error ? e.message : String(e)}`,
      }
    }
  }

  async discoverSpaForm(homeUrl: string): Promise<string | null> {
    try {
      const res = await fetch(`${this.endpoint}/discover-spa`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Worker-Secret": this.secret },
        body: JSON.stringify({ homeUrl }),
        signal: AbortSignal.timeout(60_000),
      })
      if (!res.ok) return null
      const data = (await res.json()) as { formUrl?: string | null }
      return data.formUrl ?? null
    } catch {
      return null
    }
  }
}

/**
 * env から provider を解決。未設定 or remote 設定不足なら dry に fail-soft。
 */
export function getBrowserProvider(): BrowserProvider {
  const mode = process.env.OUTREACH_BROWSER_PROVIDER ?? "dry"
  if (mode === "remote") {
    const endpoint = process.env.OUTREACH_WORKER_URL
    const secret = process.env.OUTREACH_WORKER_SECRET
    if (endpoint && secret) return new RemoteWorkerProvider(endpoint, secret)
    console.warn(
      "[outreach] OUTREACH_BROWSER_PROVIDER=remote だが OUTREACH_WORKER_URL/SECRET 未設定 → dry にフォールバック",
    )
  }
  return new DryRunProvider()
}
