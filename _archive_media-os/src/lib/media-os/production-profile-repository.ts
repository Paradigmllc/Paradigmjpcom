import type { DatabaseSync } from "node:sqlite";
import type { ProductionProfileSummary } from "./types";

interface ProductionProfileRow {
  id: string;
  registry_version: string;
  label: string;
  output_kind: ProductionProfileSummary["outputKind"];
  compositing_role: string;
  readiness: ProductionProfileSummary["readiness"];
  generator: string;
  workflow_path: string | null;
  workflow_path_env: string | null;
  binding_path_env: string | null;
  bindings_json: string;
  visual_modes_json: string;
  required_capabilities_json: string;
}

function stringArray(value: string, label: string): string[] {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed) || !parsed.every((item) => typeof item === "string")) throw new Error(`${label} must be a string array.`);
    return parsed;
  } catch (error) {
    console.error(`[production-profile] Invalid ${label}`, error);
    return [];
  }
}

function configured(name: string | null): boolean {
  return Boolean(name && process.env[name]?.trim());
}

export function loadProductionProfileSummaries(db: DatabaseSync): ProductionProfileSummary[] {
  const rows = db.prepare(`
    select id,registry_version,label,output_kind,compositing_role,readiness,generator,
      workflow_path,workflow_path_env,binding_path_env,bindings_json,visual_modes_json,required_capabilities_json
    from production_profiles order by case readiness when 'production' then 0 when 'preview' then 1 else 2 end, id
  `).all() as unknown as ProductionProfileRow[];
  return rows.map((row) => {
    const inlineBindings = row.bindings_json !== "{}";
    const workflowReady = row.output_kind === "composition" || Boolean(row.workflow_path) || configured(row.workflow_path_env);
    const bindingsReady = row.output_kind === "composition" || inlineBindings || configured(row.binding_path_env);
    const productionReady = row.readiness === "production" && workflowReady && bindingsReady;
    const blocker = productionReady
      ? null
      : !workflowReady
        ? `${row.workflow_path_env ?? "workflow"} 未設定`
        : !bindingsReady
          ? `${row.binding_path_env ?? "bindings"} 未設定`
          : row.readiness === "preview"
            ? "試写用。マスター品質ワークフロー未承認"
            : "制作プロファイル停止中";
    return {
      id: row.id,
      registryVersion: row.registry_version,
      label: row.label,
      outputKind: row.output_kind,
      compositingRole: row.compositing_role,
      readiness: row.readiness,
      generator: row.generator,
      visualModes: stringArray(row.visual_modes_json, `${row.id}.visualModes`),
      requiredCapabilities: stringArray(row.required_capabilities_json, `${row.id}.requiredCapabilities`),
      workflowReady,
      productionReady,
      blocker,
    };
  });
}
