import crypto from "node:crypto"
import { Client } from "pg"
import type { SalesCrmSelectOption, SalesCrmViewField } from "@/lib/sales/crm-field-config"

interface TwentyOption {
  id: string
  label: string
  value: string
  color: string
  position: number
}

interface TwentyMetadataObject {
  id: string
  nameSingular: string
  fields?: Array<{ id: string; name: string }>
}

interface TwentyMetadataView {
  id: string
  name: string
  objectMetadataId: string
}

interface TwentyMetadataViewField {
  id: string
  fieldMetadataId: string
  viewId: string
  position: number
  isVisible: boolean
}

export interface TwentyCrmMetadataApplyResult {
  configured: boolean
  appliedFields: number
  selectFields: number
  error: string | null
}

const SELECT_FIELD_KEYS = new Set(["country", "region", "industry", "source", "sales_status"])
const TWENTY_TEXT_ONLY_FIELD_KEYS = new Set(["region"])
const TWENTY_COMPANY_LIST_VIEW_NAMES = ["All {objectLabelPlural}", "All Companies", "All 会社", "営業リスト"]
const TWENTY_COMPANY_LIST_VIEW_NAME = "営業リスト"
const TWENTY_COMPANY_RECORD_VIEW_NAME = "Company Record Page Fields"
const TWENTY_HOME_EXTRA_FIELDS = [
  { name: "paradigmKarteScore", position: 12 },
  { name: "paradigmSourceCoverage", position: 13 },
  { name: "paradigmDataStatus", position: 14 },
  { name: "paradigmDataSources", position: 15 },
  { name: "paradigmNextAction", position: 16 },
  { name: "paradigmLastError", position: 17 },
  { name: "paradigmKarteSummary", position: 18 },
] as const

function env(name: string): string | null {
  const value = process.env[name]
  return value && value.trim().length > 0 ? value.trim() : null
}

function twentyBaseUrl(): string | null {
  const base = env("TWENTY_BASE_URL")
  return base ? base.replace(/\/$/, "") : null
}

function twentyTextColumnName(fieldName: string): string {
  return fieldName
}

async function ensureTwentyTextFieldsViaDatabase(
  client: Client,
  objectId: string,
  fields: SalesCrmViewField[],
): Promise<void> {
  const textFields = fields.filter((field) => field.fieldType === "text" && field.twentyFieldName.startsWith("paradigm"))
  if (textFields.length === 0) return

  const objectRes = await client.query<{ workspaceId: string | null }>(
    'select "workspaceId" from core."objectMetadata" where id = $1 limit 1',
    [objectId],
  )
  const workspaceId = objectRes.rows[0]?.workspaceId
  if (!workspaceId) throw new Error("Twenty company workspace id was not found.")

  const appRes = await client.query<{ applicationId: string | null }>(
    `
      select "applicationId"
      from core."fieldMetadata"
      where "objectMetadataId" = $1
        and "isCustom" = true
        and "applicationId" is not null
      limit 1
    `,
    [objectId],
  )
  const applicationId = appRes.rows[0]?.applicationId ?? null

  const schemaRes = await client.query<{ table_schema: string }>(
    `
      select table_schema
      from information_schema.tables
      where table_name = 'company'
        and table_schema like 'workspace_%'
      order by table_schema
      limit 1
    `,
  )
  const companySchema = schemaRes.rows[0]?.table_schema
  if (!companySchema) throw new Error("Twenty workspace company table was not found.")
  if (!/^workspace_[a-z0-9_]+$/.test(companySchema)) throw new Error("Unexpected Twenty workspace schema name.")

  for (const field of textFields) {
    await client.query(
      `
        insert into core."fieldMetadata" (
          id,
          "objectMetadataId",
          type,
          name,
          label,
          description,
          icon,
          settings,
          options,
          "isCustom",
          "isActive",
          "isSystem",
          "isUIReadOnly",
          "isNullable",
          "workspaceId",
          "isLabelSyncedWithName",
          "createdAt",
          "updatedAt",
          "universalIdentifier",
          "applicationId"
        )
        values (
          gen_random_uuid(),
          $1,
          'TEXT',
          $2,
          $3,
          $4,
          'IconDatabase',
          null,
          null,
          true,
          true,
          false,
          false,
          true,
          $5,
          false,
          now(),
          now(),
          gen_random_uuid(),
          $6
        )
        on conflict (name, "objectMetadataId", "workspaceId")
        do update set
          label = excluded.label,
          description = excluded.description,
          type = 'TEXT',
          options = null,
          "isActive" = true,
          "isLabelSyncedWithName" = false,
          "updatedAt" = now()
      `,
      [objectId, field.twentyFieldName, field.label, field.description, workspaceId, applicationId],
    )
    await client.query(`alter table ${companySchema}.company add column if not exists "${twentyTextColumnName(field.twentyFieldName)}" text`)
  }
}

async function ensureTwentyViewFieldsViaDatabase(
  client: Client,
  objectId: string,
  fields: SalesCrmViewField[],
): Promise<void> {
  const viewRes = await client.query<{ id: string }>(
    `
      select id
      from core."view"
      where "objectMetadataId" = $1
        and type in ('TABLE', 'FIELDS_WIDGET')
        and "deletedAt" is null
    `,
    [objectId],
  )
  if (viewRes.rows.length === 0) return

  for (const field of fields) {
    const fieldRes = await client.query<{ id: string; workspaceId: string; applicationId: string | null }>(
      `
        select id, "workspaceId", "applicationId"
        from core."fieldMetadata"
        where "objectMetadataId" = $1
          and name = $2
        limit 1
      `,
      [objectId, field.twentyFieldName],
    )
    const metadata = fieldRes.rows[0]
    if (!metadata) continue

    for (const view of viewRes.rows) {
      await client.query(
        `
          update core."viewField"
          set
            "isVisible" = $2,
            position = $3,
            "isActive" = true,
            "updatedAt" = now()
          where "fieldMetadataId" = $1
            and "viewId" = $4
            and "deletedAt" is null
        `,
        [metadata.id, field.isVisible, field.position, view.id, metadata.workspaceId, metadata.applicationId],
      )
      await client.query(
        `
          insert into core."viewField" (
            id,
            "fieldMetadataId",
            "isVisible",
            size,
            position,
            "viewId",
            "workspaceId",
            "createdAt",
            "updatedAt",
            "universalIdentifier",
            "applicationId",
            "isActive"
          )
          select
            gen_random_uuid(),
            $1,
            $2,
            180,
            $3,
            $4,
            $5,
            now(),
            now(),
            gen_random_uuid(),
            $6,
            true
          where not exists (
            select 1
            from core."viewField"
            where "fieldMetadataId" = $1
              and "viewId" = $4
              and "deletedAt" is null
          )
        `,
        [metadata.id, field.isVisible, field.position, view.id, metadata.workspaceId, metadata.applicationId],
      )
    }
  }
}

function asArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[]
  if (value && typeof value === "object" && Array.isArray((value as { data?: unknown }).data)) {
    return (value as { data: T[] }).data
  }
  return []
}

function uuidFromSeed(seed: string): string {
  const hash = crypto.createHash("md5").update(seed).digest("hex")
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`
}

function toTwentyOption(fieldName: string, option: SalesCrmSelectOption): TwentyOption {
  return {
    id: uuidFromSeed(`${fieldName}:${option.value}`),
    label: option.label,
    value: option.value,
    color: option.color,
    position: option.position,
  }
}

function selectOptionsForField(field: SalesCrmViewField, options: SalesCrmSelectOption[]): TwentyOption[] {
  if (!SELECT_FIELD_KEYS.has(field.fieldKey)) return []
  return options
    .filter((option) => option.fieldKey === field.fieldKey && option.isActive)
    .sort((a, b) => a.position - b.position)
    .map((option) => toTwentyOption(field.twentyFieldName, option))
}

function toTwentyFieldType(fieldType: SalesCrmViewField["fieldType"]): string {
  switch (fieldType) {
    case "select":
      return "SELECT"
    case "multi_select":
      return "MULTI_SELECT"
    case "url":
      return "LINKS"
    default:
      return "TEXT"
  }
}

async function twentyMetadataRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const baseUrl = twentyBaseUrl()
  const apiKey = env("TWENTY_API_KEY")
  if (!baseUrl || !apiKey) throw new Error("TWENTY_BASE_URL or TWENTY_API_KEY is not configured.")

  const res = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  })
  const text = await res.text()
  if (!res.ok) {
    console.error(`[twenty-crm-metadata] HTTP ${res.status} on ${init.method ?? "GET"} ${path}: ${text}`)
    throw new Error(`Twenty metadata API HTTP ${res.status}: ${text}`)
  }
  let parsed: unknown = null
  try {
    parsed = text ? JSON.parse(text) : null
  } catch (e) {
    console.error("[twenty-crm-metadata] JSON parse failed:", e instanceof Error ? e.message : String(e))
    throw new Error(`Twenty metadata API HTTP ${res.status}: invalid JSON response`)
  }
  return parsed as T
}

async function applyTwentyCrmMetadataViaApi(input: {
  fields: SalesCrmViewField[]
  options: SalesCrmSelectOption[]
}): Promise<TwentyCrmMetadataApplyResult> {
  const objectPayload = await twentyMetadataRequest<unknown>("/rest/metadata/objects?limit=10000")
  const objects = asArray<TwentyMetadataObject>(objectPayload)
  const company = objects.find((object) => object.nameSingular === "company")
  if (!company) throw new Error("Twenty company metadata object was not found.")

  const fieldByName = new Map((company.fields ?? []).map((field) => [field.name, field]))
  const viewsPayload = await twentyMetadataRequest<unknown>("/rest/metadata/views?limit=10000")
  const viewFieldsPayload = await twentyMetadataRequest<unknown>("/rest/metadata/viewFields?limit=10000")
  const companyViews = asArray<TwentyMetadataView>(viewsPayload).filter(
    (view) => view.objectMetadataId === company.id,
  )
  const viewFields = asArray<TwentyMetadataViewField>(viewFieldsPayload).filter((viewField) =>
    companyViews.some((view) => view.id === viewField.viewId),
  )

  let appliedFields = 0
  let selectFields = 0
  for (const field of input.fields) {
    const twentyField = fieldByName.get(field.twentyFieldName)
    if (!twentyField) continue

    const options = selectOptionsForField(field, input.options)
    const twentyType = toTwentyFieldType(field.fieldType)
    const body: Record<string, unknown> = { label: field.label, type: twentyType }
    if (field.fieldType === "select" && options.length > 0) {
      body.options = options
    }

    await twentyMetadataRequest(`/rest/metadata/fields/${twentyField.id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    })
    appliedFields += 1
    if (field.fieldType === "select" && options.length > 0) selectFields += 1

    const relatedViewFields = viewFields.filter((viewField) => viewField.fieldMetadataId === twentyField.id)
    for (const viewField of relatedViewFields) {
      await twentyMetadataRequest(`/rest/metadata/viewFields/${viewField.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          position: field.position,
          isVisible: field.isVisible,
        }),
      })
    }
  }

  const textOnlyError = await forceTwentyTextOnlyFieldsViaDatabase(input.fields)
  if (textOnlyError) {
    return { configured: true, appliedFields, selectFields, error: textOnlyError }
  }

  const viewOrderError = await normalizeTwentyCompanyViewsViaDatabase(input.fields)
  if (viewOrderError) {
    return { configured: true, appliedFields, selectFields, error: viewOrderError }
  }

  return { configured: true, appliedFields, selectFields, error: null }
}

async function normalizeTwentyCompanyViewsViaDatabase(fields: SalesCrmViewField[]): Promise<string | null> {
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

async function forceTwentyTextOnlyFieldsViaDatabase(fields: SalesCrmViewField[]): Promise<string | null> {
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

async function applyTwentyCrmMetadataViaDatabase(input: {
  fields: SalesCrmViewField[]
  options: SalesCrmSelectOption[]
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
      const shouldBeTextOnly = TWENTY_TEXT_ONLY_FIELD_KEYS.has(field.fieldKey)
      const metadataRes = await client.query(
        `
          update core."fieldMetadata"
          set
            "label" = $1,
            "type" = case when $6 then 'TEXT' when $2 then 'SELECT' else "type" end,
            "options" = case when $6 then null when $2 then $3::jsonb else "options" end,
            "updatedAt" = now()
          where "objectMetadataId" = $4
            and "name" = $5
        `,
        [field.label, shouldBeSelect, JSON.stringify(options), objectId, field.twentyFieldName, shouldBeTextOnly],
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

export async function applyTwentyCrmMetadata(input: {
  fields: SalesCrmViewField[]
  options: SalesCrmSelectOption[]
}): Promise<TwentyCrmMetadataApplyResult> {
  if (env("TWENTY_DATABASE_URL") ?? env("TWENTY_METADATA_DATABASE_URL")) {
    return applyTwentyCrmMetadataViaDatabase(input)
  }

  if (twentyBaseUrl() && env("TWENTY_API_KEY")) {
    try {
      return await applyTwentyCrmMetadataViaApi(input)
    } catch (error) {
      console.error("[twenty-crm-metadata] API apply failed, falling back to DB:", error)
      const dbResult = await fallbackApplyTwentyCrmMetadataViaDatabase(input)
      if (dbResult) return dbResult
      return {
        configured: true,
        appliedFields: 0,
        selectFields: 0,
        error: error instanceof Error ? error.message : "Twenty metadata API update failed.",
      }
    }
  }

  return applyTwentyCrmMetadataViaDatabase(input)
}

async function fallbackApplyTwentyCrmMetadataViaDatabase(input: {
  fields: SalesCrmViewField[]
  options: SalesCrmSelectOption[]
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
