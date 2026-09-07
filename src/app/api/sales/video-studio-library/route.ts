import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { authorizeSalesApiRequest } from "@/lib/sales/api-auth"
import { notifyBothChannels } from "@/lib/notify"
import { librarySaveSchema } from "@/lib/video-studio-control/library"
import { getLibraryVersion, LibraryConflict, listLibraryVersions, saveLibraryVersion } from "@/lib/video-studio-control/library-repository"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
const writeRoles = ["admin", "commercial_lead", "delivery"]
const readRoles = [...writeRoles, "viewer", "finance", "legal"]
const querySchema = z.object({
  offset: z.coerce.number().int().min(0).max(100000).default(0), entryId: z.string().uuid().optional(), versionId: z.string().uuid().optional(),
}).strict()
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } })

async function readBody(req: NextRequest): Promise<string | null> {
  if (Number(req.headers.get("content-length")) > 32768) return null
  const reader = req.body?.getReader()
  if (!reader) return ""
  const decoder = new TextDecoder()
  let size = 0
  let text = ""
  try {
    for (;;) {
      const chunk = await reader.read()
      if (chunk.done) return text + decoder.decode()
      size += chunk.value.byteLength
      if (size > 32768) { await reader.cancel(); return null }
      text += decoder.decode(chunk.value, { stream: true })
    }
  } finally { reader.releaseLock() }
}

export async function GET(req: NextRequest) {
  const auth = await authorizeSalesApiRequest(req)
  if (!auth.ok) return json({ ok: false, error: "ログインが必要です" }, 401)
  if (!readRoles.includes(auth.principal.role)) return json({ ok: false, error: "閲覧権限がありません" }, 403)
  const parsed = querySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams))
  if (!parsed.success) return json({ ok: false, error: "一覧の条件が不正です" }, 400)
  try {
    if (parsed.data.versionId) {
      const version = await getLibraryVersion(auth.principal, parsed.data.versionId)
      return version ? json({ ok: true, version }) : json({ ok: false, error: "この版は見つかりません" }, 404)
    }
    return json({ ok: true, ...await listLibraryVersions(auth.principal, parsed.data.offset, parsed.data.entryId), canWrite: writeRoles.includes(auth.principal.role) })
  } catch (error) {
    console.error("[video-studio-library] read failed", error instanceof Error ? error.name : "unknown")
    return json({ ok: false, error: "ライブラリを読み込めませんでした" }, 503)
  }
}

export async function POST(req: NextRequest) {
  const auth = await authorizeSalesApiRequest(req)
  if (!auth.ok) return json({ ok: false, error: "ログインが必要です" }, 401)
  if (!writeRoles.includes(auth.principal.role)) return json({ ok: false, error: "保存権限がありません" }, 403)
  try {
    const raw = await readBody(req)
    if (raw === null) return json({ ok: false, error: "登録内容が大きすぎます" }, 413)
    const parsed = librarySaveSchema.safeParse(JSON.parse(raw))
    if (!parsed.success) return json({ ok: false, error: "登録項目を確認してください", fields: parsed.error.flatten() }, 400)
    const result = await saveLibraryVersion(parsed.data, auth.principal)
    // The common notifier does not deduplicate DB/webhook messages. Never resend on replay.
    const notification = result.replay ? null : await notifyBothChannels("Video Studioライブラリの版を保存しました。", {
      title: "制作ライブラリを保存", message: "未検証の制作条件を保存しました。生成・品質合格・納品承認は行っていません。",
      link: `/ja/admin/video-studio-control?libraryVersion=${result.version.operationId}#library`,
      type: "video_studio_library_saved", region: "global", priority: 60,
      idempotencyKey: `video-studio-library:${result.version.operationId}`,
      clientMessageId: result.version.operationId,
    })
    if (notification && !notification.ok) console.error("[video-studio-library] notification degraded")
    return json({ ok: true, ...result, notificationOk: notification?.ok ?? null }, result.replay ? 200 : 201)
  } catch (error) {
    console.error("[video-studio-library] save failed", error instanceof Error ? error.name : "unknown")
    if (error instanceof SyntaxError) return json({ ok: false, error: "JSONの形式が不正です" }, 400)
    if (error instanceof LibraryConflict) return json({ ok: false, error: error.message }, 409)
    return json({ ok: false, error: "保存結果を確認できません。同じ内容・保存IDで再試行できます" }, 503)
  }
}
