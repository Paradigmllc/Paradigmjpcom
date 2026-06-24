import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { verifyWebhookSecret } from "@/lib/sales/auth"
import { handleAgentCommand, buildMainMenuKeyboard, type TelegramKeyboard } from "@/lib/sales/agent-team"

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
  username: z.string().optional(),
  source: z.string().optional(),
  autonomy_level: z.string().optional(),
  region: z.string().optional(),
  limit: z.number().int().optional(),
}).refine((data) => data.text !== undefined || data.message !== undefined || data.source !== undefined)

const TelegramUpdateSchema = z.object({
  message: z
    .object({
      text: z.string().optional(),
      chat: z.object({ id: z.union([z.string(), z.number()]).optional() }).optional(),
      from: z.object({ username: z.string().optional(), first_name: z.string().optional() }).optional(),
    })
    .optional(),
  callback_query: z
    .object({
      id: z.string().optional(),
      data: z.string().optional(),
      message: z
        .object({
          chat: z.object({ id: z.union([z.string(), z.number()]).optional() }).optional(),
        })
        .optional(),
      from: z.object({ username: z.string().optional(), first_name: z.string().optional() }).optional(),
    })
    .optional(),
})

function inferSourceFromText(text: string, fallback = "telegram"): string {
  if (/(^|[:_\s/-])hermes($|[:_\s/-])|ceo_?hermes|hermes_agent|Hermes Agent/i.test(text)) return "hermes_agent"
  if (/(^|[:_\s/-])opencode($|[:_\s/-])|open\s*code|OpenCode/i.test(text)) return "opencode"
  if (/(^|[:_\s/-])openclaw($|[:_\s/-])|OpenClaw/i.test(text)) return "openclaw"
  if (/(^|[:_\s/-])paperclip($|[:_\s/-])|Paperclip/i.test(text)) return "paperclip"
  return fallback
}

async function sendTelegramReply(chatId: string | null, text: string, keyboard?: TelegramKeyboard): Promise<{ ok: boolean; error?: string }> {
  if (!chatId) return { ok: false, error: "Telegram chat id missing" }
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) {
    console.error("[sales-agent-telegram] TELEGRAM_BOT_TOKEN not configured; reply skipped")
    return { ok: false, error: "TELEGRAM_BOT_TOKEN not configured" }
  }

  const body: Record<string, unknown> = {
    chat_id: chatId,
    text: text.slice(0, 3900),
    disable_web_page_preview: true,
    parse_mode: "HTML",
  }
  if (keyboard) {
    body.reply_markup = keyboard
  }

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  const payload = await res.json().catch((error: unknown) => {
    console.error("[sales-agent-telegram] failed to parse sendMessage response:", error)
    return null
  }) as { ok?: boolean; description?: string } | null

  if (!res.ok || payload?.ok !== true) {
    const error = payload?.description ?? `Telegram sendMessage HTTP ${res.status}`
    console.error("[sales-agent-telegram] sendMessage failed:", error)
    return { ok: false, error }
  }

  return { ok: true }
}

async function answerTelegramCallback(callbackId: string | null): Promise<void> {
  if (!callbackId) return
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) return
  const res = await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ callback_query_id: callbackId }),
  })
  if (!res.ok) console.error("[sales-agent-telegram] answerCallbackQuery failed:", res.status)
}

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
    const source = direct.data.source ?? inferSourceFromText(text)
    return {
      text,
      chatId: direct.data.chat_id === undefined ? null : String(direct.data.chat_id),
      username: direct.data.username ?? null,
      source,
      autonomyLevel: direct.data.autonomy_level ?? null,
      region: direct.data.region ?? null,
      limit: direct.data.limit ?? null,
    }
  }

  const update = TelegramUpdateSchema.safeParse(body)
  if (update.success) {
    const callback = update.data.callback_query
    if (callback) {
      const text = callback.data ?? ""
      const from = callback.from
      return {
        text,
        chatId: callback.message?.chat?.id === undefined ? null : String(callback.message.chat.id),
        username: from?.username ?? from?.first_name ?? null,
        source: inferSourceFromText(text),
        autonomyLevel: null,
        region: null,
        limit: null,
      }
    }

    const from = update.data.message?.from
    const text = update.data.message?.text ?? ""
    return {
      text,
      chatId: update.data.message?.chat?.id === undefined ? null : String(update.data.message.chat.id),
      username: from?.username ?? from?.first_name ?? null,
      source: inferSourceFromText(text),
      autonomyLevel: null,
      region: null,
      limit: null,
    }
  }

  return { text: "", chatId: null, username: null, source: "telegram", autonomyLevel: null, region: null, limit: null }
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
  const callbackId = TelegramUpdateSchema.safeParse(body).data?.callback_query?.id ?? null

  const command = extractCommand(body)
  const isTelegram = telegramToken != null

  if (!command.text.trim() && isTelegram) {
    const keyboard = buildMainMenuKeyboard()
    const reply = await sendTelegramReply(command.chatId, "📋 Twenty Sales OS 営業指令メニュー\n操作したい内容をボタンまたはコマンドで選択してください。", keyboard)
    return NextResponse.json({ ok: true, menu: true, telegramReply: reply })
  }
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

  if (isTelegram) {
    await answerTelegramCallback(callbackId)
    const keyboard = (result.result as { keyboard?: TelegramKeyboard })?.keyboard ?? null
    const telegramReply = await sendTelegramReply(command.chatId, result.reply, keyboard ?? undefined)
    return NextResponse.json({ ...result, telegramReply }, { status: result.ok ? 200 : 207 })
  }

  return NextResponse.json(result, { status: result.ok ? 200 : 207 })
}
