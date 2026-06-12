import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { verifyWebhookSecret } from "@/lib/sales/auth"
import { handleAgentCommand } from "@/lib/sales/agent-team"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 300

function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return diff === 0
}

function verifyTelegramWebhook(req: NextRequest): NextResponse | null {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET
  if (!secret) {
    return NextResponse.json(
      { ok: false, error: "TELEGRAM_WEBHOOK_SECRET not configured" },
      { status: 503 },
    )
  }
  const received = req.headers.get("x-telegram-bot-api-secret-token") ?? ""
  if (!safeCompare(received, secret)) {
    return NextResponse.json(
      { ok: false, error: "Invalid Telegram webhook secret" },
      { status: 401 },
    )
  }
  return null
}

const DirectCommandSchema = z.object({
  text: z.string().optional(),
  message: z.string().optional(),
  chat_id: z.union([z.string(), z.number()]).optional(),
  user_id: z.union([z.string(), z.number()]).optional(),
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
      from: z
        .object({
          id: z.union([z.string(), z.number()]).optional(),
          username: z.string().optional(),
          first_name: z.string().optional(),
        })
        .optional(),
    })
    .optional(),
})

async function sendTelegramReply(chatId: string | null, text: string): Promise<{ ok: boolean; error?: string }> {
  if (!chatId) return { ok: false, error: "Telegram chat id missing" }

  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) {
    console.error("[sales-agent-telegram] TELEGRAM_BOT_TOKEN not configured; reply skipped")
    return { ok: false, error: "TELEGRAM_BOT_TOKEN not configured" }
  }

  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: text.slice(0, 3900),
      disable_web_page_preview: true,
    }),
  })

  const payload = (await response.json().catch((error: unknown) => {
    console.error("[sales-agent-telegram] failed to parse Telegram sendMessage response:", error)
    return null
  })) as { ok?: boolean; description?: string } | null

  if (!response.ok || payload?.ok !== true) {
    const error = payload?.description ?? `Telegram sendMessage HTTP ${response.status}`
    console.error("[sales-agent-telegram] sendMessage failed:", error)
    return { ok: false, error }
  }

  return { ok: true }
}

function verifyAllowedTelegramUser(userId: string | null): NextResponse | null {
  const allowed = process.env.TELEGRAM_ALLOWED_USER_ID
  if (!allowed) return null

  const allowedIds = allowed
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)

  if (allowedIds.length === 0) return null
  if (userId && allowedIds.includes(userId)) return null

  console.error("[sales-agent-telegram] blocked Telegram user:", userId ?? "unknown")
  return NextResponse.json({ ok: false, error: "Telegram user is not allowed" }, { status: 403 })
}

function extractCommand(body: unknown): {
  text: string
  chatId: string | null
  username: string | null
  source: string
  autonomyLevel: string | null
  region: string | null
  limit: number | null
  telegramUserId: string | null
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
      telegramUserId: direct.data.user_id === undefined ? null : String(direct.data.user_id),
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
      telegramUserId: from?.id === undefined ? null : String(from.id),
    }
  }

  return {
    text: "",
    chatId: null,
    username: null,
    source: "telegram",
    autonomyLevel: null,
    region: null,
    limit: null,
    telegramUserId: null,
  }
}

export async function POST(req: NextRequest) {
  const telegramToken = req.headers.get("x-telegram-bot-api-secret-token")
  const authErr = telegramToken != null
    ? verifyTelegramWebhook(req)
    : verifyWebhookSecret(req)
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
  if (telegramToken != null) {
    const allowedErr = verifyAllowedTelegramUser(command.telegramUserId)
    if (allowedErr) return allowedErr
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

  if (telegramToken != null) {
    const reply = await sendTelegramReply(command.chatId, result.reply)
    return NextResponse.json({ ...result, telegramReply: reply }, { status: result.ok ? 200 : 207 })
  }

  return NextResponse.json(result, { status: result.ok ? 200 : 207 })
}
