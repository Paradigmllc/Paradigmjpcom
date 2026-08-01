"use client"

import { useState, type ReactNode } from "react"
import { ClipboardCheck, LoaderCircle, ScanText, Upload } from "lucide-react"
import { toast } from "sonner"
import type { PortalSource } from "@/lib/sales/portal-sources/types"
import { chunkDemoBatch, DEMO_BATCH_MAX_ITEMS } from "@/lib/sales/demo-batch-wave"

interface PortalSnapshotImportFormProps {
  source: PortalSource
  onImported: () => Promise<void>
}

function lines(value: string): string[] {
  return value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean)
}

export function PortalSnapshotImportForm({ source, onImported }: PortalSnapshotImportFormProps) {
  const [listingUrl, setListingUrl] = useState("")
  const [companyName, setCompanyName] = useState("")
  const [category, setCategory] = useState("")
  const [description, setDescription] = useState("")
  const [address, setAddress] = useState("")
  const [phone, setPhone] = useState("")
  const [websiteUrl, setWebsiteUrl] = useState("")
  const [socialLinks, setSocialLinks] = useState("")
  const [imageUrls, setImageUrls] = useState("")
  const [batchJson, setBatchJson] = useState("")
  const [portalPaste, setPortalPaste] = useState("")
  const [extractedCount, setExtractedCount] = useState(0)
  const [confirmed, setConfirmed] = useState(false)
  const [busy, setBusy] = useState(false)

  async function submitSnapshots(snapshots: unknown[]): Promise<number> {
    let imported = 0
    for (const snapshotChunk of chunkDemoBatch(snapshots, 50)) {
      const response = await fetch("/api/sales/demo-site/portal-candidates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source,
          operatorConfirmed: true,
          snapshots: snapshotChunk,
        }),
      })
      const payload = await response.json() as { imported?: number; failed?: number; error?: string }
      if (!response.ok || !payload.imported) {
        throw new Error(`${payload.error ?? "確認済み候補の保存に失敗しました"}（保存済み${imported}件）`)
      }
      imported += payload.imported
    }
    return imported
  }

  async function saveSnapshot() {
    const images = lines(imageUrls).map((line, index) => {
      const [url, ...altParts] = line.split("|")
      return { url: url.trim(), alt: altParts.join("|").trim() || `${companyName}の掲載写真 ${index + 1}` }
    })
    if (!confirmed) return toast.error("通常ブラウザで元ページを確認してください")
    if (images.length < 3) return toast.error("掲載画像URLを3件以上入力してください")
    setBusy(true)
    try {
      const imported = await submitSnapshots([{
        listingUrl,
        companyName,
        category,
        description,
        address: address || null,
        phone: phone || null,
        websiteUrl: websiteUrl || null,
        socialLinks: lines(socialLinks),
        images,
      }])
      toast.success(`確認済み候補${imported}件を保存しました。ポータル再取得・送信はありません。`)
      setListingUrl("")
      setCompanyName("")
      setCategory("")
      setDescription("")
      setAddress("")
      setPhone("")
      setWebsiteUrl("")
      setSocialLinks("")
      setImageUrls("")
      setConfirmed(false)
      await onImported()
    } catch (error) {
      console.error("[portal-snapshot-form] save failed:", error)
      toast.error(error instanceof Error ? error.message : "確認済み候補の保存に失敗しました")
    } finally {
      setBusy(false)
    }
  }

  async function saveBatch() {
    if (!confirmed) return toast.error("通常ブラウザで元ページを確認してください")
    let snapshots: unknown
    try {
      snapshots = JSON.parse(batchJson) as unknown
    } catch (error) {
      console.error("[portal-snapshot-form] batch JSON parse failed:", error)
      return toast.error("一括JSONを解析できませんでした")
    }
    if (!Array.isArray(snapshots) || snapshots.length < 1 || snapshots.length > DEMO_BATCH_MAX_ITEMS) return toast.error(`1〜${DEMO_BATCH_MAX_ITEMS}件のJSON配列を指定してください`)
    setBusy(true)
    try {
      const imported = await submitSnapshots(snapshots)
      toast.success(`確認済み候補${imported}件を一括保存しました。ポータル再取得・送信はありません。`)
      setBatchJson("")
      await onImported()
    } catch (error) {
      console.error("[portal-snapshot-form] batch save failed:", error)
      toast.error(error instanceof Error ? error.message : "確認済み候補の一括保存に失敗しました")
    } finally {
      setBusy(false)
    }
  }

  function buildBatchFromPaste() {
    if (source !== "ekiten") return toast.error("貼り付け抽出はまずエキテン専用です")
    const snapshots = extractEkitenSnapshotsFromPaste(portalPaste)
    if (snapshots.length === 0) return toast.error("候補を抽出できませんでした。エキテンの一覧または詳細ページHTMLを貼り付けてください")
    setBatchJson(JSON.stringify(snapshots, null, 2))
    setExtractedCount(snapshots.length)
    toast.success(`${snapshots.length}件を一括保存JSONへ変換しました`)
  }

  return (
    <div className="mt-7 rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <div className="flex items-start gap-3">
        <ClipboardCheck className="mt-1 h-5 w-5 text-violet-700" />
        <div>
          <h3 className="font-semibold">ブラウザ確認済みプロフィールを保存</h3>
          <p className="mt-1 text-xs leading-5 text-slate-600">ポータルへのサーバーアクセスは行いません。通常ブラウザで見えた公開情報だけを入力し、SMB・意思決定者ゲートへ渡します。</p>
        </div>
      </div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Field label="事業者ページURL"><input value={listingUrl} onChange={(event) => setListingUrl(event.target.value)} className="field" placeholder={`https://www.${source}.jp/...`} /></Field>
        <Field label="事業者名"><input value={companyName} onChange={(event) => setCompanyName(event.target.value)} className="field" /></Field>
        <Field label="業種"><input value={category} onChange={(event) => setCategory(event.target.value)} className="field" /></Field>
        <Field label="所在地"><input value={address} onChange={(event) => setAddress(event.target.value)} className="field" /></Field>
        <Field label="電話（任意）"><input value={phone} onChange={(event) => setPhone(event.target.value)} className="field" /></Field>
        <Field label="独自HP（見つかった場合）"><input value={websiteUrl} onChange={(event) => setWebsiteUrl(event.target.value)} className="field" /></Field>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Field label="説明・代表者・沿革・資格"><textarea value={description} onChange={(event) => setDescription(event.target.value)} className="field min-h-32" /></Field>
        <Field label="SNS URL（1行1件）"><textarea value={socialLinks} onChange={(event) => setSocialLinks(event.target.value)} className="field min-h-32" /></Field>
        <Field label="画像URL（1行1件、URL | alt）"><textarea value={imageUrls} onChange={(event) => setImageUrls(event.target.value)} className="field min-h-32" /></Field>
      </div>
      <div className="mt-4 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <label className="flex items-start gap-3 text-sm leading-6"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} className="mt-1 h-4 w-4" /><span>元ページを通常ブラウザで確認し、独自HP・企業規模・掲載内容を転記しました</span></label>
        <button type="button" disabled={busy || !confirmed} onClick={saveSnapshot} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-violet-700 px-5 text-sm font-bold text-white disabled:opacity-40">
          {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ClipboardCheck className="h-4 w-4" />}
          {busy ? "保存中…" : "確認済み候補を保存"}
        </button>
      </div>
      <div className="mt-6 border-t border-slate-200 pt-5">
        {source === "ekiten" && <div className="mb-6 rounded-2xl border border-violet-200 bg-white p-4">
          <div className="flex items-start gap-3">
            <ScanText className="mt-1 h-5 w-5 text-violet-700" />
            <div>
              <h4 className="text-sm font-semibold">エキテン一覧・詳細ページ貼り付け抽出</h4>
              <p className="mt-1 text-xs leading-5 text-slate-600">通常ブラウザで確認したエキテンのページHTMLまたは選択範囲を貼ると、候補JSONへ変換します。サーバーからポータルへアクセスしません。</p>
            </div>
          </div>
          <textarea value={portalPaste} onChange={(event) => setPortalPaste(event.target.value)} className="field mt-4 min-h-40 font-mono text-xs" placeholder="<html>... または エキテンページで選択コピーした内容 ..." />
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button type="button" disabled={busy || !portalPaste.trim()} onClick={buildBatchFromPaste} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-violet-700 px-5 text-sm font-bold text-white disabled:opacity-40">
              <ScanText className="h-4 w-4" />
              候補JSONへ変換
            </button>
            {extractedCount > 0 && <span className="text-xs font-semibold text-violet-800">{extractedCount}件を変換済み</span>}
          </div>
        </div>}
        <div className="flex items-start gap-3">
          <Upload className="mt-1 h-5 w-5 text-slate-700" />
          <div>
            <h4 className="text-sm font-semibold">確認済み候補を最大{DEMO_BATCH_MAX_ITEMS}件一括保存</h4>
            <p className="mt-1 text-xs leading-5 text-slate-600">同じ項目を持つJSON配列を貼り付けます。50件単位で安全に保存し、選択中ポータルのsourceと同じfail-closed判定を全候補へ適用します。</p>
          </div>
        </div>
        <textarea value={batchJson} onChange={(event) => setBatchJson(event.target.value)} className="field mt-4 min-h-36 font-mono text-xs" placeholder='[{"listingUrl":"https://...","companyName":"...","category":"...","description":"代表者・沿革・資格...","address":"...","websiteUrl":null,"socialLinks":[],"images":[{"url":"https://.../1.jpg","alt":"施工例1"},{"url":"https://.../2.jpg","alt":"施工例2"},{"url":"https://.../3.jpg","alt":"施工例3"}]}]' />
        <button type="button" disabled={busy || !confirmed || !batchJson.trim()} onClick={saveBatch} className="mt-3 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 text-sm font-bold disabled:opacity-40">
          {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          一括保存
        </button>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block text-xs font-semibold text-slate-700"><span>{label}</span><span className="mt-2 block">{children}</span></label>
}

function absoluteEkitenUrl(value: string): string | null {
  try {
    const url = new URL(value, "https://www.ekiten.jp")
    return url.protocol === "https:" && url.hostname.endsWith("ekiten.jp") ? url.toString() : null
  } catch (error) {
    console.error("[portal-snapshot-form] invalid pasted ekiten URL:", error)
    return null
  }
}

function cleanPastedText(value: string): string {
  return value.replace(/\s+/g, " ").trim()
}

function pickEkitenCategory(text: string): string {
  if (/外壁|屋根|防水|塗装|リフォーム|リノベーション/u.test(text)) return "住宅リフォーム・リノベーション"
  if (/整体|鍼灸|接骨|整骨|リラク|マッサージ/u.test(text)) return "整体・鍼灸・リラクゼーション"
  if (/行政書士/u.test(text)) return "行政書士"
  if (/社労士|社会保険労務士/u.test(text)) return "社会保険労務士"
  if (/税理士|会計/u.test(text)) return "税理士・会計事務所"
  if (/美容室|ヘアサロン|サロン/u.test(text)) return "美容室・サロン"
  return "ローカル専門サービス"
}

function pickEkitenAddress(text: string): string | null {
  return text.match(/(北海道|東京都|京都府|大阪府|.{2,3}県)[^\s,、。]{4,80}/u)?.[0] ?? null
}

function extractImages(root: Element, companyName: string): Array<{ url: string; alt: string }> {
  const seen = new Set<string>()
  const images: Array<{ url: string; alt: string }> = []
  root.querySelectorAll("img").forEach((image, index) => {
    const raw = image.getAttribute("src") ?? image.getAttribute("data-src") ?? image.getAttribute("data-original") ?? ""
    const url = raw ? absoluteEkitenUrl(raw) : null
    if (!url || seen.has(url) || /logo|icon|sprite|gmo|ekiten/i.test(url)) return
    seen.add(url)
    images.push({ url, alt: image.getAttribute("alt")?.trim() || `${companyName}の掲載写真 ${index + 1}` })
  })
  return images.slice(0, 12)
}

function nearestCandidateRoot(anchor: HTMLAnchorElement): Element {
  let root: Element = anchor
  for (let i = 0; i < 6 && root.parentElement; i++) {
    root = root.parentElement
    const text = cleanPastedText(root.textContent ?? "")
    if (text.length > 120 && root.querySelectorAll("img").length >= 3) return root
  }
  return anchor.closest("body") ?? anchor
}

function extractEkitenSnapshotsFromPaste(raw: string): Array<Record<string, unknown>> {
  const parser = new DOMParser()
  const doc = parser.parseFromString(raw.includes("<") ? raw : `<main>${raw}</main>`, "text/html")
  const anchors = [...doc.querySelectorAll<HTMLAnchorElement>("a[href*='/shop_']")]
  const detailUrl = raw.match(/https:\/\/www\.ekiten\.jp\/shop_\d+\/?/u)?.[0] ?? null
  if (anchors.length === 0 && detailUrl) {
    const bodyText = cleanPastedText(doc.body.textContent ?? raw)
    const companyName = bodyText.match(/#\s*([^\n\r]{2,80})/u)?.[1]?.trim() ?? bodyText.split(/\s+/u).find((part) => part.length >= 2 && part.length <= 30) ?? ""
    const images = extractImages(doc.body, companyName)
    return images.length >= 3 ? [{
      listingUrl: detailUrl,
      companyName,
      category: pickEkitenCategory(bodyText),
      description: bodyText.slice(0, 900),
      address: pickEkitenAddress(bodyText),
      websiteUrl: null,
      socialLinks: [],
      images,
    }] : []
  }

  const seen = new Set<string>()
  const snapshots: Array<Record<string, unknown>> = []
  for (const anchor of anchors) {
    const listingUrl = absoluteEkitenUrl(anchor.getAttribute("href") ?? "")
    if (!listingUrl || seen.has(listingUrl)) continue
    seen.add(listingUrl)
    const root = nearestCandidateRoot(anchor)
    const text = cleanPastedText(root.textContent ?? "")
    const companyName = cleanPastedText(anchor.textContent ?? "").replace(/^(店舗公式|NEW|\d+\.\d+)\s*/u, "").slice(0, 80)
    if (companyName.length < 2 || /写真|口コミ|料金|詳細|電話|お問い合わせ|PAGE TOP|ログイン/u.test(companyName)) continue
    const images = extractImages(root, companyName)
    if (images.length < 3) continue
    snapshots.push({
      listingUrl,
      companyName,
      category: pickEkitenCategory(text),
      description: text.slice(0, 900),
      address: pickEkitenAddress(text),
      websiteUrl: null,
      socialLinks: [],
      images,
    })
    if (snapshots.length >= DEMO_BATCH_MAX_ITEMS) break
  }
  return snapshots
}
