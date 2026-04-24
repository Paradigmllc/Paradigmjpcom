import type { CollectionConfig } from "payload"
import { isAdmin, isAdminOrEditor, isLoggedIn } from "../access/byRole"
import { makeAfterChangeAudit, makeAfterDeleteAudit } from "../hooks/auditLog"

export const Media: CollectionConfig = {
  slug: "media",
  admin: {
    useAsTitle: "alt",
    description: "画像・ファイルの管理（thumb=一覧・card=カード・hero=ヒーロー・og=OGP）",
    group: "メディア",
  },
  access: {
    read: () => true,
    create: isAdminOrEditor,
    update: isAdminOrEditor,
    delete: isAdmin,
  },
  hooks: {
    afterChange: [makeAfterChangeAudit("media")],
    afterDelete: [makeAfterDeleteAudit("media")],
  },
  upload: {
    staticDir: "public/media",
    imageSizes: [
      {
        name: "thumb",
        width: 400,
        height: undefined,
        position: "centre",
      },
      {
        name: "card",
        width: 800,
        height: undefined,
        position: "centre",
      },
      {
        name: "hero",
        width: 1920,
        height: undefined,
        position: "centre",
      },
      {
        name: "og",
        width: 1200,
        height: 630,
        position: "centre",
      },
    ],
    adminThumbnail: "thumb",
    focalPoint: true,
    mimeTypes: ["image/*", "application/pdf"],
  },
  fields: [
    {
      name: "alt",
      type: "text",
      label: "代替テキスト（alt）",
      required: true,
      localized: true,
    },
    {
      name: "caption",
      type: "text",
      label: "キャプション",
      localized: true,
    },
  ],
}
