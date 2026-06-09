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
        companyId: fields.text({
          label: "企業ID",
          validation: { isRequired: false },
        }),
        domain: fields.url({
          label: "対象URL",
          validation: { isRequired: false },
        }),
        industry: fields.text({
          label: "業界",
          defaultValue: "consulting",
        }),
        accentColor: fields.text({
          label: "アクセントカラー",
          defaultValue: "#7c3aed",
        }),
        accentColorDark: fields.text({
          label: "アクセントカラー（ダーク）",
          defaultValue: "#5b21b6",
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
        heroHeadline: fields.text({
          label: "ヒーロー見出し",
          multiline: true,
        }),
        heroSubtitle: fields.text({
          label: "ヒーローサブタイトル",
          multiline: true,
        }),
        serviceTitle: fields.text({
          label: "サービスセクションタイトル",
        }),
        services: fields.array(
          fields.object({
            title: fields.text({ label: "サービス名" }),
            description: fields.text({ label: "説明" }),
            icon: fields.text({ label: "アイコン名" }),
          }),
          {
            label: "サービス一覧",
            itemLabel: (props) => props.fields.title.value || "新規サービス",
          }
        ),
        caseTitle: fields.text({
          label: "導入実績タイトル",
        }),
        caseDescription: fields.text({
          label: "導入実績説明",
          multiline: true,
        }),
        caseMetrics: fields.array(
          fields.object({
            label: fields.text({ label: "指標名" }),
            value: fields.text({ label: "値" }),
            suffix: fields.text({ label: "単位" }),
          }),
          {
            label: "成果指標",
            itemLabel: (props) => props.fields.label.value || "新規指標",
          }
        ),
        ctaTitle: fields.text({
          label: "CTAタイトル",
        }),
        ctaBody: fields.text({
          label: "CTA本文",
          multiline: true,
        }),
        calBookingUrl: fields.url({
          label: "予約URL (Cal.com)",
          validation: { isRequired: false },
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
