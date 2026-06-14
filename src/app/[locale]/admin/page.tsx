import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

interface Props {
  params: Promise<{ locale: string }>
}

export default async function AdminIndexPage({ params }: Props) {
  const { locale } = await params
  redirect(`/${locale}/admin/sales`)
}
