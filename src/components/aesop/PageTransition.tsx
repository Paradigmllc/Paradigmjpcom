"use client"

/**
 * PageTransition — opacity fade on every pathname change.
 *
 * The `key={pathname}` forces React to unmount the previous page and
 * mount the new one, which is what triggers framer-motion's `initial`
 * variant on every navigation. Without the key, the same div would
 * persist and the fade would never re-fire.
 *
 * 0.6s fade is intentional: shorter feels jarring after Aesop's
 * deliberate hairline-only chrome, longer feels like a connection issue.
 *
 * AE-PHP-1: 19 lines. Pure motion primitive — no business logic.
 */

import { motion } from "framer-motion"
import { usePathname } from "next/navigation"
import type { ReactNode } from "react"

export default function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}
