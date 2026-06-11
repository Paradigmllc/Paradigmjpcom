"use client"

import { useState } from "react"
import { ExternalLink } from "lucide-react"
import type { SalesDashboardData } from "@/lib/sales/dashboard"

export function TemplateManagementPanel({ data }: { data: SalesDashboardData }) {
  const [previewLang, setPreviewLang] = useState<"ja" | "en">("ja")
  return (
    <div className="space-y-4 p-4">
      <div className="rounded-lg border border-zinc-200 bg-white">
        <div className="border-b border-zinc-100 p-4 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-zinc-950">テンプレート管理</h2>
            <p className="mt-1 text-xs text-zinc-500">
              全7バリアント × 2言語の診断レポートテンプレートを確認・編集できます。
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select value={previewLang} onChange={(e) => setPreviewLang(e.target.value as "ja" | "en")}
              className="h-9 rounded-md border border-zinc-200 bg-white px-2 text-xs font-medium text-zinc-700 outline-none focus:border-zinc-500">
              <option value="ja">日本語 (JA)</option>
              <option value="en">English (EN)</option>
            </select>
            <a href={`/${previewLang}/report/template-preview`} target="_blank" rel="noopener noreferrer"
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-zinc-950 px-4 text-xs font-bold text-white hover:bg-zinc-800">
              <ExternalLink className="h-3.5 w-3.5" />
              新規タブで開く
            </a>
          </div>
        </div>
        <div className="p-4">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { variant: "website_diagnostic", label: "Web制作診断", desc: "速度・OGP・技術スタック" },
              { variant: "meo", label: "MEO診断", desc: "Googleマップ・口コミ" },
              { variant: "security", label: "セキュリティ診断", desc: "SSL・脆弱性・証明書" },
              { variant: "japan_entry", label: "日本参入診断", desc: "法規制・決済・ロードマップ" },
              { variant: "video_subscription", label: "動画診断", desc: "制作・配信・エンゲージメント" },
              { variant: "subsidy", label: "補助金診断", desc: "マッチング・申請計画" },
              { variant: "outreach", label: "アウトリーチ診断", desc: "フォーム・ファネル" },
              { variant: "dx_ai_package", label: "DX・AI導入診断", desc: "自動化・コスト削減・DX" },
            ].map((v) => (
              <a key={v.variant} href={`/${previewLang}/report/demo/${v.variant}`} target="_blank" rel="noopener noreferrer"
                className="rounded-lg border border-zinc-200 p-4 hover:border-zinc-400 hover:shadow-sm transition-all">
                <div className="text-xs font-bold text-zinc-900">{v.label}</div>
                <div className="mt-1 text-[10px] text-zinc-500">{v.desc}</div>
                <div className="mt-2">
                  <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[9px] font-bold text-zinc-600">{v.variant}</span>
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>
      <div className="rounded-lg border border-zinc-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-zinc-950">Dify / DeepSeek ステータス</h2>
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
          {(() => {
            const checks = [
              { label: "Dify Cloud API", check: data.integrationStatus.find(i => i.slug === "dify_cloud")?.status === "ready" },
              { label: "カルテ→レポート", check: data.integrationStatus.find(i => i.slug === "dify_karte_to_report")?.status === "ready" },
              { label: "フォーム文面生成", check: data.integrationStatus.find(i => i.slug === "dify_form_message")?.status === "ready" },
              { label: "DeepSeek", check: !!process.env.DEEPSEEK_API_KEY || data.integrationStatus.some(i => i.slug.includes("deepseek") && i.status === "ready") },
            ]
            return checks.map((item) => (
              <div key={item.label} className={`rounded-md border p-2.5 ${item.check ? "border-emerald-200 bg-emerald-50" : "border-zinc-200 bg-zinc-50"}`}>
                <div className="font-medium text-zinc-700">{item.label}</div>
                <div className={`mt-1 text-[10px] font-bold ${item.check ? "text-emerald-700" : "text-zinc-500"}`}>
                  {item.check ? "接続済み" : "未確認"}
                </div>
              </div>
            ))
          })()}
        </div>
        <p className="mt-3 text-[10px] text-zinc-400">
          Difyプロンプトは「AIプロンプト」タブで編集できます。変更は即座に診断レポートに反映されます。
        </p>
      </div>
    </div>
  )
}
