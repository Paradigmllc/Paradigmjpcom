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

export async function applyTwentyCrmMetadata(input: {
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
