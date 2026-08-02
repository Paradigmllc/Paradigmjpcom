import { ExternalLink, PackageOpen } from "lucide-react"
import { PRODUCT_STATUSES } from "@/lib/shopify-ops/types"
import type { ShopifyOpsProduct } from "@/lib/shopify-ops/types"
import { PRODUCT_STATUS_LABELS, PRODUCT_TIER_LABELS } from "@/lib/shopify-ops/labels"
type Action = (formData: FormData) => Promise<void>

export function ShopifyProductsPanel({ products, locale, submit }: { products: ShopifyOpsProduct[]; locale: string; submit: Action }) {
  if (products.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-12 text-center">
        <PackageOpen className="mx-auto h-8 w-8 text-zinc-300" />
        <h2 className="mt-4 text-base font-bold text-zinc-900">商品候補がありません</h2>
        <p className="mt-2 text-sm text-zinc-500">初期商品シードのDB適用状況を確認してください。</p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
      <div className="border-b border-zinc-100 px-5 py-4 sm:px-6">
        <h2 className="text-lg font-bold text-zinc-950">商品パイプライン</h2>
        <p className="mt-1 text-sm text-zinc-500">Hero商品を5〜8点に絞り、素材と商品ページが揃ったものだけ公開します。</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1050px] text-left text-sm">
          <thead className="bg-zinc-50 text-xs text-zinc-500">
            <tr>
              <th className="px-5 py-3 font-semibold">商品</th>
              <th className="px-4 py-3 font-semibold">採算</th>
              <th className="px-4 py-3 font-semibold">動画素材</th>
              <th className="px-4 py-3 font-semibold">写真</th>
              <th className="px-4 py-3 font-semibold">在庫</th>
              <th className="px-4 py-3 font-semibold">状態</th>
              <th className="px-5 py-3 font-semibold">更新</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {products.map((product) => (
              <tr key={product.id} className="align-top hover:bg-zinc-50/70">
                <td className="px-5 py-4">
                  <div className="flex items-start gap-3">
                    <span className={`rounded-md px-2 py-1 text-[10px] font-black ${product.tier === "s_plus" ? "bg-violet-100 text-violet-700" : "bg-zinc-100 text-zinc-600"}`}>{PRODUCT_TIER_LABELS[product.tier]}</span>
                    <div className="min-w-0">
                      <p className="max-w-64 truncate font-semibold text-zinc-900">{product.name}</p>
                      <p className="mt-1 text-xs text-zinc-500">{product.sku} · {product.category}</p>
                      {product.isHero && <span className="mt-2 inline-block rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">Hero</span>}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <p className="font-bold text-zinc-900">${product.priceUsd}</p>
                  <p className={`mt-1 text-xs font-semibold ${product.estimatedMarginPercent >= 60 ? "text-emerald-600" : "text-amber-600"}`}>{product.estimatedMarginPercent}%</p>
                </td>
                <td className="px-4 py-4 text-zinc-600">{product.clipReady}/{product.clipTarget}</td>
                <td className="px-4 py-4 text-zinc-600">{product.photoReady}/{product.photoTarget}</td>
                <td className="px-4 py-4 text-zinc-600">{product.inventoryOnHand}</td>
                <td className="px-4 py-4"><span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-700">{PRODUCT_STATUS_LABELS[product.status]}</span></td>
                <td className="px-5 py-4">
                  <form action={submit} className="grid min-w-72 grid-cols-4 gap-2">
                    <input type="hidden" name="id" value={product.id} />
                    <input type="hidden" name="locale" value={locale} />
                    <select name="status" defaultValue={product.status} aria-label={`${product.name}の状態`} className="col-span-2 rounded-lg border border-zinc-200 bg-white px-2 py-2 text-xs">
                      {PRODUCT_STATUSES.map((status) => <option key={status} value={status}>{PRODUCT_STATUS_LABELS[status]}</option>)}
                    </select>
                    <input name="inventoryOnHand" type="number" min="0" defaultValue={product.inventoryOnHand} aria-label={`${product.name}の在庫`} className="rounded-lg border border-zinc-200 px-2 py-2 text-xs" />
                    <input name="clipReady" type="number" min="0" max={product.clipTarget} defaultValue={product.clipReady} aria-label={`${product.name}の完成動画素材数`} className="rounded-lg border border-zinc-200 px-2 py-2 text-xs" />
                    <input name="photoReady" type="number" min="0" max={product.photoTarget} defaultValue={product.photoReady} aria-label={`${product.name}の完成写真数`} className="rounded-lg border border-zinc-200 px-2 py-2 text-xs" />
                    <input name="shopifyHandle" defaultValue={product.shopifyHandle ?? ""} placeholder="Shopify handle" aria-label={`${product.name}のShopifyハンドル`} className="col-span-2 rounded-lg border border-zinc-200 px-2 py-2 text-xs" />
                    <button type="submit" className="col-span-2 rounded-lg bg-zinc-900 px-3 py-2 text-xs font-bold text-white hover:bg-zinc-700">保存</button>
                    {product.shopifyHandle && product.shopifyHandle.startsWith("http") && (
                      <a href={product.shopifyHandle} target="_blank" rel="noopener noreferrer" className="col-span-2 inline-flex items-center justify-center gap-1 text-xs font-semibold text-violet-600">商品を見る <ExternalLink className="h-3 w-3" /></a>
                    )}
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
