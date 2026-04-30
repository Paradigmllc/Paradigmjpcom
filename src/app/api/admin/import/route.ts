import { NextRequest, NextResponse } from "next/server"
import { getPayload } from "payload"
import config from "@payload-config"
import { headers as nextHeaders } from "next/headers"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type ImportBody = {
  collection: string
  mode?: "insert" | "upsert"
  upsertKey?: string
  rows: Array<Record<string, unknown>>
  dryRun?: boolean
}

const ALLOWED_COLLECTIONS = new Set([
  "posts",
  "services",
  "faqs",
  "works",
  "pricing",
  "leads",
])

function parseCsvLine(line: string): string[] {
  const out: string[] = []
  let cur = ""
  let inQ = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQ && line[i + 1] === '"') {
        cur += '"'
        i++
      } else {
        inQ = !inQ
      }
    } else if (ch === "," && !inQ) {
      out.push(cur)
      cur = ""
    } else {
      cur += ch
    }
  }
  out.push(cur)
  return out
}

function csvToRows(csv: string): Array<Record<string, unknown>> {
  const lines = csv.replace(/\r\n/g, "\n").split("\n").filter((l) => l.length > 0)
  if (lines.length < 2) return []
  const header = parseCsvLine(lines[0])
  const rows: Array<Record<string, unknown>> = []
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i])
    const row: Record<string, unknown> = {}
    header.forEach((h, idx) => {
      const v = cols[idx] ?? ""
      if (v === "") row[h] = null
      else if (v === "true") row[h] = true
      else if (v === "false") row[h] = false
      else if (/^-?\d+(\.\d+)?$/.test(v)) row[h] = Number(v)
      else row[h] = v
    })
    rows.push(row)
  }
  return rows
}

export async function POST(req: NextRequest) {
  try {
    const payload = await getPayload({ config })
    const headers = await nextHeaders()
    const { user } = await payload.auth({ headers })
    if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 })
    const role = (user as { role?: string }).role
    if (role !== "admin" && role !== "editor") {
      return NextResponse.json({ error: "権限がありません" }, { status: 403 })
    }

    const contentType = req.headers.get("content-type") || ""
    let body: ImportBody

    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData()
      const file = form.get("file") as File | null
      const collection = String(form.get("collection") || "")
      const mode = String(form.get("mode") || "insert") as "insert" | "upsert"
      const upsertKey = form.get("upsertKey") ? String(form.get("upsertKey")) : undefined
      const dryRun = form.get("dryRun") === "true"
      if (!file || !collection) {
        return NextResponse.json({ error: "file と collection は必須です" }, { status: 400 })
      }
      const text = await file.text()
      const rows = file.name.endsWith(".json") ? JSON.parse(text) : csvToRows(text)
      body = { collection, mode, upsertKey, rows, dryRun }
    } else {
      body = (await req.json()) as ImportBody
    }

    if (!ALLOWED_COLLECTIONS.has(body.collection)) {
      return NextResponse.json({ error: `未対応のコレクション: ${body.collection}` }, { status: 400 })
    }
    if (!Array.isArray(body.rows) || body.rows.length === 0) {
      return NextResponse.json({ error: "rows が空です" }, { status: 400 })
    }
    if (body.rows.length > 5000) {
      return NextResponse.json({ error: "1回のインポートは5000行まで" }, { status: 400 })
    }

    if (body.dryRun) {
      return NextResponse.json({
        ok: true,
        dryRun: true,
        collection: body.collection,
        mode: body.mode ?? "insert",
        rowsPreview: body.rows.slice(0, 3),
        total: body.rows.length,
      })
    }

    const results = {
      created: 0,
      updated: 0,
      failed: 0,
      errors: [] as Array<{ index: number; error: string }>,
    }

    for (let i = 0; i < body.rows.length; i++) {
      const row = body.rows[i]
      try {
        if (body.mode === "upsert" && body.upsertKey) {
          const keyVal = row[body.upsertKey]
          if (keyVal !== undefined && keyVal !== null) {
            const existing = await payload.find({
              collection: body.collection,
              where: { [body.upsertKey]: { equals: keyVal } },
              limit: 1,
              depth: 0,
            } as Parameters<typeof payload.find>[0])
            if (existing.totalDocs > 0) {
              // Payload v3 collection slugs form a discriminated union with
              // `data`; with `body.collection` typed as `string` we cannot
              // satisfy that narrowing without a runtime collection-by-collection
              // dispatch. The whole-object cast keeps the boundary local
              // and the runtime safety guard is ALLOWED_COLLECTIONS above.
              await payload.update({
                collection: body.collection,
                id: existing.docs[0].id,
                data: row,
              } as Parameters<typeof payload.update>[0])
              results.updated++
              continue
            }
          }
        }
        await payload.create({
          collection: body.collection,
          data: row,
        } as Parameters<typeof payload.create>[0])
        results.created++
      } catch (e) {
        results.failed++
        results.errors.push({ index: i, error: e instanceof Error ? e.message : String(e) })
      }
    }

    return NextResponse.json({ ok: true, collection: body.collection, ...results })
  } catch (e) {
    console.error("[admin/import] error:", e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    endpoint: "/api/admin/import",
    method: "POST",
    description: "PayloadCMSへのCSV/JSON一括インポート（admin/editor認証必須）",
    supportedCollections: Array.from(ALLOWED_COLLECTIONS),
    modes: ["insert", "upsert"],
    example: {
      multipart: "FormData(file, collection, mode, upsertKey, dryRun)",
      json: { collection: "posts", mode: "insert", rows: [{ title: "...", slug: "..." }], dryRun: false },
    },
  })
}
