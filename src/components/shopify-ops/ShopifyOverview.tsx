import { AlertTriangle, CheckCircle2, PackageCheck, ShoppingBag, Target, Video } from "lucide-react"
import type { ShopifyOpsDashboard } from "@/lib/shopify-ops/types"

function moneyJpy(value: number): string {
  return new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY", maximumFractionDigits: 0 }).format(value)
}

export function ShopifyOverview({ dashboard }: { dashboard: ShopifyOpsDashboard }) {
  const topProducts = dashboard.products
    .filter((product) => product.isHero)
    .sort((a, b) => b.estimatedMarginPercent - a.estimatedMarginPercent)
    .slice(0, 6)

  return (
    <div className="space-y-6">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "30日注文", value: dashboard.totals30d.orders.toLocaleString(), helper: `目標 ${dashboard.goals.orders}件`, icon: ShoppingBag },
          { label: "30日セッション", value: dashboard.totals30d.sessions.toLocaleString(), helper: `目標 ${dashboard.goals.sessions.toLocaleString()}`, icon: Target },
          { label: "動画再生", value: dashboard.totals30d.videoViews.toLocaleString(), helper: `目標 ${dashboard.goals.videoViews.toLocaleString()}`, icon: Video },
          { label: "推定限界利益", value: moneyJpy(dashboard.totals30d.estimatedProfitJpy), helper: `目標 ${moneyJpy(dashboard.goals.profitJpy)}`, icon: PackageCheck },
        ].map((metric) => {
          const Icon = metric.icon
          return (
            <article key={metric.label} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between"><p className="text-xs font-semibold text-zinc-500">{metric.label}</p><Icon className="h-4 w-4 text-violet-500" aria-hidden="true" /></div>
              <p className="mt-3 text-2xl font-bold tracking-tight text-zinc-950">{metric.value}</p>
              <p className="mt-1 text-xs text-zinc-400">{metric.helper}</p>
            </article>
          )
        })}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-600">Launch readiness</p><h2 className="mt-2 text-xl font-bold text-zinc-950">ローンチ準備</h2></div>
            <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold text-zinc-700">{dashboard.launchControl.readyGateCount}/{dashboard.launchControl.totalGateCount} 完了</span>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {dashboard.launchControl.gates.map((item) => (
              <div key={item.key} className="rounded-xl border border-zinc-100 bg-zinc-50 p-3">
                <div className="flex items-start gap-2 text-sm">
                  {item.status === "ready" ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />}
                  <div><p className="font-semibold text-zinc-800">{item.label}</p><p className="mt-1 text-xs leading-relaxed text-zinc-500">{item.detail}</p></div>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-600">Hero economics</p>
          <h2 className="mt-2 text-xl font-bold text-zinc-950">主力商品の採算仮説</h2>
          {topProducts.length === 0 ? (
            <p className="mt-5 rounded-xl bg-zinc-50 p-4 text-sm text-zinc-500">公開証跡を満たした主力商品はまだありません。</p>
          ) : (
            <div className="mt-5 space-y-3">
              {topProducts.map((product) => (
                <div key={product.id} className="flex items-center justify-between gap-4 rounded-xl border border-zinc-100 bg-zinc-50 p-3">
                  <div className="min-w-0"><p className="truncate text-sm font-semibold text-zinc-900">{product.name}</p><p className="mt-1 text-xs text-zinc-500">${product.priceUsd} · {product.weightGrams}g</p></div>
                  <div className="shrink-0 text-right"><p className={`text-sm font-bold ${product.estimatedMarginPercent >= 60 ? "text-emerald-600" : "text-amber-600"}`}>{product.estimatedMarginPercent}%</p><p className="text-[11px] text-zinc-400">{moneyJpy(product.estimatedProfitJpy)}</p></div>
                </div>
              ))}
            </div>
          )}
          <p className="mt-4 rounded-xl bg-amber-50 p-3 text-xs leading-relaxed text-amber-800">採算値は運営仮説です。実商品の原価、決済手数料、国際配送、返品、関税の確認後に販売判断へ使用します。</p>
        </article>
      </section>
    </div>
  )
}
