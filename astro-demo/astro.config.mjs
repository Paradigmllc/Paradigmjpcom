import { defineConfig } from "astro/config"
import node from "@astrojs/node"
import tailwindcss from "@tailwindcss/vite"
import icon from "astro-icon"

export default defineConfig({
  output: "server",
  adapter: node({
    mode: "standalone",
  }),
  integrations: [icon()],
  vite: {
    plugins: [tailwindcss()],
  },
})
