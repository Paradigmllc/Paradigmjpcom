import type { CollectionConfig } from "payload"

export const Leads: CollectionConfig = {
  slug: "leads",
  admin: {
    useAsTitle: "companyName",
    defaultColumns: ["companyName", "name", "email", "pipelineStage", "source", "createdAt"],
    description: "お問い合わせ・リードの管理",
    group: "営業",
  },
  access: {
    create: () => true, // フォームからの送信を許可
    read: ({ req }) => !!req.user, // ログイン済みのみ閲覧
    update: ({ req }) => !!req.user,
    delete: ({ req }) => req.user?.role === "admin",
  },
  fields: [
    {
      name: "name",
      type: "text",
      label: "氏名",
      required: true,
    },
    {
      name: "companyName",
      type: "text",
      label: "会社名",
    },
    {
      name: "email",
      type: "email",
      label: "メールアドレス",
      required: true,
    },
    {
      name: "phone",
      type: "text",
      label: "電話番号",
    },
    {
      name: "subject",
      type: "text",
      label: "件名",
    },
    {
      name: "message",
      type: "textarea",
      label: "メッセージ",
    },
    {
      name: "serviceInterest",
      type: "select",
      label: "興味のあるサービス",
      options: [
        { label: "Web制作", value: "web" },
        { label: "MEO対策", value: "meo" },
        { label: "SEO・GEO対策", value: "seo" },
        { label: "AI導入支援", value: "ai" },
        { label: "Japan Entry Package", value: "japan-entry" },
        { label: "その他", value: "other" },
      ],
    },
    {
      name: "budget",
      type: "text",
      label: "予算感",
    },
    {
      name: "pipelineStage",
      type: "select",
      label: "パイプラインステージ",
      options: [
        { label: "新規", value: "new" },
        { label: "商談中", value: "in_discussion" },
        { label: "提案済み", value: "proposal_sent" },
        { label: "成約", value: "closed_won" },
        { label: "不成約", value: "closed_lost" },
      ],
      defaultValue: "new",
      admin: {
        position: "sidebar",
      },
    },
    {
      name: "source",
      type: "text",
      label: "流入元",
      defaultValue: "paradigmjp.com",
      admin: {
        position: "sidebar",
      },
    },
    {
      name: "locale",
      type: "select",
      label: "問い合わせ言語",
      options: [
        { label: "日本語", value: "ja" },
        { label: "English", value: "en" },
      ],
      defaultValue: "ja",
      admin: {
        position: "sidebar",
      },
    },
    {
      name: "notes",
      type: "textarea",
      label: "社内メモ",
      admin: {
        position: "sidebar",
        description: "顧客には非表示",
      },
    },
  ],
  timestamps: true,
}
