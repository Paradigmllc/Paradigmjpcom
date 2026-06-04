import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "OpenMontage | Paradigm",
  description: "OpenMontage公式OSS入口へリダイレクトします。",
  robots: "noindex,nofollow",
}

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return children
}
