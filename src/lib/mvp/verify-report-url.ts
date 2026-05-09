/**
 * Report URL 200 確認 fence — B36 #19 永久ルール.
 * 「書いた → 読めた」確認なしで n8n 次 workflow trigger するから死ぬ.
 */

export interface VerifyResult {
  ok: boolean;
  status: number;
  attempts: number;
  finalUrl?: string;
  errorMessage?: string;
}

export async function verifyReportUrl(
  url: string,
  opts?: { maxAttempts?: number; initialWaitMs?: number; timeoutMs?: number }
): Promise<VerifyResult> {
  const maxAttempts = opts?.maxAttempts ?? 4;
  const initialWaitMs = opts?.initialWaitMs ?? 0;
  const timeoutMs = opts?.timeoutMs ?? 10_000;

  if (initialWaitMs > 0) {
    await sleep(initialWaitMs);
  }

  let lastStatus = 0;
  let lastError: string | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        method: "GET",
        redirect: "follow",
        headers: { "User-Agent": "ParadigmReportVerifier/1.0" },
        signal: ctrl.signal,
      });
      clearTimeout(timer);
      lastStatus = res.status;
      if (res.status >= 200 && res.status < 300) {
        return { ok: true, status: res.status, attempts: attempt, finalUrl: res.url };
      }
      if (attempt < maxAttempts) {
        await sleep(backoffMs(attempt));
        continue;
      }
    } catch (e) {
      clearTimeout(timer);
      lastError = e instanceof Error ? e.message : String(e);
      if (attempt < maxAttempts) {
        await sleep(backoffMs(attempt));
        continue;
      }
    }
  }

  return {
    ok: false,
    status: lastStatus,
    attempts: maxAttempts,
    errorMessage: lastError ?? `non-2xx after ${maxAttempts} attempts`,
  };
}

function backoffMs(attempt: number): number {
  return Math.min(30_000 * 2 ** (attempt - 1), 120_000);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
