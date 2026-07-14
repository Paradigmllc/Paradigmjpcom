"use client"

import { useEffect, useState } from "react"
import { ExternalLink, Info, Laptop, Monitor, Smartphone, X } from "lucide-react"

const DEVICES = {
  desktop: { label: "PC", width: "100%", icon: Monitor },
  tablet: { label: "タブレット", width: "820px", icon: Laptop },
  mobile: { label: "モバイル", width: "390px", icon: Smartphone },
} as const

type Device = keyof typeof DEVICES
type Environment = "checking" | "framed" | "top"

export function demoPreviewNotice(expiresAt?: string): string {
  if (!expiresAt) return "提案用デモです。検索エンジンには登録されず、正式公開前の内容です。"
  const expiry = new Date(expiresAt)
  const label = Number.isNaN(expiry.getTime()) ? "7日以内" : expiry.toLocaleDateString("ja-JP")
  return `現在一般公開・検索登録されておらず、この閲覧URLは${label}に失効します。`
}

export function DemoPreviewToolbar({
  companyName,
  expiresAt,
  children,
}: {
  companyName: string
  expiresAt?: string
  children: React.ReactNode
}) {
  const [environment, setEnvironment] = useState<Environment>("checking")
  const [device, setDevice] = useState<Device>("desktop")
  const [frameSrc, setFrameSrc] = useState("")
  const [fullscreenSrc, setFullscreenSrc] = useState("")
  const [toolbarClosed, setToolbarClosed] = useState(false)
  const [noticeVisible, setNoticeVisible] = useState(true)

  useEffect(() => {
    if (window.self !== window.top) {
      setEnvironment("framed")
      return
    }
    const url = new URL(window.location.href)
    if (url.searchParams.get("__demo_full") === "1") {
      setEnvironment("framed")
      return
    }
    const fullscreenUrl = new URL(url)
    fullscreenUrl.searchParams.delete("__demo_frame")
    fullscreenUrl.searchParams.set("__demo_full", "1")
    url.searchParams.set("__demo_frame", "1")
    setFrameSrc(`${url.pathname}${url.search}${url.hash}`)
    setFullscreenSrc(`${fullscreenUrl.pathname}${fullscreenUrl.search}${fullscreenUrl.hash}`)
    setEnvironment("top")
  }, [])

  if (environment !== "top" || toolbarClosed || !frameSrc) return children

  const active = DEVICES[device]
  return (
    <div className="flex h-dvh min-h-[520px] flex-col overflow-hidden bg-slate-200 text-slate-950" data-demo-preview-toolbar>
      <header className="relative z-[100] shrink-0 border-b border-slate-300 bg-white shadow-[0_1px_12px_rgba(15,23,42,.08)]">
        <div className="mx-auto flex min-h-14 max-w-[1600px] items-center gap-3 px-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-2 sm:w-56">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-950 text-[10px] font-black tracking-[.08em] text-white">P</span>
            <div className="min-w-0">
              <p className="truncate text-xs font-bold sm:text-sm">{companyName}</p>
              <p className="hidden text-[10px] font-semibold uppercase tracking-[.16em] text-slate-400 sm:block">Website preview</p>
            </div>
          </div>

          <div className="mx-auto flex rounded-xl border border-slate-200 bg-slate-50 p-1" role="group" aria-label="プレビュー端末を切り替える">
            {(Object.entries(DEVICES) as Array<[Device, (typeof DEVICES)[Device]]>).map(([key, item]) => {
              const Icon = item.icon
              const selected = key === device
              return <button key={key} type="button" aria-label={`${item.label}表示`} aria-pressed={selected} onClick={() => setDevice(key)} className={`grid h-9 min-w-10 place-items-center rounded-lg px-2 transition sm:min-w-11 ${selected ? "bg-white text-slate-950 shadow-sm ring-1 ring-slate-200" : "text-slate-400 hover:text-slate-700"}`} title={`${item.label}表示`}><Icon className="h-4 w-4" /></button>
            })}
          </div>

          <div className="flex items-center gap-1 sm:w-56 sm:justify-end">
            <button type="button" aria-label={noticeVisible ? "注意事項を閉じる" : "注意事項を表示する"} onClick={() => setNoticeVisible((value) => !value)} className="grid h-10 w-10 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-950" title={noticeVisible ? "注意事項を閉じる" : "注意事項を表示する"}><Info className="h-4 w-4" /></button>
            <a href={fullscreenSrc} target="_blank" rel="noopener noreferrer" aria-label="全画面で開く" className="hidden h-10 w-10 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 sm:grid" title="全画面で開く"><ExternalLink className="h-4 w-4" /></a>
            <button type="button" aria-label="プレビューバーを閉じる" onClick={() => setToolbarClosed(true)} className="grid h-10 w-10 place-items-center rounded-lg text-slate-500 transition hover:bg-red-50 hover:text-red-700" title="プレビューバーを閉じる"><X className="h-5 w-5" /></button>
          </div>
        </div>
        {noticeVisible && <div className="border-t border-amber-200 bg-amber-50 px-4 py-2 text-center text-[11px] font-semibold leading-5 text-amber-950 sm:text-xs"><span aria-hidden="true">⚠️ </span>{demoPreviewNotice(expiresAt)} ご安心ください。</div>}
      </header>

      <div className="flex min-h-0 flex-1 justify-center overflow-hidden px-0 sm:px-3 sm:pb-3">
        <div className="h-full overflow-hidden bg-white shadow-2xl transition-[width] duration-300 ease-out sm:rounded-b-xl" style={{ width: active.width, maxWidth: "100%" }}>
          <iframe src={frameSrc} title={`${companyName} ${active.label}プレビュー`} className="h-full w-full border-0 bg-white" />
        </div>
      </div>
    </div>
  )
}
