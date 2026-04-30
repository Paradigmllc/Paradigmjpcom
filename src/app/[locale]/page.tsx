/**
 * /[locale] — Aesop-style luxury homepage (8-band cinematic composition)
 *
 * 役割:   Aesop-style luxury homepage (8-band cinematic composition)
 * 入力:   params.locale (12 locales)
 * 出力:   HomeClient with Hero/Marquee/Services/Process/Stats/Features/Testimonials/CTA
 *
 * AE-PHP-4 準拠 (各 page.tsx に役割/入力/出力 を明示)。
 */
import HomeClient from "./HomeClient"

export default function HomePage() {
  return <HomeClient />
}
