/**
 * POST /api/sales/import-csv — Sprint 15 Apollo/外部 CSV 一括インポート
 *
 * 役割: Apollo / Hunter / 自前リスト等の CSV を投入し、各行を sales_companies に bulk INSERT.
 *       INSERT 直後に 30+ API enrich pipeline を fire-and-forget で発火.
 *       結果: インポート後 5-30 分で全リードの企業カルテが完成する.
 *
 * 認証: X-Webhook-Secret header 必須 (Notion or n8n or 内部管理から呼ぶ)
 *
 * Body (JSON):
 *   {
 *     rows: Array<{
 *       company_name: string,         // 必須
 *       domain: string,               // 必須
 *       industry?: Industry,
 *       prefecture?: string,
 *       email?: string,               // contact form 様式・enrich pipeline トリガー用
 *       phone?: string,
 *       contact_name?: string,
 *       contact_title?: string,
 *       source?: string,              // "apollo" | "hunter" | "manual" 等
 *     }>,
 *     enrich?: boolean                // default true・false なら INSERT のみ (enrich しない)
 *   }
 *
 * 出力: { ok, total, inserted, skipped, enrich_triggered }
 *
 * Apollo CSV → JSON 変換例 (クライアント側):
 *   ```js
 *   const csv = await fetch('apollo-leads.csv').then(r=>r.text())
 *   const rows = csvToJson(csv, mapping: {
 *     'Company': 'company_name',
 *     'Website': 'domain',
 *     'Industry': 'industry',
 *     'State': 'prefecture',
 *     'Email': 'email',
 *     'First Name + Last Name': 'contact_name',
 *     'Title': 'contact_title',
 *   })
 *   await fetch('/api/sales/import-csv', { method:'POST', body: JSON.stringify({rows}) })
 *   ```
 */

import { NextRequest, NextResponse } from "next/server"
import { verifyWebhookSecret } from "@/lib/sales/auth"
import { upsertCompanyByDomain, findCompanyByDomain } from "@/lib/sales/companies"
import { enrichFromContact } from "@/lib/sales/enrich"
import type { Industry } from "@/lib/sales/types"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

interface CsvRow {
  company_name?: string
  domain?: string
  industry?: Industry
  prefecture?: string
  email?: string
  phone?: string
  contact_name?: string
  contact_title?: string
  source?: string
}

interface Body {
  rows?: CsvRow[]
  enrich?: boolean
}

function slugify(name: string): string {
  // 簡易 ASCII slugify (日本語含む場合は raw でも OK)
  return name
    .toLowerCase()
    .replace(/[^\w぀-ゟ゠-ヿ一-鿿\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80)
}

export async function POST(req: NextRequest) {
  const authErr = verifyWebhookSecret(req)
  if (authErr) return authErr

  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return NextResponse.json({ ok: false, error: "invalid json body" }, { status: 400 })
  }
  const rows = body.rows ?? []
  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ ok: false, error: "rows[] required" }, { status: 400 })
  }
  if (rows.length > 1000) {
    return NextResponse.json(
      { ok: false, error: "max 1000 rows per request (split into chunks)" },
      { status: 400 },
    )
  }

  const shouldEnrich = body.enrich !== false // default true

  let inserted = 0
  let skipped = 0
  let enrichTriggered = 0
  const failures: { row: number; reason: string }[] = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    if (!row.company_name || !row.domain) {
      failures.push({ row: i, reason: "company_name and domain required" })
      continue
    }
    const cleanDomain = row.domain
      .replace(/^https?:\/\//, "")
      .replace(/\/.*$/, "")
      .trim()
      .toLowerCase()
    if (!cleanDomain.includes(".")) {
      failures.push({ row: i, reason: "invalid domain format" })
      continue
    }

    const existing = await findCompanyByDomain(cleanDomain)
    if (existing) {
      skipped++
      continue
    }

    // Stub UPSERT (即時) — slug 自動生成
    const result = await upsertCompanyByDomain({
      domain: cleanDomain,
      company_name: row.company_name,
      industry: row.industry ?? null,
      prefecture: row.prefecture ?? null,
      pipeline_status: shouldEnrich ? "scanning" : "pending",
      source: row.source ?? "csv_import",
      meta: {
        csv_import: {
          imported_at: new Date().toISOString(),
          source_file: row.source ?? "unknown",
          original_row: row,
        },
        contact_seed: {
          email: row.email ?? null,
          phone: row.phone ?? null,
          name: row.contact_name ?? null,
          title: row.contact_title ?? null,
        },
      },
    })
    if (!result.ok) {
      failures.push({ row: i, reason: result.error ?? "upsert failed" })
      continue
    }
    inserted++

    // 自動で slug を埋める (重複時 -2 など suffix)
    if (result.company) {
      const baseSlug = slugify(row.company_name)
      // Note: 重複チェックは別途 unique 制約に任せる (重複時 INSERT エラー → null retain)
      // ここでは best-effort で UPSERT (再 update)
      await upsertCompanyByDomain({
        domain: cleanDomain,
        company_name: result.company.company_name,
        meta: { ...result.company.meta, generated_slug: baseSlug },
      })
    }

    // 🚀 enrich pipeline 発火 (fire-and-forget・非同期)
    if (shouldEnrich) {
      enrichTriggered++
      void enrichFromContact({
        email: row.email ?? `info@${cleanDomain}`,
        company: row.company_name,
        message: `CSV import (${row.source ?? "manual"})`,
        services: [],
        source: row.source ?? "csv_import",
      }).catch((e) => {
        console.error(`[import-csv] enrich row ${i} failed:`, e)
      })
    }
  }

  return NextResponse.json({
    ok: true,
    total: rows.length,
    inserted,
    skipped,
    enrich_triggered: enrichTriggered,
    failures: failures.slice(0, 20), // 最大 20 件まで返す
    note: shouldEnrich
      ? "Enrich pipeline triggered for each row (non-blocking・5-30 min to complete depending on PSI rate-limit)"
      : "Enrich skipped (enrich=false)",
  })
}
