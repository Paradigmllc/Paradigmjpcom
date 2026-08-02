export default function ShopifyOpsLoading() {
  return (
    <main className="min-h-dvh bg-zinc-50 p-6 sm:p-10">
      <div className="mx-auto max-w-6xl animate-pulse space-y-6">
        <div className="h-14 rounded-2xl bg-zinc-200" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((item) => <div key={item} className="h-32 rounded-2xl bg-zinc-200" />)}
        </div>
        <div className="h-96 rounded-2xl bg-zinc-200" />
      </div>
    </main>
  )
}
