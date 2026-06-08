export default function ReportLoading() {
  return (
    <div className="min-h-screen bg-[#fbfaf7] flex items-center justify-center">
      <div className="animate-pulse space-y-6 w-full max-w-2xl px-8">
        <div className="h-4 bg-zinc-200 rounded w-1/3" />
        <div className="h-8 bg-zinc-200 rounded w-2/3" />
        <div className="h-4 bg-zinc-200 rounded w-1/2" />
        <div className="h-48 bg-zinc-200 rounded" />
        <div className="h-4 bg-zinc-200 rounded w-3/4" />
        <div className="h-4 bg-zinc-200 rounded w-1/3" />
      </div>
    </div>
  )
}
