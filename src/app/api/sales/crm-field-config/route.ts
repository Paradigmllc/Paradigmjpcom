import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getSalesCrmFieldConfig, saveSalesCrmFieldConfig } from "@/lib/sales/crm-field-config"
import { applyTwentyCrmMetadata } from "@/lib/sales/twenty-crm-metadata"
import { isSalesApiAuthorized } from "@/lib/sales/api-auth"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

const FieldSchema = z.object({
  fieldKey: z.string().min(1).max(80),
  twentyFieldName: z.string().min(1).max(120),
  label: z.string().min(1).max(80),
  position: z.number().int().min(0).max(200),
  isVisible: z.boolean(),
  fieldType: z.enum(["text", "url", "select", "multi_select"]),
  description: z.string().max(240).nullable(),
})

const OptionSchema = z.object({
  fieldKey: z.string().min(1).max(80),
  value: z.string().min(1).max(160),
  label: z.string().min(1).max(120),
  countryCode: z.string().max(8).nullable(),
  position: z.number().int().min(0).max(2000),
  isActive: z.boolean(),
  color: z.string().min(1).max(32),
})

const PatchSchema = z.object({
  fields: z.array(FieldSchema).max(80),
  options: z.array(OptionSchema).max(500),
})

export async function GET(req: NextRequest) {
  if (!(await isSalesApiAuthorized(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const result = await getSalesCrmFieldConfig()
    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    console.error("[sales-crm-field-config] GET failed:", error)
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "CRM field config load failed" },
      { status: 500 },
    )
  }
}

export async function PATCH(req: NextRequest) {
  if (!(await isSalesApiAuthorized(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const parsed = PatchSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 })
    }

    const result = await saveSalesCrmFieldConfig(parsed.data)
    const twenty = await applyTwentyCrmMetadata(result)
    return NextResponse.json({ ok: true, ...result, twenty })
  } catch (error) {
    console.error("[sales-crm-field-config] PATCH failed:", error)
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "CRM field config update failed" },
      { status: 500 },
    )
  }
}
