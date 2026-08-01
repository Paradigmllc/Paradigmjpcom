import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const HOME = process.env.USERPROFILE || process.env.HOME;

const SKIP_DIRS = new Set([
  ".git",
  ".claude",
  ".next",
  "node_modules",
  "coverage",
  "dist",
  "build",
  "renders",
]);

const FILE_BUDGETS = new Map([
  ["AGENTS.md", Number(process.env.CONTEXT_BUDGET_AGENTS_LINES || 240)],
  ["CLAUDE.md", Number(process.env.CONTEXT_BUDGET_CLAUDE_LINES || 120)],
  ["GEMINI.md", Number(process.env.CONTEXT_BUDGET_GEMINI_LINES || 120)],
  ["Task.md", Number(process.env.CONTEXT_BUDGET_TASK_LINES || 120)],
  [".clinerules", Number(process.env.CONTEXT_BUDGET_RULES_LINES || 240)],
  [".windsurfrules", Number(process.env.CONTEXT_BUDGET_RULES_LINES || 240)],
  ["docs/ai-rules-coding.md", Number(process.env.CONTEXT_BUDGET_SOURCE_RULES_LINES || 240)],
]);

const CURSOR_RULE_BUDGET = Number(process.env.CONTEXT_BUDGET_CURSOR_RULE_LINES || 240);
const INCLUDE_GLOBAL = process.env.CONTEXT_AUDIT_SKIP_GLOBAL !== "1";

const GLOBAL_FILES = HOME
  ? [
      {
        label: "~/.claude/CLAUDE.md",
        absolutePath: path.join(HOME, ".claude", "CLAUDE.md"),
        budget: Number(process.env.CONTEXT_BUDGET_GLOBAL_CLAUDE_LINES || 120),
      },
      {
        label: "~/AGENTS.md",
        absolutePath: path.join(HOME, "AGENTS.md"),
        budget: Number(process.env.CONTEXT_BUDGET_GLOBAL_AGENTS_LINES || 120),
      },
      {
        label: "~/.codex/AGENTS.md",
        absolutePath: path.join(HOME, ".codex", "AGENTS.md"),
        budget: Number(process.env.CONTEXT_BUDGET_GLOBAL_AGENTS_LINES || 120),
      },
      {
        label: "~/.config/opencode/AGENTS.md",
        absolutePath: path.join(HOME, ".config", "opencode", "AGENTS.md"),
        budget: Number(process.env.CONTEXT_BUDGET_GLOBAL_OPENCODE_LINES || 120),
      },
      {
        label: "~/.gemini/GEMINI.md",
        absolutePath: path.join(HOME, ".gemini", "GEMINI.md"),
        budget: Number(process.env.CONTEXT_BUDGET_GLOBAL_GEMINI_LINES || 120),
      },
      {
        label: "~/.gemini/AGENTS.md",
        absolutePath: path.join(HOME, ".gemini", "AGENTS.md"),
        budget: Number(process.env.CONTEXT_BUDGET_GLOBAL_GEMINI_LINES || 120),
      },
      {
        label: "~/.agents/AGENTS.md",
        absolutePath: path.join(HOME, ".agents", "AGENTS.md"),
        budget: Number(process.env.CONTEXT_BUDGET_GLOBAL_AGENTS_LINES || 120),
      },
    ]
  : [];

function normalize(filePath) {
  return filePath.split(path.sep).join("/");
}

function lineCount(content) {
  if (content.length === 0) return 0;
  return content.split(/\r\n|\r|\n/).length;
}

function budgetFor(relativePath) {
  const normalized = normalize(relativePath);
  const fileName = path.basename(relativePath);

  if (FILE_BUDGETS.has(normalized)) return FILE_BUDGETS.get(normalized);
  if (FILE_BUDGETS.has(fileName)) return FILE_BUDGETS.get(fileName);
  if (normalized.startsWith(".cursor/rules/") && normalized.endsWith(".mdc")) {
    return CURSOR_RULE_BUDGET;
  }
  if (
    (normalized.startsWith(".agents/rules/") || normalized.startsWith(".agent/rules/")) &&
    normalized.endsWith(".md")
  ) {
    return Number(process.env.CONTEXT_BUDGET_AGENT_RULE_LINES || 120);
  }

  return null;
}

async function collect(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      files.push(...await collect(path.join(dir, entry.name)));
      continue;
    }

    const absolutePath = path.join(dir, entry.name);
    const relativePath = path.relative(ROOT, absolutePath);
    if (budgetFor(relativePath) !== null) {
      files.push(relativePath);
    }
  }

  return files;
}

const files = await collect(ROOT);
const results = [];

for (const file of files.sort()) {
  const content = await readFile(path.join(ROOT, file), "utf8");
  const lines = lineCount(content);
  const budget = budgetFor(file);
  results.push({ file: normalize(file), lines, budget, ok: lines <= budget });
}

if (INCLUDE_GLOBAL) {
  for (const file of GLOBAL_FILES) {
    try {
      const content = await readFile(file.absolutePath, "utf8");
      const lines = lineCount(content);
      results.push({
        file: file.label,
        lines,
        budget: file.budget,
        ok: lines <= file.budget,
      });
    } catch (error) {
      if (error && error.code !== "ENOENT") {
        throw error;
      }
    }
  }
}

console.log("Context budget audit");
for (const result of results) {
  const mark = result.ok ? "OK " : "FAIL";
  console.log(`${mark} ${result.file} ${result.lines}/${result.budget} lines`);
}

const failures = results.filter((result) => !result.ok);
if (failures.length > 0) {
  console.error("");
  console.error("Context budget exceeded. Archive old history into docs/handoff-archive/ and keep startup files as summaries plus links.");
  process.exit(1);
}
