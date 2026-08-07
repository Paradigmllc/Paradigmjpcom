import { existsSync } from "node:fs";
import { delimiter, dirname, resolve } from "node:path";

export function voicePythonCandidates({
  projectRoot = resolve("."),
  environment = process.env,
  platform = process.platform,
} = {}) {
  const configured = environment.MEDIA_OS_VOICE_PYTHON?.trim();
  const platformDefaults = platform === "win32"
    ? [resolve(projectRoot, ".cache/voice-runtime/Scripts/python.exe")]
    : [
        resolve(projectRoot, ".cache/voice-runtime/bin/python"),
        "/opt/voice-runtime/bin/python",
      ];
  return [...new Set([configured, ...platformDefaults].filter(Boolean))];
}

export function findVoicePython(options = {}) {
  const exists = options.exists ?? existsSync;
  return voicePythonCandidates(options).find((candidate) => exists(candidate)) ?? null;
}

export function voiceEnvironment(projectRoot = resolve("."), environment = process.env) {
  const python = findVoicePython({ projectRoot, environment });
  if (!python) {
    throw new Error(
      `Voice runtime is missing. Checked: ${voicePythonCandidates({ projectRoot, environment }).join(", ")}`,
    );
  }
  const pythonDirectory = dirname(python);
  return {
    python,
    env: {
      ...environment,
      PATH: `${pythonDirectory}${delimiter}${environment.PATH ?? ""}`,
      PYTHONUTF8: "1",
      PYTHONIOENCODING: "utf-8",
    },
  };
}
