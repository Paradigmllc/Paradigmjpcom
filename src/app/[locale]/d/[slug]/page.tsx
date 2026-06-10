/**
 * paradigmjp.com /d/[slug] → Astro demo redirect
 *
 * All demo links now redirect to the professional Astro demo at
 * paradigm-astro-demo.pages.dev. The legacy iframe-based demo is retired.
 */
import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

export default async function PublicDemoPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  redirect(`https://paradigm-astro-demo.pages.dev/?slug=${encodeURIComponent(slug)}`)
}
