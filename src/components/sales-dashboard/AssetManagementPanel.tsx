"use client"

import { useState } from "react"
import { ExternalLink, FileVideo, Globe, Layers, Monitor, Play } from "lucide-react"
import type { SalesDashboardData } from "@/lib/sales/dashboard"

export function AssetManagementPanel({ data }: { data: SalesDashboardData }) {
  const [activeTab, setActiveTab] = useState<"demos" | "videos" | "storage">("demos")

  return (
    <div className="space-y-4 p-4">
      {/* Tab bar */}
      <div className="flex items-center gap-1 border-b border-zinc-200">
        {[
          { id: "demos" as const, label: "Webデモサイト", icon: Globe },
          { id: "videos" as const, label: "動画アセット", icon: FileVideo },
          { id: "storage" as const, label: "ストレージ (R2)", icon: Layers },
        ].map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-colors ${activeTab === tab.id ? "border-zinc-900 text-zinc-900" : "border-transparent text-zinc-500 hover:text-zinc-700"}`}>
            <tab.icon className="h-3.5 w-3.5" />{tab.label}
          </button>
        ))}
      </div>

      {activeTab === "demos" && <DemosTab data={data} />}
      {activeTab === "videos" && <VideosTab data={data} />}
      {activeTab === "storage" && <StorageTab data={data} />}
    </div>
  )
}

function DemosTab({ data }: { data: SalesDashboardData }) {
  const companiesWithDemo = data.companies.filter(c => c.reportUrl || c.pipelineStatus === "report_ready").slice(0, 20)
  
  return (
    <div className="space-y-4">
      {/* Quick links */}
      <div className="grid gap-2 sm:grid-cols-3">
        <a href="https://keystatic.paradigmjp.com" target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white p-4 hover:border-zinc-400 transition-colors">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
            <Globe className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-zinc-900">Keystatic CMS</div>
            <div className="text-[10px] text-zinc-500">手動デモサイト編集</div>
          </div>
          <ExternalLink className="ml-auto h-3 w-3 text-zinc-400" />
        </a>
        <a href="https://keystatic.paradigmjp.com/keystatic" target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white p-4 hover:border-zinc-400 transition-colors">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
            <Monitor className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-zinc-900">Keystatic Dashboard</div>
            <div className="text-[10px] text-zinc-500">コンテンツ管理画面</div>
          </div>
          <ExternalLink className="ml-auto h-3 w-3 text-zinc-400" />
        </a>
        <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white p-4 hover:border-zinc-400 transition-colors">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-zinc-900">Supabase web_demos</div>
            <div className="text-[10px] text-zinc-500">自動生成デモ管理</div>
          </div>
          <ExternalLink className="ml-auto h-3 w-3 text-zinc-400" />
        </a>
      </div>

      {/* Demo URLs per company */}
      <div className="rounded-lg border border-zinc-200 bg-white">
        <div className="border-b border-zinc-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-zinc-950">企業別デモサイト</h2>
          <p className="mt-1 text-xs text-zinc-500">自動生成デモのURL一覧（Astroデモ /d/{'{slug}'}-demo）</p>
        </div>
        <div className="max-h-[500px] overflow-y-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 text-zinc-500 sticky top-0">
              <tr>
                <th className="px-4 py-2 font-medium">企業</th>
                <th className="px-4 py-2 font-medium">デモURL</th>
                <th className="px-4 py-2 font-medium">ステータス</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {companiesWithDemo.map((c) => {
                const demoUrl = c.reportUrl ? c.reportUrl.replace(/\/report\//, "/d/") + "-demo" : null
                return (
                  <tr key={c.id} className="hover:bg-zinc-50">
                    <td className="px-4 py-2 font-medium text-zinc-900">{c.companyName}</td>
                    <td className="px-4 py-2">
                      {demoUrl ? (
                        <a href={demoUrl} target="_blank" rel="noopener noreferrer" className="text-violet-600 hover:underline font-mono text-[10px]">
                          {demoUrl.replace("https://paradigmjp.com", "")} <ExternalLink className="inline h-2.5 w-2.5" />
                        </a>
                      ) : (
                        <span className="text-zinc-400">未生成</span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <span className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-bold ${c.pipelineStatus === "report_ready" ? "bg-emerald-50 text-emerald-700" : "bg-zinc-100 text-zinc-500"}`}>
                        {c.pipelineStatus === "report_ready" ? "生成済み" : "準備中"}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function VideosTab({ data }: { data: SalesDashboardData }) {
  const videoJobs = data.videoPipeline?.jobs ?? []
  const hyperframesReady = data.toolConnections.some(t => (t.slug as string) === "hyperframes_renderer" && t.status === "active")

  return (
    <div className="space-y-4">
      {/* Status */}
      <div className="grid gap-2 sm:grid-cols-3">
        <StatCard label="HyperFrames" value={hyperframesReady ? "稼働中" : "停止"} color={hyperframesReady ? "emerald" : "rose"} />
        <StatCard label="動画ジョブ総数" value={`${videoJobs.length}件`} color="zinc" />
        <StatCard label="完了" value={`${videoJobs.filter(j => j.status === "completed").length}件`} color="emerald" />
      </div>

      {/* Video management links */}
      <div className="grid gap-2 sm:grid-cols-2">
        <a href="https://hyperframes.paradigmjp.com/health" target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white p-4 hover:border-zinc-400 transition-colors">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
            <Play className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-zinc-900">HyperFrames OSS</div>
            <div className="text-[10px] text-zinc-500">レンダリングサーバー状態</div>
          </div>
          <ExternalLink className="ml-auto h-3 w-3 text-zinc-400" />
        </a>
      </div>

      {/* Recent video jobs */}
      {videoJobs.length > 0 && (
        <div className="rounded-lg border border-zinc-200 bg-white">
          <div className="border-b border-zinc-100 px-4 py-3">
            <h2 className="text-sm font-semibold text-zinc-950">最近の動画ジョブ</h2>
          </div>
          <div className="max-h-[400px] overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 text-zinc-500 sticky top-0">
                <tr>
                  <th className="px-4 py-2 font-medium">企業</th>
                  <th className="px-4 py-2 font-medium">ステータス</th>
                  <th className="px-4 py-2 font-medium">エンジン</th>
                  <th className="px-4 py-2 font-medium">プレビュー</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {videoJobs.slice(0, 15).map((job: any) => (
                  <tr key={job.id} className="hover:bg-zinc-50">
                    <td className="px-4 py-2 font-medium text-zinc-900">{job.sales_companies?.company_name ?? job.company_id?.slice(0,8) ?? "-"}</td>
                    <td className="px-4 py-2">
                      <span className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-bold ${
                        job.status === "completed" ? "bg-emerald-50 text-emerald-700" :
                        job.status === "failed" ? "bg-rose-50 text-rose-700" :
                        job.status === "rendering" ? "bg-amber-50 text-amber-700" :
                        "bg-zinc-100 text-zinc-500"
                      }`}>{job.status}</span>
                    </td>
                    <td className="px-4 py-2 text-zinc-500">{job.render_engine ?? "-"}</td>
                    <td className="px-4 py-2">
                      {job.preview_url ? (
                        <a href={job.preview_url} target="_blank" rel="noopener noreferrer" className="text-violet-600 hover:underline">開く</a>
                      ) : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function StorageTab({ data }: { data: SalesDashboardData }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-3">
        <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white p-4 hover:border-zinc-400 transition-colors">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600"><Layers className="h-5 w-5" /></div>
          <div><div className="text-xs font-bold text-zinc-900">Supabase</div><div className="text-[10px] text-zinc-500">DB + Storage</div></div>
          <ExternalLink className="ml-auto h-3 w-3 text-zinc-400" />
        </a>
        <div className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-amber-500"><Layers className="h-5 w-5" /></div>
          <div><div className="text-xs font-bold text-zinc-900">R2 (Cloudflare)</div><div className="text-[10px] text-zinc-500">動画・アセット配信</div></div>
        </div>
        <div className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-50 text-zinc-600"><Layers className="h-5 w-5" /></div>
          <div><div className="text-xs font-bold text-zinc-900">GitHub (Keystatic)</div><div className="text-[10px] text-zinc-500">デモサイトコード</div></div>
        </div>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-6">
        <h2 className="text-sm font-semibold text-zinc-950 mb-4">ストレージ構成</h2>
        <div className="grid gap-3 text-xs">
          {[
            { label: "Supabase DB", desc: "全営業データ（companies, templates, jobs, logs）", icon: "🗄️" },
            { label: "Supabase Storage", desc: "診断レポートPDF、スクリーンショット", icon: "📁" },
            { label: "Cloudflare R2", desc: "動画MP4、大容量アセット配信", icon: "☁️" },
            { label: "GitHub (Keystatic)", desc: "AstroデモサイトのMarkdown/MDXコンテンツ", icon: "📝" },
            { label: "HyperFrames Work Dir", desc: "レンダリング作業用一時ファイル (Droplet /data)", icon: "⚙️" },
          ].map((item) => (
            <div key={item.label} className="flex items-start gap-3 rounded-lg border border-zinc-100 p-3">
              <span className="text-lg">{item.icon}</span>
              <div>
                <div className="font-bold text-zinc-900">{item.label}</div>
                <div className="text-zinc-500">{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  const colors: Record<string, string> = {
    emerald: "bg-emerald-50 border-emerald-200 text-emerald-800",
    rose: "bg-rose-50 border-rose-200 text-rose-800",
    zinc: "bg-zinc-50 border-zinc-200 text-zinc-700",
  }
  return (
    <div className={`rounded-lg border p-3 ${colors[color] ?? colors.zinc}`}>
      <div className="text-[10px] font-semibold uppercase opacity-70">{label}</div>
      <div className="mt-1 text-lg font-bold">{value}</div>
    </div>
  )
}
