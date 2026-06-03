import { mkdir, writeFile, readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const source = await readFile(path.join(root, "docs", "ai-rules-coding.md"), "utf8");

function withSingleFinalNewline(content) {
  return `${content.trimEnd()}\n`;
}

const outputs = [
  {
    file: "AGENTS.md",
    content: `# AGENTS.md — Paradigm Projects

> OpenAI Codex agent instructions for Paradigm LLC projects.
> このファイルは \`docs/ai-rules-coding.md\` から自動生成されます。
> 直接編集せず、正本を編集して \`bash sync.sh deploy-ai-rules\` を実行してください。

## Agent Instructions

このリポジトリで作業する際は以下のルールに**例外なく**従うこと。

---

${source}
`,
  },
  {
    file: ".clinerules",
    content: `# Cline Rules — Paradigm Projects
# このファイルは docs/ai-rules-coding.md から自動生成されます。直接編集しないこと。

${source}
`,
  },
  {
    file: ".windsurfrules",
    content: `# Windsurf Rules — Paradigm Projects
# このファイルは docs/ai-rules-coding.md から自動生成されます。直接編集しないこと。

${source}
`,
  },
  {
    file: path.join(".cursor", "rules", "global.mdc"),
    content: `---
description: Paradigm global coding rules for all projects
alwaysApply: true
---
# Paradigm Coding Rules

> このファイルは docs/ai-rules-coding.md から自動生成されます。直接編集しないこと。

${source}
`,
  },
  {
    file: "GEMINI.md",
    content: `# GEMINI.md — Paradigm Antigravity Rules

> Antigravity / Gemini-specific lightweight entrypoint.
> Shared rules live in \`AGENTS.md\`; do not duplicate long rules here.

## Always On

- Read \`AGENTS.md\` for the shared cross-agent rules.
- Keep \`GEMINI.md\`, \`AGENTS.md\`, \`CLAUDE.md\`, and \`Task.md\` lightweight.
- Do not write progress logs or long history into startup files.
- Archive long handoffs in \`docs/handoff-archive/\` and long specs in \`docs/knowledge/\` or \`docs/refactor/\`.
- Before finishing any task that edits agent/context files, run \`npm run context:audit\`.
- If \`npm run context:audit\` fails, fix the context bloat before continuing.
`,
  },
  {
    file: path.join(".agents", "rules", "context-budget.md"),
    content: `# Context Budget Guard

Activation: Always On

- Startup files are entrypoints, not history stores.
- Keep \`Task.md\` and \`CLAUDE.md\` under 120 lines.
- Keep generated shared rule files under 240 lines.
- Use \`docs/handoff-archive/\` for old handoffs.
- Use \`docs/knowledge/\` or \`docs/refactor/\` for detailed specs and audits.
- Run \`npm run context:audit\` before finishing changes to agent rules, handoffs, or context files.
`,
  },
];

for (const output of outputs) {
  const absolutePath = path.join(root, output.file);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, withSingleFinalNewline(output.content), "utf8");
  console.log(`updated ${output.file}`);
}
