import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { verifyWebhookSecret } from "@/lib/sales/auth"
import { handleAgentCommand } from "@/lib/sales/agent-team"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 300

const DirectCommandSchema = z.object({
  text: z.string().optional(),
  message: z.string().optional(),
  chat_id: z.union([z.string(), z.number()]).optional(),
  username: z.string().optional(),
  source: z.string().optional(),
  autonomy_level: z.string().optional(),
  region: z.string().optional(),
  limit: z.number().int().optional(),
})

const TelegramUpdateSchema = z.object({
  message: z
    .object({
      text: z.string().optional(),
      chat: z.object({ id: z.union([z.string(), z.number()]).optional() }).optional(),
      from: z.object({ username: z.string().optional(), first_name: z.string().optional() }).optional(),
    })
    .optional(),
})

function extractCommand(body: unknown): {
  text: string
  chatId: string | null
  username: string | null
  source: string
  autonomyLevel: string | null
  region: string | null
  limit: number | null
} {
  const direct = DirectCommandSchema.safeParse(body)
  if (direct.success) {
    const text = direct.data.text ?? direct.data.message ?? ""
    return {
      text,
      chatId: direct.data.chat_id === undefined ? null : String(direct.data.chat_id),
      username: direct.data.username ?? null,
      source: direct.data.source ?? "telegram",
      autonomyLevel: direct.data.autonomy_level ?? null,
      region: direct.data.region ?? null,
      limit: direct.data.limit ?? null,
    }
  }

  const update = TelegramUpdateSchema.safeParse(body)
  if (update.success) {
    const from = update.data.message?.from
    return {
      text: update.data.message?.text ?? "",
      chatId: update.data.message?.chat?.id === undefined ? null : String(update.data.message.chat.id),
      username: from?.username ?? from?.first_name ?? null,
      source: "telegram",
      autonomyLevel: null,
      region: null,
      limit: null,
    }
  }

  return { text: "", chatId: null, username: null, source: "telegram", autonomyLevel: null, region: null, limit: null }
}

export async function POST(req: NextRequest) {
  const authErr = verifyWebhookSecret(req)
  if (authErr) return authErr

  let body: unknown
  try {
    body = await req.json()
  } catch (error) {
    console.error("[sales-agent-telegram] invalid JSON body:", error)
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 })
  }

  const command = extractCommand(body)
  if (!command.text.trim()) {
    return NextResponse.json({ ok: false, error: "Command text is required" }, { status: 400 })
  }

  const result = await handleAgentCommand({
    text: command.text,
    chatId: command.chatId,
    username: command.username,
    source: command.source,
    autonomyLevel: command.autonomyLevel,
    region: command.region,
    limit: command.limit,
  })

  return NextResponse.json(result, { status: result.ok ? 200 : 207 })
}
