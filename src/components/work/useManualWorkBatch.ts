"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import type { ManualMessageAngleSelection } from "@/lib/sales/manual-japan-entry-angle"
import type { ManualMessageVariantSelection } from "@/lib/sales/manual-japan-entry-experiment"
import type { ManualWorkBatchSnapshot } from "@/lib/sales/manual-japan-entry-batch-types"

interface BatchResponse {
  ok?: boolean
  claimed?: number
  activeBatch?: ManualWorkBatchSnapshot | null
  snapshot?: ManualWorkBatchSnapshot
  error?: string
}

async function readBatchResponse(response: Response): Promise<BatchResponse> {
  const body = await response.json() as BatchResponse
  if (!response.ok || !body.ok) throw new Error(body.error ?? "永続バッチを処理できませんでした")
  return body
}

export function useManualWorkBatch(onHistoryRefresh: () => Promise<void>) {
  const [snapshot, setSnapshot] = useState<ManualWorkBatchSnapshot | null>(null)
  const [running, setRunning] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const drainingRef = useRef(false)

  const drain = useCallback(async (initial: ManualWorkBatchSnapshot) => {
    if (drainingRef.current) return
    drainingRef.current = true
    setRunning(true)
    setErrorMessage(null)
    let current = initial
    try {
      while (current.remaining > 0) {
        const response = await fetch(`/api/work/batches/${current.batch.id}/drain`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        })
        const body = await readBatchResponse(response)
        if (!body.snapshot) throw new Error("バッチ進捗を読み戻せませんでした")
        current = body.snapshot
        setSnapshot(current)
        await onHistoryRefresh()
        if ((body.claimed ?? 0) === 0 && current.remaining > 0) {
          throw new Error("処理中の項目が残っています。10分後に「処理を再開」を押してください。")
        }
      }
      toast.success(`${current.batch.total_count}件のバッチ処理が完了しました`)
    } catch (error) {
      console.error("[manual-work-batch-ui] drain failed:", error)
      const message = error instanceof Error ? error.message : "バッチ処理を継続できませんでした"
      setErrorMessage(message)
      toast.error(`${message} キューはDBに保存されています。`)
    } finally {
      drainingRef.current = false
      setRunning(false)
      await onHistoryRefresh()
    }
  }, [onHistoryRefresh])

  const resume = useCallback(async (batch: ManualWorkBatchSnapshot) => {
    setSnapshot(batch)
    await drain(batch)
  }, [drain])

  useEffect(() => {
    let cancelled = false
    async function loadActive(): Promise<void> {
      try {
        const response = await fetch("/api/work/batches", { cache: "no-store" })
        const body = await readBatchResponse(response)
        if (!cancelled && body.activeBatch) await resume(body.activeBatch)
      } catch (error) {
        console.error("[manual-work-batch-ui] active batch read failed:", error)
        if (!cancelled) setErrorMessage(error instanceof Error ? error.message : "実行中バッチを取得できませんでした")
      }
    }
    void loadActive()
    return () => { cancelled = true }
  }, [resume])

  const start = useCallback(async (input: {
    urls: string[]
    variant: ManualMessageVariantSelection
    angle: ManualMessageAngleSelection
    sourceSlug: string
    sourcePageUrl: string
  }) => {
    if (running || drainingRef.current) return
    setRunning(true)
    setErrorMessage(null)
    try {
      const response = await fetch("/api/work/batches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      })
      const body = await readBatchResponse(response)
      if (!body.snapshot) throw new Error("作成したバッチを読み戻せませんでした")
      setSnapshot(body.snapshot)
      toast.success(`${body.snapshot.batch.total_count}件を永続キューへ登録しました`)
      setRunning(false)
      await drain(body.snapshot)
    } catch (error) {
      console.error("[manual-work-batch-ui] create failed:", error)
      const message = error instanceof Error ? error.message : "バッチを作成できませんでした"
      setErrorMessage(message)
      setRunning(false)
      toast.error(message)
    }
  }, [drain, running])

  return { snapshot, running, errorMessage, start, resume }
}
