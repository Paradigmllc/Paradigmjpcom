/**
 * lib/stores/sales-region/types.ts — Sales region type definitions
 *
 * 役割: SalesRegion union (12 regions), ClusterType, RegionTheme interface.
 * 入力: なし (静的)
 * 出力: 上記 type/interface + ALL_REGIONS readonly array
 *
 * 2026-05-01 audit fix: 型を独立ファイル化。
 */

export type SalesRegion =
  | "ja"       // 🇯🇵 日本
  | "ko"       // 🇰🇷 韓国（北朝鮮除外）
  | "zh"       // 🇹🇼 中国語圏（台湾/マカオ・中国本土除外）
  | "en"       // 🌐 英語圏（US/CA/UK/AU/NZ/IE/SG/HK/IN/UAE/Gulf-6/Egypt/South Africa）
  | "europe"   // 🇪🇺 欧州非英語（DE/FR/IT/NL/Nordics/Swiss）
  | "es"       // 🇪🇸 スペイン語圏（ES + LatAm）
  | "pt"       // 🇧🇷 ポルトガル語圏（Brazil + Portugal）
  | "ru"       // 🇷🇺 ロシア語圏（CIS/バルト・ロシア本土除外）
  | "ar"       // 🕌 アラビア語/イスラム圏（Gulf+Egypt+SA除外・Turkey/Morocco/Levant）
  | "sea"      // 🌏 東南アジア（SG除外の非英語ASEAN）
  | "africa"   // 🌍 アフリカ（SA除外・SSA 英/仏/現地語混在）
  | "others"   // 🗺️ その他（Mongolia/Caucasus/Myanmar/Cambodia 等の少数市場）

export const ALL_REGIONS: readonly SalesRegion[] = [
  "ja", "ko", "zh", "en", "europe", "es", "pt", "ru", "ar", "sea", "africa", "others",
] as const

export type ClusterType =
  | "pure"          // 純言語クラスター（1地域=1言語・テンプレ1本で完結）
  | "hybrid"        // ハイブリッド心理クラスター（多言語だが同バイヤー心理）
  | "multilingual"  // 多言語混在クラスター（地域で括る・languages[] で動的切替）

export interface RegionTheme {
  accent: string
  accentHover: string
  accentLight: string
  accentFg: string
  label: string
  emoji: string
  shortcut: string       // '⌘1'〜'⌘0' + '⌘-'（12地域・others は空）
  shortcutKey: string    // '1'〜'0' + '-'
  currency: string       // ISO 4217
  lang: string           // ISO 639-1（UIデフォルト言語・LLMプロンプトの既定）
  languages: readonly string[]  // この地域で生成される言語バリアント（BCP-47）
  clusterType: ClusterType       // テンプレ生成戦略の分岐キー
  ppp: number            // 🆕 PPP per capita USD (IMF/World Bank 2024 推計・加重平均)
  marketSizeUsdB: number // 🆕 市場規模 USD Billion (PPP GDP 合計・営業優先度)
  populationM: number    // 🆕 人口 Million（TAM推定用）
  b2bEnglishScore: number // 🆕 1-5 (5=完全英語で商談成立・1=現地語必須)
  dataSource: string     // 下部バー表示用（主要データソース）
}

export interface SalesRegionState {
  activeRegion: SalesRegion
  setRegion: (region: SalesRegion) => void
  getTheme: () => RegionTheme
}

// ─── テーマ定義（11地域）─────────────────────────────────────────────
// ショートカット割当: 東アジア ⌘1-⌘3 / 西欧 ⌘4-⌘5 / ラテン ⌘6-⌘7 /
