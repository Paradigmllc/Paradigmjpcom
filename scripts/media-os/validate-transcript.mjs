import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const MUSIC_TOKEN = /^(?:[♪♫♬]+|[\[(<（【]\s*(?:music|音楽|bgm)\s*[\])>）】])$/iu;
const FILLERS = {
  ja: new Set(["えー", "ええと", "あの", "その", "まあ", "うーん"]),
  en: new Set(["um", "uh", "erm", "hmm"]),
};

function requireFiniteNumber(value, label) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    throw new Error(`${label} must be a finite number.`);
  }
  return number;
}

export function validateAndCleanTranscript(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Transcript must be a JSON object.");
  }

  const language = input.language;
  if (language !== "ja" && language !== "en") {
    throw new Error("Transcript language must be ja or en.");
  }

  const model = String(input.model ?? "").trim();
  if (!model) {
    throw new Error("Transcript model is required for reproducibility.");
  }
  if (language !== "en" && model.toLowerCase().endsWith(".en")) {
    throw new Error(`English-only model ${model} cannot be used for ${language}.`);
  }
  if (!Array.isArray(input.words) || input.words.length === 0) {
    throw new Error("Transcript words must be a non-empty array.");
  }

  const cleanedWords = [];
  const warnings = [];
  let removedNoise = 0;
  let previousStart = -1;
  let previousEnd = -1;

  for (const [index, rawWord] of input.words.entries()) {
    if (!rawWord || typeof rawWord !== "object" || Array.isArray(rawWord)) {
      throw new Error(`Word ${index} must be an object.`);
    }

    const text = String(rawWord.text ?? "").trim();
    const start = requireFiniteNumber(rawWord.start, `Word ${index} start`);
    const end = requireFiniteNumber(rawWord.end, `Word ${index} end`);
    if (start < 0 || end <= start) {
      throw new Error(`Word ${index} has an invalid time range.`);
    }
    if (start < previousStart || start < previousEnd - 0.04) {
      throw new Error(`Word ${index} overlaps or reverses the prior timestamp.`);
    }
    previousStart = start;
    previousEnd = end;

    const normalizedToken = text.toLocaleLowerCase(language === "ja" ? "ja-JP" : "en-US");
    if (!text || MUSIC_TOKEN.test(text) || FILLERS[language].has(normalizedToken)) {
      removedNoise += 1;
      continue;
    }

    if (end - start < 0.05) {
      throw new Error(`Word ${index} is shorter than 50 milliseconds.`);
    }
    if (cleanedWords.length > 0) {
      const gap = start - cleanedWords.at(-1).end;
      if (gap > 20) {
        warnings.push(`Long silent gap of ${gap.toFixed(2)} seconds before word ${index}.`);
      }
    }

    cleanedWords.push({
      id: `w-${String(cleanedWords.length + 1).padStart(4, "0")}`,
      text,
      start,
      end,
    });
  }

  const noiseRatio = removedNoise / input.words.length;
  if (noiseRatio > 0.2) {
    throw new Error(`Noise/filler ratio ${(noiseRatio * 100).toFixed(1)}% exceeds the 20% gate.`);
  }
  if (cleanedWords.length === 0) {
    throw new Error("Transcript contains no usable words after cleanup.");
  }

  return {
    version: 1,
    language,
    model,
    words: cleanedWords,
    quality: {
      sourceWordCount: input.words.length,
      cleanedWordCount: cleanedWords.length,
      removedNoise,
      noiseRatio: Number(noiseRatio.toFixed(4)),
      warnings,
      passed: true,
    },
  };
}

async function main(argv) {
  const inputArg = argv[0];
  if (!inputArg) {
    throw new Error("Usage: node scripts/validate-transcript.mjs <input.json> [--output <output.json>]");
  }
  const outputFlag = argv.indexOf("--output");
  const outputArg = outputFlag >= 0 ? argv[outputFlag + 1] : undefined;
  if (outputFlag >= 0 && !outputArg) {
    throw new Error("--output requires a path.");
  }

  const inputPath = resolve(inputArg);
  const transcript = JSON.parse(await readFile(inputPath, "utf8"));
  const result = validateAndCleanTranscript(transcript);

  if (outputArg) {
    const outputPath = resolve(outputArg);
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  }

  process.stdout.write(`${JSON.stringify(result.quality, null, 2)}\n`);
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
