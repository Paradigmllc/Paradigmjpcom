"use client"

import { useState, useEffect, useCallback } from "react"
import { AlertTriangle, RefreshCw, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface FailedJob {
  id: string
  companyId: string
  companyName: string | null
  domain: string | null
  jobType: string
  status: string
  attempts: number
  maxAttempts: number
  errorMessage: string | null
  createdAt: string
}

interface FailedJobsStats {
  total: number
  last24h: number
  byType: Record<string, number>
}

export function SalesFailedJobsPanel() {
  const [jobs, setJobs] = useState<FailedJob[]>([])
  const [stats, setStats] = useState<FailedJobsStats>({ total: 0, last24h: 0, byType: {} })
  const [loading, setLoading] = useState(true)
  const [retrying, setRetrying] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)

  const fetchJobs = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/sales/enrichment/retry")
      const data = await res.json()
      if (!data.ok) { setError(data.error); return }
      setJobs(data.jobs ?? [])
      const now = new Date()
      const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      const last24h = (data.jobs as FailedJob[]).filter((j: FailedJob) => new Date(j.createdAt) >= dayAgo).length
      const byType: Record<string, number> = {}
      for (const j of data.jobs as FailedJob[]) { byType[j.jobType] = (byType[j.jobType] ?? 0) + 1 }
      setStats({ total: data.total ?? 0, last24h, byType })
      setError(null)
    } catch (e) {
      console.error("[SalesFailedJobsPanel] fetchJobs failed:", e)
      toast.error("Failed to load failed jobs")
      setError(e instanceof Error ? e.message : "Fetch failed")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchJobs() }, [fetchJobs])

  async function handleRetry(jobId: string) {
    setRetrying((prev) => new Set([...prev, jobId]))
    try {
      const res = await fetch("/api/sales/enrichment/retry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId }),
      })
      const data = await res.json()
      if (data.ok) {
        setJobs((prev) => prev.filter((j) => j.id !== jobId))
      } else {
        setError(data.error ?? "Retry failed")
      }
    } catch (e) {
      console.error("[SalesFailedJobsPanel] handleRetry failed:", e)
      toast.error("Failed to retry job")
      setError(e instanceof Error ? e.message : "Retry failed")
    } finally {
      setRetrying((prev) => { const next = new Set(prev); next.delete(jobId); return next })
    }
  }

  function formatDate(iso: string): string {
    const d = new Date(iso)
    return d.toLocaleString("ja-JP", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-950">失敗ジョブ</h3>
        <button
          onClick={fetchJobs}
          disabled={loading}
          className="rounded-md border border-zinc-200 px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-50"
        >
          {loading ? <Loader2 size={12} className="animate-spin" /> : "更新"}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3">
          <div className="text-xs text-rose-600">全失敗</div>
          <div className="text-lg font-bold text-rose-800">{stats.total}</div>
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
          <div className="text-xs text-amber-600">直近24h</div>
          <div className="text-lg font-bold text-amber-800">{stats.last24h}</div>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
          <div className="text-xs text-zinc-500">ジョブ種別</div>
          <div className="text-xs text-zinc-700 mt-0.5">
            {Object.entries(stats.byType).map(([type, count]) => (
              <div key={type}>{type}: {count}</div>
            ))}
            {Object.keys(stats.byType).length === 0 && <span className="text-zinc-400">なし</span>}
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-md border border-rose-200 bg-rose-50 p-2 text-xs text-rose-700">
          <AlertTriangle size={12} />
          {error}
        </div>
      )}

      {/* Job list */}
      <div className="max-h-64 overflow-y-auto">
        {loading ? (
          <div className="py-8 text-center text-sm text-zinc-400">読み込み中...</div>
        ) : jobs.length === 0 ? (
          <div className="py-4 text-center text-sm text-zinc-400">失敗ジョブはありません</div>
        ) : (
          <div className="space-y-2">
            {jobs.map((job) => (
              <div key={job.id} className="rounded-lg border border-zinc-200 bg-white p-3 text-xs">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-zinc-800 truncate">
                      {job.companyName ?? job.domain ?? "不明"}
                    </div>
                    {job.domain && job.companyName !== job.domain && (
                      <div className="text-zinc-400 mt-0.5">{job.domain}</div>
                    )}
                    <div className="mt-1 flex flex-wrap gap-1">
                      <span className="rounded bg-rose-100 px-1.5 py-0.5 text-rose-700">{job.jobType}</span>
                      <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-zinc-600">
                        {job.attempts}/{job.maxAttempts}回試行
                      </span>
                      <span className="text-zinc-400">{formatDate(job.createdAt)}</span>
                    </div>
                    {job.errorMessage && (
                      <div className="mt-1 rounded bg-rose-50 p-1 text-rose-700 break-all">
                        {job.errorMessage.slice(0, 200)}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => handleRetry(job.id)}
                    disabled={retrying.has(job.id)}
                    className="flex shrink-0 items-center gap-1 rounded border border-rose-200 px-2 py-1 text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                  >
                    {retrying.has(job.id) ? (
                      <Loader2 size={10} className="animate-spin" />
                    ) : (
                      <RefreshCw size={10} />
                    )}
                    再実行
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
