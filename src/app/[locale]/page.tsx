/**
 * /[locale] — Aesop-style luxury homepage
 *
 * All 12 locales render the same Aesop 8-band cinematic composition (HomeClient).
 * Next-intl translations handle locale-specific text via the "home" namespace.
 *
 * 入力:   params.locale (12 locales)
 * 出力:   <HomeClient> (next-intl aware)
 */

import HomeClient from "./HomeClient"

export const dynamic = "force-dynamic"

export default function HomePage() {
  return <HomeClient />
}
