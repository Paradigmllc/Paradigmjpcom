import { CheckCircle2, CircleAlert, CircleX, SearchCheck } from "lucide-react"
import { manualFormDiscoveryPresentation } from "@/lib/sales/manual-form-discovery-status"
import type { ManualJapanEntryWorkRow } from "@/lib/sales/manual-japan-entry-types"

function formatCheckedAt(value: string | null): string | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return new Intl.DateTimeFormat("ja-JP", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Tokyo",
  }).format(date)
}

export function ManualFormDiscoveryStatus({ item }: { item: ManualJapanEntryWorkRow }) {
  const presentation = manualFormDiscoveryPresentation({
    formUrl: item.form_url,
    formDiscovery: item.form_discovery,
  })
  const checkedAt = formatCheckedAt(presentation.checkedAt)
  const verified = presentation.state === "verified_form"
  const terminalMissing = presentation.state === "contact_page_only" || presentation.state === "no_public_form"
  const Icon = verified ? CheckCircle2 : terminalMissing ? CircleX : CircleAlert
  const colors = verified
    ? "border-emerald-200 bg-emerald-50 text-emerald-950"
    : terminalMissing
      ? "border-slate-200 bg-slate-50 text-slate-800"
      : "border-amber-200 bg-amber-50 text-amber-950"

  return (
    <section className={`mt-5 rounded-xl border p-4 ${colors}`} aria-label="問い合わせフォーム探索結果">
      <div className="flex flex-wrap items-center gap-2">
        <Icon className="size-4 shrink-0" aria-hidden="true" />
        <p className="text-sm font-semibold">{presentation.label}</p>
        <span className="ml-auto inline-flex items-center gap-1 text-[11px] font-medium opacity-75">
          <SearchCheck className="size-3.5" aria-hidden="true" />
          探索 {item.attempts}回
          {presentation.checkedUrlCount !== null ? ` · ${presentation.checkedUrlCount} URL確認` : ""}
        </span>
      </div>
      <p className="mt-2 text-xs leading-5 opacity-85">{presentation.detail}</p>
      {checkedAt && <p className="mt-2 text-[11px] opacity-65">最終探索: {checkedAt}</p>}
      {terminalMissing && <p className="mt-2 text-[11px] font-medium opacity-75">存在しないURLは補完せず、Twenty同期を停止しています。</p>}
    </section>
  )
}
