import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "動画制作ライン | Paradigm",
  description: "Paradigm Revenue OS の OpenMontage / n8n 連携ジョブ投入画面",
  robots: "noindex,nofollow",
}

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return children
}
