import { describe, expect, it } from "vitest";
import { findVoicePython, voicePythonCandidates } from "./voice-runtime.mjs";

describe("voice runtime resolution", () => {
  it("prefers an explicitly configured runtime", () => {
    const candidates = voicePythonCandidates({
      projectRoot: "/app",
      environment: { MEDIA_OS_VOICE_PYTHON: "/runtime/python" },
      platform: "linux",
    });
    expect(candidates[0]).toBe("/runtime/python");
  });

  it("supports the local Windows virtual environment", () => {
    const python = findVoicePython({
      projectRoot: "C:/repo",
      environment: {},
      platform: "win32",
      exists: (candidate) => candidate.endsWith("Scripts\\python.exe"),
    });
    expect(python).toMatch(/Scripts\\python\.exe$/);
  });

  it("fails closed when no candidate exists", () => {
    expect(findVoicePython({
      projectRoot: "/app",
      environment: {},
      platform: "linux",
      exists: () => false,
    })).toBeNull();
  });
});
