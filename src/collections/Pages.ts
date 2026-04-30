import type { CollectionConfig } from "payload"
import { isAdmin, isAdminOrEditor, isLoggedIn } from "../access/byRole"
import { makeAfterChangeAudit, makeAfterDeleteAudit } from "../hooks/auditLog"

import { HeroBlock } from "../blocks/Hero"
import { SectionBlock } from "../blocks/Section"
import { CardGridBlock } from "../blocks/CardGrid"
import { CTABlock } from "../blocks/CTA"
import { FAQBlock } from "../blocks/FAQ"
import { RichTextBlock } from "../blocks/RichText"

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
      url: ({ data }) => {
        const slug = (data as { slug?: string } | undefined)?.slug ?? ""
        return `${process.env.PAYLOAD_PUBLIC_SERVER_URL ?? "https://paradigmjp.com"}/ja/cms/${slug}?draft=true`
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
      ],
    },
    {
      name: "availableLocales",
      type: "select",
      label: "配信ロケール",
      hasMany: true,
      options: [
        { label: "日本語 (/ja)", value: "ja" },
        { label: "English (/en)", value: "en" },
        { label: "한국어 (/ko)", value: "ko" },
        { label: "中文 (/zh)", value: "zh" },
      ],
      defaultValue: ["ja", "en"],
      required: true,
      admin: { position: "sidebar" },
    },
    {
      name: "isHomepage",
      type: "checkbox",
      label: "このページをホームに使う (true なら / にも配信)",
      defaultValue: false,
      admin: { position: "sidebar" },
    },
  ],
}
