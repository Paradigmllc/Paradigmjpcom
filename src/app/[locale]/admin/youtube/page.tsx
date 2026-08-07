import Link from "next/link"
import { cookies, headers } from "next/headers"
import { authorizePayloadAdminRequest } from "@/lib/admin-auth"
import { ReviewClient } from "@/components/youtube/ReviewClient"
import { listReviewVideos } from "@/lib/youtube/review/store"

export const dynamic = "force-dynamic"

export default async function YoutubeReviewPage() {
  const cookieStore = await cookies()
  const requestHeaders = await headers()
  const auth = await authorizePayloadAdminRequest({
    headers: new Headers(requestHeaders),
    legacyToken: cookieStore.get("paradigm_admin_token")?.value,
  })

  if (!auth.ok) {
    return (
      <main className="grid min-h-screen place-items-center bg-zinc-100">
        <div className="text-center">
          <p>管理者認証が必要です。</p>
          <Link href="/admin" className="mt-4 inline-block rounded-xl bg-zinc-950 px-4 py-2 text-white">
            管理画面へ
          </Link>
        </div>
      </main>
    )
  }

  const result = await listReviewVideos({ limit: 50 })
  if (!result.ok) {
    return (
      <main className="grid min-h-screen place-items-center bg-zinc-100 px-6">
        <div className="max-w-lg text-center">
          <p className="font-semibold">審査対象を読み込めませんでした。</p>
          <p className="mt-2 text-sm text-zinc-600">{result.error}</p>
        </div>
      </main>
    )
  }

  return <ReviewClient initialVideos={result.data ?? []} />
}
