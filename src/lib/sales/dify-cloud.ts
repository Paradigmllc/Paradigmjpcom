export const DIFY_CLOUD_BASE_URL = "https://api.dify.ai"

export const DIFY_DIAGNOSIS_WORKFLOW_KEY_ENV_NAMES = [
  "DIFY_DIAGNOSIS_API_KEY",
  "DIFY_KARTE_TO_REPORT_API_KEY",
  "DIFY_KARTE_TO_REPORT_KEY",
  "DIFY_KARTE_TO_SALES_MATERIAL_API_KEY",
  "DIFY_KARTE_TO_SALES_MATERIAL_KEY",
  "DIFY_API_KEY",
] as const

export const DIFY_WORKFLOW_ENV_GROUPS = {
  default: ["DIFY_API_KEY"],
  localeJa: ["DIFY_API_KEY_JA", "DIFY_API_KEY"],
  localeEn: ["DIFY_API_KEY_EN", "DIFY_API_KEY"],
  diagnosis: DIFY_DIAGNOSIS_WORKFLOW_KEY_ENV_NAMES,
  formMessage: ["DIFY_FORM_MESSAGE_API_KEY", "DIFY_FORM_MESSAGE_KEY", "DIFY_API_KEY"],
  templatePicker: ["DIFY_TEMPLATE_PICKER_API_KEY", "DIFY_TEMPLATE_PICKER_KEY", "DIFY_API_KEY"],
  video: [
    "DIFY_VIDEO_WORKFLOW_API_KEY",
    "DIFY_VIDEO_API_KEY",
    "DIFY_KARTE_TO_SALES_MATERIAL_API_KEY",
    "DIFY_KARTE_TO_SALES_MATERIAL_KEY",
    "DIFY_API_KEY",
  ],
  karteToReport: [
    "DIFY_KARTE_TO_REPORT_API_KEY",
    "DIFY_KARTE_TO_REPORT_KEY",
    "DIFY_DIAGNOSIS_API_KEY",
    "DIFY_API_KEY",
  ],
  karteToSalesMaterial: [
    "DIFY_KARTE_TO_SALES_MATERIAL_API_KEY",
    "DIFY_KARTE_TO_SALES_MATERIAL_KEY",
    "DIFY_FORM_MESSAGE_API_KEY",
    "DIFY_API_KEY",
  ],
} as const

export type DifyWorkflowGroup = keyof typeof DIFY_WORKFLOW_ENV_GROUPS

export const DIFY_RUNTIME_KEY_ENV_NAMES = Array.from(
  new Set(Object.values(DIFY_WORKFLOW_ENV_GROUPS).flat()),
)

export const DIFY_RUNTIME_URL_ENV_NAMES = [
  "DIFY_BASE_URL",
  "DIFY_DIAGNOSIS_BASE_URL",
  "DIFY_DIAGNOSIS_API_URL",
  "DIFY_FORM_MESSAGE_BASE_URL",
  "DIFY_FORM_MESSAGE_API_URL",
  "DIFY_VIDEO_WORKFLOW_BASE_URL",
  "DIFY_VIDEO_WORKFLOW_API_URL",
] as const

function optionalEnv(name: string): string | null {
  const value = process.env[name]
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null
}

function isDifyCloudUrl(value: string): boolean {
  try {
    return new URL(value).hostname === "api.dify.ai"
  } catch {
    return false
  }
}

export function normalizeDifyCloudBaseUrl(value?: string | null): string {
  if (!value) return DIFY_CLOUD_BASE_URL
  const trimmed = value.trim().replace(/\/+$/, "")
  return isDifyCloudUrl(trimmed) ? trimmed : DIFY_CLOUD_BASE_URL
}

export function normalizeDifyCloudApiUrl(value?: string | null): string {
  if (!value) return `${DIFY_CLOUD_BASE_URL}/v1/workflows/run`
  const trimmed = value.trim()
  return isDifyCloudUrl(trimmed) ? trimmed : `${DIFY_CLOUD_BASE_URL}/v1/workflows/run`
}

export function resolveDifyWorkflowKey(groups: DifyWorkflowGroup[]): string | null {
  for (const group of groups) {
    for (const envName of DIFY_WORKFLOW_ENV_GROUPS[group]) {
      if (optionalEnv(envName)) return envName
    }
  }
  return null
}

export function getDifyCloudRuntimeConfig(groups: DifyWorkflowGroup[] = ["default"]) {
  const configuredGroups = groups.filter((group) => resolveDifyWorkflowKey([group]) !== null)
  const missingGroups = groups.filter((group) => !configuredGroups.includes(group))
  const baseUrl = normalizeDifyCloudBaseUrl(
    optionalEnv("DIFY_VIDEO_WORKFLOW_BASE_URL") ??
      optionalEnv("DIFY_DIAGNOSIS_BASE_URL") ??
      optionalEnv("DIFY_FORM_MESSAGE_BASE_URL") ??
      optionalEnv("DIFY_BASE_URL"),
  )
  const workflowUrl = normalizeDifyCloudApiUrl(
    optionalEnv("DIFY_VIDEO_WORKFLOW_API_URL") ??
      optionalEnv("DIFY_DIAGNOSIS_API_URL") ??
      optionalEnv("DIFY_FORM_MESSAGE_API_URL") ??
      `${baseUrl}/v1/workflows/run`,
  )

  return {
    provider: "dify_cloud" as const,
    baseUrl,
    workflowUrl,
    ready: configuredGroups.length > 0,
    configuredGroups,
    missingGroups,
    configuredEnvNames: DIFY_RUNTIME_KEY_ENV_NAMES.filter((name) => optionalEnv(name) !== null),
    secretValuesInPayload: false,
  }
}
