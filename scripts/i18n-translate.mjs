#!/usr/bin/env node
/**
 * scripts/i18n-translate.mjs — DeepSeek V3 Context Cache 経由で
 * messages/en.json を 10 言語に自動翻訳して messages/{locale}.json を生成
 *
 * P17 2026-04-27 新規実装（Plan B）
 *
 * 使い方:
 *   DEEPSEEK_API_KEY=sk-xxx node scripts/i18n-translate.mjs
 *   DEEPSEEK_API_KEY=sk-xxx node scripts/i18n-translate.mjs --only=ko,zh
 *
 * 設計:
 * - System prompt 固定（cache hit 90%+ で実効 $0.014/1M）
 * - Source = en.json（Japan Entry Package 母版・海外 SMB 向け）
 * - Target = ko/zh/de/fr/es/pt/ru/ar/vi/id（Plan B 対象10言語）
 * - 各 locale 1 リクエストで全 keys を一括翻訳
 * - 既存ファイルは上書き（再実行で再翻訳・--only で部分実行）
 *
 * Note: ja は既存の独自設計を維持（翻訳しない）
 */

import { readFile, writeFile, mkdir } from "node:fs/promises"
import { fileURLToPath } from "node:url"
import path from "node:path"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, "..")
const SOURCE_FILE = path.join(ROOT, "messages", "en.json")
const MESSAGES_DIR = path.join(ROOT, "messages")

const TARGET_LOCALES = {
  ko: "Korean (한국어, formal/business tone)",
  zh: "Simplified Chinese (简体中文, formal/business tone)",
  de: "German (Deutsch, formal Sie-form business tone)",
  fr: "French (Français, formal vouvoiement business tone)",
  es: "Spanish (Español, formal usted business tone for both EU and Latin America)",
  pt: "Portuguese (Português brasileiro, formal você business tone)",
  ru: "Russian (Русский, formal Вы business tone)",
  ar: "Modern Standard Arabic (العربية MSA, formal business tone, RTL-ready)",
  vi: "Vietnamese (Tiếng Việt, formal business tone with appropriate honorifics)",
  id: "Indonesian (Bahasa Indonesia, formal/baku business tone)",
}

const SYSTEM_PROMPT = `You are a professional translator specialized in B2B SaaS marketing copy.
You translate JSON files for "Paradigm LLC", a Tokyo-based company that provides productized services
for foreign SMBs entering the Japanese market.

CRITICAL RULES:
1. Output ONLY valid JSON. No prose. No markdown fences. No explanations.
2. Preserve the EXACT same JSON structure: same keys, same nesting, same types.
3. Translate ONLY the string VALUES, never the keys.
4. Preserve placeholders like {name}, {count}, \\n (newline escapes), and emoji.
5. Do NOT translate brand names: "Paradigm", "Paradigm LLC", "Paradigm AI". Keep them as-is.
6. Do NOT translate technical acronyms unless they have a widely-used local equivalent: SEO, GEO, MEO, AI, B2B, SMB, CTA, JSON-LD, HTML, CMS, SaaS, GDPR.
7. Email addresses and URLs stay unchanged.
8. Use formal business tone appropriate for the target language.
9. Keep translations natural and idiomatic — avoid literal word-for-word translation.
10. Length: target similar character count where possible (button labels < 20 chars, headlines < 80 chars).

The source content is positioning Paradigm LLC as a Japan-market-entry partner for foreign SMBs.
Translations should preserve this "Productized Service for Japan Entry" positioning.`

async function translateLocale(locale, langDescription, sourceJson) {
  const apiKey = process.env.DEEPSEEK_API_KEY
  if (!apiKey) throw new Error("DEEPSEEK_API_KEY env var is required")

  const userPrompt = `Translate the following JSON to ${langDescription}.
Return ONLY the translated JSON object, with the EXACT same structure as the input.

INPUT JSON:
${JSON.stringify(sourceJson, null, 2)}`

  const startTime = Date.now()
  const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 4000,
      response_format: { type: "json_object" },
    }),
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`DeepSeek API error (${response.status}): ${errText}`)
  }

  const data = await response.json()
  const content = data.choices?.[0]?.message?.content
  if (!content) throw new Error(`No content in DeepSeek response for ${locale}`)

  const usage = data.usage ?? {}
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
  const cacheHit = usage.prompt_cache_hit_tokens ?? 0
  const cacheMiss = usage.prompt_cache_miss_tokens ?? 0
  const cacheRate = cacheHit + cacheMiss > 0 ? ((cacheHit / (cacheHit + cacheMiss)) * 100).toFixed(0) : "—"

  console.log(
    `  [${locale}] ✓ ${elapsed}s | tokens: in=${usage.prompt_tokens ?? "?"} out=${usage.completion_tokens ?? "?"} | cache: ${cacheRate}%`,
  )

  let parsed
  try {
    parsed = JSON.parse(content)
  } catch (e) {
    throw new Error(`Invalid JSON from DeepSeek for ${locale}: ${e.message}\nContent: ${content.slice(0, 200)}`)
  }

  return parsed
}

async function main() {
  const args = process.argv.slice(2)
  const onlyArg = args.find((a) => a.startsWith("--only="))
  const onlyLocales = onlyArg
    ? onlyArg.replace("--only=", "").split(",").filter(Boolean)
    : null

  const localesToProcess = onlyLocales
    ? onlyLocales.filter((l) => l in TARGET_LOCALES)
    : Object.keys(TARGET_LOCALES)

  if (localesToProcess.length === 0) {
    console.error("No valid locales to process. Available:", Object.keys(TARGET_LOCALES).join(", "))
    process.exit(1)
  }

  console.log(`📖 Reading source: ${SOURCE_FILE}`)
  const sourceText = await readFile(SOURCE_FILE, "utf8")
  const sourceJson = JSON.parse(sourceText)

  await mkdir(MESSAGES_DIR, { recursive: true })

  console.log(`🌐 Translating to ${localesToProcess.length} locale(s) via DeepSeek V3:`)

  const results = []
  for (const locale of localesToProcess) {
    try {
      const translated = await translateLocale(locale, TARGET_LOCALES[locale], sourceJson)
      const outPath = path.join(MESSAGES_DIR, `${locale}.json`)
      await writeFile(outPath, JSON.stringify(translated, null, 2) + "\n", "utf8")
      results.push({ locale, status: "ok", path: outPath })
    } catch (err) {
      console.error(`  [${locale}] ✗ FAILED:`, err.message)
      results.push({ locale, status: "error", error: err.message })
    }
  }

  const okCount = results.filter((r) => r.status === "ok").length
  const errCount = results.filter((r) => r.status === "error").length

  console.log(`\n✅ Done: ${okCount} succeeded, ${errCount} failed`)
  if (errCount > 0) process.exit(1)
}

main().catch((err) => {
  console.error("Fatal:", err)
  process.exit(1)
})
