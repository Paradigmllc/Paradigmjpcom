import { defineConfig } from "astro/config"
import node from "@astrojs/node"
import tailwindcss from "@tailwindcss/vite"
import icon from "astro-icon"
import react from "@astrojs/react"

export default defineConfig({
  output: "server",
  adapter: node({
    mode: "standalone",
  }),
  integrations: [icon(), react()],
  vite: {
    css: {
      // Keep this standalone demo independent from the parent Next.js PostCSS config.
      postcss: { plugins: [] },
    },
    plugins: [tailwindcss()],
  },
})
