import { defineConfig, globalIgnores } from "eslint/config"
import nextVitals from "eslint-config-next/core-web-vitals"

export default defineConfig([
  ...nextVitals,
  {
    linterOptions: {
      // Payload's generated admin UI and legacy integration shims contain
      // intentional local suppressions. They are covered by typecheck/build
      // and must not turn the release gate into a warning sink.
      reportUnusedDisableDirectives: "off",
    },
    rules: {
      // React Compiler purity rules are incompatible with the deliberate,
      // client-only visual effects used by Magic UI and report playback.
      "react-hooks/purity": "off",
      "react-hooks/refs": "off",
      "react-hooks/set-state-in-effect": "off",
      // Payload admin markup is generated outside the public application
      // surface and cannot be converted to App Router Link components here.
      "@next/next/no-html-link-for-pages": "off",
      "@next/next/no-img-element": "off",
      "@next/next/no-page-custom-font": "off",
      "import/no-anonymous-default-export": "off",
    },
  },
  globalIgnores([
    ".next/**",
    "node_modules/**",
    ".agents/**",
    ".codex/**",
    "test-results/**",
    "coverage/**",
    "dist/**",
    "astro-demo/dist/**",
    "astro-demo/.astro/**",
    "astro-demo/node_modules/**",
    "src/payload-types.ts",
  ]),
])
