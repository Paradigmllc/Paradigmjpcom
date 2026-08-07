import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { tmpdir } from "node:os";
import {
  buildScriptPrompt,
  evaluateProductionScript,
  normalizeProductionScript,
  productionScriptFingerprint,
  toNarrationManifest,
  validateEvidencePack,
} from "./production-script-core.mjs";

function parseArgs(argv) {
  const values = { blueprint: argv[0] };
  for (let index = 1; index < argv.length; index += 2) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (!flag?.startsWith("--") || value === undefined) throw new Error(`Invalid argument near ${flag ?? "end"}.`);
    values[flag.slice(2)] = value;
  }
  return values;
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function writeJsonAtomic(path, value) {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(temporary, path);
}

function contentText(content) {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.map((item) => item?.text ?? "").join("");
  throw new Error("LLM response did not contain text content.");
}

function parseJsonResponse(content) {
  const text = contentText(content).trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`LLM returned invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function chatWithCodex({ messages }) {
  const directory = mkdtempSync(resolve(tmpdir(), "media-os-codex-script-"));
  const output = resolve(directory, "response.json");
  const schema = resolve(directory, "schema.json");
  const criticMode = messages.at(-1)?.content?.startsWith("Act as a skeptical executive documentary editor");
  const outputSchema = criticMode ? {
    type: "object",
    properties: {
      scores: {
        type: "object",
        properties: Object.fromEntries(["story", "specificity", "evidence", "pacing", "spokenLanguage"].map((key) => [key, { type: "number" }])),
        required: ["story", "specificity", "evidence", "pacing", "spokenLanguage"],
        additionalProperties: false,
      },
      blockingIssues: {
        type: "array",
        items: {
          type: "object",
          properties: { sceneId: { type: "string" }, problem: { type: "string" }, fix: { type: "string" } },
          required: ["sceneId", "problem", "fix"],
          additionalProperties: false,
        },
      },
      strengths: { type: "array", items: { type: "string" } },
    },
    required: ["scores", "blockingIssues", "strengths"],
    additionalProperties: false,
  } : {
    type: "object",
    properties: {
      version: { type: "integer" },
      scenes: {
        type: "array",
        items: {
          type: "object",
          properties: {
            sceneId: { type: "string" },
            editorialIntent: { type: "string" },
            visualSync: { type: "string" },
            pauseAfterSeconds: { type: "number" },
            segments: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  role: { type: "string", enum: ["hook", "evidence", "transition", "outcome", "cta"] },
                  text: { type: "string" },
                  claimIds: { type: "array", items: { type: "string" } },
                  sourceLocator: { type: "string" },
                },
                required: ["role", "text", "claimIds", "sourceLocator"],
                additionalProperties: false,
              },
            },
          },
          required: ["sceneId", "editorialIntent", "visualSync", "pauseAfterSeconds", "segments"],
          additionalProperties: false,
        },
      },
    },
    required: ["version", "scenes"],
    additionalProperties: false,
  };
  writeFileSync(schema, `${JSON.stringify(outputSchema)}\n`, "utf8");
  const prompt = `${messages.map((message) => `${message.role.toUpperCase()}:\n${message.content}`).join("\n\n")}\n\nReturn only the requested JSON object. Do not use tools, inspect files, or add commentary.`;
  try {
    const command = process.platform === "win32" ? process.execPath : "codex";
    const launcher = process.platform === "win32"
      ? [resolve(process.env.APPDATA ?? "", "npm/node_modules/@openai/codex/bin/codex.js")]
      : [];
    const result = spawnSync(command, [...launcher,
      "exec", "--ephemeral", "--ignore-user-config", "--ignore-rules", "--sandbox", "read-only", "--color", "never",
      "--model", process.env.MEDIA_OS_CODEX_MODEL?.trim() || "gpt-5.4",
      "-c", "service_tier=\"fast\"",
      "-c", "model_reasoning_effort=\"low\"",
      "--output-schema", schema,
      "--output-last-message", output, "-",
    ], {
      input: prompt,
      encoding: "utf8",
      timeout: 600_000,
      maxBuffer: 20 * 1024 * 1024,
    });
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error((result.stderr || result.stdout).slice(-3000));
    return { model: "codex-cli", usage: null, value: parseJsonResponse(readFileSync(output, "utf8")) };
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

async function chat({ messages, temperature, maxTokens }) {
  if (process.env.MEDIA_OS_SCRIPT_PROVIDER?.trim() === "codex-cli") {
    return chatWithCodex({ messages });
  }
  const token = process.env.OPENROUTER_API_KEY?.trim();
  if (!token) throw new Error("OPENROUTER_API_KEY is required for professional script generation.");
  const models = [...new Set([
    process.env.MEDIA_OS_SCRIPT_MODEL?.trim(),
    process.env.OPENROUTER_DEFAULT_MODEL?.trim(),
    "nvidia/nemotron-3-super-120b-a12b:free",
    "google/gemma-4-31b-it:free",
    "openai/gpt-oss-20b:free",
  ].filter(Boolean))];
  const failures = [];
  for (const model of models) {
    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        signal: AbortSignal.timeout(240_000),
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://media-os.178.105.138.55.sslip.io",
          "X-Title": "YouTube Media OS",
        },
        body: JSON.stringify({
          model,
          temperature,
          max_tokens: maxTokens,
          response_format: { type: "json_object" },
          messages,
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error?.message ?? `HTTP ${response.status}`);
      const choice = body?.choices?.[0]?.message;
      if (!choice) throw new Error("no completion choice");
      return { model: body.model ?? model, usage: body.usage ?? null, value: parseJsonResponse(choice.content) };
    } catch (error) {
      failures.push(`${model}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  if (process.env.MEDIA_OS_ALLOW_CODEX_FALLBACK?.trim() === "true") {
    return chatWithCodex({ messages });
  }
  throw new Error(`All script models failed: ${failures.join(" | ")}`);
}

function criticPrompt(blueprint, evidencePack, draft) {
  return `Act as a skeptical executive documentary editor. Audit the draft against the supplied evidence and scene plan.
Return JSON only: {"scores":{"story":0-100,"specificity":0-100,"evidence":0-100,"pacing":0-100,"spokenLanguage":0-100},"blockingIssues":[{"sceneId":"...","problem":"...","fix":"..."}],"strengths":["..."]}.
Flag unsupported causality, allegation/fact drift, repeated exposition, weak hooks, synthetic-sounding prose, poor scene endings, and text that cannot fit the allotted time. Do not rewrite yet.

SCENE PLAN:
${JSON.stringify(blueprint.scenes.map((scene) => ({ sceneId: scene.id, beat: scene.beat, durationSeconds: scene.durationSeconds, claimIds: scene.claimIds })), null, 2)}

EVIDENCE:
${JSON.stringify(evidencePack.claims, null, 2)}

DRAFT:
${JSON.stringify(draft)}`;
}

function revisionPrompt(basePrompt, draft, critic, deterministic = null) {
  return `${basePrompt}

You are now the final senior editor. Rewrite the complete JSON plan, preserving the required schema and exact scene order. Resolve every critic issue and every deterministic blocker. Keep factual content inside the evidence pack. Return the entire revised JSON, not a patch.

CURRENT DRAFT:
${JSON.stringify(draft)}

EXECUTIVE CRITIC:
${JSON.stringify(critic)}

DETERMINISTIC BLOCKERS:
${JSON.stringify(deterministic?.blockers ?? [])}`;
}

function criticPasses(critic) {
  const scores = Object.values(critic?.scores ?? {}).map(Number);
  return scores.length === 5 && scores.every((score) => Number.isFinite(score) && score >= 86)
    && Array.isArray(critic.blockingIssues) && critic.blockingIssues.length === 0;
}

export async function generateProductionScript(options) {
  const projectRoot = resolve(options.projectRoot ?? ".");
  const blueprintPath = resolve(projectRoot, options.blueprint);
  const evidencePath = resolve(projectRoot, options.evidence);
  const baseManifestPath = resolve(projectRoot, options.baseManifest);
  const outputPath = resolve(projectRoot, options.output);
  const reportPath = resolve(projectRoot, options.report ?? `${outputPath}.generation.json`);
  const blueprint = await readJson(blueprintPath);
  const evidencePack = validateEvidencePack(await readJson(evidencePath), blueprint);
  const baseManifest = await readJson(baseManifestPath);
  const basePrompt = buildScriptPrompt(blueprint, evidencePack);

  if (options.candidateReport) {
    const prior = await readJson(resolve(projectRoot, options.candidateReport));
    const script = normalizeProductionScript(prior.candidateScript, blueprint, evidencePack);
    const report = evaluateProductionScript({ script, blueprint, evidencePack });
    if (report.status !== "pass") throw new Error(`Normalized candidate blocked: ${report.blockers.map((item) => item.id).join(", ")}`);
    const narration = toNarrationManifest(script, blueprint, evidencePack, baseManifest);
    const fingerprint = productionScriptFingerprint({ script, evidencePack, blueprint: blueprint.fingerprint });
    await writeJsonAtomic(outputPath, narration);
    await writeJsonAtomic(reportPath, {
      ...prior,
      version: "2026-08-03.2",
      status: "review_required",
      fingerprint,
      outputPath,
      candidateScript: undefined,
      deterministicQuality: report,
      normalization: "claim_locator_role_and_scene_pacing_v1",
    });
    return { narration, report, critic: prior.critic, criticAccepted: false, outputPath, reportPath, fingerprint };
  }

  const draftResponse = await chat({
    temperature: 0.68,
    maxTokens: 9_000,
    messages: [
      { role: "system", content: "You write source-disciplined, high-retention documentary narration and always return strict JSON." },
      { role: "user", content: basePrompt },
    ],
  });
  const draft = normalizeProductionScript(draftResponse.value, blueprint, evidencePack);
  const draftReport = evaluateProductionScript({ script: draft, blueprint, evidencePack });
  const criticResponse = await chat({
    temperature: 0.15,
    maxTokens: 4_000,
    messages: [
      { role: "system", content: "You are a demanding executive editor and fact checker. Return strict JSON." },
      { role: "user", content: criticPrompt(blueprint, evidencePack, draft) },
    ],
  });
  const revisionResponse = await chat({
    temperature: 0.38,
    maxTokens: 9_000,
    messages: [
      { role: "system", content: "You are the final senior documentary editor. Return strict JSON only." },
      { role: "user", content: revisionPrompt(basePrompt, draft, criticResponse.value, draftReport) },
    ],
  });
  let script = normalizeProductionScript(revisionResponse.value, blueprint, evidencePack);
  let report = evaluateProductionScript({ script, blueprint, evidencePack });
  let repair = null;
  if (report.status !== "pass") {
    repair = await chat({
      temperature: 0.2,
      maxTokens: 9_000,
      messages: [
        { role: "system", content: "Repair the complete documentary script JSON. Output strict JSON only." },
        { role: "user", content: revisionPrompt(basePrompt, script, { blockingIssues: [] }, report) },
      ],
    });
    script = normalizeProductionScript(repair.value, blueprint, evidencePack);
    report = evaluateProductionScript({ script, blueprint, evidencePack });
  }
  const criticAccepted = criticPasses(criticResponse.value);
  if (report.status !== "pass") {
    await writeJsonAtomic(reportPath, {
      status: "blocked",
      blueprintPath,
      evidencePath,
      report,
      critic: criticResponse.value,
      candidateScript: script,
      draftModel: draftResponse.model,
      revisionModel: revisionResponse.model,
    });
    throw new Error(`Production script blocked: ${report.blockers.map((item) => item.id).join(", ")}`);
  }
  const narration = toNarrationManifest(script, blueprint, evidencePack, baseManifest);
  const fingerprint = productionScriptFingerprint({ script, evidencePack, blueprint: blueprint.fingerprint });
  await writeJsonAtomic(outputPath, narration);
  await writeJsonAtomic(reportPath, {
    version: "2026-08-03.2",
    status: criticAccepted ? "pass" : "review_required",
    episodeId: blueprint.episodeId,
    fingerprint,
    blueprintPath,
    evidencePath,
    outputPath,
    models: {
      draft: draftResponse.model,
      critic: criticResponse.model,
      revision: revisionResponse.model,
      repair: repair?.model ?? null,
    },
    usage: {
      draft: draftResponse.usage,
      critic: criticResponse.usage,
      revision: revisionResponse.usage,
      repair: repair?.usage ?? null,
    },
    critic: criticResponse.value,
    deterministicQuality: report,
  });
  return { narration, report, critic: criticResponse.value, criticAccepted, outputPath, reportPath, fingerprint };
}

async function main(argv) {
  const args = parseArgs(argv);
  if (!args.blueprint || !args.evidence || !args["base-manifest"] || !args.output) {
    throw new Error("Usage: node scripts/generate-production-script.mjs <blueprint.json> --evidence <evidence-pack.json> --base-manifest <narration.json> --output <narration.json> [--report <report.json>]");
  }
  const state = await generateProductionScript({
    blueprint: args.blueprint,
    evidence: args.evidence,
    baseManifest: args["base-manifest"],
    output: args.output,
    report: args.report,
    candidateReport: args["candidate-report"],
  });
  process.stdout.write(`${JSON.stringify({
    ok: true,
    status: state.report.status,
    score: state.report.score,
    segmentCount: state.narration.segments.length,
    criticAccepted: state.criticAccepted,
    outputPath: state.outputPath,
    reportPath: state.reportPath,
  })}\n`);
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
