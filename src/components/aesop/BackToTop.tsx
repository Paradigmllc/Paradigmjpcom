"use client"

/**
 * BackToTop — fixed-bottom-right floating button (P18-D-9 NEW).
 *
 * Aesop-tech voice: rounded-full + paradigm-glass + gradient border + arrow
 * icon. Appears after 400px scroll. Lifts above DifyChatbot via right-20.
 * Smooth scroll to top with framer-motion fade.
 */

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowUp } from "lucide-react"

export default function BackToTop() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          type="button"
          onClick={scrollToTop}
          aria-label="Back to top"
          initial={{ opacity: 0, scale: 0.7, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.7, y: 10 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          whileHover={{ scale: 1.08, y: -2 }}
          whileTap={{ scale: 0.95 }}
          className="fixed bottom-6 right-24 md:right-28 z-[9998] paradigm-glass rounded-full w-11 h-11 md:w-12 md:h-12 flex items-center justify-center text-paradigm-ink hover:text-paradigm-accent paradigm-glow-md hover:paradigm-glow-lg transition-shadow"
          style={{ marginBottom: "var(--cookie-consent-h, 0px)" }}
        >
          <span
            aria-hidden
            className="absolute inset-0 rounded-full bg-gradient-to-br from-fuchsia-400/0 via-paradigm-accent/30 to-paradigm-tech/0 bg-[length:200%_100%] animate-[gradientShift_4s_linear_infinite] opacity-40"
          />
          <ArrowUp size={18} strokeWidth={2} className="relative z-10" />
        </motion.button>
      )}
    </AnimatePresence>
  )
}
