import type { SalesCrmSelectOption, SalesCrmViewField } from "@/lib/sales/crm-field-config"
import { asArray, env, selectOptionsForField, twentyBaseUrl, TWENTY_TEXT_ONLY_FIELD_KEYS } from "./twenty-crm-metadata-helpers"
import {
  applyTwentyCrmMetadataViaDatabase,
  fallbackApplyTwentyCrmMetadataViaDatabase,
  forceTwentyTextOnlyFieldsViaDatabase,
  normalizeTwentyCompanyViewsViaDatabase,
} from "./twenty-crm-metadata-db-apply"

export type { TwentyCrmMetadataApplyResult } from "./twenty-crm-metadata-db-apply"
export { normalizeTwentyCompanyViewsViaDatabase, forceTwentyTextOnlyFieldsViaDatabase }

export { SELECT_FIELD_KEYS, TWENTY_TEXT_ONLY_FIELD_KEYS } from "./twenty-crm-metadata-helpers"

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

interface TwentyCompanyListPayload {
  data?: { companies?: Array<Record<string, unknown>> }
}

export function missingTwentyCrmFieldNames(fields: SalesCrmViewField[], existingNames: Iterable<string>): string[] {
  const existing = new Set(existingNames)
  return fields.map((field) => field.twentyFieldName).filter((name) => !existing.has(name))
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
}): Promise<import("./twenty-crm-metadata-db-apply").TwentyCrmMetadataApplyResult> {
  const objectPayload = await twentyMetadataRequest<unknown>("/rest/metadata/objects?limit=10000")
  const objects = asArray<TwentyMetadataObject>(objectPayload)
  const company = objects.find((object) => object.nameSingular === "company")
  if (!company) throw new Error("Twenty company metadata object was not found.")

  const fieldByName = new Map((company.fields ?? []).map((field) => [field.name, field]))
  const missingMetadataFields = missingTwentyCrmFieldNames(input.fields, fieldByName.keys())
  if (missingMetadataFields.length > 0) {
    throw new Error(`Twenty company metadata is missing required fields: ${missingMetadataFields.join(", ")}. Apply the Twenty application schema before list synchronization.`)
  }
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
    if (!twentyField) throw new Error(`Twenty company metadata field disappeared during apply: ${field.twentyFieldName}`)

    const options = selectOptionsForField(field, input.options)
    const twentyType = field.fieldType === "select" ? "SELECT" : field.fieldType === "multi_select" ? "MULTI_SELECT" : field.fieldType === "url" ? "LINKS" : "TEXT"
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

  const corePayload = await twentyMetadataRequest<TwentyCompanyListPayload>("/rest/companies?limit=1&depth=0")
  const coreCompany = corePayload.data?.companies?.[0]
  if (coreCompany) {
    const missingCoreFields = missingTwentyCrmFieldNames(input.fields, Object.keys(coreCompany))
    if (missingCoreFields.length > 0) {
      throw new Error(`Twenty Core API schema is stale; required fields are unavailable: ${missingCoreFields.join(", ")}. Restart the Twenty server to refresh the workspace schema before list synchronization.`)
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

export async function applyTwentyCrmMetadata(input: {
  fields: SalesCrmViewField[]
  options: SalesCrmSelectOption[]
}): Promise<import("./twenty-crm-metadata-db-apply").TwentyCrmMetadataApplyResult> {
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
