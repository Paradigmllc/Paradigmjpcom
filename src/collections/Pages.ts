import type { CollectionConfig } from "payload"
import { isAdmin, isAdminOrEditor, isLoggedIn } from "../access/byRole"
import { makeAfterChangeAudit, makeAfterDeleteAudit } from "../hooks/auditLog"
import { AVAILABLE_LOCALE_OPTIONS } from "./_localeOptions"

import { HeroBlock } from "../blocks/Hero"
import { SectionBlock } from "../blocks/Section"
import { CardGridBlock } from "../blocks/CardGrid"
import { CTABlock } from "../blocks/CTA"
import { FAQBlock } from "../blocks/FAQ"
import { RichTextBlock } from "../blocks/RichText"
import { StatsBlock } from "../blocks/Stats"
import { TestimonialsBlock } from "../blocks/Testimonials"
import { ProcessBlock } from "../blocks/Process"
import { MarqueeBlock } from "../blocks/Marquee"
import { ComparisonBlock } from "../blocks/Comparison"

/**
 * Pages collection — Block ベースの Visual Page Builder
 *
 * 2026-04-30 ユーザ指示「PayloadCMS でサイトのデザイン、コンテンツなどを高度
 * カスタマイズできるようにフル実装して」対応。
 *
 * 役割:
 *   ・HomePage / AboutPage / 各 LP / カスタムページ等を CMS 編集可能にする
 *   ・layout (Block 配列) を組み合わせるだけでページ構成可能
 *   ・/[locale]/cms/[[...slug]]/page.tsx (dynamic route) で render
 *
 * Block 種:
 *   Hero / Section / CardGrid / CTA / FAQ / RichText (6 種・拡張可能)
 *
 * 永久ルール (CLAUDE.md s10-6 AE-PHP-6):
 *   新規ページ追加 = Pages collection で create するだけ・コード追加不要
 *   ハードコード Page を増やすのは禁止 (例外: 認証/middleware 必須ページ)
 */
export const Pages: CollectionConfig = {
  slug: "pages",
  admin: {
    useAsTitle: "title",
    defaultColumns: ["title", "slug", "_status", "updatedAt"],
    description: "Block ベースのビジュアルページ (Hero/Section/CardGrid/CTA/FAQ/RichText 等を組み合わせ)",
    group: "サイト",
    livePreview: {
      // locale-aware: admin が編集中の locale (document locale) で preview。
      // Payload v3 では callback の第 2 引数経由で document locale を取得できる。
      // fallback は ja。
      url: ({ data, locale }) => {
        const slug = (data as { slug?: string } | undefined)?.slug ?? ""
        const previewLocale =
          (typeof locale === "object" && locale && "code" in locale
            ? (locale as { code: string }).code
            : undefined) ??
          (typeof locale === "string" ? locale : undefined) ??
          "ja"
        return `${process.env.PAYLOAD_PUBLIC_SERVER_URL ?? "https://paradigmjp.com"}/${previewLocale}/cms/${slug}?draft=true`
      },
    },
  },
  access: {
    read: () => true, // 公開ページなので全員 read 可能
    create: isAdminOrEditor,
    update: isAdminOrEditor,
    delete: isAdmin,
  },
  versions: {
    drafts: { autosave: { interval: 2000 } },
    maxPerDoc: 20,
  },
  hooks: {
    afterChange: [makeAfterChangeAudit("pages")],
    afterDelete: [makeAfterDeleteAudit("pages")],
  },
  fields: [
    {
      name: "title",
      type: "text",
      label: "ページタイトル (ブラウザタブ用)",
      required: true,
      localized: true,
    },
    {
      name: "slug",
      type: "text",
      label: "スラッグ (URL: /{locale}/cms/{slug})",
      required: true,
      unique: true,
      admin: {
        description: "例: about-us, why-paradigm, japan-entry-guide",
      },
    },
    {
      name: "description",
      type: "textarea",
      label: "メタ description (SEO 用・150 字以内推奨)",
      localized: true,
      admin: { description: "Open Graph + Twitter Card にも使われます" },
    },
    {
      name: "ogImage",
      type: "upload",
      relationTo: "media",
      label: "OG 画像 (1200×630 px 推奨)",
    },
    // 2026-05-01 audit fix: Posts と同じ SEO group を Pages にも追加
    {
      name: "seo",
      type: "group",
      label: "SEO 設定 (詳細)",
      admin: {
        position: "sidebar",
        description: "title / description / canonical / robots — page.tsx の generateMetadata から参照",
      },
      fields: [
        {
          name: "metaTitle",
          type: "text",
          label: "メタタイトル (空のとき title を使用)",
          localized: true,
        },
        {
          name: "metaDescription",
          type: "textarea",
          label: "メタディスクリプション (空のとき description を使用)",
          localized: true,
        },
        {
          name: "noindex",
          type: "checkbox",
          label: "noindex (検索エンジンにインデックスさせない)",
          defaultValue: false,
        },
        {
          name: "canonical",
          type: "text",
          label: "canonical URL (空のとき自動生成)",
        },
      ],
    },
    {
      name: "layout",
      type: "blocks",
      label: "レイアウト (Block を組み合わせる)",
      minRows: 1,
      blocks: [
        HeroBlock,
        SectionBlock,
        CardGridBlock,
        CTABlock,
        FAQBlock,
        RichTextBlock,
        StatsBlock,
        TestimonialsBlock,
        ProcessBlock,
        MarqueeBlock,
        ComparisonBlock,
      ],
    },
    {
      name: "availableLocales",
      type: "select",
      label: "配信ロケール",
      hasMany: true,
      options: AVAILABLE_LOCALE_OPTIONS,
      defaultValue: ["ja", "en"],
      required: true,
      admin: {
        position: "sidebar",
        description: "12 locale から多選択。ja/en は独自設計母版・他10ロケールは翻訳版として展開。",
      },
    },
    {
      name: "isHomepage",
      type: "checkbox",
      label: "このページをホームに使う (true なら / にも配信)",
      defaultValue: false,
      admin: { position: "sidebar" },
    },
    // 2026-05-12 [DEPRECATED soft removal]: 旧 single-locale フィールド。
    // 新規 entry は availableLocales (12-locale multi-select) を使用してください。
    // 既存データ保護のため `condition` で値が入っているドキュメントだけ表示し、
    // `disabled: true` で読み取り専用化。DB column は migration P19 で drop 予定。
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
          "⚠️ このフィールドは 2026-05-12 に廃止されました。availableLocales を使用してください。" +
          "既存データ移行後に DB 列も drop 予定。",
        condition: (data) => Boolean(data?.locale),
      },
    },
  ],
}
