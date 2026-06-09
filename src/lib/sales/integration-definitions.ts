/**
 * lib/sales/integration-definitions.ts — 統合レジストリの定義配列（結合モジュール）
 *
 * integration-registry.ts から分離 (C-1 対応)。
 * カテゴリ別に分割された定義をインポートして統合する。
 */
import type { SalesIntegrationDefinition } from "./integration-registry-types"
import { ORCHESTRATION_DEFS } from "./integration-defs-orchestration"
import { SOURCE_DEFS } from "./integration-defs-sources"
import { ASSET_DEFS } from "./integration-defs-assets"

export const INTEGRATION_REGISTRY: SalesIntegrationDefinition[] = [
  ...ORCHESTRATION_DEFS,
  ...SOURCE_DEFS,
  ...ASSET_DEFS,
]
