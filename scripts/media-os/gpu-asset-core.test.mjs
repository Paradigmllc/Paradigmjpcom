import { describe, expect, it } from "vitest";
import { comfyOutputVerification, generatedAssetRecord, materializeProfileWorkflow, materializeWorkflow, validateVisualAssetManifest } from "./gpu-asset-core.mjs";

const asset = {
  id: "scene-one", sceneOrdinal: 1, seed: 42, width: 1344, height: 768,
  prompt: "Abstract evidentiary reconstruction of financial ledgers, restrained documentary lighting",
  negativePrompt: "real person, logo, readable fabricated document", realPersonLikeness: false,
  photorealistic: false, disclosureRequired: false, rights: { mode: "project_generated", commercialUse: true },
};
const bindings = { positiveTextNode: "6", negativeTextNode: "7", samplerNode: "3", latentNode: "5", saveNode: "9" };
const workflow = {
  3: { class_type: "KSampler", inputs: { seed: 0 } },
  5: { class_type: "EmptyLatentImage", inputs: { width: 1, height: 1 } },
  6: { class_type: "CLIPTextEncode", inputs: { text: "" } },
  7: { class_type: "CLIPTextEncode", inputs: { text: "" } },
  9: { class_type: "SaveImage", inputs: { filename_prefix: "" } },
};

describe("GPU asset contract", () => {
  it("rejects real-person likeness and missing disclosure", () => {
    expect(() => validateVisualAssetManifest({ version: 1, episodeId: "episode-test", workflowPath: "x", assets: [{ ...asset, realPersonLikeness: true }] })).toThrow(/likeness/);
    expect(() => validateVisualAssetManifest({ version: 1, episodeId: "episode-test", workflowPath: "x", assets: [{ ...asset, photorealistic: true }] })).toThrow(/disclosure/);
  });

  it("materializes deterministic workflow bindings", () => {
    const result = materializeWorkflow(workflow, bindings, asset);
    expect(result[3].inputs.seed).toBe(42);
    expect(result[5].inputs).toMatchObject({ width: 1344, height: 768 });
    expect(result[6].inputs.text).toContain("evidentiary");
  });

  it("validates and materializes typed version 2 assets", () => {
    const typedAsset = { ...asset, productionProfileId: "manga_docudrama", expectedOutputKind: "image" };
    expect(validateVisualAssetManifest({ version: 2, episodeId: "episode-test", registryPath: "profiles.json", assets: [typedAsset] })).toBeTruthy();
    const result = materializeProfileWorkflow(workflow, { id: "manga_docudrama", outputKind: "image", bindings }, typedAsset);
    expect(result[9].inputs.filename_prefix).toBe("scene-one");
  });

  it("rejects video assets without bounded shot duration", () => {
    const typedAsset = { ...asset, productionProfileId: "realistic_host", expectedOutputKind: "video" };
    expect(() => validateVisualAssetManifest({ version: 2, episodeId: "episode-test", registryPath: "profiles.json", assets: [typedAsset] })).toThrow(/video duration/);
  });

  it("records hashes and compute cost", () => {
    const record = generatedAssetRecord({ asset, workflow, outputPath: "a.png", outputSha256: "f".repeat(64), elapsedSeconds: 1800, hourlyRateUsd: 0.4, promptId: "p1" });
    expect(record.costUsd).toBeCloseTo(0.2);
    expect(record.workflowSha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it("extracts objective ML verification emitted by ComfyUI QA nodes", () => {
    expect(comfyOutputVerification({ prompt: { outputs: { 42: { ui: { lip_sync_score: 0.81, identity_score: 0.9 } } } } }, "prompt"))
      .toEqual({ lipSyncScore: 0.81, identityScore: 0.9 });
  });
});
