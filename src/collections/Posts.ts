import type { CollectionConfig } from "payload"
import { isAdmin, isAdminOrEditor, isLoggedIn } from "../access/byRole"
import { makeAfterChangeAudit, makeAfterDeleteAudit } from "../hooks/auditLog"
import { makeAutoTranslateHook } from "../lib/cms/autoTranslate"
import { AVAILABLE_LOCALE_OPTIONS } from "./_localeOptions"

export const Posts: CollectionConfig = {
  slug: "posts",
  admin: {
    useAsTitle: "title",
    defaultColumns: ["title", "status", "category", "locale", "publishedAt"],
    listSearchableFields: ["title", "excerpt", "category"],
    description: "ブログ記事の管理（日本語・英語）",
    group: "コンテンツ",
  },
  access: {
    read: isLoggedIn,
    create: isAdminOrEditor,
    update: isAdminOrEditor,
    delete: isAdmin,
  },
  versions: {
    drafts: {
      autosave: {
        interval: 1000,
      },
    },
    maxPerDoc: 10,
  },
  fields: [
    {
      name: "title",
      type: "text",
      label: "タイトル",
      required: true,
      localized: true,
    },
    {
      name: "slug",
      type: "text",
      label: "スラッグ（URL）",
      required: true,
      unique: true,
      admin: {
        description: "URLに使用される識別子。英数字とハイフンのみ",
      },
    },
    {
      name: "excerpt",
      type: "textarea",
      label: "概要",
      localized: true,
    },
    {
      name: "content",
      type: "richText",
      label: "本文",
      localized: true,
    },
    {
      name: "coverImage",
      type: "upload",
      label: "カバー画像",
      relationTo: "media",
    },
    {
      type: "row",
      fields: [
        {
          name: "category",
          type: "text",
          label: "カテゴリー",
          localized: true,
        },
        {
          name: "readTime",
          type: "text",
          label: "読了時間",
          defaultValue: "5分",
          localized: true,
        },
      ],
    },
    {
      name: "tags",
      type: "array",
      label: "タグ",
      fields: [
        {
          name: "tag",
          type: "text",
          label: "タグ",
        },
      ],
    },
    {
      name: "status",
      type: "select",
      label: "ステータス",
      options: [
        { label: "下書き", value: "draft" },
        { label: "公開", value: "published" },
      ],
      defaultValue: "draft",
      required: true,
      admin: {
        position: "sidebar",
      },
    },
    {
      name: "publishedAt",
      type: "date",
      label: "公開日時",
      admin: {
        position: "sidebar",
        date: {
          pickerAppearance: "dayAndTime",
        },
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
        description: "この記事を表示するロケール（複数選択可・12 locale）。",
      },
    },
    // 2026-05-01 audit cleanup: legacy `locale` field removed.
    // 旧 single-locale 値は `availableLocales` (multi-select) で代替。
    // Payload v3 では migration 経由で DB column を drop する必要あり (P19)。
    {
      name: "seo",
      type: "group",
      label: "SEO設定",
      admin: {
        position: "sidebar",
        description: "検索エンジン最適化",
      },
      fields: [
        {
          name: "metaTitle",
          type: "text",
          label: "メタタイトル",
          localized: true,
        },
        {
          name: "metaDescription",
          type: "textarea",
          label: "メタディスクリプション",
          localized: true,
        },
      ],
    },
  ],
  hooks: {
    beforeChange: [
      ({ data }) => {
        if (data.status === "published" && !data.publishedAt) {
          data.publishedAt = new Date().toISOString()
        }
        return data
      },
    ],
    afterChange: [
      makeAfterChangeAudit("posts"),
      makeAutoTranslateHook({ text: ["title", "excerpt", "category", "readTime"], rich: ["content"] }),
    ],
    afterDelete: [makeAfterDeleteAudit("posts")],
  },
}
