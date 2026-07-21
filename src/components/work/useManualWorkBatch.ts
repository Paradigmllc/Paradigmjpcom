"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import type { ManualMessageAngleSelection } from "@/lib/sales/manual-japan-entry-angle"
import type { ManualMessageVariantSelection } from "@/lib/sales/manual-japan-entry-experiment"
import {
  isManualWorkBatchTerminal,
  type ManualWorkBatchItemRow,
  type ManualWorkBatchItemStatus,
  type ManualWorkBatchRow,
  type ManualWorkBatchSnapshot,
} from "@/lib/sales/manual-japan-entry-batch-types"

const ITEM_STATUSES: ManualWorkBatchItemStatus[] = [
  "queued", "processing", "completed", "needs_review", "rejected", "failed", "duplicate",
]

function mergeBatchItem(snapshot: ManualWorkBatchSnapshot, item: ManualWorkBatchItemRow): ManualWorkBatchSnapshot {
  const index = snapshot.items.findIndex((candidate) => candidate.id === item.id)
  const items = index >= 0
    ? snapshot.items.map((candidate, itemIndex) => itemIndex === index ? item : candidate)
    : [...snapshot.items, item].sort((a, b) => a.position - b.position)
  const counts = Object.fromEntries(ITEM_STATUSES.map((status) => [status, 0])) as Record<ManualWorkBatchItemStatus, number>
  for (const candidate of items) counts[candidate.status] += 1
  const remaining = counts.queued + counts.processing
  return { ...snapshot, items, counts, remaining, finished: items.length - remaining }
}

interface BatchResponse {
  ok?: boolean
  automaticDrainStarted?: boolean
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
  const eventsRef = useRef<EventSource | null>(null)
  const snapshotRef = useRef<ManualWorkBatchSnapshot | null>(null)
  const lastHistoryRefreshRef = useRef(0)

  const commitSnapshot = useCallback((next: ManualWorkBatchSnapshot) => {
    snapshotRef.current = next
    setSnapshot(next)
  }, [])

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
        commitSnapshot(current)
        await onHistoryRefresh()
        if ((body.claimed ?? 0) === 0 && current.remaining > 0) {
          setErrorMessage(null)
          toast.info("サーバー側の自動処理が継続しています。キューはDBに保存済みです。")
          break
        }
      }
      if (current.remaining === 0) toast.success(`${current.batch.total_count}件のバッチ処理が完了しました`)
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
  }, [commitSnapshot, onHistoryRefresh])

  const resume = useCallback(async (batch: ManualWorkBatchSnapshot) => {
    commitSnapshot(batch)
    await drain(batch)
  }, [commitSnapshot, drain])

  useEffect(() => {
    let cancelled = false
    async function loadActive(): Promise<void> {
      try {
        const response = await fetch("/api/work/batches", { cache: "no-store" })
        const body = await readBatchResponse(response)
        if (!cancelled && body.activeBatch) {
          commitSnapshot(body.activeBatch)
          lastHistoryRefreshRef.current = body.activeBatch.finished
          setRunning(true)
          if (body.activeBatch.batch.last_error) {
            toast.info("停止したサーバー処理を自動復旧しています。再解析ボタンは不要です。")
            void drain(body.activeBatch)
          }
        }
      } catch (error) {
        console.error("[manual-work-batch-ui] active batch read failed:", error)
        if (!cancelled) setErrorMessage(error instanceof Error ? error.message : "実行中バッチを取得できませんでした")
      }
    }
    void loadActive()
    return () => { cancelled = true }
  }, [commitSnapshot, drain])

  const batchId = snapshot?.batch.id ?? null
  const batchStatus = snapshot?.batch.status ?? null
  useEffect(() => {
    eventsRef.current?.close()
    eventsRef.current = null
    if (!batchId || !batchStatus || isManualWorkBatchTerminal(batchStatus)) {
      setRunning(false)
      return
    }

    setRunning(true)
    const events = new EventSource(`/api/work/batches/${batchId}/events`)
    eventsRef.current = events
    events.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as {
          type?: string
          snapshot?: ManualWorkBatchSnapshot | null
          item?: ManualWorkBatchItemRow
          batch?: ManualWorkBatchRow
          message?: string
        }
        if (payload.type === "warning") {
          console.warn("[manual-work-batch-ui] realtime warning:", payload.message)
          return
        }
        let next = snapshotRef.current
        if (payload.snapshot) next = payload.snapshot
        if (payload.item && next) next = mergeBatchItem(next, payload.item)
        if (payload.batch && next) next = { ...next, batch: payload.batch }
        if (!next) return
        commitSnapshot(next)
        const shouldRefreshHistory = next.finished - lastHistoryRefreshRef.current >= 25
          || isManualWorkBatchTerminal(next.batch.status)
        if (shouldRefreshHistory) {
          lastHistoryRefreshRef.current = next.finished
          void onHistoryRefresh()
        }
        if (isManualWorkBatchTerminal(next.batch.status)) {
          events.close()
          eventsRef.current = null
          setRunning(false)
          if (next.counts.failed > 0) {
            toast.warning(`${next.batch.total_count}件の自動処理が完了しました（失敗${next.counts.failed}件）`)
          } else {
            toast.success(`${next.batch.total_count}件の自動処理が完了しました`)
          }
        }
      } catch (error) {
        console.error("[manual-work-batch-ui] realtime payload failed:", error)
      }
    }
    events.onerror = (error) => {
      console.warn("[manual-work-batch-ui] realtime connection retrying:", error)
    }
    return () => {
      events.close()
      if (eventsRef.current === events) eventsRef.current = null
    }
  }, [batchId, batchStatus, commitSnapshot, onHistoryRefresh])

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
      commitSnapshot(body.snapshot)
      lastHistoryRefreshRef.current = body.snapshot.finished
      toast.success(`${body.snapshot.batch.total_count}件を永続キューへ登録し、サーバー自動処理を開始しました`)
    } catch (error) {
      console.error("[manual-work-batch-ui] create failed:", error)
      const message = error instanceof Error ? error.message : "バッチを作成できませんでした"
      setErrorMessage(message)
      setRunning(false)
      toast.error(message)
    }
  }, [commitSnapshot, running])

  return { snapshot, running, errorMessage, start, resume }
}
