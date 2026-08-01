import { motion } from "framer-motion"

interface Props {
  title: string
  subtitle: string
  ctaLabel: string
  ctaHref: string
  image?: string
  variant?: "default" | "parallax" | "gradient"
  accentColor?: string
}

export default function HeroIsland({ title, subtitle, ctaLabel, ctaHref, image, variant = "default", accentColor = "#2997ff" }: Props) {
  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.15, delayChildren: 0.2 } }
  }
  const item = {
    hidden: { opacity: 0, y: 30 },
    show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } }
  }

  return (
    <section style={{
      position: "relative", minHeight: "100vh", display: "flex", alignItems: "center",
      justifyContent: "center", textAlign: "center", overflow: "hidden",
      background: variant === "gradient"
        ? `linear-gradient(180deg, #000 0%, ${accentColor}20 50%, #000 100%)`
        : "#000",
    }}>
      {image && (
        <motion.img
          src={image} alt=""
          initial={{ scale: 1.1 }}
          animate={{ scale: 1 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.6 }}
        />
      )}
      <motion.div
        variants={container} initial="hidden" animate="show"
        style={{ position: "relative", zIndex: 1, maxWidth: 800, padding: "0 24px" }}
      >
        <motion.h1
          variants={item}
          style={{ fontSize: "clamp(48px, 8vw, 80px)", fontWeight: 600, letterSpacing: "-.015em", lineHeight: 1.05, color: "#fff", marginBottom: 16 }}
        >
          {title}
        </motion.h1>
        <motion.p
          variants={item}
          style={{ fontSize: "clamp(17px, 2.5vw, 24px)", fontWeight: 400, lineHeight: 1.4, color: "#86868b", marginBottom: 32, maxWidth: 500, marginLeft: "auto", marginRight: "auto" }}
        >
          {subtitle}
        </motion.p>
        <motion.div variants={item}>
          <motion.a
            href={ctaHref}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.98 }}
            style={{ display: "inline-flex", padding: "14px 32px", background: accentColor, color: "#fff", borderRadius: 980, fontSize: 17, fontWeight: 500, textDecoration: "none" }}
          >
            {ctaLabel}
          </motion.a>
        </motion.div>
      </motion.div>
    </section>
  )
}
