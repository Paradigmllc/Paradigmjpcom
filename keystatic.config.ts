import { collection, config, fields } from "@keystatic/core"

export default config({
  storage: {
    kind: "local",
  },
  collections: {
    demoSites: collection({
      label: "デモサイト",
      slugField: "title",
      path: "content/keystatic/demo-sites/*",
      format: { contentField: "body" },
      schema: {
        title: fields.slug({
          name: { label: "ページ名" },
        }),
        customerName: fields.text({
          label: "顧客名",
        }),
        domain: fields.url({
          label: "対象URL",
          validation: { isRequired: false },
        }),
        status: fields.select({
          label: "状態",
          defaultValue: "draft",
          options: [
            { label: "下書き", value: "draft" },
            { label: "レビュー中", value: "review" },
            { label: "公開準備", value: "ready" },
          ],
        }),
        body: fields.markdoc({
          label: "構成メモ",
        }),
      },
    }),
    salesPages: collection({
      label: "営業LP",
      slugField: "title",
      path: "content/keystatic/sales-pages/*",
      format: { contentField: "body" },
      schema: {
        title: fields.slug({
          name: { label: "ページ名" },
        }),
        locale: fields.select({
          label: "言語",
          defaultValue: "ja",
          options: [
            { label: "日本語", value: "ja" },
            { label: "English", value: "en" },
          ],
        }),
        targetSegment: fields.text({
          label: "対象セグメント",
        }),
        body: fields.markdoc({
          label: "本文",
        }),
      },
    }),
  },
})
