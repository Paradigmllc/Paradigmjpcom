import { Client } from "pg"
import type { SalesCrmViewField } from "@/lib/sales/crm-field-config"
import { ensureTwentyTextFieldsViaDatabase, ensureTwentyViewFieldsViaDatabase } from "@/lib/sales/twenty-crm-metadata-db"

function env(name: string): string | null {
  const value = process.env[name]
  return value && value.trim().length > 0 ? value.trim() : null
}

const TWENTY_COMPANY_LIST_VIEW_NAMES = ["All {objectLabelPlural}", "All Companies", "All 会社", "営業リスト"]
const TWENTY_COMPANY_LIST_VIEW_NAME = "営業リスト"
const TWENTY_COMPANY_RECORD_VIEW_NAME = "Company Record Page Fields"
const TWENTY_HOME_EXTRA_FIELDS = [
  { name: "paradigmDataStatus", position: 3 },
  { name: "paradigmNextAction", position: 4 },
  { name: "paradigmLastError", position: 5 },
  { name: "paradigmKarteScore", position: 6 },
  { name: "paradigmKarteSummary", position: 7 },
] as const

export interface TwentyCrmMetadataApplyResult {
  configured: boolean
  appliedFields: number
  selectFields: number
  error: string | null
}

import { selectOptionsForField, TWENTY_TEXT_ONLY_FIELD_KEYS } from "./twenty-crm-metadata-helpers"

export async function normalizeTwentyCompanyViewsViaDatabase(fields: SalesCrmViewField[]): Promise<string | null> {
  const connectionString = env("TWENTY_DATABASE_URL") ?? env("TWENTY_METADATA_DATABASE_URL")
  if (!connectionString) {
    return "TWENTY_DATABASE_URL is required to normalize Twenty company view order."
  }

  const orderedFields = fields
    .map((field) => ({
      name: field.twentyFieldName,
      position: field.position,
      visible: field.isVisible,
    }))
    .sort((a, b) => a.position - b.position)

  const client = new Client({ connectionString })
  try {
    await client.connect()
    await client.query("begin")
    const objectRes = await client.query<{ id: string }>(
      'select "id" from core."objectMetadata" where "nameSingular" = $1 limit 1',
      ["company"],
    )
    const objectId = objectRes.rows[0]?.id
    if (!objectId) throw new Error("Twenty company object metadata was not found.")

    await client.query(
      `
        with crm_order as (
          select *
          from jsonb_to_recordset($2::jsonb) as order_row(name text, position int, visible boolean)
        ),
        list_views as (
          select id
          from core."view"
          where "objectMetadataId" = $1
            and name = any($3::text[])
        ),
        extra_home_fields as (
          select *
          from jsonb_to_recordset($4::jsonb) as extra_row(name text, position int)
        ),
        renamed_views as (
          update core."view"
          set name = $5,
              "updatedAt" = now()
          where id in (select id from list_views)
          returning id
        ),
        normalized_list as (
          update core."viewField" view_field
          set
            "position" = coalesce(crm_order.position, view_field."position"),
            "isVisible" = coalesce(crm_order.visible, false),
            "updatedAt" = now()
          from core."fieldMetadata" field
          left join crm_order on crm_order.name = field.name
          where view_field."viewId" in (select id from list_views)
            and view_field."fieldMetadataId" = field.id
            and field."objectMetadataId" = $1
          returning view_field.id
        )
        update core."viewField" view_field
        set
          "position" = coalesce(crm_order.position, extra_home_fields.position, view_field."position"),
          "isVisible" = case
            when crm_order.name is not null then crm_order.visible
            when extra_home_fields.name is not null then true
            else false
          end,
          "updatedAt" = now()
        from core."fieldMetadata" field
        left join crm_order on crm_order.name = field.name
        left join extra_home_fields on extra_home_fields.name = field.name
        where view_field."viewId" in (
          select id
          from core."view"
          where "objectMetadataId" = $1
            and name = $6
        )
          and view_field."fieldMetadataId" = field.id
          and field."objectMetadataId" = $1
      `,
      [
        objectId,
        JSON.stringify(orderedFields),
        TWENTY_COMPANY_LIST_VIEW_NAMES,
        JSON.stringify(TWENTY_HOME_EXTRA_FIELDS),
        TWENTY_COMPANY_LIST_VIEW_NAME,
        TWENTY_COMPANY_RECORD_VIEW_NAME,
      ],
    )

    await client.query("commit")
    return null
  } catch (error) {
    await client.query("rollback").catch((rollbackErr) => { console.error("[twenty-crm-metadata] rollback failed:", rollbackErr) })
    console.error("[twenty-crm-metadata] company view normalization failed:", error)
    return error instanceof Error ? error.message : "Twenty company view normalization failed."
  } finally {
    await client.end().catch((endErr) => { console.error("[twenty-crm-metadata] client.end failed:", endErr) })
  }
}

export async function forceTwentyTextOnlyFieldsViaDatabase(fields: SalesCrmViewField[]): Promise<string | null> {
  const targets = fields.filter((field) => TWENTY_TEXT_ONLY_FIELD_KEYS.has(field.fieldKey))
  if (targets.length === 0) return null

  const connectionString = env("TWENTY_DATABASE_URL") ?? env("TWENTY_METADATA_DATABASE_URL")
  if (!connectionString) {
    return "TWENTY_DATABASE_URL is required to coerce country-dependent fields back to text."
  }

  const client = new Client({ connectionString })
  try {
    await client.connect()
    await client.query("begin")
    const objectRes = await client.query<{ id: string }>(
      'select "id" from core."objectMetadata" where "nameSingular" = $1 limit 1',
      ["company"],
    )
    const objectId = objectRes.rows[0]?.id
    if (!objectId) throw new Error("Twenty company object metadata was not found.")

    for (const field of targets) {
      await client.query(
        `
          update core."fieldMetadata"
          set
            "type" = 'TEXT',
            "options" = null,
            "updatedAt" = now()
          where "objectMetadataId" = $1
            and "name" = $2
        `,
        [objectId, field.twentyFieldName],
      )
    }

    await client.query("commit")
    return null
  } catch (error) {
    await client.query("rollback").catch((rollbackErr) => { console.error("[twenty-crm-metadata] rollback failed:", rollbackErr) })
    console.error("[twenty-crm-metadata] text-only field coercion failed:", error)
    return error instanceof Error ? error.message : "Twenty text-only field coercion failed."
  } finally {
    await client.end().catch((endErr) => { console.error("[twenty-crm-metadata] client.end failed:", endErr) })
  }
}

export async function applyTwentyCrmMetadataViaDatabase(input: {
  fields: SalesCrmViewField[]
  options: import("@/lib/sales/crm-field-config").SalesCrmSelectOption[]
}): Promise<TwentyCrmMetadataApplyResult> {
  const connectionString = env("TWENTY_DATABASE_URL") ?? env("TWENTY_METADATA_DATABASE_URL")
  if (!connectionString) {
    return {
      configured: false,
      appliedFields: 0,
      selectFields: 0,
      error: "TWENTY_DATABASE_URL is not configured.",
    }
  }

  const client = new Client({ connectionString })
  try {
    await client.connect()
    await client.query("begin")

    const objectRes = await client.query<{ id: string }>(
      'select "id" from core."objectMetadata" where "nameSingular" = $1 limit 1',
      ["company"],
    )
    const objectId = objectRes.rows[0]?.id
    if (!objectId) throw new Error("Twenty company object metadata was not found.")
    await ensureTwentyTextFieldsViaDatabase(client, objectId, input.fields)

    let appliedFields = 0
    let selectFields = 0
    for (const field of input.fields) {
      const options = selectOptionsForField(field, input.options)
      const shouldBeSelect = field.fieldType === "select" && options.length > 0
      const shouldBeLinks = field.fieldType === "url"
      const shouldBeTextOnly = TWENTY_TEXT_ONLY_FIELD_KEYS.has(field.fieldKey)
      const metadataRes = await client.query(
        `
          update core."fieldMetadata"
          set
            "label" = $1,
            "type" = case when $6 then 'TEXT' when $7 then 'LINKS' when $2 then 'SELECT' else "type" end,
            "options" = case when $6 then null when $2 then $3::jsonb else "options" end,
            "updatedAt" = now()
          where "objectMetadataId" = $4
            and "name" = $5
        `,
        [field.label, shouldBeSelect, JSON.stringify(options), objectId, field.twentyFieldName, shouldBeTextOnly, shouldBeLinks],
      )
      appliedFields += metadataRes.rowCount ?? 0
      if (shouldBeSelect) selectFields += 1

      await client.query(
        `
          update core."viewField" view_field
          set
            "position" = $1,
            "isVisible" = $2,
            "updatedAt" = now()
          from core."fieldMetadata" field, core."view" view
          where field."objectMetadataId" = $3
            and field."name" = $4
            and view."objectMetadataId" = $3
            and view_field."fieldMetadataId" = field."id"
            and view_field."viewId" = view."id"
        `,
        [field.position, field.isVisible, objectId, field.twentyFieldName],
      )
    }

    await ensureTwentyViewFieldsViaDatabase(client, objectId, input.fields)

    await client.query("commit")
    const viewOrderError = await normalizeTwentyCompanyViewsViaDatabase(input.fields)
    if (viewOrderError) return { configured: true, appliedFields, selectFields, error: viewOrderError }

    return { configured: true, appliedFields, selectFields, error: null }
  } catch (error) {
    await client.query("rollback").catch((rollbackErr) => { console.error("[twenty-crm-metadata] rollback failed:", rollbackErr) })
    console.error("[twenty-crm-metadata] apply failed:", error)
    return {
      configured: true,
      appliedFields: 0,
      selectFields: 0,
      error: error instanceof Error ? error.message : "Twenty metadata update failed.",
    }
  } finally {
    await client.end().catch((endErr) => { console.error("[twenty-crm-metadata] client.end failed:", endErr) })
  }
}

export async function fallbackApplyTwentyCrmMetadataViaDatabase(input: {
  fields: SalesCrmViewField[]
  options: import("@/lib/sales/crm-field-config").SalesCrmSelectOption[]
}): Promise<TwentyCrmMetadataApplyResult | null> {
  const connectionString = env("TWENTY_DATABASE_URL") ?? env("TWENTY_METADATA_DATABASE_URL")
  if (!connectionString) {
    console.error("[twenty-crm-metadata] DB fallback unavailable: TWENTY_DATABASE_URL is not configured")
    return null
  }
  try {
    return await applyTwentyCrmMetadataViaDatabase(input)
  } catch (dbError) {
    console.error("[twenty-crm-metadata] DB fallback also failed:", dbError)
    return null
  }
}
