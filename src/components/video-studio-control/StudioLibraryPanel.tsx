"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { z } from "zod"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { librarySpecSchema, type LibraryPage, type LibrarySave, type LibraryVersion } from "@/lib/video-studio-control/library"
import { kindLabels, newLibrarySpec, StudioLibraryForm } from "./StudioLibraryForm"

type Payload = Partial<LibraryPage> & { ok: boolean; error?: string; version?: LibraryVersion; notificationOk?: boolean | null }
async function libraryApi(query = "", input?: LibrarySave): Promise<Payload> {
  const response = await fetch(`/api/sales/video-studio-library${query}`, {
    method: input ? "POST" : "GET", cache: "no-store", signal: AbortSignal.timeout(20_000),
    headers: input ? { "content-type": "application/json" } : undefined,
    body: input ? JSON.stringify(input) : undefined,
  })
  const result = await response.json() as Payload
  if (!response.ok || !result.ok) throw new Error(result.error ?? "制作ライブラリの操作に失敗しました")
  return result
}

export function StudioLibraryPanel() {
  const [page, setPage] = useState<LibraryPage | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [spec, setSpec] = useState(newLibrarySpec)
  const [parent, setParent] = useState<LibraryVersion | null>(null)
  const [selected, setSelected] = useState<LibraryVersion | null>(null)
  const [pending, setPending] = useState<LibrarySave | null>(null)
  const inFlight = useRef(false)
  const requestNumber = useRef(0)
  const selectionNumber = useRef(0)
  const listError = (failure: unknown) => {
    console.error("[studio-library-ui] operation failed", failure)
    const message = failure instanceof Error ? failure.message : "操作に失敗しました"
    setError(message); toast.error(message)
  }
  const refresh = useCallback(async (offset = 0) => {
    const request = ++requestNumber.current
    setLoading(true)
    try {
      const result = await libraryApi(`?offset=${offset}`)
      if (request !== requestNumber.current) return
      setPage({ versions: result.versions ?? [], nextOffset: result.nextOffset ?? null, canWrite: result.canWrite === true })
      setError(null)
    } catch (failure) { if (request === requestNumber.current) listError(failure) }
    finally { if (request === requestNumber.current) setLoading(false) }
  }, [])
  const readSelection = useCallback(async () => {
    const request = ++selectionNumber.current
    const id = new URL(window.location.href).searchParams.get("libraryVersion")
    setSelected(null)
    if (!id) return
    if (!z.string().uuid().safeParse(id).success) { listError(new Error("URLの版IDが不正です")); return }
    try {
      const result = await libraryApi(`?versionId=${encodeURIComponent(id)}`)
      if (request === selectionNumber.current) setSelected(result.version ?? null)
    } catch (failure) { if (request === selectionNumber.current) listError(failure) }
  }, [])
  const invalidateRequests = useCallback(() => { requestNumber.current++; selectionNumber.current++ }, [])
  useEffect(() => {
    void refresh(); void readSelection()
    const onPop = () => { void readSelection() }
    window.addEventListener("popstate", onPop)
    return () => { invalidateRequests(); window.removeEventListener("popstate", onPop) }
  }, [refresh, readSelection, invalidateRequests])

  const select = (version: LibraryVersion) => {
    selectionNumber.current++
    setSelected(version)
    const url = new URL(window.location.href)
    url.searchParams.set("libraryVersion", version.operationId); url.hash = "library"
    window.history.pushState(null, "", url)
  }
  const save = async () => {
    if (inFlight.current) return
    const parsed = librarySpecSchema.safeParse(spec)
    if (!pending && !parsed.success) {
      listError(new Error(parsed.error.issues.map((item) => `${item.path.join(".")}: ${item.message}`).join(" / ")))
      return
    }
    const id = crypto.randomUUID()
    const input: LibrarySave = pending ?? { operationId: id, entryId: parent?.entryId ?? id, parentVersionId: parent?.operationId ?? null, spec: parsed.success ? parsed.data : spec }
    // Freeze the exact request on ambiguous outcomes; retries never invent another operation ID.
    inFlight.current = true; setBusy(true); setPending(input); setError(null)
    try {
      const result = await libraryApi("", input)
      if (!result.version) throw new Error("保存した版の応答がありません。同じ保存IDで再試行してください")
      setPending(null); setParent(result.version); setSpec(result.version.spec); select(result.version)
      toast.success("新しい版を保存しました（未検証・課金なし）")
      if (result.notificationOk !== true) toast.warning("保存済みです。ベル・Slack通知の成功は確認できていません。")
      await refresh()
    } catch (failure) { listError(failure) }
    finally { inFlight.current = false; setBusy(false) }
  }
  const editVersion = (version: LibraryVersion, duplicate: boolean) => {
    setSpec(structuredClone(version.spec)); setParent(duplicate ? null : version); setError(null)
    toast.info(duplicate ? "別の項目として編集できます。保存するまでは登録されません。" : "この版を元に編集します。元の版は変更しません。")
  }
  return <Card id="library" data-testid="studio-library" className="min-w-0 border-zinc-200">
    <CardHeader><CardTitle>制作ライブラリ・再現条件</CardTitle><p className="text-sm leading-6 text-zinc-600">テンプレート・キャラクター・生成レシピを版ごとに保存します。すべて未検証です。生成への適用、素材照合、品質承認はまだ接続していません。</p><p className="text-xs text-zinc-600">同じログイン主体の登録を表示します。共通管理者ログインでは共有ライブラリになります。保存後に一覧を更新します。他の端末の変更は「ライブラリ更新」で取得してください。</p></CardHeader>
    <CardContent className="min-w-0 space-y-6">
      <Button variant="outline" disabled={loading || busy} onClick={() => void refresh()}>ライブラリ更新</Button>
      {loading && <p role="status" className="text-sm">ライブラリを読み込み中…</p>}
      {error && <p role="alert" className="break-words rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {page && !page.versions.length && <p className="text-sm text-zinc-600">登録された版はありません。合格済みのキャラクターやテンプレートを用意済みという意味ではありません。</p>}
      {page && <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{page.versions.map((version) => <article key={version.operationId} className="min-w-0 rounded-lg border p-4">
        <p className="text-xs text-zinc-600">{kindLabels[version.spec.kind]} / {version.spec.genre}</p><h3 className="mt-1 break-words font-semibold">{version.spec.name}</h3>
        <p className="my-2 text-xs text-amber-900">未検証・生成未接続</p><p className="break-all text-xs text-zinc-600">版ID: {version.operationId}</p>
        <Button className="mt-3" variant="outline" aria-label={`${version.spec.name}の版 ${version.operationId} を確認`} onClick={() => select(version)}>この版を確認</Button>
      </article>)}</div>}
      {page?.nextOffset !== null && page?.nextOffset !== undefined && <Button variant="outline" disabled={loading} onClick={() => void refresh(page.nextOffset!)}>次の50件</Button>}
      {selected && <section aria-label="選択したライブラリの版" className="min-w-0 space-y-3 rounded-lg border border-blue-200 bg-blue-50/30 p-4">
        <h3 className="break-words font-semibold">選択中: {selected.spec.name}</h3>
        <p className="break-all text-xs">版ID: {selected.operationId}<br />元の版: {selected.parentVersionId ?? "初版"}<br />設定指紋（ファイル検証ではありません）: {selected.contentHash}</p>
        <ul className="space-y-1 pl-5 text-sm text-amber-900">{selected.blockers.map((blocker) => <li className="list-disc" key={blocker}>{blocker}</li>)}</ul>
        <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={!page?.canWrite || busy || !!pending} onClick={() => editVersion(selected, false)}>この版から派生版を編集</Button><Button variant="outline" disabled={!page?.canWrite || busy || !!pending} onClick={() => editVersion(selected, true)}>別の項目に複製して編集</Button></div>
        <details><summary className="cursor-pointer text-sm">保存条件JSON（実行用ワークフローではありません）</summary><pre className="max-h-80 overflow-auto whitespace-pre-wrap break-all text-xs">{JSON.stringify(selected, null, 2)}</pre></details>
      </section>}
      {page?.canWrite && <section aria-label="ライブラリ登録" className="space-y-4 border-t pt-5">
        <h3 className="font-semibold">{parent ? "派生版を保存（元の版を保持）" : "新規項目を登録"}</h3>
        {pending && <p role="status" className="break-all text-sm text-amber-900">保存ID: {pending.operationId}。結果確認中は内容を固定します。失敗後は同じ保存IDで再試行してください。画面を閉じる前に結果を確認してください。</p>}
        <StudioLibraryForm value={spec} onChange={setSpec} locked={busy || !!pending} derived={!!parent} />
        <div className="flex flex-wrap gap-3"><Button disabled={busy} onClick={() => void save()}>{busy ? "保存結果を確認中…" : pending ? "同じ保存IDで再試行" : "未検証の版を保存（課金なし）"}</Button>
          <Button variant="outline" disabled={busy} onClick={() => { setPending(null); setParent(null); setSpec(newLibrarySpec()); setError(null) }}>{pending ? "編集を破棄して新規作成（保存済みの可能性あり）" : "入力をリセットして新規作成"}</Button></div>
      </section>}
      {page && !page.canWrite && <p className="text-sm text-zinc-600">閲覧専用です。登録には保存権限が必要です。</p>}
    </CardContent>
  </Card>
}
