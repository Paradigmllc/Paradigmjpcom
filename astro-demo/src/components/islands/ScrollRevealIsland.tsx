import { motion } from "framer-motion"
import type { ReactNode } from "react"

interface Props {
  children: ReactNode
  direction?: "up" | "down" | "left" | "right"
  delay?: number
}

export default function ScrollRevealIsland({ children, direction = "up", delay = 0 }: Props) {
  const dirMap = { up: { y: 40 }, down: { y: -40 }, left: { x: 40 }, right: { x: -40 } }
  const initial = { opacity: 0, ...dirMap[direction] }

  return (
    <motion.div
      initial={initial}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}
