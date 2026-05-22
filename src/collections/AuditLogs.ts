import type { CollectionConfig } from "payload"
import { isAdmin, isLoggedIn } from "../access/byRole"

export const AuditLogs: CollectionConfig = {
  slug: "audit-logs",
  labels: {
    singular: "監査ログ",
    plural: "監査ログ",
  },
  admin: {
    useAsTitle: "action",
    defaultColumns: ["createdAt", "collection", "action", "userEmail", "documentId"],
    listSearchableFields: ["collection", "documentId", "userEmail", "userRole"],
    pagination: { defaultLimit: 50, limits: [25, 50, 100] },
    description: "コレクション変更の監査ログ（自動記録・読み取り専用）。新しい順に表示。",
    group: "設定",
  },
  access: {
    read: isLoggedIn,
    create: () => false,
    update: () => false,
    delete: isAdmin,
  },
  fields: [
    {
      name: "collection",
      type: "text",
      label: "コレクション",
      required: true,
      index: true,
    },
    {
      name: "action",
      type: "select",
      label: "操作",
      required: true,
      defaultValue: "update",
      options: [
        { label: "作成", value: "create" },
        { label: "更新", value: "update" },
        { label: "削除", value: "delete" },
      ],
    },
    {
      name: "documentId",
      type: "text",
      label: "ドキュメントID",
      index: true,
    },
    {
      name: "userEmail",
      type: "email",
      label: "ユーザー",
    },
    {
      name: "userRole",
      type: "text",
      label: "ロール",
    },
    {
      name: "diff",
      type: "code",
      label: "差分",
      admin: {
        language: "json",
        description: "変更前/変更後のJSON差分（最大8KB）",
      },
    },
  ],
  timestamps: true,
}
