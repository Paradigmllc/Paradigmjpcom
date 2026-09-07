"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { libraryKinds, referenceRoles, type LibrarySpec } from "@/lib/video-studio-control/library"

export const kindLabels = { template: "テンプレート", character: "キャラクター", recipe: "生成レシピ" } as const
const control = "min-h-10 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"

export function newLibrarySpec(): LibrarySpec {
  return { kind: "template", name: "", genre: "", direction: "", limitations: "",
    references: [], character: null,
    settings: { seed: null, steps: null, width: 1080, height: 1920, fps: 24, durationSeconds: 30 } }
}

export function StudioLibraryForm({ value, onChange, locked, derived }: {
  value: LibrarySpec; onChange: (spec: LibrarySpec) => void; locked: boolean; derived: boolean
}) {
  const field = (key: "name" | "genre" | "direction" | "limitations", text: string) => onChange({ ...value, [key]: text })
  return <fieldset disabled={locked} className="grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-3">
    <label className="space-y-1 text-sm">登録種別<select aria-label="登録種別" className={control} disabled={derived} value={value.kind} onChange={(event) => {
      const kind = libraryKinds.find((item) => item === event.target.value)
      if (kind) onChange({ ...value, kind, character: kind === "character" ? { identityDescription: "", wardrobe: "", adultFictional: true } : null })
    }}>{libraryKinds.map((kind) => <option key={kind} value={kind}>{kindLabels[kind]}</option>)}</select></label>
    <label className="space-y-1 text-sm">ライブラリ名<Input value={value.name} maxLength={160} onChange={(event) => field("name", event.target.value)} /></label>
    <label className="space-y-1 text-sm">ジャンル<Input value={value.genre} maxLength={160} placeholder="例: 実写ドラマ / 解説 / アニメ" onChange={(event) => field("genre", event.target.value)} /></label>
    <label className="space-y-1 text-sm sm:col-span-2 lg:col-span-3">演出・固定したい条件<textarea className={control} rows={3} maxLength={4000} value={value.direction} onChange={(event) => field("direction", event.target.value)} /></label>
    <label className="space-y-1 text-sm sm:col-span-2 lg:col-span-3">利用条件・既知の制約<textarea className={control} rows={2} maxLength={2000} placeholder="権利の出典、未検証の動作、苦手なカットなど。秘密情報は入力しないでください。" value={value.limitations} onChange={(event) => field("limitations", event.target.value)} /></label>
    {value.character && <>
      <label className="space-y-1 text-sm sm:col-span-2">人物設定（成人の架空人物のみ）<textarea className={control} rows={3} maxLength={2000} value={value.character.identityDescription} onChange={(event) => onChange({ ...value, character: { ...value.character!, identityDescription: event.target.value } })} /></label>
      <label className="space-y-1 text-sm">衣装・外見<Input maxLength={1000} value={value.character.wardrobe} onChange={(event) => onChange({ ...value, character: { ...value.character!, wardrobe: event.target.value } })} /></label>
    </>}
    {([
      ["width", "幅 (px)", 128, 8192], ["height", "高さ (px)", 128, 8192], ["fps", "フレームレート", 1, 120],
      ["durationSeconds", "尺 (秒)", 0.01, 1800], ["seed", "seed（未固定なら空欄）", 0, Number.MAX_SAFE_INTEGER], ["steps", "steps（未固定なら空欄）", 1, 200],
    ] as const).map(([key, label, min, max]) => <label key={key} className="space-y-1 text-sm">{label}<Input type="number" min={min} max={max} step={key === "durationSeconds" ? "0.01" : "1"} value={value.settings[key] ?? ""} onChange={(event) => onChange({ ...value, settings: { ...value.settings, [key]: event.target.value === "" && (key === "seed" || key === "steps") ? null : Number(event.target.value) } })} /></label>)}
    <div className="min-w-0 space-y-3 sm:col-span-2 lg:col-span-3">
      <p className="text-sm font-semibold">参照素材・モデルの宣言</p>
      <p className="text-xs text-zinc-600">素材IDとSHA-256を記録します。ファイルのアップロード・実在検証ではありません。URL・認証情報は登録しないでください。</p>
      {value.references.map((reference, index) => <div key={index} className="grid gap-2 rounded border p-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-xs">役割<select aria-label={`参照${index + 1}の役割`} className={control} value={reference.role} onChange={(event) => {
          const role = referenceRoles.find((item) => item === event.target.value)
          if (role) onChange({ ...value, references: value.references.map((item, i) => i === index ? { ...item, role } : item) })
        }}>{referenceRoles.map((role) => <option key={role}>{role}</option>)}</select></label>
        <label className="text-xs">素材ID<Input aria-label={`参照${index + 1}の素材ID`} maxLength={160} value={reference.assetId} onChange={(event) => onChange({ ...value, references: value.references.map((item, i) => i === index ? { ...item, assetId: event.target.value } : item) })} /></label>
        <label className="text-xs">SHA-256<Input aria-label={`参照${index + 1}のSHA-256`} maxLength={64} value={reference.sha256} onChange={(event) => onChange({ ...value, references: value.references.map((item, i) => i === index ? { ...item, sha256: event.target.value } : item) })} /></label>
        <Button type="button" variant="outline" aria-label={`参照${index + 1}を削除`} onClick={() => onChange({ ...value, references: value.references.filter((_, i) => i !== index) })}>参照を削除</Button>
      </div>)}
      <Button type="button" variant="outline" disabled={value.references.length >= 24} onClick={() => onChange({ ...value, references: [...value.references, { role: "composition", assetId: "", sha256: "" }] })}>参照を追加</Button>
    </div>
  </fieldset>
}
