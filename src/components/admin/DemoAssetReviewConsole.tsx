"use client"

import { useState } from "react"
import { Copy, ExternalLink, ImagePlus, KeyRound, ShieldCheck, Trash2 } from "lucide-react"
import { toast } from "sonner"
import type { DemoReviewedAsset } from "@/lib/sales/demo-private-access"

const EMPTY_ASSET: DemoReviewedAsset = {
  id: "",
  kind: "image",
  sourceUrl: "",
  ownerLabel: "",
  sourceAccount: "",
  useBasis: "private_proposal",
  officialSource: true,
  peopleVisible: false,
  watermarkVisible: false,
  alt: "",
  notes: "",
}

export function DemoAssetReviewConsole() {
  const [slug, setSlug] = useState("")
  const [ttlDays, setTtlDays] = useState(14)
  const [assets, setAssets] = useState<DemoReviewedAsset[]>([{ ...EMPTY_ASSET, id: crypto.randomUUID() }])
  const [previewUrl, setPreviewUrl] = useState("")
  const [expiresAt, setExpiresAt] = useState("")
  const [busy, setBusy] = useState(false)

  function updateAsset(index: number, patch: Partial<DemoReviewedAsset>) {
    setAssets((current) => current.map((asset, itemIndex) => itemIndex === index ? { ...asset, ...patch } : asset))
  }

  async function issuePreview() {
    if (!slug.trim()) return toast.error("デモslugを入力してください")
    setBusy(true)
    try {
      const response = await fetch(`/api/sales/demo-site/private-access/${encodeURIComponent(slug.trim())}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ttlDays, locale: "ja", assets }),
      })
      const payload = await response.json() as { ok: boolean; previewUrl?: string; expiresAt?: string; error?: string }
      if (!response.ok || !payload.ok || !payload.previewUrl) throw new Error(payload.error ?? "発行に失敗しました")
      setPreviewUrl(payload.previewUrl)
      setExpiresAt(payload.expiresAt ?? "")
      toast.success("期限付き非公開URLを発行しました")
    } catch (error) {
      console.error("[demo-assets] issue failed:", error)
      toast.error(error instanceof Error ? error.message : "発行に失敗しました")
    } finally {
      setBusy(false)
    }
  }

  async function revokePreview() {
    if (!slug.trim()) return toast.error("デモslugを入力してください")
    setBusy(true)
    try {
      const response = await fetch(`/api/sales/demo-site/private-access/${encodeURIComponent(slug.trim())}`, { method: "DELETE" })
      const payload = await response.json() as { ok: boolean; error?: string }
      if (!response.ok || !payload.ok) throw new Error(payload.error ?? "失効に失敗しました")
      setPreviewUrl("")
      setExpiresAt("")
      toast.success("非公開URLを失効しました")
    } catch (error) {
      console.error("[demo-assets] revoke failed:", error)
      toast.error(error instanceof Error ? error.message : "失効に失敗しました")
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="min-h-dvh bg-[#f5f7fa] px-4 py-10 text-slate-950 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-9">
          <div className="flex items-start gap-4"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-slate-950 text-white"><ShieldCheck /></div><div><p className="text-xs font-bold uppercase tracking-[.22em] text-emerald-700">Private demo control</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">実素材の審査と非公開URL発行</h1><p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">公式SNS等の実素材は、出所・許諾・人物・透かしを記録し、期限付き非公開デモだけで利用します。送信やCRM同期は行いません。</p></div></div>
        </header>

        <section className="mt-6 grid gap-6 lg:grid-cols-[.72fr_1.28fr]">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <label className="block text-sm font-semibold" htmlFor="demo-slug">デモslug</label>
            <input id="demo-slug" value={slug} onChange={(event) => setSlug(event.target.value)} placeholder="oikawa-yogashiten-private-review" className="mt-2 h-12 w-full rounded-xl border border-slate-300 px-4 outline-none focus:border-slate-950" />
            <label className="mt-5 block text-sm font-semibold" htmlFor="ttl-days">有効日数（最大30日）</label>
            <input id="ttl-days" type="number" min={1} max={30} value={ttlDays} onChange={(event) => setTtlDays(Number(event.target.value))} className="mt-2 h-12 w-full rounded-xl border border-slate-300 px-4 outline-none focus:border-slate-950" />
            <div className="mt-6 rounded-2xl bg-amber-50 p-4 text-xs leading-6 text-amber-950"><strong>自動ブロック:</strong> HTTPSでないURL、出所不明、許諾なしの人物・透かし、blocked指定素材。</div>
            <button type="button" disabled={busy} onClick={issuePreview} className="mt-6 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-bold text-white disabled:opacity-50"><KeyRound className="h-4 w-4" />{busy ? "処理中…" : "審査して非公開URLを発行"}</button>
            <button type="button" disabled={busy} onClick={revokePreview} className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-red-200 text-sm font-bold text-red-700 disabled:opacity-50"><Trash2 className="h-4 w-4" />URLを失効</button>
          </div>

          <div className="space-y-4">
            {assets.map((asset, index) => (
              <article key={asset.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between"><h2 className="flex items-center gap-2 font-semibold"><ImagePlus className="h-4 w-4" />素材 {index + 1}</h2>{assets.length > 1 && <button type="button" aria-label={`素材${index + 1}を削除`} onClick={() => setAssets((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="rounded-lg p-2 text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>}</div>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <Field label="素材URL" wide><input value={asset.sourceUrl} onChange={(event) => updateAsset(index, { sourceUrl: event.target.value })} className="field" placeholder="https://..." /></Field>
                  <Field label="種類"><select value={asset.kind} onChange={(event) => updateAsset(index, { kind: event.target.value as DemoReviewedAsset["kind"] })} className="field"><option value="logo">ロゴ</option><option value="image">画像</option><option value="video">動画</option></select></Field>
                  <Field label="利用根拠"><select value={asset.useBasis} onChange={(event) => updateAsset(index, { useBasis: event.target.value as DemoReviewedAsset["useBasis"] })} className="field"><option value="private_proposal">公式素材・非公開提案のみ</option><option value="consented">明示許諾済み</option><option value="licensed">ライセンス素材</option><option value="official_embed">公式埋め込み</option><option value="generated">生成・所有素材</option><option value="blocked">利用禁止</option></select></Field>
                  <Field label="所有者"><input value={asset.ownerLabel} onChange={(event) => updateAsset(index, { ownerLabel: event.target.value })} className="field" placeholder="企業名 / 撮影者" /></Field>
                  <Field label="取得元"><input value={asset.sourceAccount} onChange={(event) => updateAsset(index, { sourceAccount: event.target.value })} className="field" placeholder="公式Instagram投稿URL等" /></Field>
                  <Field label="altテキスト" wide><input value={asset.alt} onChange={(event) => updateAsset(index, { alt: event.target.value })} className="field" placeholder="画像の内容を具体的に記述" /></Field>
                </div>
                <div className="mt-5 flex flex-wrap gap-5 text-sm"><Check label="公式出所" checked={asset.officialSource} onChange={(checked) => updateAsset(index, { officialSource: checked })} /><Check label="人物あり" checked={asset.peopleVisible} onChange={(checked) => updateAsset(index, { peopleVisible: checked })} /><Check label="透かしあり" checked={asset.watermarkVisible} onChange={(checked) => updateAsset(index, { watermarkVisible: checked })} /></div>
              </article>
            ))}
            <button type="button" onClick={() => setAssets((current) => [...current, { ...EMPTY_ASSET, id: crypto.randomUUID() }])} className="min-h-12 w-full rounded-2xl border border-dashed border-slate-400 bg-white text-sm font-bold hover:border-slate-950">＋ 素材を追加</button>
          </div>
        </section>

        {previewUrl && <section className="mt-6 rounded-3xl border border-emerald-200 bg-emerald-50 p-6"><p className="font-semibold text-emerald-950">非公開URL（再発行すると旧URLは無効）</p><p className="mt-2 break-all text-sm text-emerald-900">{previewUrl}</p><p className="mt-2 text-xs text-emerald-800">期限: {new Date(expiresAt).toLocaleString("ja-JP")}</p><div className="mt-4 flex flex-wrap gap-3"><button type="button" onClick={() => navigator.clipboard.writeText(previewUrl).then(() => toast.success("コピーしました")).catch((error) => { console.error("[demo-assets] copy failed:", error); toast.error("コピーに失敗しました") })} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-900 px-5 text-sm font-bold text-white"><Copy className="h-4 w-4" />コピー</button><a href={previewUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-emerald-800 px-5 text-sm font-bold text-emerald-950"><ExternalLink className="h-4 w-4" />確認する</a></div></section>}
      </div>
      <style jsx global>{`.field{height:3rem;width:100%;border-radius:.75rem;border:1px solid #cbd5e1;padding:0 .875rem;background:white;outline:none}.field:focus{border-color:#0f172a}`}</style>
    </main>
  )
}

function Field({ label, wide = false, children }: { label: string; wide?: boolean; children: React.ReactNode }) {
  return <label className={`block text-xs font-semibold text-slate-700 ${wide ? "sm:col-span-2" : ""}`}><span className="mb-2 block">{label}</span>{children}</label>
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return <label className="flex items-center gap-2"><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4" />{label}</label>
}
