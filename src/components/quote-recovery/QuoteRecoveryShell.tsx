import type { ReactNode } from "react"
import Link from "next/link"
import { Gauge, LockKeyhole } from "lucide-react"
import { QuoteRecoveryContractLink } from "@/components/quote-recovery/QuoteRecoveryContractLink"

type Props = {
  children: ReactNode
  compact?: boolean
}

export function QuoteRecoveryShell({ children, compact = false }: Props) {
  return (
    <div className="min-h-dvh bg-white text-slate-950">
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur">
        <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-4 px-5 sm:px-8">
          <Link href="/ja/quote-recovery" className="flex items-center gap-2.5 font-bold tracking-tight" aria-label="Quote Recoveryトップ">
            <span className="flex size-9 items-center justify-center rounded-xl bg-violet-600 text-white"><Gauge className="size-5" aria-hidden="true" /></span>
            <span>Quote Recovery</span>
          </Link>
          {!compact && (
            <nav className="hidden items-center gap-6 text-sm font-semibold text-slate-600 md:flex" aria-label="Quote Recoveryページ内メニュー">
              <a href="#product" className="hover:text-violet-700">機能</a>
              <a href="#workflow" className="hover:text-violet-700">導入方法</a>
              <a href="#security" className="hover:text-violet-700">セキュリティ</a>
              <a href="#pricing" className="hover:text-violet-700">料金</a>
              <a href="#faq" className="hover:text-violet-700">FAQ</a>
            </nav>
          )}
          <div className="flex items-center gap-2">
            <Link href="/ja/quote-recovery/login" className="hidden min-h-10 items-center justify-center rounded-xl px-3 text-sm font-bold text-slate-700 hover:bg-slate-100 sm:inline-flex">ログイン</Link>
            <QuoteRecoveryContractLink className="inline-flex min-h-10 items-center justify-center rounded-xl bg-violet-600 px-4 text-sm font-bold text-white hover:bg-violet-700">契約を開始</QuoteRecoveryContractLink>
          </div>
        </div>
      </header>
      {children}
      <footer className="border-t border-slate-200 bg-slate-950 px-5 py-10 text-slate-300 sm:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 sm:grid-cols-[1fr_auto] sm:items-end">
          <div>
            <div className="flex items-center gap-2 font-bold text-white"><LockKeyhole className="size-4 text-violet-300" aria-hidden="true" />Quote Recovery</div>
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-400">製造業・機械商社の見積フォローを、既存CSVから始められる回収優先度管理SaaSです。</p>
            <p className="mt-4 text-xs text-slate-500">運営：Paradigm合同会社</p>
          </div>
          <nav className="flex flex-wrap gap-x-5 gap-y-3 text-xs" aria-label="法務・サポート">
            <Link href="/ja/privacy" className="hover:text-white">プライバシーポリシー</Link>
            <Link href="/ja/terms" className="hover:text-white">利用規約</Link>
            <Link href="/ja/tokushoho" className="hover:text-white">特定商取引法</Link>
            <Link href="/ja/contact" className="hover:text-white">お問い合わせ</Link>
          </nav>
        </div>
      </footer>
    </div>
  )
}
