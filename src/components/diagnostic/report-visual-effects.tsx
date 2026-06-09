"use client"

import { useEffect, useRef, type CSSProperties } from "react"
import { motion, useScroll, useTransform, type TargetAndTransition } from "framer-motion"

// ─── Animated Particle/Gradient Background ──────────────────
export function AnimatedBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let animId: number
    const particles: Array<{ x: number; y: number; vx: number; vy: number; r: number; alpha: number }> = []
    
    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener("resize", resize)

    // Create particles
    for (let i = 0; i < 50; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        r: Math.random() * 2 + 0.5,
        alpha: Math.random() * 0.3 + 0.1,
      })
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      for (const p of particles) {
        p.x += p.vx
        p.y += p.vy
        if (p.x < 0) p.x = canvas.width
        if (p.x > canvas.width) p.x = 0
        if (p.y < 0) p.y = canvas.height
        if (p.y > canvas.height) p.y = 0
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(124, 92, 255, ${p.alpha})`
        ctx.fill()
      }
      // Draw connecting lines
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x
          const dy = particles[i].y - particles[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 150) {
            ctx.beginPath()
            ctx.moveTo(particles[i].x, particles[i].y)
            ctx.lineTo(particles[j].x, particles[j].y)
            ctx.strokeStyle = `rgba(124, 92, 255, ${0.05 * (1 - dist / 150)})`
            ctx.stroke()
          }
        }
      }
      animId = requestAnimationFrame(animate)
    }
    animate()

    return () => { cancelAnimationFrame(animId); window.removeEventListener("resize", resize) }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ opacity: 0.7 }}
      aria-hidden
    />
  )
}

// ─── Glassmorphism Card ──────────────────────────────────────
export function GlassCard({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, duration: 0.5, ease: "easeOut" }}
      className={`rounded-2xl border border-white/20 bg-white/70 backdrop-blur-xl shadow-lg shadow-black/5 ${className}`}
    >
      {children}
    </motion.div>
  )
}

// ─── Parallax Section ────────────────────────────────────────
export function ParallaxSection({ children, speed = 0.5, className = "" }: { children: React.ReactNode; speed?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] })
  const y = useTransform(scrollYProgress, [0, 1], [speed * 100, -speed * 100])
  const opacity = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [0.3, 1, 1, 0.3])

  return (
    <motion.div ref={ref} style={{ y, opacity }} className={className}>
      {children}
    </motion.div>
  )
}

// ─── Animated Gradient Text ──────────────────────────────────
export function GradientText({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`bg-gradient-to-r from-violet-600 via-violet-500 to-blue-600 bg-clip-text text-transparent animate-gradient ${className}`}>
      {children}
    </span>
  )
}

// ─── Pulse Glow Effect ───────────────────────────────────────
export function PulseGlow({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      animate={{ boxShadow: ["0 0 0 0 rgba(124,92,255,0)", "0 0 20px 5px rgba(124,92,255,0.15)", "0 0 0 0 rgba(124,92,255,0)"] }}
      transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// ─── Counter Animation ───────────────────────────────────────
export function AnimatedCounter({ value, duration = 1.5, className = "" }: { value: number; duration?: number; className?: string }) {
  return (
    <motion.span
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      className={className}
    >
      <motion.span
        initial={{ "--num": 0 } as TargetAndTransition}
        whileInView={{ "--num": value } as TargetAndTransition}
        viewport={{ once: true }}
        transition={{ duration, ease: "easeOut" }}
        className="tabular-nums"
        style={{ counterReset: "num var(--num)" } as CSSProperties}
      >
        {value.toLocaleString()}
      </motion.span>
    </motion.span>
  )
}

// ─── Staggered Reveal ────────────────────────────────────────
export function StaggeredReveal({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-50px" }}
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: { staggerChildren: 0.1, delayChildren: 0.1 },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export function RevealItem({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 20, filter: "blur(4px)" },
        visible: { opacity: 1, y: 0, filter: "blur(0px)" },
      }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  )
}
