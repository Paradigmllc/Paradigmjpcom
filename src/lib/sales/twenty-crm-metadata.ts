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

function env(name: string): string | null {
  const value = process.env[name]
  return value && value.trim().length > 0 ? value.trim() : null
}

function twentyBaseUrl(): string | null {
  const base = env("TWENTY_BASE_URL")
  return base ? base.replace(/\/$/, "") : null
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
  if (!res.ok) throw new Error(`Twenty metadata API HTTP ${res.status}: ${text.slice(0, 180)}`)
  return (text ? JSON.parse(text) : null) as T
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
    const body: Record<string, unknown> = { label: field.label }
    if (field.fieldType === "select" && options.length > 0) {
      body.options = options
      selectFields += 1
    }

    await twentyMetadataRequest(`/rest/metadata/fields/${twentyField.id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    })
    appliedFields += 1

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

  return { configured: true, appliedFields, selectFields, error: null }
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
  await client.connect()
  try {
    await client.query("begin")

    const objectRes = await client.query<{ id: string }>(
      'select "id" from core."objectMetadata" where "nameSingular" = $1 limit 1',
      ["company"],
    )
    const objectId = objectRes.rows[0]?.id
    if (!objectId) throw new Error("Twenty company object metadata was not found.")

    let appliedFields = 0
    let selectFields = 0
    for (const field of input.fields) {
      const options = selectOptionsForField(field, input.options)
      const shouldBeSelect = field.fieldType === "select" && options.length > 0
      const metadataRes = await client.query(
        `
          update core."fieldMetadata"
          set
            "label" = $1,
            "type" = case when $2 then 'SELECT' else "type" end,
            "options" = case when $2 then $3::jsonb else "options" end,
            "updatedAt" = now()
          where "objectMetadataId" = $4
            and "name" = $5
        `,
        [field.label, shouldBeSelect, JSON.stringify(options), objectId, field.twentyFieldName],
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

    await client.query("commit")
    return { configured: true, appliedFields, selectFields, error: null }
  } catch (error) {
    await client.query("rollback")
    console.error("[twenty-crm-metadata] apply failed:", error)
    return {
      configured: true,
      appliedFields: 0,
      selectFields: 0,
      error: error instanceof Error ? error.message : "Twenty metadata update failed.",
    }
  } finally {
    await client.end()
  }
}

export async function applyTwentyCrmMetadata(input: {
  fields: SalesCrmViewField[]
  options: SalesCrmSelectOption[]
}): Promise<TwentyCrmMetadataApplyResult> {
  if (twentyBaseUrl() && env("TWENTY_API_KEY")) {
    try {
      return await applyTwentyCrmMetadataViaApi(input)
    } catch (error) {
      console.error("[twenty-crm-metadata] API apply failed:", error)
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
