import crypto from "node:crypto"
import type { SalesCrmSelectOption, SalesCrmViewField } from "@/lib/sales/crm-field-config"

export const SELECT_FIELD_KEYS = new Set(["country", "region", "industry", "source", "sales_status"])
export const TWENTY_TEXT_ONLY_FIELD_KEYS = new Set(["region"])

interface TwentyOption {
  id: string
  label: string
  value: string
  color: string
  position: number
}

export function asArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[]
  if (value && typeof value === "object" && Array.isArray((value as { data?: unknown }).data)) {
    return (value as { data: T[] }).data
  }
  return []
}

export function env(name: string): string | null {
  const value = process.env[name]
  return value && value.trim().length > 0 ? value.trim() : null
}

export function twentyBaseUrl(): string | null {
  const base = env("TWENTY_BASE_URL")
  return base ? base.replace(/\/$/, "") : null
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

export function selectOptionsForField(field: SalesCrmViewField, options: SalesCrmSelectOption[]): TwentyOption[] {
  if (!SELECT_FIELD_KEYS.has(field.fieldKey)) return []
  return options
    .filter((option) => option.fieldKey === field.fieldKey && option.isActive)
    .sort((a, b) => a.position - b.position)
    .map((option) => toTwentyOption(field.twentyFieldName, option))
}

export function toTwentyFieldType(fieldType: SalesCrmViewField["fieldType"]): string {
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
