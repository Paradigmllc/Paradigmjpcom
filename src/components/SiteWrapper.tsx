"use client"

import { usePathname } from "next/navigation"

/**
 * SiteWrapper — site chrome 配下の <main> をラップし、SiteHeader (fixed top-0 h-16)
 * との重複を避けるため pt-16 を default で付ける.
 *
 * LP 系 (/p/*, /{locale}/report/*) は ConditionalSiteChrome 内で SiteHeader を
 * skip するため pt-16 も不要. ConditionalSiteChrome が LP 判定で children を
 * 直接返す経路に切り替えた現在、本 component は LP 経路で呼ばれることは
 * 無いが、防御的に pathname 判定を残す (renderer migration time の保険).
 */
export default function SiteWrapper({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  // LP 経路は <main pt-16> を付けない (header skip のため top spacing 不要)
  const isLp = pathname.startsWith("/p/") || /^\/[a-z]{2}\/(?:report|d)\//.test(pathname)
  return <main className={isLp ? "" : "pt-16"}>{children}</main>
}
