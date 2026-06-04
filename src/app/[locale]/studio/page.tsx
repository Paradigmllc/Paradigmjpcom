import type { Metadata } from "next"
import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"
export const revalidate = 0

export const metadata: Metadata = {
  title: "OpenMontage | Paradigm Revenue OS",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false },
  },
}

export default async function StudioPage() {
  redirect("https://github.com/calesthio/OpenMontage")
}
