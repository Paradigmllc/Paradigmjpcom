import { Bot, CheckCircle2, CircleAlert, Film, Play, PlusCircle } from "lucide-react"
import {
  CONTENT_PLATFORM_LABELS,
  CONTENT_STATUS_LABELS,
  CONTENT_TYPE_LABELS,
} from "@/lib/shopify-ops/labels"
import { CONTENT_PLATFORMS, CONTENT_STATUSES, CONTENT_TYPES } from "@/lib/shopify-ops/types"
import type { ShopifyOpsContentItem, ShopifyOpsProduct, ShopifySocialAutomationStatus } from "@/lib/shopify-ops/types"

type Action = (formData: FormData) => Promise<void>

export function ShopifyContentPanel({
  items,
  products,
  automation,
  locale,
  create,
  updateStatus,
  runDaily,
}: {
  items: ShopifyOpsContentItem[]
  products: ShopifyOpsProduct[]
  automation: ShopifySocialAutomationStatus
  locale: string
  create: Action
  updateStatus: Action
  runDaily: Action
}) {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-2"><Bot className="h-5 w-5 text-violet-600" /><h2 className="font-bold text-zinc-950">SNS日次自動化</h2></div>
            <p className="mt-2 text-sm text-zinc-500">公開ゲート通過商品だけから英語投稿を自動生成し、承認ポリシー・予約・公開結果をDBに保存します。</p>
          </div>
          <form action={runDaily}>
            <input type="hidden" name="pageLocale" value={locale} />
            <button type="submit" className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-violet-500"><Play className="h-4 w-4" />今日のパイプラインを実行</button>
          </form>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["公開可能商品", automation.readyProductCount, "商品"], ["予約投稿", automation.scheduledPostCount, "件"],
            ["公開済み", automation.publishedPostCount, "件"], ["要対応", automation.failedPostCount, "件"],
          ].map(([label, value, unit]) => <div key={String(label)} className="rounded-xl bg-zinc-50 p-3"><p className="text-xs text-zinc-500">{label}</p><p className="mt-1 text-xl font-black text-zinc-950">{value}<span className="ml-1 text-xs font-semibold text-zinc-400">{unit}</span></p></div>)}
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {automation.connectors.map((connector) => (
            <div key={connector.platform} className="flex items-start gap-2 rounded-xl border border-zinc-100 p-3">
              {connector.configured && connector.directPublishingSupported ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> : <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />}
              <div><p className="text-xs font-bold capitalize text-zinc-800">{connector.platform}</p><p className="mt-1 text-[11px] leading-relaxed text-zinc-500">{connector.reason}</p></div>
            </div>
          ))}
        </div>
        {automation.recentRuns[0] && <p className={`mt-4 rounded-xl px-3 py-2 text-xs ${automation.recentRuns[0].status === "blocked" ? "bg-amber-50 text-amber-800" : "bg-emerald-50 text-emerald-800"}`}>最終実行 {automation.recentRuns[0].runDate}: {automation.recentRuns[0].status}{automation.recentRuns[0].blockedReason ? ` — ${automation.recentRuns[0].blockedReason}` : ""}</p>}
      </section>

      <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
      <section className="h-fit rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6 xl:sticky xl:top-24">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-violet-100 p-2 text-violet-700"><PlusCircle className="h-5 w-5" /></div>
          <div>
            <h2 className="font-bold text-zinc-950">制作カードを追加</h2>
            <p className="text-xs text-zinc-500">1商品5〜7本の完成動画を作成</p>
          </div>
        </div>
        <form action={create} className="mt-6 space-y-4">
          <input type="hidden" name="pageLocale" value={locale} />
          <label className="block text-xs font-semibold text-zinc-600">対象商品
            <select name="productId" defaultValue="" className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm">
              <option value="">ブランド共通</option>
              {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs font-semibold text-zinc-600">配信先
              <select name="platform" defaultValue="multi" className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm">
                {CONTENT_PLATFORMS.map((platform) => <option key={platform} value={platform}>{CONTENT_PLATFORM_LABELS[platform]}</option>)}
              </select>
            </label>
            <label className="block text-xs font-semibold text-zinc-600">動画タイプ
              <select name="contentType" defaultValue="discovery" className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm">
                {CONTENT_TYPES.map((type) => <option key={type} value={type}>{CONTENT_TYPE_LABELS[type]}</option>)}
              </select>
            </label>
          </div>
          <label className="block text-xs font-semibold text-zinc-600">冒頭フック
            <textarea name="hook" required minLength={8} maxLength={500} rows={4} placeholder="I found the strangest object in a tiny Japanese shop..." className="mt-1.5 w-full resize-none rounded-xl border border-zinc-200 px-3 py-2.5 text-sm" />
          </label>
          <input type="hidden" name="locale" value="en" />
          <button type="submit" className="w-full rounded-xl bg-zinc-950 px-4 py-3 text-sm font-bold text-white hover:bg-zinc-800">制作キューへ追加</button>
        </form>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-100 px-5 py-4 sm:px-6">
          <h2 className="text-lg font-bold text-zinc-950">コンテンツ制作パイプライン</h2>
          <p className="mt-1 text-sm text-zinc-500">購入フォロワーは使わず、実物映像70〜80%の投稿在庫を増やします。</p>
        </div>
        {items.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <Film className="mx-auto h-9 w-9 text-zinc-300" />
            <h3 className="mt-4 font-bold text-zinc-900">制作カードはまだありません</h3>
            <p className="mt-2 text-sm text-zinc-500">最初のHero商品から、発見・驚き型の動画を追加してください。</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-100">
            {items.map((item) => (
              <article key={item.id} className="p-5 sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold">
                      <span className="rounded-full bg-violet-50 px-2.5 py-1 text-violet-700">{CONTENT_PLATFORM_LABELS[item.platform]}</span>
                      <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-zinc-600">{CONTENT_TYPE_LABELS[item.contentType]}</span>
                      <span className="font-mono text-zinc-400">{item.contentCode}</span>
                    </div>
                    <p className="mt-3 whitespace-pre-line text-sm font-semibold leading-relaxed text-zinc-900">{item.caption ?? item.hook}</p>
                    <p className="mt-2 text-xs text-zinc-500">{item.productName ?? "ブランド共通"} · {item.videoViews.toLocaleString()}再生 · {item.linkClicks.toLocaleString()}クリック · {item.ordersAttributed}注文</p>
                    {item.autoGenerated && <p className="mt-2 text-[11px] font-semibold text-violet-600">自動生成 · {item.generationDate} · 公開試行 {item.publishAttempts}回</p>}
                    {item.errorMessage && <p className="mt-2 rounded-lg bg-rose-50 p-2 text-xs text-rose-700">{item.errorMessage}</p>}
                  </div>
                  <form action={updateStatus} className="flex shrink-0 gap-2">
                    <input type="hidden" name="id" value={item.id} />
                    <input type="hidden" name="locale" value={locale} />
                    <select name="status" defaultValue={item.status} aria-label={`${item.contentCode}の状態`} className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold">
                      {CONTENT_STATUSES.map((status) => <option key={status} value={status}>{CONTENT_STATUS_LABELS[status]}</option>)}
                    </select>
                    <button type="submit" className="rounded-xl bg-zinc-900 px-3 py-2 text-xs font-bold text-white hover:bg-zinc-700">更新</button>
                  </form>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
      </div>
    </div>
  )
}
