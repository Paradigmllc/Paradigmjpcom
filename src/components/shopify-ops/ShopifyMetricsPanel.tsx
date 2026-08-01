import { BarChart3 } from "lucide-react"
import type { ShopifyOpsDailyMetric, ShopifyOpsDashboard } from "@/lib/shopify-ops/types"

type Action = (formData: FormData) => Promise<void>

function todayInJapan(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date())
}

function Field({ name, label, defaultValue = 0, step = 1 }: { name: string; label: string; defaultValue?: number; step?: number }) {
  return (
    <label className="block text-xs font-semibold text-zinc-600">{label}
      <input name={name} type="number" min="0" step={step} defaultValue={defaultValue} required className="mt-1.5 w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm" />
    </label>
  )
}

function MetricRow({ metric }: { metric: ShopifyOpsDailyMetric }) {
  const conversion = metric.sessions > 0 ? ((metric.orders / metric.sessions) * 100).toFixed(2) : "0.00"
  return (
    <tr className="border-t border-zinc-100 text-sm">
      <td className="px-4 py-3 font-mono text-xs text-zinc-600">{metric.metricDate}</td>
      <td className="px-4 py-3 text-zinc-700">{metric.videoViews.toLocaleString()}</td>
      <td className="px-4 py-3 text-zinc-700">{metric.sessions.toLocaleString()}</td>
      <td className="px-4 py-3 font-semibold text-zinc-900">{metric.orders}</td>
      <td className="px-4 py-3 text-zinc-700">{conversion}%</td>
      <td className="px-4 py-3 font-semibold text-zinc-900">${metric.revenueUsd.toLocaleString()}</td>
    </tr>
  )
}

export function ShopifyMetricsPanel({ dashboard, locale, submit }: { dashboard: ShopifyOpsDashboard; locale: string; submit: Action }) {
  return (
    <div className="grid gap-6 xl:grid-cols-[440px_minmax(0,1fr)]">
      <section className="h-fit rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-bold text-zinc-950">日次KPIを記録</h2>
        <p className="mt-1 text-sm text-zinc-500">フォロワー数ではなく、再生→クリック→注文→利益を追跡します。</p>
        <form action={submit} className="mt-6 space-y-4">
          <input type="hidden" name="locale" value={locale} />
          <label className="block text-xs font-semibold text-zinc-600">対象日
            <input name="metricDate" type="date" defaultValue={todayInJapan()} required className="mt-1.5 w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm" />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <Field name="videoViews" label="動画再生" />
            <Field name="profileVisits" label="プロフィール訪問" />
            <Field name="linkClicks" label="リンククリック" />
            <Field name="sessions" label="ストアセッション" />
            <Field name="productViews" label="商品閲覧" />
            <Field name="addToCarts" label="カート追加" />
            <Field name="checkouts" label="チェックアウト" />
            <Field name="orders" label="注文" />
            <Field name="revenueUsd" label="売上 USD" step={0.01} />
            <Field name="variableCostJpy" label="変動費 JPY" />
            <Field name="tiktokFollowers" label="TikTokフォロワー" />
            <Field name="instagramFollowers" label="Instagramフォロワー" />
          </div>
          <label className="block text-xs font-semibold text-zinc-600">メモ
            <textarea name="notes" maxLength={1000} rows={3} className="mt-1.5 w-full resize-none rounded-xl border border-zinc-200 px-3 py-2.5 text-sm" />
          </label>
          <button type="submit" className="w-full rounded-xl bg-zinc-950 px-4 py-3 text-sm font-bold text-white hover:bg-zinc-800">KPIを保存</button>
        </form>
      </section>

      <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-100 px-5 py-4 sm:px-6">
          <h2 className="text-lg font-bold text-zinc-950">直近30日の実績</h2>
          <p className="mt-1 text-sm text-zinc-500">目標購入率2%、SNS→ストア遷移率1%を基準に判断します。</p>
        </div>
        {dashboard.dailyMetrics.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <BarChart3 className="mx-auto h-9 w-9 text-zinc-300" />
            <h3 className="mt-4 font-bold text-zinc-900">日次KPIはまだありません</h3>
            <p className="mt-2 text-sm text-zinc-500">ローンチ前は0値でも記録し、ベースラインを作成してください。</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left">
              <thead className="bg-zinc-50 text-xs font-semibold text-zinc-500"><tr><th className="px-4 py-3">日付</th><th className="px-4 py-3">再生</th><th className="px-4 py-3">訪問</th><th className="px-4 py-3">注文</th><th className="px-4 py-3">CVR</th><th className="px-4 py-3">売上</th></tr></thead>
              <tbody>{dashboard.dailyMetrics.map((metric) => <MetricRow key={metric.id} metric={metric} />)}</tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
