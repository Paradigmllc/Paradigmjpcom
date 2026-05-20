import type { CollectionConfig } from "payload"
import { isAdmin, isAdminOrEditor, isLoggedIn } from "../access/byRole"
import { makeAfterChangeAudit, makeAfterDeleteAudit } from "../hooks/auditLog"
import { makeAutoTranslateHook } from "../lib/cms/autoTranslate"
import { AVAILABLE_LOCALE_OPTIONS } from "./_localeOptions"

export const Services: CollectionConfig = {
  slug: "services",
  admin: {
    useAsTitle: "name",
    defaultColumns: ["name", "slug", "sortOrder", "locale"],
    description: "サービスの管理",
    group: "商材",
  },
  access: {
    read: isLoggedIn,
    create: isAdminOrEditor,
    update: isAdminOrEditor,
    delete: isAdmin,
  },
  versions: {
    drafts: { autosave: { interval: 1500 } },
    maxPerDoc: 10,
  },
  hooks: {
    afterChange: [
      makeAfterChangeAudit("services"),
      makeAutoTranslateHook({ text: ["name", "tagline"], rich: ["description"] }),
    ],
    afterDelete: [makeAfterDeleteAudit("services")],
  },
  fields: [
    {
      name: "name",
      type: "text",
      label: "サービス名",
      required: true,
      localized: true,
    },
    {
      name: "slug",
      type: "text",
      label: "スラッグ",
      required: true,
      unique: true,
    },
    {
      name: "tagline",
      type: "text",
      label: "キャッチコピー",
      localized: true,
    },
    {
      name: "description",
      type: "richText",
      label: "説明",
      localized: true,
    },
    {
      name: "icon",
      type: "text",
      label: "アイコン名（lucide-react）",
      admin: {
        description: "例: Globe, Search, Bot, MapPin",
      },
    },
    {
      name: "features",
      type: "array",
      label: "機能・特徴",
      fields: [
        {
          name: "feature",
          type: "text",
          label: "特徴",
          localized: true,
        },
      ],
    },
    {
      name: "sortOrder",
      type: "number",
      label: "表示順",
      defaultValue: 0,
      admin: {
        position: "sidebar",
      },
    },
    {
      name: "availableLocales",
      type: "select",
      label: "配信ロケール",
      hasMany: true,
      options: AVAILABLE_LOCALE_OPTIONS,
      defaultValue: ["ja"],
      required: true,
      admin: {
        position: "sidebar",
        description: "このサービスを表示するロケール（複数選択可）。12 locale から自由に組み合わせ可能。",
      },
    },
    // 2026-05-12 [DEPRECATED soft removal] — availableLocales (12-locale) に統合済み
    {
      name: "locale",
      type: "select",
      label: "⚠️ [DEPRECATED 2026-05-12] 旧言語フィールド",
      options: [
        { label: "日本語 (/ja)", value: "ja" },
        { label: "English (/en)", value: "en" },
        { label: "両方", value: "both" },
      ],
      admin: {
        position: "sidebar",
        disabled: true,
        description:
          "⚠️ このフィールドは 2026-05-12 に廃止されました。availableLocales を使用してください。",
        condition: (data) => Boolean(data?.locale),
      },
    },
    {
      name: "isActive",
      type: "checkbox",
      label: "有効",
      defaultValue: true,
      admin: {
        position: "sidebar",
      },
    },
  ],
}
