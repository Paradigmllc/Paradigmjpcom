import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { pageAlternates } from "@/lib/page-metadata"
import LegalDocumentPage from "@/components/LegalDocumentPage"

export const dynamic = "force-dynamic"

interface Props { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "refundPage" })
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: pageAlternates(locale, "/refund"),
  }
}

export default async function RefundPage({ params }: Props) {
  const { locale } = await params
  return <LegalDocumentPage locale={locale} namespace="refundPage" />
}
