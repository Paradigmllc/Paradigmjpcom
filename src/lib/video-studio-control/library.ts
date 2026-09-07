import { z } from "zod"

export const LIBRARY_EVENT = "video_studio_library_version"
export const libraryKinds = ["template", "character", "recipe"] as const
export const referenceRoles = ["identity", "voice", "composition", "model", "workflow", "runtime", "preview"] as const
const digest = z.string().regex(/^[a-f0-9]{64}$/, "SHA-256は小文字の16進数64文字です")
const shortText = z.string().trim().min(1).max(160)
const reference = z.object({
  role: z.enum(referenceRoles),
  // Stable inventory identifier, never a URL, credential, or executable path.
  assetId: z.string().trim().min(1).max(160).regex(/^[a-zA-Z0-9][a-zA-Z0-9._/-]*$/)
    .refine((value) => !value.split("/").some((part) => part === "." || part === "..")),
  sha256: digest,
}).strict()

export const librarySpecSchema = z.object({
  kind: z.enum(libraryKinds), name: shortText, genre: shortText,
  direction: z.string().trim().min(1).max(4000),
  limitations: z.string().trim().min(1).max(2000),
  references: z.array(reference).max(24),
  settings: z.object({
    seed: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER).nullable(),
    steps: z.number().int().min(1).max(200).nullable(),
    width: z.number().int().min(128).max(8192), height: z.number().int().min(128).max(8192),
    fps: z.number().int().min(1).max(120), durationSeconds: z.number().positive().max(1800),
  }).strict(),
  character: z.object({
    identityDescription: z.string().trim().min(1).max(2000),
    wardrobe: z.string().trim().min(1).max(1000),
    adultFictional: z.literal(true),
  }).strict().nullable(),
}).strict().superRefine((value, context) => {
  if ((value.kind === "character") !== (value.character !== null)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["character"], message: "人物設定は成人の架空キャラクターにのみ指定します" })
  }
  const ids = value.references.map((item) => `${item.role}:${item.assetId}`)
  if (new Set(ids).size !== ids.length) context.addIssue({ code: z.ZodIssueCode.custom, path: ["references"], message: "同じ参照素材が重複しています" })
})

export const librarySaveSchema = z.object({
  operationId: z.string().uuid(), entryId: z.string().uuid(), parentVersionId: z.string().uuid().nullable(),
  spec: librarySpecSchema,
}).strict().refine((value) => value.parentVersionId !== null || value.operationId === value.entryId, {
  message: "初版の登録IDが一致しません", path: ["entryId"],
})
export type LibrarySpec = z.infer<typeof librarySpecSchema>
export type LibrarySave = z.infer<typeof librarySaveSchema>
export type LibraryVersion = LibrarySave & { createdAt: string; contentHash: string; status: "draft"; blockers: string[] }
export type LibraryPage = { versions: LibraryVersion[]; nextOffset: number | null; canWrite: boolean }

// Canonical metadata fingerprint, not proof that declared files exist or render identically.
export function canonicalLibrary(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalLibrary).join(",")}]`
  if (value !== null && typeof value === "object") {
    const row = value as Record<string, unknown>
    return `{${Object.keys(row).sort().map((key) => `${JSON.stringify(key)}:${canonicalLibrary(row[key])}`).join(",")}}`
  }
  return JSON.stringify(value)
}

export function libraryBlockers(spec: LibrarySpec): string[] {
  const roles = new Set(spec.references.map((item) => item.role))
  const missing = (spec.kind === "character" ? ["identity", "voice"] : spec.kind === "template" ? ["composition"] : ["model", "workflow", "runtime"])
    .filter((role) => !roles.has(role as typeof referenceRoles[number]))
  return [
    ...missing.map((role) => `参照未登録: ${role}`),
    ...(spec.kind === "recipe" && (spec.settings.seed === null || spec.settings.steps === null) ? ["seed・steps未固定"] : []),
    "素材本体・SHA-256・利用条件のサーバー検証は未実施",
    "本設定での実生成・人物一貫性・完成映像レビューは未実施",
    "生成パイプラインへの適用は未接続（登録だけでは課金しません）",
  ]
}
