import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { OpportunityBrandPage } from "@/components/opportunities/OpportunityBrandPage"
import {
  OPPORTUNITY_BRAND_SLUGS,
  getOpportunityBrand,
  isOpportunityBrandSlug,
} from "@/lib/opportunities/brands"
import { pageAlternates } from "@/lib/page-metadata"

interface Props {
  params: Promise<{ locale: string; brand: string }>
}

export function generateStaticParams() {
  return OPPORTUNITY_BRAND_SLUGS.map((brand) => ({ brand }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, brand: rawBrand } = await params
  if (!isOpportunityBrandSlug(rawBrand)) return {}
  const brand = getOpportunityBrand(rawBrand, locale)
  return {
    title: brand.name,
    description: brand.description,
    alternates: pageAlternates(locale, `/japan-opportunities/${brand.slug}`),
  }
}

export default async function OpportunityBrandRoute({ params }: Props) {
  const { locale, brand: rawBrand } = await params
  if (!isOpportunityBrandSlug(rawBrand)) notFound()
  const brand = getOpportunityBrand(rawBrand, locale)
  return <OpportunityBrandPage brand={brand} locale={locale} />
}
