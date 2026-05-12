#!/usr/bin/env node
/**
 * add-loading-messages.mjs — Add `loadingPage` namespace to all 12 messages files.
 *
 * Sprint audit fix #1: /[locale]/loading.tsx hardcoded JP "少々お待ちください…" を
 *                     12-locale messages に外出し。
 */

import { readFileSync, writeFileSync } from "node:fs"

const TRANSLATIONS = {
  ja: { eyebrow: "Loading", message: "少々お待ちください…" },
  en: { eyebrow: "Loading", message: "Please wait a moment…" },
  ko: { eyebrow: "Loading", message: "잠시만 기다려 주세요…" },
  zh: { eyebrow: "Loading", message: "请稍候…" },
  de: { eyebrow: "Loading", message: "Einen Moment bitte…" },
  fr: { eyebrow: "Loading", message: "Veuillez patienter…" },
  es: { eyebrow: "Loading", message: "Por favor, espere…" },
  pt: { eyebrow: "Loading", message: "Por favor, aguarde…" },
  ru: { eyebrow: "Loading", message: "Подождите немного…" },
  ar: { eyebrow: "Loading", message: "يرجى الانتظار…" },
  vi: { eyebrow: "Loading", message: "Vui lòng đợi trong giây lát…" },
  id: { eyebrow: "Loading", message: "Mohon tunggu sebentar…" },
}

for (const [locale, t] of Object.entries(TRANSLATIONS)) {
  const path = `messages/${locale}.json`
  const obj = JSON.parse(readFileSync(path, "utf8"))
  if (obj.loadingPage) {
    console.log(`[${locale}] already has loadingPage, skipping`)
    continue
  }
  obj.loadingPage = t
  writeFileSync(path, JSON.stringify(obj, null, 2) + "\n", "utf8")
  console.log(`[${locale}] added loadingPage: ${JSON.stringify(t)}`)
}
console.log("\nDone.")
