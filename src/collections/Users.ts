import type { CollectionConfig } from "payload"
import { isAdmin, isLoggedIn, isSelfOrAdmin } from "../access/byRole"

export const Users: CollectionConfig = {
  slug: "users",
  auth: {
    maxLoginAttempts: 5,
    lockTime: 600,
    // 既定の2時間だと /admin タブが見た目ログイン済みのままトークンだけ失効し、
    // Cookie 連携先 (media-os スタジオ等) が「ログイン済みなのに弾かれる」状態になる。
    // 社内 CMS なので14日にする。
    tokenExpiration: 60 * 60 * 24 * 14,
  },
  admin: {
    useAsTitle: "email",
    defaultColumns: ["email", "name", "role"],
    description: "CMSユーザー管理（admin=全権 / editor=編集 / viewer=閲覧のみ）",
    group: "設定",
  },
  access: {
    read: isLoggedIn,
    create: isAdmin,
    update: isSelfOrAdmin,
    delete: isAdmin,
    admin: ({ req }) => Boolean(req.user),
  },
  fields: [
    {
      name: "name",
      type: "text",
      label: "名前",
    },
    {
      name: "role",
      type: "select",
      label: "ロール",
      options: [
        { label: "管理者", value: "admin" },
        { label: "編集者", value: "editor" },
        { label: "閲覧者", value: "viewer" },
      ],
      defaultValue: "editor",
      required: true,
      access: {
        update: ({ req }) => (req.user as { role?: string } | undefined)?.role === "admin",
      },
      admin: {
        description: "admin=全権 / editor=本番データ作成更新 / viewer=読み取りのみ",
      },
    },
  ],
}
