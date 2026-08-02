import { AlertTriangle, CheckCircle2, ExternalLink, Link2, PackageSearch, RefreshCw } from "lucide-react"
import type { BaseSyncStatus } from "@/lib/shopify-ops/types"

type Action = (formData: FormData) => Promise<void>

function statusLabel(status: BaseSyncStatus["recentRuns"][number]["status"]): string {
  if (status === "succeeded") return "成功"
  if (status === "running") return "実行中"
  if (status === "blocked") return "待機"
  return "失敗"
}

function statusTone(status: BaseSyncStatus["recentRuns"][number]["status"]): string {
  if (status === "succeeded") return "bg-emerald-50 text-emerald-700"
  if (status === "running" || status === "blocked") return "bg-amber-50 text-amber-700"
  return "bg-rose-50 text-rose-700"
}

function dateTime(value: string): string {
  return new Intl.DateTimeFormat("ja-JP", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Tokyo" }).format(new Date(value))
}

export function ShopifyBaseSyncPanel({ status, locale, submit }: { status: BaseSyncStatus; locale: string; submit: Action }) {
  const readiness = [
    { label: "BASE Developersアプリ", ready: status.baseAppConfigured },
    { label: "BASEショップOAuth", ready: status.baseShopConnected },
    { label: "Shopify Admin API", ready: status.shopifyConfigured },
  ]

  return (
    <div className="space-y-6">
      <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <article className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-600">Connection</p>
          <h2 className="mt-2 text-xl font-bold text-zinc-950">BASE → Shopify</h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-500">BASEを商品・税込価格・在庫・画像の正本として、Shopifyには非公開の下書き商品を作成します。</p>
          <div className="mt-5 space-y-3">
            {readiness.map((item) => (
              <div key={item.label} className="flex items-center justify-between rounded-xl bg-zinc-50 px-4 py-3 text-sm">
                <span className="font-semibold text-zinc-700">{item.label}</span>
                <span className={`flex items-center gap-1.5 text-xs font-bold ${item.ready ? "text-emerald-600" : "text-amber-600"}`}>
                  {item.ready ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                  {item.ready ? "準備済み" : "未設定"}
                </span>
              </div>
            ))}
          </div>
          {status.baseAppConfigured && !status.baseShopConnected && (
            <a href="/api/shopify-ops/base/connect" className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-950 px-4 py-3 text-sm font-bold text-white hover:bg-zinc-800">
              <Link2 className="h-4 w-4" /> BASEショップを接続
            </a>
          )}
          {!status.baseAppConfigured && (
            <p className="mt-5 rounded-xl bg-amber-50 p-3 text-xs leading-relaxed text-amber-800">BASE Developersのclient ID / secretを本番シークレットへ設定すると、ここにOAuth接続ボタンが表示されます。</p>
          )}
        </article>

        <article className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-600">Safe sync</p>
              <h2 className="mt-2 text-xl font-bold text-zinc-950">同期を実行</h2>
            </div>
            <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold text-zinc-700">リンク済み {status.linkedProductCount}件</span>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <form action={submit} className="rounded-xl border border-zinc-200 p-4">
              <input type="hidden" name="mode" value="dry_run" />
              <input type="hidden" name="pageLocale" value={locale} />
              <h3 className="font-bold text-zinc-900">1. dry-run</h3>
              <p className="mt-2 min-h-10 text-xs leading-relaxed text-zinc-500">BASE商品を読み取り、作成予定のSKU・価格・在庫・分類を確認します。</p>
              <button type="submit" disabled={!status.baseShopConnected || status.syncRunning} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-300 px-3 py-2 text-sm font-bold text-zinc-800 disabled:cursor-not-allowed disabled:opacity-40">
                <PackageSearch className="h-4 w-4" /> {status.syncRunning ? "同期実行中" : "読み取りテスト"}
              </button>
            </form>
            <form action={submit} className="rounded-xl border border-violet-200 bg-violet-50/40 p-4">
              <input type="hidden" name="mode" value="apply" />
              <input type="hidden" name="pageLocale" value={locale} />
              <h3 className="font-bold text-zinc-900">2. 下書き同期</h3>
              <p className="mt-2 min-h-10 text-xs leading-relaxed text-zinc-500">4コレクションを用意し、商品を下書きでupsertします。商品削除・自動公開は行いません。</p>
              <button type="submit" disabled={!status.readyToSync} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-violet-600 px-3 py-2 text-sm font-bold text-white hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-40">
                <RefreshCw className={`h-4 w-4 ${status.syncRunning ? "animate-spin" : ""}`} /> {status.syncRunning ? "同期実行中" : "BASEから同期"}
              </button>
            </form>
          </div>
          <div className={`mt-4 rounded-xl border p-4 ${status.readyToSync ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-bold text-zinc-900">{status.automationIntervalMinutes}分ごとの在庫・商品差分同期</p>
              <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${status.readyToSync ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                {status.readyToSync ? "自動運転" : "安全停止中"}
              </span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-zinc-600">通常の変更だけを自動反映します。0件・商品数の急減/異常増加・接続切れでは停止して通知し、商品削除と自動公開は行いません。</p>
            {status.lastScheduledRun && (
              <p className="mt-2 text-xs font-semibold text-zinc-700">最終自動実行 {dateTime(status.lastScheduledRun.startedAt)} · {statusLabel(status.lastScheduledRun.status)}</p>
            )}
          </div>
          {status.lastRun && (
            <p className={`mt-4 rounded-xl p-3 text-xs font-semibold ${statusTone(status.lastRun.status)}`} aria-live="polite">
              最終実行 {dateTime(status.lastRun.startedAt)} · {statusLabel(status.lastRun.status)} · 取得 {status.lastRun.sourceCount} / 新規 {status.lastRun.createdCount} / 更新 {status.lastRun.updatedCount} / 失敗 {status.lastRun.failedCount}
            </p>
          )}
        </article>
      </section>

      <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-100 px-5 py-4 sm:px-6">
          <h2 className="text-lg font-bold text-zinc-950">直近のBASE商品プレビュー</h2>
          <p className="mt-1 text-sm text-zinc-500">dry-runまたは同期で読み取った先頭50件です。価格はShopifyの基準通貨JPYで登録し、Markets側で現地通貨表示します。</p>
        </div>
        {status.previewItems.length === 0 ? (
          <div className="p-10 text-center text-sm text-zinc-500">dry-runを実行すると、ここに同期予定の商品が表示されます。</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="bg-zinc-50 text-xs text-zinc-500"><tr><th className="px-5 py-3">商品</th><th className="px-4 py-3">分類</th><th className="px-4 py-3">価格</th><th className="px-4 py-3">在庫</th><th className="px-4 py-3">画像</th><th className="px-4 py-3">種類</th><th className="px-5 py-3">BASE</th></tr></thead>
              <tbody className="divide-y divide-zinc-100">
                {status.previewItems.map((item) => (
                  <tr key={item.baseItemId}>
                    <td className="px-5 py-4"><p className="font-semibold text-zinc-900">{item.title}</p><p className="mt-1 text-xs text-zinc-400">{item.sku}</p></td>
                    <td className="px-4 py-4 capitalize text-zinc-600">{item.collectionHandle}</td>
                    <td className="px-4 py-4 font-semibold text-zinc-800">¥{item.priceJpy.toLocaleString()}</td>
                    <td className="px-4 py-4 text-zinc-600">{item.inventory}</td>
                    <td className="px-4 py-4 text-zinc-600">{item.imageCount}</td>
                    <td className="px-4 py-4 text-zinc-600">{item.variationCount || 1}</td>
                    <td className="px-5 py-4"><span className={`rounded-full px-2 py-1 text-xs font-bold ${item.visibleInBase ? "bg-emerald-50 text-emerald-700" : "bg-zinc-100 text-zinc-500"}`}>{item.visibleInBase ? "公開" : "非公開"}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center justify-between gap-3"><h2 className="text-lg font-bold text-zinc-950">同期履歴</h2><a href="https://docs.thebase.in/api/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-bold text-violet-600">BASE API仕様 <ExternalLink className="h-3 w-3" /></a></div>
        {status.recentRuns.length === 0 ? <p className="mt-4 text-sm text-zinc-500">まだ同期履歴がありません。</p> : (
          <div className="mt-4 space-y-2">{status.recentRuns.map((run) => <div key={run.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-zinc-50 px-4 py-3 text-xs"><span className="font-semibold text-zinc-700">{dateTime(run.startedAt)} · {run.triggeredBy === "scheduled" ? "自動" : "手動"} · {run.mode === "dry_run" ? "dry-run" : "本同期"}</span><span className={`rounded-full px-2 py-1 font-bold ${statusTone(run.status)}`}>{statusLabel(run.status)} · {run.sourceCount}件</span></div>)}</div>
        )}
      </section>
    </div>
  )
}
