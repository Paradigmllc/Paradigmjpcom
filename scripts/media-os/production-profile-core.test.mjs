import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  loadProductionProfileRegistry,
  profileForVisualMode,
  runtimeProductionProfile,
  validateProductionProfileRegistry,
} from "./production-profile-core.mjs";

describe("production profile registry", () => {
  it("routes every entertainment family through a single production profile", () => {
    const registry = loadProductionProfileRegistry();
    expect(profileForVisualMode(registry, "avatar_pip").id).toBe("realistic_host");
    expect(profileForVisualMode(registry, "anime_reenactment").id).toBe("anime_cohost");
    expect(profileForVisualMode(registry, "motion_comic").id).toBe("manga_docudrama");
    expect(profileForVisualMode(registry, "source_document").id).toBe("evidence_room");
  });

  it("keeps an unconfigured talking host fail-closed", () => {
    const registryPath = resolve("config/comfyui/production-profiles.json");
    const registry = loadProductionProfileRegistry(registryPath);
    const host = runtimeProductionProfile(profileForVisualMode(registry, "avatar_fullscreen"), registryPath, {});
    expect(host.workflowReady).toBe(false);
    expect(host.bindingsReady).toBe(false);
    expect(host.productionReady).toBe(false);
    expect(host.blocker).toContain("MEDIA_OS_REALISTIC_HOST_WORKFLOW_PATH");
  });

  it("rejects ambiguous visual-mode ownership", () => {
    const registry = loadProductionProfileRegistry();
    const duplicate = structuredClone(registry);
    duplicate.profiles[1].visualModes.push("avatar_pip");
    expect(() => validateProductionProfileRegistry(duplicate)).toThrow(/multiple production profiles/);
  });
});
