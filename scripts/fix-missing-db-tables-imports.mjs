/**
 * fix-missing-db-tables-imports.mjs — Add missing DB_TABLES imports
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from "fs";
import { resolve, relative, join, extname } from "path";

function collectFiles(dir, files = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith(".") && entry.name !== "node_modules") {
      collectFiles(full, files);
    } else if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) {
      files.push(full);
    }
  }
  return files;
}

const srcDir = resolve("src");
const files = collectFiles(srcDir);
let fixed = 0;

for (const filePath of files) {
  let content = readFileSync(filePath, "utf8");
  if (!content.includes("DB_TABLES.")) continue;
  if (content.includes("import { DB_TABLES }")) continue;

  // Find the last import line that ends with a complete statement
  // Match: import ... from "..."; or import ... from "..." 
  const lines = content.split("\n");
  let lastImportIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^import\s+.+from\s+["']/.test(line) || /^\s*\}\s*from\s+["']/.test(line)) {
      lastImportIdx = i;
    } else if (/^import\s/.test(line) && !/from\s+["']/.test(line)) {
      // Multi-line import start - skip until we find the closing
    }
  }

  if (lastImportIdx >= 0) {
    lines.splice(lastImportIdx + 1, 0, `import { DB_TABLES } from "@/lib/sales/db-tables"`);
  } else {
    // No import found, add at top after any file header comment
    let insertAt = 0;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith("//") || lines[i].startsWith("/*") || lines[i].startsWith(" *") || lines[i].trim() === "" || lines[i].startsWith('"use strict"')) {
        insertAt = i + 1;
      } else {
        break;
      }
    }
    lines.splice(insertAt, 0, `import { DB_TABLES } from "@/lib/sales/db-tables"`);
  }

  const newContent = lines.join("\n");
  if (newContent !== content) {
    writeFileSync(filePath, newContent, "utf8");
    console.log(`  FIXED: ${relative(".", filePath)}`);
    fixed++;
  }
}

console.log(`\nFixed ${fixed} files with missing DB_TABLES import.`);
