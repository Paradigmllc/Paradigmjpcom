import type { CollectionConfig } from "payload"

export const Users: CollectionConfig = {
  slug: "users",
  auth: true,
  admin: {
    useAsTitle: "email",
    defaultColumns: ["email", "name", "role"],
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
      ],
      defaultValue: "editor",
      required: true,
    },
  ],
}
