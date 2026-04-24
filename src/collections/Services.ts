import type { CollectionConfig } from "payload"
import { isAdmin, isAdminOrEditor, isLoggedIn } from "../access/byRole"
import { makeAfterChangeAudit, makeAfterDeleteAudit } from "../hooks/auditLog"

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
    afterChange: [makeAfterChangeAudit("services")],
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
      options: [
        { label: "日本語 (/ja)", value: "ja" },
        { label: "English (/en)", value: "en" },
      ],
      defaultValue: ["ja"],
      required: true,
      admin: {
        position: "sidebar",
        description: "このサービスを表示するロケール（複数選択可）。EN/JAで異なる商品カタログを出せる。",
      },
    },
    {
      name: "locale",
      type: "select",
      label: "[legacy] 言語",
      options: [
        { label: "日本語 (/ja)", value: "ja" },
        { label: "English (/en)", value: "en" },
        { label: "両方", value: "both" },
      ],
      admin: {
        position: "sidebar",
        description: "非推奨: availableLocalesを使用してください。バックワードコンパチ用。",
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
