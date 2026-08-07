"use client"

/**
 * YouTube 公開前審査画面。
 *
 * 設計の狙い: 承認を形骸化させないこと。
 * 実測でゲート通過済みの台本が「見出しに無い税率」を創作していたため、
 * 動画だけを見て承認できる作りにはしない。シーンごとにナレーション全文と
 * 出典URLを並べ、根拠の無いシーンと数値を含むシーンを目立たせる。
 */

import { useMemo, useState } from "react"
import type { ReviewVideo } from "@/lib/youtube/review/types"
import { buildReviewChecklist } from "@/lib/youtube/review/types"

interface Props {
  initialVideos: ReviewVideo[]
}

const STATUS_LABEL: Record<string, string> = {
  review_required: "審査待ち",
  approved: "承認済み",
  rejected: "却下",
  published: "公開済み",
  failed: "失敗",
  draft: "下書き",
  rendering: "生成中",
}

const STATUS_STYLE: Record<string, string> = {
  review_required: "bg-amber-100 text-amber-900 ring-amber-300",
  approved: "bg-emerald-100 text-emerald-900 ring-emerald-300",
  rejected: "bg-rose-100 text-rose-900 ring-rose-300",
  published: "bg-sky-100 text-sky-900 ring-sky-300",
  failed: "bg-zinc-200 text-zinc-700 ring-zinc-300",
  draft: "bg-zinc-100 text-zinc-600 ring-zinc-300",
  rendering: "bg-zinc-100 text-zinc-600 ring-zinc-300",
}

function formatDuration(seconds: number | null): string {
  if (seconds === null) return "—"
  const total = Math.round(seconds)
  return `${Math.floor(total / 60)}分${String(total % 60).padStart(2, "0")}秒`
}

export function ReviewClient({ initialVideos }: Props) {
  const [videos, setVideos] = useState(initialVideos)
  const [selectedId, setSelectedId] = useState(initialVideos[0]?.id ?? null)
  const [note, setNote] = useState("")
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null)

  const selected = useMemo(
    () => videos.find((video) => video.id === selectedId) ?? null,
    [videos, selectedId],
  )
  const checklist = useMemo(() => (selected ? buildReviewChecklist(selected) : []), [selected])

  async function decide(decision: "approve" | "reject") {
    if (!selected) return
    if (decision === "reject" && note.trim().length === 0) {
      setMessage({ kind: "error", text: "却下する場合は理由を書いてください。再生成の指示になります。" })
      return
    }

    setBusy(true)
    setMessage(null)
    try {
      const response = await fetch(`/api/youtube/review/${selected.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, note: note.trim() || undefined }),
      })
      const json = (await response.json()) as { ok: boolean; error?: string; video?: ReviewVideo }
      if (!json.ok || !json.video) {
        setMessage({ kind: "error", text: json.error ?? "更新に失敗しました。" })
        return
      }
      const updated = json.video
      setVideos((previous) => previous.map((video) => (video.id === updated.id ? updated : video)))
      setNote("")
      setMessage({ kind: "ok", text: decision === "approve" ? "承認しました。" : "却下しました。" })
    } catch (error) {
      setMessage({ kind: "error", text: error instanceof Error ? error.message : "通信に失敗しました。" })
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-900">
      <header className="border-b border-zinc-200 bg-white px-8 py-5">
        <h1 className="text-xl font-bold tracking-tight">YouTube 公開前審査</h1>
        <p className="mt-1 text-sm text-zinc-600">
          公開前ゲートは構造とポリシー適合だけを検査します。事実の正確さはここで確認してください。
        </p>
      </header>

      <div className="mx-auto grid max-w-[1600px] gap-6 px-8 py-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        {/* 一覧 */}
        <aside className="space-y-2">
          {videos.length === 0 && (
            <p className="rounded-xl border border-dashed border-zinc-300 p-6 text-sm text-zinc-500">
              審査待ちの動画はありません。
            </p>
          )}
          {videos.map((video) => (
            <button
              key={video.id}
              type="button"
              onClick={() => {
                setSelectedId(video.id)
                setNote("")
                setMessage(null)
              }}
              className={`w-full rounded-xl border p-4 text-left transition ${
                video.id === selectedId
                  ? "border-zinc-900 bg-white shadow-sm"
                  : "border-zinc-200 bg-white/60 hover:border-zinc-400"
              }`}
            >
              <span
                className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${
                  STATUS_STYLE[video.status] ?? STATUS_STYLE.draft
                }`}
              >
                {STATUS_LABEL[video.status] ?? video.status}
              </span>
              <p className="mt-2 line-clamp-2 text-sm font-semibold leading-snug">{video.title}</p>
              <p className="mt-1 text-xs text-zinc-500">
                {video.formatId} · {formatDuration(video.durationSec)}
              </p>
            </button>
          ))}
        </aside>

        {/* 詳細 */}
        {selected && (
          <section className="space-y-6">
            <div className="rounded-2xl border border-zinc-200 bg-white p-6">
              <h2 className="text-lg font-bold leading-snug">{selected.title}</h2>
              <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-zinc-600">
                <div>形式 <span className="font-medium text-zinc-900">{selected.formatId}</span></div>
                <div>尺 <span className="font-medium text-zinc-900">{formatDuration(selected.durationSec)}</span></div>
                <div>シーン <span className="font-medium text-zinc-900">{selected.script?.scenes?.length ?? 0}</span></div>
                {selected.llmCalls !== null && (
                  <div>LLM呼出 <span className="font-medium text-zinc-900">{selected.llmCalls}回</span></div>
                )}
              </dl>
              {selected.thumbnailText.length > 0 && (
                <p className="mt-3 text-sm text-zinc-600">
                  サムネ文言 <span className="font-medium text-zinc-900">{selected.thumbnailText.join(" / ")}</span>
                </p>
              )}
            </div>

            {/* 確認事項 */}
            {checklist.length > 0 && (
              <div className="rounded-2xl border border-amber-300 bg-amber-50 p-6">
                <h3 className="text-sm font-bold text-amber-900">確認してほしい点</h3>
                <ul className="mt-2 space-y-1.5 text-sm text-amber-900">
                  {checklist.map((item) => (
                    <li key={item} className="flex gap-2">
                      <span aria-hidden>•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 動画 */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-6">
              <h3 className="mb-3 text-sm font-bold">映像</h3>
              {selected.videoUrl ? (
                // eslint-disable-next-line jsx-a11y/media-has-caption -- 字幕は台本欄で全文を提示している
                <video src={selected.videoUrl} controls className="w-full rounded-xl bg-black" />
              ) : (
                <p className="rounded-xl bg-zinc-100 p-6 text-sm text-zinc-600">
                  動画が未生成です。映像を見ずに承認しないでください。
                </p>
              )}
            </div>

            {/* 台本 */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-6">
              <h3 className="mb-1 text-sm font-bold">台本と出典</h3>
              <p className="mb-4 text-xs text-zinc-500">
                数値と固有名詞が出典に実在するか確認してください。モデルが知識から補うことがあります。
              </p>
              <ol className="space-y-4">
                {(selected.script?.scenes ?? []).map((scene) => {
                  const hasNumber = /\d/.test(scene.narration)
                  const unsourced = scene.sources.length === 0
                  return (
                    <li
                      key={scene.id}
                      className={`rounded-xl border p-4 ${
                        unsourced && hasNumber ? "border-rose-300 bg-rose-50" : "border-zinc-200"
                      }`}
                    >
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="font-mono font-semibold text-zinc-500">{scene.id}</span>
                        <span className="text-zinc-500">{Math.round(scene.durationSec)}秒</span>
                        {hasNumber && (
                          <span className="rounded bg-amber-100 px-1.5 py-0.5 font-semibold text-amber-900">
                            数値あり
                          </span>
                        )}
                        <span
                          className={`rounded px-1.5 py-0.5 font-semibold ${
                            unsourced ? "bg-rose-100 text-rose-900" : "bg-emerald-100 text-emerald-900"
                          }`}
                        >
                          出典 {scene.sources.length}件
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-relaxed">{scene.narration}</p>
                      {scene.onScreenText.length > 0 && (
                        <p className="mt-2 text-xs text-zinc-500">
                          画面表示: {scene.onScreenText.join(" / ")}
                        </p>
                      )}
                      {scene.sources.length > 0 && (
                        <ul className="mt-2 space-y-1">
                          {scene.sources.map((source) => (
                            <li key={source.url} className="text-xs">
                              <a
                                href={source.url}
                                target="_blank"
                                rel="noreferrer noopener"
                                className="text-sky-700 underline underline-offset-2 hover:text-sky-900"
                              >
                                {source.claim.slice(0, 70)}
                              </a>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  )
                })}
              </ol>
            </div>

            {/* ゲート結果 */}
            {selected.gate && (
              <div className="rounded-2xl border border-zinc-200 bg-white p-6">
                <h3 className="mb-3 text-sm font-bold">
                  公開前ゲート {selected.gate.ok ? "通過" : "不通過"}
                </h3>
                {(selected.gate.findings ?? []).length === 0 ? (
                  <p className="text-sm text-zinc-600">指摘なし</p>
                ) : (
                  <ul className="space-y-1.5 text-sm">
                    {selected.gate.findings.map((finding, index) => (
                      <li key={`${finding.code}-${index}`} className="flex gap-2">
                        <span
                          className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-semibold ${
                            finding.severity === "block"
                              ? "bg-rose-100 text-rose-900"
                              : "bg-amber-100 text-amber-900"
                          }`}
                        >
                          {finding.severity}
                        </span>
                        <span className="text-zinc-700">{finding.message}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* 生成時の警告 */}
            {selected.warnings.length > 0 && (
              <div className="rounded-2xl border border-zinc-200 bg-white p-6">
                <h3 className="mb-3 text-sm font-bold">生成時の警告</h3>
                <ul className="space-y-1 text-xs text-zinc-600">
                  {selected.warnings.map((warning, index) => (
                    <li key={index}>{warning}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* 判断 */}
            <div className="sticky bottom-4 rounded-2xl border border-zinc-300 bg-white p-6 shadow-lg">
              {selected.status === "review_required" ? (
                <>
                  <label htmlFor="review-note" className="text-sm font-bold">
                    コメント<span className="ml-2 font-normal text-zinc-500">却下時は必須</span>
                  </label>
                  <textarea
                    id="review-note"
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    rows={3}
                    placeholder="例: s1 の「10%から8%へ」は出典の見出しに無い。税率の方向が逆の可能性がある。"
                    className="mt-2 w-full rounded-xl border border-zinc-300 p-3 text-sm"
                  />
                  <div className="mt-3 flex gap-3">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => decide("approve")}
                      className="rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      承認する
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => decide("reject")}
                      className="rounded-xl bg-rose-700 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      却下する
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-sm">
                  <p className="font-semibold">
                    {STATUS_LABEL[selected.status] ?? selected.status}
                    {selected.reviewedBy && <span className="ml-2 font-normal text-zinc-500">{selected.reviewedBy}</span>}
                  </p>
                  {selected.reviewerNote && (
                    <p className="mt-2 whitespace-pre-wrap text-zinc-700">{selected.reviewerNote}</p>
                  )}
                </div>
              )}
              {message && (
                <p
                  className={`mt-3 text-sm ${message.kind === "ok" ? "text-emerald-700" : "text-rose-700"}`}
                >
                  {message.text}
                </p>
              )}
            </div>
          </section>
        )}
      </div>
    </main>
  )
}
