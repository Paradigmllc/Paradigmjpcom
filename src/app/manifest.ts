/**
 * app/manifest.ts — PWA Web App Manifest (locale-neutral)
 *
 * 役割: ホーム画面追加・standalone display・PWA インストール対応。
 * 出力: paradigmjp.com/manifest.webmanifest (Next.js File Convention).
 *
 * Note: theme_color は Aesop paper パレット (paradigm-paper #FAFAF7) ベース。
 *       icons は app/icon.tsx (動的生成) と public/ static の組合せ。
 */

import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Paradigm Japan Entry",
    short_name: "Paradigm",
    description: "$12,000 fixed Japan Entry setup. Standard managed operation is $2,000/month; the first 10 selected launch partners receive months 1–6 at $0/month.",
    start_url: "/en",
    display: "standalone",
    orientation: "portrait",
    background_color: "#FAFAF7",
    theme_color: "#1C1C2E",
    icons: [
      { src: "/icon", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png", purpose: "any" },
    ],
    categories: ["business", "productivity"],
    lang: "en",
    dir: "ltr",
  }
}
