"use client"

/**
 * ThemeProvider — wraps `next-themes` for the Paradigm Aesop foundation.
 *
 * Why a thin wrapper instead of using next-themes directly in layout.tsx:
 * - layout.tsx is a server component; next-themes needs "use client".
 * - We standardise the attribute (`data-theme`) so globals.css selectors
 *   (`[data-theme="dark"]`) match without configuration drift.
 * - `disableTransitionOnChange` avoids a flash of unstyled paint when the
 *   user toggles theme — globals.css already animates color transitions
 *   via `html { transition: ... }`, so we want next-themes to NOT race it.
 *
 * AE-PHP-1: 22 lines. AE-PHP-4: this file's role is theme attribute SSR
 * + localStorage hydration only. No business logic.
 */

import { ThemeProvider as NextThemesProvider } from "next-themes"
import type { ReactNode } from "react"

export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider
      attribute="data-theme"
      defaultTheme="light"
      enableSystem
      disableTransitionOnChange={false}
      storageKey="paradigm-theme"
    >
      {children}
    </NextThemesProvider>
  )
}
