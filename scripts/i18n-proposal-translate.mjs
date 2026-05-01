#!/usr/bin/env node
/**
 * scripts/i18n-proposal-translate.mjs
 *
 * messages/proposal/ja.json を 10 locale に DeepSeek V4 Cache 経由で自動翻訳。
 * P24 H-0-6 (2026-05-01) — Paradigm Sales OS v2 / Paradigm-HP 共通の UI 翻訳。
 *
 * 翻訳対象 locale (SalesRegion 12 値から ja/en を除く):
 *   ko, zh, europe, es, pt, ru, ar, sea, africa, others
 *
 * source: messages/proposal/ja.json (or en.json)
 * output: messages/proposal/{locale}.json
 *
 * 使い方:
 *   DEEPSEEK_API_KEY=sk-xxx node scripts/i18n-proposal-translate.mjs
 *   DEEPSEEK_API_KEY=sk-xxx node scripts/i18n-proposal-translate.mjs --only=ko,zh
 *   DEEPSEEK_API_KEY=sk-xxx node scripts/i18n-proposal-translate.mjs --source=en
 *
 * 設計原則 (CLAUDE.md s10-5 sales-region 準拠):
 *   - silently-JA-leak 防止: 出力に日本語が混入したら該当 locale を skip
 *   - System Prompt 固定で DeepSeek Context Cache 90%OFF
 *   - JSON モード強制で structured output
 *   - 各 locale 1 リクエストで全 keys 一括翻訳
 */

import { readFile, writeFile } from "node:fs/promises"
import { fileURLToPath } from "node:url"
import path from "node:path"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, "..")
const MESSAGES_DIR = path.join(ROOT, "src", "messages", "proposal")

const TARGET_LOCALES = ["ko", "zh", "europe", "es", "pt", "ru", "ar", "sea", "africa", "others"]

const LOCALE_LABELS = {
  ko: "Korean (한국어・존댓말・professional B2B)",
  zh: "Simplified Chinese (简体中文・正式・B2B)",
  europe: "English (European market・professional・no Americanisms・GDPR-aware)",
  es: "Spanish (Latin American + Spain universal・professional)",
  pt: "Portuguese (Brazilian・professional)",
  ru: "Russian (Русский・деловой・professional)",
  ar: "Arabic (Modern Standard Arabic・formal・RTL-friendly)",
  sea: "English (Southeast Asia regional・Singapore/Vietnam/Indonesia neutral)",
  africa: "English (Sub-Saharan Africa regional・Nigeria/Kenya/Ghana neutral)",
  others: "English (international neutral・Mongolia/Caucasus/Myanmar safe)",
}

const SYSTEM_PREFIX = `あなたは Paradigm 合同会社の B2B SaaS 多言語コピーライターです。

# あなたの役割
営業提案ページ用の UI 文字列 (JSON 形式) を、指定された target locale に翻訳します。

# 厳守ルール
1. **JSON 構造維持**: キー構造を一切変更しない・全キーを保持
2. **placeholder 維持**: {company} {count} {rate} {avg} {score} {locale} 等の {} 内変数は維持
3. **言語混在禁止**: 出力に target locale 以外の言語を混ぜない (特に target != ja で日本語禁止)
4. **トーン統一**: B2B プロフェッショナル・敬語/敬体相当 (各言語の polite professional レベル)
5. **固有名詞**: "Paradigm" "Paradigm 合同会社" は翻訳しない (法人名・ブランド名)
6. **数値・単位**: パーセント記号 (%) や数字フォーマット (1,234) はそのまま維持
7. **スラッシュ区切り**: "Zoom / Google Meet / 対面" のような選択肢は target locale に翻訳した上でスラッシュ維持

# Output 形式
必ず JSON のみ返却。Markdown コードブロック禁止。説明文禁止。
入力 JSON と完全に同じキー構造で、値だけ target locale に翻訳した JSON を返す。`

const PRICING = { inputCacheHit: 0.028, inputCacheMiss: 0.14, output: 0.28 }
const USD_TO_JPY = 150

// ─── DeepSeek 呼び出し ──────────────────────────────────────────────
async function translateLocale(sourceJson, sourceLocale, targetLocale) {
  const apiKey = process.env.DEEPSEEK_API_KEY
  if (!apiKey) throw new Error("DEEPSEEK_API_KEY not set")

  const userPrompt = `# Source locale: ${sourceLocale}
# Target locale: ${targetLocale} (${LOCALE_LABELS[targetLocale] || targetLocale})

# Source JSON (translate to ${targetLocale}, maintain exact key structure):
${JSON.stringify(sourceJson, null, 2)}

Return ONLY the translated JSON with the same key structure.`

  const startedAt = Date.now()

  const res = await fetch("https://api.deepseek.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "deepseek-v4-flash",
      messages: [
        { role: "system", content: SYSTEM_PREFIX },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.2,
      max_tokens: 8192,
      response_format: { type: "json_object" },
    }),
    signal: AbortSignal.timeout(120000),
  })

  const latencyMs = Date.now() - startedAt

  if (!res.ok) {
    const errBody = await res.text().catch(() => "(unreadable)")
    throw new Error(`DeepSeek ${res.status}: ${errBody.slice(0, 300)}`)
  }

  const data = await res.json()
  const content = data.choices?.[0]?.message?.content || ""

  // strip markdown code fence (defensive)
  const cleaned = content
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "")

  const translated = JSON.parse(cleaned)

  // silently-JA-leak 検知 (target != ja)
  // 例外: 法人固有名詞 "合同会社" は翻訳しない仕様 (system prompt 6番)
  // 例外: zh (Chinese) は Han 範囲 (一-龥) を CJK 共通文字として共有するため除外
  if (targetLocale !== "ja") {
    const flat = JSON.stringify(translated)
      .replace(/合同会社/g, "")  // 法人格は許容
      .replace(/Paradigm/g, "")   // ブランド名は許容
    // Hiragana / Katakana は確実に日本語固有 (zh では発生しない)
    const hasHiraganaKatakana = /[ぁ-んァ-ヶー]/.test(flat)
    // Han characters (一-龥): zh では合法・他 locale では JA leak の可能性
    const hasHan = /[一-龥]/.test(flat)
    if (hasHiraganaKatakana) {
      throw new Error(`silently-JA-leak detected (hiragana/katakana) in ${targetLocale}`)
    }
    if (hasHan && targetLocale !== "zh") {
      throw new Error(`silently-JA-leak detected (Han chars) in ${targetLocale}`)
    }
  }

  // コスト計算
  const usage = data.usage || {}
  const promptTotal = usage.prompt_tokens || 0
  const cacheHit = usage.prompt_cache_hit_tokens || 0
  const cacheMiss = usage.prompt_cache_miss_tokens !== undefined
    ? usage.prompt_cache_miss_tokens : promptTotal - cacheHit
  const completion = usage.completion_tokens || 0
  const usd =
    (cacheHit / 1_000_000) * PRICING.inputCacheHit
    + (cacheMiss / 1_000_000) * PRICING.inputCacheMiss
    + (completion / 1_000_000) * PRICING.output

  return {
    translated,
    stats: {
      locale: targetLocale,
      latencyMs,
      promptTotal, cacheHit, cacheMiss, completion,
      usd, jpy: usd * USD_TO_JPY,
      cacheHitRate: promptTotal > 0 ? cacheHit / promptTotal : 0,
    },
  }
}

// ─── main ────────────────────────────────────────────────────────────
async function main() {
  // CLI options
  const args = process.argv.slice(2)
  const onlyArg = args.find((a) => a.startsWith("--only="))
  const sourceArg = args.find((a) => a.startsWith("--source="))

  const sourceLocale = sourceArg ? sourceArg.split("=")[1] : "ja"
  const targets = onlyArg
    ? onlyArg.split("=")[1].split(",").map((s) => s.trim()).filter(Boolean)
    : TARGET_LOCALES

  console.log(`[i18n-proposal] source: ${sourceLocale}, targets: ${targets.join(", ")}`)

  const sourcePath = path.join(MESSAGES_DIR, `${sourceLocale}.json`)
  const sourceJson = JSON.parse(await readFile(sourcePath, "utf8"))

  const allStats = []
  let totalUsd = 0

  for (const target of targets) {
    if (target === sourceLocale) {
      console.log(`[i18n-proposal] skip ${target} (source)`)
      continue
    }
    try {
      console.log(`[i18n-proposal] translating to ${target}...`)
      const { translated, stats } = await translateLocale(sourceJson, sourceLocale, target)
      const outPath = path.join(MESSAGES_DIR, `${target}.json`)
      await writeFile(outPath, JSON.stringify(translated, null, 2) + "\n", "utf8")
      console.log(`[i18n-proposal] ✓ ${target} → ${outPath}`)
      console.log(`[i18n-proposal]   stats: ${stats.completion} tokens / $${stats.usd.toFixed(4)} / ${stats.latencyMs}ms / cache ${(stats.cacheHitRate * 100).toFixed(0)}%`)
      allStats.push(stats)
      totalUsd += stats.usd
    } catch (e) {
      console.error(`[i18n-proposal] ✗ ${target}: ${e.message}`)
    }
  }

  console.log("")
  console.log(`[i18n-proposal] Done. Total cost: $${totalUsd.toFixed(4)} (¥${(totalUsd * USD_TO_JPY).toFixed(2)})`)
  console.log(`[i18n-proposal] Successfully translated: ${allStats.length}/${targets.length}`)
}

main().catch((e) => {
  console.error("[i18n-proposal] fatal:", e)
  process.exit(1)
})
