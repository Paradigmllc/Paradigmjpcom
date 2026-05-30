/**
 * lib/sales/video-generator.ts — HyperFrames 診断動画生成 (Sprint 10-B)
 *
 * 役割: sales_companies + sales_templates → HTML video template 生成 → HyperFrames API
 *       で MP4 化 → Cloudflare R2 にアップロード → URL を返す。
 *
 * 戦略原典:
 *   - Notion 営業MVP壁打ち②: HyperFrames は HTML→MP4 (CPU)・Vast.ai 不要
 *   - 「写真+動くデータ+音声」で 60-90 秒の診断動画を量産
 *   - Cap (人間録画) は HOT リード後段の Sprint 11+ で実装
 *
 * 実装方針:
 *   1. fetchDiagnosticReport() で 3-Act データ取得
 *   2. DeepSeek V4 PRO でナレーション原稿生成 (60-90 秒 = 約 200-300 字)
 *   3. HTML テンプレに 3-Act + ナレーション + 音声タイミングを埋込
 *   4. HyperFrames API (Cloud or self-hosted) で MP4 化
 *   5. Cloudflare R2 にアップ → 公開 URL
 *
 * MVP では steps 1-3 までを完成させ、4-5 は HyperFrames endpoint 接続後に有効化。
 */

import { callDeepSeek } from "@/lib/deepseek"
import { matchContentTemplate } from "./content-templates"
import { fetchDiagnosticReport, type DiagnosticReportData } from "./diagnostic"
import { findCompanyById, findCompanyByDomain, findCompanyBySlug } from "./companies"

/* ───── DeepSeek V4 PRO によるナレーション原稿生成 ───── */

const NARRATION_SYSTEM_PROMPT = `あなたは Paradigm 合同会社の診断レポート動画ナレーション原稿を生成するエディタです。

【制約】
1. 60-90 秒の動画用 → 約 200-300 字 (1 字 = 0.3 秒換算)
2. 構成: ① フック (5 秒) ② Pain (15 秒) ③ Fear (15 秒) ④ Hope (15 秒) ⑤ CTA (10 秒)
3. ですます調・冷静で誠実な口調 (煽らない)
4. 「御社」を主語・「弊社」自称は最小限
5. 損失額・数値は具体的に・「業界平均」を根拠に
6. 最後は「30 分の無料診断」CTA

【出力フォーマット】
JSON 形式で次の shape を返す:
{
  "hook": "5 秒のオープニング (約 15-20 字)",
  "pain": "最初の課題 (約 50-70 字)",
  "fear": "二番目の課題 (約 50-70 字)",
  "hope": "三番目の課題 (約 50-70 字)",
  "cta": "CTA (約 30-40 字)"
}`

export interface NarrationScript {
  hook: string
  pain: string
  fear: string
  hope: string
  cta: string
}

export async function generateNarrationScript(
  data: DiagnosticReportData,
): Promise<{ ok: boolean; script?: NarrationScript; error?: string }> {
  const userPrompt = `【対象企業】
会社名: ${data.company_name}
${data.industry ? `業種: ${data.industry}` : ""}
${data.prefecture ? `所在: ${data.prefecture}` : ""}

【フック】
${data.hook}

【検出課題 (3 Acts)】
${data.acts
  .map(
    (act, i) =>
      `${i + 1}. ${act.headline} (${act.severity}) — ${act.body.slice(0, 100)} [指標: ${act.metric_label} = ${act.metric_value}${act.metric_unit}・${act.metric_bench}]`,
  )
  .join("\n")}

【損失合計】
月間 ${data.total_loss}

上記をもとに JSON 形式の動画ナレーション原稿を生成してください。`

  const res = await callDeepSeek(
    [
      { role: "system", content: NARRATION_SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
    {
      // 🚨 V4 PRO 永久指定 (deepseek.ts default で適用済)
      temperature: 0.4,
      maxTokens: 800,
      responseFormat: "json_object",
    },
  )

  if (!res.ok || !res.text) {
    return { ok: false, error: res.error ?? "DeepSeek empty response" }
  }

  try {
    const parsed = JSON.parse(res.text) as NarrationScript
    if (!parsed.hook || !parsed.pain || !parsed.fear || !parsed.hope || !parsed.cta) {
      return { ok: false, error: "Incomplete narration JSON shape" }
    }
    return { ok: true, script: parsed }
  } catch (e) {
    return {
      ok: false,
      error: `JSON parse failed: ${e instanceof Error ? e.message : String(e)}`,
    }
  }
}

/* ───── HyperFrames HTML テンプレ generator ───── */

/**
 * HyperFrames 用の HTML composition を生成。
 * シーン構成: 5 scene (5s + 15s × 3 + 10s)
 *
 * 注: HyperFrames は HTML + data-hf-* 属性を読んで MP4 にする仕様 (仮想)。
 *     詳細は HyperFrames 公式ドキュメント参照 (Sprint 11 で実 endpoint 接続)。
 */
export function buildHyperFramesHtml(
  data: DiagnosticReportData,
  script: NarrationScript,
): string {
  const escape = (s: string) =>
    s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="utf-8" />
  <title>Paradigm 診断動画 — ${escape(data.company_name)}</title>
  <style>
    body { margin: 0; font-family: 'Noto Sans JP', sans-serif; background: #0f172a; color: #fff; }
    .hf-scene { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; padding: 80px; }
    .hf-scene h1, .hf-scene h2 { text-align: center; }
    .hook { background: linear-gradient(135deg, #6366f1, #8b5cf6); }
    .pain { background: linear-gradient(135deg, #dc2626, #991b1b); }
    .fear { background: linear-gradient(135deg, #d97706, #92400e); }
    .hope { background: linear-gradient(135deg, #16a34a, #14532d); }
    .cta  { background: linear-gradient(135deg, #0f172a, #1e293b); }
    .metric { font-size: 96px; font-weight: 900; font-family: 'DM Mono', monospace; }
  </style>
</head>
<body data-hf-fps="30" data-hf-width="1920" data-hf-height="1080">
  <!-- Scene 1: Hook (0-5s) -->
  <div class="hf-scene hook" data-hf-start="0" data-hf-end="5">
    <h1 style="font-size: 64px; line-height: 1.3;">${escape(script.hook)}</h1>
  </div>
  <!-- Scene 2: Pain (5-20s) -->
  <div class="hf-scene pain" data-hf-start="5" data-hf-end="20">
    <div style="text-align: center;">
      <div class="metric">${escape(data.acts[0]?.metric_value ?? "")}<span style="font-size: 32px;">${escape(data.acts[0]?.metric_unit ?? "")}</span></div>
      <h2 style="font-size: 40px; margin-top: 24px; max-width: 80%; margin-left: auto; margin-right: auto;">${escape(script.pain)}</h2>
    </div>
  </div>
  <!-- Scene 3: Fear (20-35s) -->
  <div class="hf-scene fear" data-hf-start="20" data-hf-end="35">
    <div style="text-align: center;">
      <div class="metric">${escape(data.acts[1]?.metric_value ?? "")}<span style="font-size: 32px;">${escape(data.acts[1]?.metric_unit ?? "")}</span></div>
      <h2 style="font-size: 40px; margin-top: 24px; max-width: 80%; margin-left: auto; margin-right: auto;">${escape(script.fear)}</h2>
    </div>
  </div>
  <!-- Scene 4: Hope (35-50s) -->
  <div class="hf-scene hope" data-hf-start="35" data-hf-end="50">
    <div style="text-align: center;">
      <h2 style="font-size: 48px; max-width: 80%; margin: 0 auto;">${escape(script.hope)}</h2>
      <div style="margin-top: 32px; font-size: 56px; font-family: 'DM Mono', monospace; font-weight: 900;">月間損失: ${escape(data.total_loss)}</div>
    </div>
  </div>
  <!-- Scene 5: CTA (50-60s) -->
  <div class="hf-scene cta" data-hf-start="50" data-hf-end="60">
    <div style="text-align: center;">
      <h2 style="font-size: 56px; line-height: 1.3;">${escape(script.cta)}</h2>
      <div style="margin-top: 32px; font-size: 24px; color: #94a3b8;">paradigmjp.com/diagnostic</div>
    </div>
  </div>
  <!-- Narration audio cues (HyperFrames が ElevenLabs と連携する場合) -->
  <script type="application/json" data-hf-narration>
    ${JSON.stringify(script, null, 2)}
  </script>
</body>
</html>`
}

/* ───── HyperFrames API call (stub・本実装は Sprint 11) ───── */

const HYPERFRAMES_API = process.env.HYPERFRAMES_API_URL ?? ""

export interface VideoGenerationResult {
  ok: boolean
  video_url?: string
  duration_sec?: number
  script?: NarrationScript
  html?: string
  content_template?: {
    title: string
    quality_bar: string
    dify_selection_rule: string
  }
  error?: string
}

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://paradigmjp.com"

const isUuid = (s: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)
const isDomain = (s: string): boolean => /\./.test(s)

/**
 * 完全な動画生成パイプライン (Sprint 14 リファクタ):
 *   1. companyIdOrSlugOrDomain → SalesCompany 解決
 *   2. fetchDiagnosticReport
 *   3. generateNarrationScript (DeepSeek V4 PRO)
 *   4. buildHyperFramesHtml (HyperFrames API 用)
 *   5. HyperFrames API call (env 設定時のみ) or HTML preview URL (fallback)
 *
 * 戻り値:
 *   - HYPERFRAMES_API_URL 設定時:  video_url = MP4 URL
 *   - HYPERFRAMES_API_URL 未設定:  video_url = /ja/report/[slug]/video (HTML auto-play)
 *
 * どちらも顧客にメール/Slack で送付可能 (HTML preview URL も「動画版レポート」として完結)
 */
export async function generateDiagnosticVideo(
  companyIdOrSlugOrDomain: string,
): Promise<VideoGenerationResult> {
  // Sprint 14: slug 優先 lookup
  let company = await findCompanyBySlug(companyIdOrSlugOrDomain)
  if (!company) {
    company = isUuid(companyIdOrSlugOrDomain)
      ? await findCompanyById(companyIdOrSlugOrDomain)
      : isDomain(companyIdOrSlugOrDomain)
        ? await findCompanyByDomain(companyIdOrSlugOrDomain)
        : null
  }
  if (!company) return { ok: false, error: "company not found" }

  const data = await fetchDiagnosticReport({ companyId: company.id })
  if (!data) return { ok: false, error: "diagnostic data unavailable" }

  const narration = await generateNarrationScript(data)
  if (!narration.ok || !narration.script) {
    return { ok: false, error: narration.error }
  }

  const html = buildHyperFramesHtml(data, narration.script)
  const contentTemplate = await matchContentTemplate({
    reportLocale: data.report_locale,
    targetCountry: data.target_country,
    industry: data.industry,
    assetType: "sales_video",
    templateVariant: data.template_variant,
  })
  const previewUrl = company.slug
    ? `${BASE_URL}/ja/report/${company.slug}/video`
    : null

  // HYPERFRAMES_API_URL 未設定: HTML preview URL を返す (Sprint 14・fail-soft)
  if (!HYPERFRAMES_API) {
    return {
      ok: true,
      video_url: previewUrl ?? undefined,
      script: narration.script,
      html,
      content_template: {
        title: contentTemplate.title,
        quality_bar: contentTemplate.quality_bar,
        dify_selection_rule: contentTemplate.dify_selection_rule,
      },
      duration_sec: 60,
      ...(previewUrl ? {} : { error: "company.slug not set — preview URL unavailable" }),
    }
  }

  // HyperFrames API call (MP4 化)
  try {
    const res = await fetch(`${HYPERFRAMES_API}/render`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        html,
        format: "mp4",
        width: 1920,
        height: 1080,
        fps: 30,
        duration_sec: 60,
      }),
      signal: AbortSignal.timeout(180_000),
    })
    if (!res.ok) {
      // MP4 化失敗時も HTML preview URL を fallback として返す
      return {
        ok: !!previewUrl,
        video_url: previewUrl ?? undefined,
        script: narration.script,
        html,
        content_template: {
          title: contentTemplate.title,
          quality_bar: contentTemplate.quality_bar,
          dify_selection_rule: contentTemplate.dify_selection_rule,
        },
        duration_sec: 60,
        error: `HyperFrames API ${res.status}: ${res.statusText} (returning HTML preview)`,
      }
    }
    const result = (await res.json()) as { video_url?: string }
    return {
      ok: true,
      video_url: result.video_url ?? previewUrl ?? undefined,
      script: narration.script,
      html,
      content_template: {
        title: contentTemplate.title,
        quality_bar: contentTemplate.quality_bar,
        dify_selection_rule: contentTemplate.dify_selection_rule,
      },
      duration_sec: 60,
    }
  } catch (e) {
    // タイムアウト等で MP4 化失敗 → HTML preview にフォールバック
    return {
      ok: !!previewUrl,
      video_url: previewUrl ?? undefined,
      script: narration.script,
      html,
      content_template: {
        title: contentTemplate.title,
        quality_bar: contentTemplate.quality_bar,
        dify_selection_rule: contentTemplate.dify_selection_rule,
      },
      duration_sec: 60,
      error: e instanceof Error ? e.message : String(e),
    }
  }
}
