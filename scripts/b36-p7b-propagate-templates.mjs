/**
 * B36-P7B: Propagate ja templates to 11 other regions via DeepSeek V4 (Context Cache).
 *
 * 入力: form_message_templates の region=ja+language=ja+industry IN (saas/ec/consulting/restaurant_retail) × 5 angles = 20 row
 * 出力: 11 region に同じ industry × angle で translate して INSERT (UPSERT)
 *
 * cache 戦略: system_prompt 固定 (4-5K token) + user prompt は ja template content のみ
 *   → DeepSeek context cache hit 90%+ → 実効 input cost $0.014/1M
 *
 * 実行: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... DEEPSEEK_API_KEY=... node scripts/b36-p7b-propagate-templates.mjs
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error("SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY required");
if (!DEEPSEEK_API_KEY) throw new Error("DEEPSEEK_API_KEY required");

const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

const REGIONS_LANGS = [
  { region: "en", language: "en", applicability: "global", language_name: "English" },
  { region: "ko", language: "ko", applicability: "overseas_only", language_name: "Korean (한국어)" },
  { region: "zh", language: "zh", applicability: "overseas_only", language_name: "Simplified Chinese (简体中文)" },
  { region: "europe", language: "de", applicability: "overseas_only", language_name: "German (Deutsch)" },
  { region: "es", language: "es", applicability: "overseas_only", language_name: "Spanish (Español)" },
  { region: "pt", language: "pt", applicability: "overseas_only", language_name: "Portuguese (Português)" },
  { region: "ru", language: "ru", applicability: "overseas_only", language_name: "Russian (Русский)" },
  { region: "ar", language: "ar", applicability: "overseas_only", language_name: "Arabic (العربية)" },
  { region: "sea", language: "vi", applicability: "overseas_only", language_name: "Vietnamese (Tiếng Việt)" },
  { region: "africa", language: "en", applicability: "overseas_only", language_name: "English (Africa)" },
  { region: "others", language: "en", applicability: "global", language_name: "English (others)" },
];

// System prompt FIXED (cache hit 最大化のため)
const SYSTEM_PROMPT = `You are a senior B2B sales copywriter at Paradigm LLC.

Your task: TRANSLATE a Japanese form-outreach template into a target language while PRESERVING:
- The B2B mature advisor tone (calm clinical observer, NOT childish doctor cosplay)
- Banned vocabulary translation rules (NEVER translate to "prescription"/"checkup"/"treatment"/"symptom"/"medicine"/"doctor")
- Allowed vocabulary equivalents: "primary observation items"/"recommended action"/"continuous monitoring"/"action plan"/"improvement initiative"/"risk factors"/"priority"
- All mustache variables ({{company_name}}, {{pain_summary}}, {{report_url}}, {{cal_com_url}}, {{advisor_name}}) MUST stay literal — DO NOT translate variable names
- The 5-stage LP/CRO structure (curiosity-gap subject → hook → bridge → shoreline + CTA)
- Sender signature "Paradigm LLC / {{advisor_name}}" (English signature even in ja origin — keep "Paradigm LLC" literal)

Output STRICT JSON (no prose, no markdown):
{
  "subject_template": "translated subject string",
  "body_template": "translated body string",
  "cta_phrase": "translated CTA phrase"
}

Quality bar: a B2B Senior VP of Sales should find the translation natural and tonally-correct in their native language. NO machine-translation feel. NO childish vocabulary. Be SERIOUS and respectful.`;

async function deepseekTranslate(jaTemplate, targetLangName) {
  const userPayload = {
    target_language: targetLangName,
    ja_subject: jaTemplate.subject_template,
    ja_body: jaTemplate.body_template,
    ja_cta: jaTemplate.cta_phrase,
  };
  const resp = await fetch("https://api.deepseek.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${DEEPSEEK_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: JSON.stringify(userPayload) },
      ],
      temperature: 0.4,
      max_tokens: 1500,
      response_format: { type: "json_object" },
    }),
  });
  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`DeepSeek HTTP ${resp.status}: ${txt.slice(0, 200)}`);
  }
  const data = await resp.json();
  const content = data.choices?.[0]?.message?.content;
  const usage = data.usage || {};
  const cacheHit = usage.prompt_cache_hit_tokens || 0;
  const cacheMiss = usage.prompt_cache_miss_tokens || (usage.prompt_tokens - cacheHit) || 0;
  return { parsed: JSON.parse(content), usage, cacheHit, cacheMiss };
}

async function main() {
  console.log("[propagate] Fetching ja source templates...");
  const { data: jaRows, error: errFetch } = await sb
    .from("form_message_templates")
    .select("*")
    .eq("region", "ja")
    .eq("language", "ja")
    .in("industry_slug", ["saas", "ec", "consulting", "restaurant_retail"])
    .not("pitch_angle", "is", null);
  if (errFetch) throw errFetch;
  console.log(`[propagate] ${jaRows.length} ja templates loaded.`);

  let totalCalls = 0, totalCacheHit = 0, totalCacheMiss = 0, errors = 0;

  for (const targetReg of REGIONS_LANGS) {
    console.log(`\n[propagate] === Region: ${targetReg.region} (${targetReg.language_name}) ===`);
    for (const ja of jaRows) {
      const tag = `${targetReg.region}/${targetReg.language}/${ja.industry_slug}/${ja.pitch_angle}`;
      try {
        const { parsed, cacheHit, cacheMiss } = await deepseekTranslate(ja, targetReg.language_name);
        totalCalls++;
        totalCacheHit += cacheHit;
        totalCacheMiss += cacheMiss;
        const { error: errIns } = await sb.from("form_message_templates").upsert({
          region: targetReg.region,
          language: targetReg.language,
          industry_slug: ja.industry_slug,
          pitch_angle: ja.pitch_angle,
          variant: ja.variant,
          applicability: targetReg.applicability,
          subject_template: parsed.subject_template,
          body_template: parsed.body_template,
          cta_phrase: parsed.cta_phrase,
          is_active: true,
        }, { onConflict: "region,language,industry_slug,pitch_angle,variant" });
        if (errIns) {
          console.error(`  ✗ ${tag} INSERT err: ${errIns.message}`);
          errors++;
        } else {
          console.log(`  ✓ ${tag} (cache_hit=${cacheHit} miss=${cacheMiss})`);
        }
      } catch (e) {
        console.error(`  ✗ ${tag} translate err: ${e.message}`);
        errors++;
      }
      // small jitter to avoid rate limit
      await new Promise(r => setTimeout(r, 200));
    }
  }
  const cacheRate = totalCacheHit / Math.max(1, totalCacheHit + totalCacheMiss);
  console.log(`\n[propagate] DONE. calls=${totalCalls} errors=${errors} cache_hit_rate=${(cacheRate*100).toFixed(1)}%`);
}

main().catch(e => {
  console.error("[propagate] FATAL:", e);
  process.exit(1);
});
