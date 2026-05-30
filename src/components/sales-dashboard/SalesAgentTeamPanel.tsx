"use client"

import { Bot, CheckCircle2, Clock3, MessageSquareText, ShieldCheck, Workflow } from "lucide-react"
import type { SalesDashboardData } from "@/lib/sales/dashboard"
import { formatDate, statusTone } from "./SalesCommandPanels"

const COMMAND_EXAMPLES = [
  "今日の営業OS状況を見て",
  "カルテ生成を3件進めて",
  "フォーム営業dry-runを5件実行して",
  "Twenty同期して",
  "Web制作向けの資料と動画ブリーフを準備して",
]

const STATUS_LABELS: Record<string, string> = {
  completed: "完了",
  blocked: "承認待ち",
  failed: "失敗",
  running: "実行中",
  queued: "待機中",
}

export function SalesAgentTeamPanel({ data }: { data: SalesDashboardData }) {
  const agentTeam = data.agentTeam
  const endpointUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://paradigmjp.com"}${agentTeam.endpointPath}`

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-zinc-200 bg-white p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-zinc-500">
              <Bot size={15} aria-hidden />
              Paradigm AI Bot / 自律営業チーム
            </div>
            <h2 className="mt-2 text-xl font-semibold tracking-normal text-zinc-950">
              Telegramから営業OSを動かす司令塔
            </h2>
            <p className="mt-2 max-w-4xl text-sm leading-7 text-zinc-600">
              {agentTeam.telegramBot} に送った指示を n8n / Hermes Agent / Paperclip が受け取り、
              Supabaseのジョブ・手動キュー・Twenty同期へ変換します。ライブ送信、契約、インフラ変更は承認なしでは実行しません。
            </p>
          </div>
          <div className="grid min-w-[280px] grid-cols-2 gap-2">
            <div className="rounded-lg bg-zinc-50 p-3">
              <div className="text-xs text-zinc-500">状態</div>
              <div className={`mt-2 inline-flex rounded-full px-2 py-1 text-xs font-semibold ${statusTone(agentTeam.status)}`}>
                {agentTeam.status}
              </div>
            </div>
            <div className="rounded-lg bg-zinc-50 p-3">
              <div className="text-xs text-zinc-500">ログ保存</div>
              <div className={`mt-2 inline-flex rounded-full px-2 py-1 text-xs font-semibold ${statusTone(agentTeam.storageStatus === "supabase" ? "ready" : "degraded")}`}>
                {agentTeam.storageStatus === "supabase" ? "Supabase" : "migration待ち"}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-lg border border-zinc-200 bg-white p-5">
          <div className="flex items-center gap-2">
            <Workflow size={16} aria-hidden />
            <h3 className="text-sm font-semibold text-zinc-950">AIエージェント役割分担</h3>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {agentTeam.roles.map((role) => (
              <div key={role.id} className="rounded-lg border border-zinc-100 bg-zinc-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-zinc-950">{role.name}</div>
                    <div className="mt-1 text-xs text-zinc-500">{role.owner}</div>
                  </div>
                  <ShieldCheck size={16} className="text-zinc-500" aria-hidden />
                </div>
                <p className="mt-3 text-xs leading-6 text-zinc-600">{role.responsibility}</p>
                <p className="mt-2 text-xs leading-6 text-zinc-500">{role.guardrail}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border border-zinc-200 bg-white p-5">
            <div className="flex items-center gap-2">
              <MessageSquareText size={16} aria-hidden />
              <h3 className="text-sm font-semibold text-zinc-950">Telegram / n8n 接続口</h3>
            </div>
            <div className="mt-4 rounded-md bg-zinc-950 p-3 text-xs text-white">
              <div className="font-semibold">POST {agentTeam.endpointPath}</div>
              <div className="mt-2 break-all text-zinc-300">{endpointUrl}</div>
              <div className="mt-2 text-zinc-400">Header: X-Webhook-Secret</div>
            </div>
            <div className="mt-4 space-y-2">
              {COMMAND_EXAMPLES.map((example) => (
                <div key={example} className="rounded-md border border-zinc-100 bg-zinc-50 px-3 py-2 text-xs text-zinc-700">
                  {example}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-zinc-200 bg-white p-5">
            <div className="flex items-center gap-2">
              <ShieldCheck size={16} aria-hidden />
              <h3 className="text-sm font-semibold text-zinc-950">自律レベル</h3>
            </div>
            <div className="mt-4 space-y-3">
              {agentTeam.autonomyLevels.map((level) => (
                <div key={level.id} className="rounded-md border border-zinc-100 p-3">
                  <div className="text-xs font-semibold text-zinc-950">{level.label}</div>
                  <p className="mt-1 text-xs leading-6 text-zinc-600">{level.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-lg border border-zinc-200 bg-white p-5">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} aria-hidden />
            <h3 className="text-sm font-semibold text-zinc-950">安全ルール</h3>
          </div>
          <ul className="mt-4 space-y-3 text-xs leading-6 text-zinc-600">
            {agentTeam.guardrails.map((guardrail) => (
              <li key={guardrail} className="flex gap-2">
                <CheckCircle2 size={14} className="mt-1 shrink-0 text-emerald-600" aria-hidden />
                <span>{guardrail}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-lg border border-zinc-200 bg-white p-5">
          <div className="flex items-center gap-2">
            <Clock3 size={16} aria-hidden />
            <h3 className="text-sm font-semibold text-zinc-950">最近のTelegram指示</h3>
          </div>
          <div className="mt-4 divide-y divide-zinc-100">
            {agentTeam.recentCommands.length === 0 ? (
              <p className="py-8 text-sm text-zinc-500">
                まだ指示ログがありません。migration_023適用後、Telegram/n8n経由の指示がここに残ります。
              </p>
            ) : (
              agentTeam.recentCommands.map((command) => (
                <div key={command.id} className="py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] ${statusTone(command.status)}`}>
                      {STATUS_LABELS[command.status] ?? command.status}
                    </span>
                    <span className="text-xs text-zinc-500">{command.intent}</span>
                    <span className="text-xs text-zinc-400">{formatDate(command.createdAt)}</span>
                  </div>
                  <div className="mt-2 text-sm font-medium text-zinc-950">{command.commandText}</div>
                  <div className="mt-1 text-xs leading-6 text-zinc-500">
                    {command.runSummary ?? `${command.source} / ${command.telegramUser ?? "unknown"}`}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
