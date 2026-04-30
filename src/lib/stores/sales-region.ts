// ─── Sales Region Store ─────────────────────────────────────────────
// Paradigm Sales OS v2 — 12地域ハイブリッド版（Q9 Phase 1 最終確定 v4 + PPPソート）
//
// 役割:
//   1. `activeRegion`（11地域 union）をグローバル保持
//   2. ⌘1〜⌘0 + ⌘- キーボードショートカットから書換（RegionSwitcher側）
//   3. persist middleware で localStorage 永続化（リロード復元）
//   4. region → カラーテーマ/通貨/代表言語/想定言語群/絵文字 を派生
//
// 【重要】純言語分類ではなくハイブリッド設計:
//   「バイヤー心理 × 営業運用の現実 × テンプレ複利」の3点最適化
//
//   ◆ 純言語クラスター（1地域 = 1言語 = 1テンプレ）:
//       ja / ko / zh / es / pt / ru
//     → テンプレ使い回し最大化・キャッシュヒット 90%+
//
//   ◆ ハイブリッド心理クラスター（異言語でも同バイヤー心理）:
//       en  → 多数国統合（US/CA/UK/AU/NZ/IE/SG/HK/IN/UAE/Gulf-6/Egypt/ZA）
//               B2B英語が商談共通語で統一
//       ar  → アラビア語中心だが Turkish/Persian 系も包含
//               トルコ語は別語族（アルタイ系）だがイスラム圏バイヤー心理を共有
//
//   ◆ 多言語混在クラスター（地域で括る・言語はLLM動的切替）:
//       europe → DE/FR/IT/NL/Nordics/Swiss（8言語以上）
//       sea    → TH/VN/ID/MY/PH（6言語・B2B英語フォールバック）
//       africa → SSA 英/仏/Swahili/Hausa/Yoruba 混在
//     → テンプレは languages[] で多言語バリアント生成・言語ヒットで動的選択
//
// 落とし穴と対策:
//   - トルコ語 ≠ アラビア語（別語族）だが同じイスラム圏心理 → ar にまとめる
//   - SEA は 6 言語混在 → languages[] で対応・B2B商談は英語フォールバック
//   - アフリカは 英/仏/現地語 錯綜 → multilingual cluster として許容
//   - ⇒ 「純言語」だけでは綺麗に分割できない領域は languages[] で柔軟対応
//
// テンプレ複利戦略:
//   - 純言語クラスター: lang 1個で全市場カバー（コスト最安）
//   - ハイブリッド心理: lang + 副言語で 2-3 バリアント
//   - 多言語混在: languages[] 全バリアント生成 + リードの言語ヒントで選択
//
// 個別ルーティング根拠:
//   - シンガポール/香港/UAE/サウジ/カタール/クウェート → en（B2B英語優勢）
//   - インド → en（英語メイン市場）
//   - エジプト → en（国際商取引で英語優勢・B2B共通語）
//   - 南アフリカ → en（公用語に英語・ヨハネスブルグB2Bは英語優勢）
//   - 台湾/マカオ → zh（繁體中文・中国本土は実運用上除外）
//   - トルコ → ar（言語はトルコ語だがイスラム圏バイヤー心理を共有）
//   - ナイジェリア/ケニア/ガーナ等 → africa（多言語混在のまま一括・SSA中心）
//   - 非英語ASEAN（TH/VN/ID/MY/PH）→ sea（現地語必須だが地域で括る）
//
// 実運用上の除外市場（CHECK制約では除外せず・営業ポリシーで対応）:
//   - 中国本土（zh からは実質除外・決済/法規制リスク）
//   - ロシア本土（ru からは実質除外・制裁/送金リスク）
//   - 北朝鮮（ko からは実質除外）
// ─────────────────────────────────────────────────────────────────────

import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"

// ─── 型定義 ───────────────────────────────────────────────────────────
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

interface SalesRegionState {
  activeRegion: SalesRegion
  setRegion: (region: SalesRegion) => void
  getTheme: () => RegionTheme
}

// ─── テーマ定義（11地域）─────────────────────────────────────────────
// ショートカット割当: 東アジア ⌘1-⌘3 / 西欧 ⌘4-⌘5 / ラテン ⌘6-⌘7 /
//                    キリル/アラビア ⌘8-⌘9 / 多言語クラスター ⌘0/⌘-
export const REGION_THEMES: Record<SalesRegion, RegionTheme> = {
  ja: {
    accent: "#C1272D",          // 和朱色（伝統・信頼）
    accentHover: "#A01F24",
    accentLight: "#FCE8E9",
    accentFg: "#FFFFFF",
    label: "日本",
    emoji: "🇯🇵",
    shortcut: "⌘1",
    shortcutKey: "1",
    currency: "JPY",
    lang: "ja",
    languages: ["ja"] as const,
    clusterType: "pure" as const,
    ppp: 46000,
    marketSizeUsdB: 6200,
    populationM: 124,
    b2bEnglishScore: 1,
    dataSource: "国税庁+gBizInfo+jGrants",
  },
  ko: {
    accent: "#003478",          // 青海波（Korean navy）
    accentHover: "#00265A",
    accentLight: "#E0E7F3",
    accentFg: "#FFFFFF",
    label: "韓国",
    emoji: "🇰🇷",
    shortcut: "⌘2",
    shortcutKey: "2",
    currency: "KRW",
    lang: "ko",
    languages: ["ko"] as const,
    clusterType: "pure" as const,
    ppp: 53500,
    marketSizeUsdB: 2900,
    populationM: 52,
    b2bEnglishScore: 2,
    dataSource: "NTS+DART+Saramin",
  },
  zh: {
    accent: "#7D3C98",          // 梅花紫（台湾国花・独自性）
    accentHover: "#5E2E75",
    accentLight: "#F3E5F5",
    accentFg: "#FFFFFF",
    label: "中国語圏",
    emoji: "🇹🇼",
    shortcut: "⌘3",
    shortcutKey: "3",
    currency: "USD",            // TWD/MOPは流動性低・USD基準
    lang: "zh-TW",              // 繁體中文（簡体字ではない）
    languages: ["zh-TW"] as const,
    clusterType: "pure" as const,
    ppp: 75000,                 // 台湾$72K + マカオ$90K の加重平均
    marketSizeUsdB: 1800,
    populationM: 24,
    b2bEnglishScore: 2,
    dataSource: "MOEA+104 JobBank+DSEC Macau",
  },
  en: {
    accent: "#1E3A5F",          // リバティブルー（Stripe/Linear系深色）
    accentHover: "#15283F",
    accentLight: "#E6EDF5",
    accentFg: "#FFFFFF",
    label: "英語圏",
    emoji: "🌐",
    shortcut: "⌘4",
    shortcutKey: "4",
    currency: "USD",
    lang: "en",
    languages: ["en"] as const,   // 商談言語は英語1本・多国統合でも単一テンプレ
    clusterType: "hybrid" as const, // 言語は純だが多数国統合のハイブリッド心理
    ppp: 60000,                    // US$75K/UK$54K/AU$60K/SG$140K/IN$10K/ZA$16K の加重
    marketSizeUsdB: 38000,         // 全地域中最大（US+UK+AU+SG+HK+IN+Gulf+ZA+Egypt）
    populationM: 2100,
    b2bEnglishScore: 5,
    dataSource: "SEC+Companies House+Gulf+CIPC ZA+GAFI Egypt",
  },
  europe: {
    accent: "#003399",          // EUロイヤルブルー
    accentHover: "#00247A",
    accentLight: "#E0E7FF",
    accentFg: "#FFFFFF",
    label: "欧州",
    emoji: "🇪🇺",
    shortcut: "⌘5",
    shortcutKey: "5",
    currency: "EUR",
    lang: "de",                 // 独/仏/蘭はLLM多言語で吸収（代表: ドイツ語）
    languages: ["de", "fr", "it", "nl", "sv", "no", "da", "fi"] as const,
    clusterType: "multilingual" as const, // 8言語混在・テンプレは言語ヒントで動的選択
    ppp: 58000,
    marketSizeUsdB: 14000,
    populationM: 350,
    b2bEnglishScore: 3,
    dataSource: "Bundesanzeiger+Infogreffe+KvK",
  },
  es: {
    accent: "#B01D30",          // スパニッシュレッド（Iberian crimson）
    accentHover: "#8D1626",
    accentLight: "#FDE7EA",
    accentFg: "#FFFFFF",
    label: "スペイン語圏",
    emoji: "🇪🇸",
    shortcut: "⌘6",
    shortcutKey: "6",
    currency: "USD",            // LatAm通貨多様のためUSD基準
    lang: "es",
    languages: ["es"] as const,   // スペイン・LatAm 共通スペイン語1本（方言差はLLM）
    clusterType: "pure" as const,
    ppp: 23000,                   // Spain$48K/Mexico$23K/Argentina$26K/Peru$16K 加重
    marketSizeUsdB: 6500,
    populationM: 500,
    b2bEnglishScore: 2,
    dataSource: "BORME+IGJ+RUT+SAT",
  },
  pt: {
    accent: "#009C3B",          // ブラジル緑（CNPJ緑・ブラジル旗系）
    accentHover: "#007A2E",
    accentLight: "#D4F5DD",
    accentFg: "#FFFFFF",
    label: "ポルトガル語圏",
    emoji: "🇧🇷",
    shortcut: "⌘7",
    shortcutKey: "7",
    currency: "BRL",            // ブラジルが市場の90%以上
    lang: "pt",
    languages: ["pt-BR", "pt-PT"] as const, // ブラジル/ポルトガル方言差あり
    clusterType: "pure" as const,
    ppp: 22000,                   // Brazil$19K が90% + Portugal$45K
    marketSizeUsdB: 4200,
    populationM: 225,
    b2bEnglishScore: 2,
    dataSource: "Receita Federal+JUCESP+Portugal IRN",
  },
  ru: {
    accent: "#D62718",          // スラヴィッククリムゾン（ロシア旗の赤）
    accentHover: "#AD1F13",
    accentLight: "#FCE4E1",
    accentFg: "#FFFFFF",
    label: "ロシア語圏",
    emoji: "🇷🇺",
    shortcut: "⌘8",
    shortcutKey: "8",
    currency: "USD",            // ルーブル不安定・ロシア本土除外のためUSD基準
    lang: "ru",
    languages: ["ru", "uk"] as const, // ロシア語メイン + ウクライナ語（西部CIS）
    clusterType: "hybrid" as const, // ru/uk は言語学的に近縁・同バイヤー心理
    ppp: 28000,                   // CIS/バルト加重（EE$48K/LT$50K/LV$40K/UA$16K/BY$23K）
    marketSizeUsdB: 2500,         // ロシア本土除外のため小規模
    populationM: 85,
    b2bEnglishScore: 2,
    dataSource: "CIS+Baltic+HeadHunter",
  },
  ar: {
    accent: "#B8860B",          // デザートゴールド（砂漠・アラベスク）
    accentHover: "#8B6608",
    accentLight: "#FEF3C7",
    accentFg: "#FFFFFF",
    label: "イスラム圏",
    emoji: "🕌",
    shortcut: "⌘9",
    shortcutKey: "9",
    currency: "USD",
    lang: "ar",
    languages: ["ar", "tr"] as const, // アラビア語 + トルコ語（別語族だが同イスラム圏心理）
    clusterType: "hybrid" as const,
    ppp: 25000,                   // Turkey$45K/Morocco$11K/Jordan$14K/Lebanon$15K 加重
    marketSizeUsdB: 4000,
    populationM: 200,
    b2bEnglishScore: 2,
    dataSource: "Turkey MERSIS+Morocco OMPIC+Jordan MoITS",
  },
  sea: {
    accent: "#0F766E",          // トロピカルエメラルド（海・常夏）
    accentHover: "#0A544F",
    accentLight: "#D1FAE5",
    accentFg: "#FFFFFF",
    label: "東南アジア",
    emoji: "🌏",
    shortcut: "⌘0",
    shortcutKey: "0",
    currency: "USD",
    lang: "en",                 // SEA商談の共通語は英語（現地語テンプレは別系）
    languages: ["en", "th", "vi", "id", "ms", "tl"] as const, // 6言語混在クラスター
    clusterType: "multilingual" as const,
    ppp: 20000,                   // MY$35K/TH$23K/ID$16K/VN$15K/PH$12K 加重
    marketSizeUsdB: 6500,
    populationM: 560,
    b2bEnglishScore: 3,          // Malaysia/Philippinesは英語優勢・Indonesia/Vietnamは低
    dataSource: "JobStreet+DICT+BSSR+HRD Thailand",
  },
  africa: {
    accent: "#E67E22",          // サバンナオレンジ（アフリカ大陸の太陽）
    accentHover: "#BA6519",
    accentLight: "#FEF3E6",
    accentFg: "#FFFFFF",
    label: "アフリカ",
    emoji: "🌍",
    shortcut: "⌘-",
    shortcutKey: "-",
    currency: "USD",
    lang: "en",                 // アフリカ商談は英語/仏語基準（現地語は別系）
    languages: ["en", "fr", "sw"] as const, // SSA: 英 + 仏 + スワヒリ（東アフリカ）
    clusterType: "multilingual" as const,
    ppp: 7000,                    // Nigeria$7K/Kenya$7K/Ghana$8K/Tanzania$4K/Cote d'Ivoire$7K
    marketSizeUsdB: 3500,
    populationM: 900,
    b2bEnglishScore: 4,          // 旧英領植民地は英語が公用語・仏領は仏語優勢
    dataSource: "CAC Nigeria+Brela Tanzania+Kenya BRS+ANSUT",
  },
  others: {
    accent: "#6B7280",          // ニュートラルグレー（カテゴリ未分類）
    accentHover: "#4B5563",
    accentLight: "#F3F4F6",
    accentFg: "#FFFFFF",
    label: "その他",
    emoji: "🗺️",
    shortcut: "",               // キーボードショートカット割当なし（ドロップダウン経由）
    shortcutKey: "",
    currency: "USD",
    lang: "en",                 // 商談は英語フォールバック・現地語はLLM動的
    languages: ["en"] as const, // テンプレは英語1本・必要になった地域だけ追加
    clusterType: "multilingual" as const,
    ppp: 15000,                  // Mongolia$18K/Myanmar$5K/Georgia$27K/Cambodia$6K 加重
    marketSizeUsdB: 1000,
    populationM: 150,
    b2bEnglishScore: 2,
    dataSource: "Mongolia NSO+Myanmar DICA+Caucasus bizdir",
  },
}

// ─── Store 本体 ──────────────────────────────────────────────────────
export const useSalesRegion = create<SalesRegionState>()(
  persist(
    (set, get) => ({
      activeRegion: "ja",

      setRegion: (region) => set({ activeRegion: region }),

      getTheme: () => REGION_THEMES[get().activeRegion],
    }),
    {
      name: "sales-region-v2",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ activeRegion: state.activeRegion }),
      // 永続化マイグレーション:
      //   v1/v2: 旧2値 'jp'|'global'
      //   v3:    中間10地域 (na/oceania/mena)
      //   v4:    10言語 (en/pt/ar 確定)
      //   v5:    11言語 (zh 追加・Gulf→en)
      version: 5,
      migrate: (persistedState: unknown, version: number): { activeRegion: SalesRegion } => {
        const state = persistedState as { activeRegion?: string } | null
        const legacy = state?.activeRegion

        // v1/v2 → v5: 旧2値 からの移行
        if (version < 3) {
          if (legacy === "jp") return { activeRegion: "ja" }
          if (legacy === "global") return { activeRegion: "en" }
        }

        // v3 → v5: 中間10地域からのrename/統合
        if (version < 4) {
          if (legacy === "na") return { activeRegion: "en" }
          if (legacy === "oceania") return { activeRegion: "en" }   // AU/NZ/英領→英語圏に統合
          if (legacy === "mena") return { activeRegion: "ar" }
        }

        // v4 → v5: zh追加・Gulf居住者のar→enシフトは影響なし（既存ja/ko/en等は互換）

        if (legacy && ALL_REGIONS.includes(legacy as SalesRegion)) {
          return { activeRegion: legacy as SalesRegion }
        }
        return { activeRegion: "ja" }
      },
    }
  )
)

// ─── URL ヘルパー ─────────────────────────────────────────────────────
/** 現在の region から /sales/{region}/* URLを組み立て */
export function regionPath(region: SalesRegion, subpath: string = ""): string {
  const clean = subpath.replace(/^\/+/, "")
  return clean ? `/sales/${region}/${clean}` : `/sales/${region}`
}

/** URL pathname から region を推論（/sales/ja/leads → 'ja'） */
export function inferRegionFromPath(pathname: string): SalesRegion | null {
  const match = pathname.match(/^\/sales\/([a-z]+)(\/|$)/)
  const candidate = match?.[1]
  if (candidate && ALL_REGIONS.includes(candidate as SalesRegion)) {
    return candidate as SalesRegion
  }
  return null
}

/** 現在の region を URL と store のどちらかから取得 */
export function getRegionFromUrlOrStore(pathname: string): SalesRegion {
  return inferRegionFromPath(pathname) || useSalesRegion.getState().activeRegion
}

/** 型ガード: 任意の文字列が SalesRegion かどうか */
export function isValidRegion(value: unknown): value is SalesRegion {
  return typeof value === "string" && ALL_REGIONS.includes(value as SalesRegion)
}

// ─── Country → Region マッピング ──────────────────────────────────────
// ISO 3166-1 alpha-2 → SalesRegion（docblock の routing 根拠に準拠）
// DB `leads.country` は ISO-2（大文字）を想定。"Japan"/"日本" 等の別名も許容。
//
// 設計方針:
//   1. 大文字小文字・前後空白を正規化してから判定
//   2. 別名（"JP"/"jp"/"Japan"/"日本"/"JPN"）→ ISO-2 へ畳み込み
//   3. 判定不能時は "others" にフォールバック（空文字/null は "ja" にするのは lead-generator の別責務）

const COUNTRY_ALIAS: Record<string, string> = {
  // Full name → ISO-2
  "japan": "JP", "日本": "JP", "jpn": "JP",
  "korea": "KR", "south korea": "KR", "republic of korea": "KR", "kor": "KR",
  "taiwan": "TW", "taiwan, province of china": "TW", "twn": "TW",
  "hong kong": "HK", "hongkong": "HK", "hkg": "HK",
  "macau": "MO", "macao": "MO", "mac": "MO",
  "china": "CN", "prc": "CN", "chn": "CN",
  "united states": "US", "usa": "US", "united states of america": "US",
  "united kingdom": "GB", "uk": "GB", "britain": "GB", "great britain": "GB", "gbr": "GB",
  "canada": "CA", "can": "CA",
  "australia": "AU", "aus": "AU",
  "new zealand": "NZ", "nzl": "NZ",
  "ireland": "IE", "irl": "IE",
  "singapore": "SG", "sgp": "SG",
  "india": "IN", "ind": "IN",
  "uae": "AE", "united arab emirates": "AE", "emirates": "AE", "are": "AE",
  "saudi arabia": "SA", "saudi": "SA", "ksa": "SA",
  "qatar": "QA", "kuwait": "KW", "oman": "OM", "bahrain": "BH",
  "south africa": "ZA", "zaf": "ZA",
  "egypt": "EG", "egy": "EG",
  "germany": "DE", "deutschland": "DE", "deu": "DE", "ger": "DE",
  "france": "FR", "fra": "FR",
  "italy": "IT", "ita": "IT",
  "netherlands": "NL", "holland": "NL", "nld": "NL",
  "sweden": "SE", "swe": "SE",
  "norway": "NO", "nor": "NO",
  "denmark": "DK", "dnk": "DK",
  "finland": "FI", "fin": "FI",
  "belgium": "BE", "bel": "BE",
  "austria": "AT", "aut": "AT",
  "switzerland": "CH", "che": "CH",
  "poland": "PL", "pol": "PL",
  "spain": "ES", "españa": "ES", "esp": "ES",
  "mexico": "MX", "méxico": "MX", "mex": "MX",
  "argentina": "AR", "arg": "AR",
  "colombia": "CO", "col": "CO",
  "chile": "CL", "chl": "CL",
  "peru": "PE", "per": "PE",
  "brazil": "BR", "brasil": "BR", "bra": "BR",
  "portugal": "PT", "prt": "PT",
  "russia": "RU", "russian federation": "RU", "rus": "RU",
  "ukraine": "UA", "ukr": "UA",
  "belarus": "BY", "blr": "BY",
  "kazakhstan": "KZ", "kaz": "KZ",
  "estonia": "EE", "latvia": "LV", "lithuania": "LT",
  "turkey": "TR", "türkiye": "TR", "turkiye": "TR", "tur": "TR",
  "morocco": "MA", "mar": "MA",
  "thailand": "TH", "tha": "TH",
  "vietnam": "VN", "viet nam": "VN", "vnm": "VN",
  "indonesia": "ID", "idn": "ID",
  "malaysia": "MY", "mys": "MY",
  "philippines": "PH", "phl": "PH",
  "nigeria": "NG", "nga": "NG",
  "kenya": "KE", "ken": "KE",
  "ghana": "GH", "gha": "GH",
  "mongolia": "MN", "mng": "MN",
  "myanmar": "MM", "burma": "MM", "mmr": "MM",
  "cambodia": "KH", "khm": "KH",
  "georgia": "GE", "geo": "GE",
}

const COUNTRY_TO_REGION: Record<string, SalesRegion> = {
  // ja（日本）
  JP: "ja",

  // ko（韓国・北朝鮮除外）
  KR: "ko",

  // zh（台湾/マカオ/中国本土 — 営業ポリシーで CN は実質除外だが型としては zh）
  TW: "zh", HK: "zh", MO: "zh", CN: "zh",

  // en（英語圏ハイブリッド: US/CA/UK/AU/NZ/IE/SG/IN/UAE/Gulf-6/Egypt/South Africa）
  US: "en", CA: "en", GB: "en", AU: "en", NZ: "en", IE: "en",
  SG: "en", IN: "en", AE: "en", SA: "en", QA: "en", KW: "en",
  OM: "en", BH: "en", EG: "en", ZA: "en",

  // europe（欧州非英語・Baltic は ru 側に分類）
  DE: "europe", FR: "europe", IT: "europe", NL: "europe",
  SE: "europe", NO: "europe", DK: "europe", FI: "europe",
  BE: "europe", AT: "europe", CH: "europe", PL: "europe",
  CZ: "europe", HU: "europe", RO: "europe", GR: "europe",
  RS: "europe", HR: "europe", SI: "europe", SK: "europe", BG: "europe",

  // es（スペイン + LatAm）
  ES: "es", MX: "es", AR: "es", CO: "es", PE: "es", CL: "es",
  VE: "es", UY: "es", PY: "es", BO: "es", EC: "es", DO: "es",
  GT: "es", HN: "es", SV: "es", NI: "es", CR: "es", PA: "es",
  PR: "es", CU: "es",

  // pt（ブラジル + ポルトガル）
  BR: "pt", PT: "pt",

  // ru（CIS/バルト・ロシア本土除外だが型としては ru）
  RU: "ru", UA: "ru", BY: "ru", KZ: "ru", UZ: "ru", KG: "ru",
  TJ: "ru", TM: "ru", AZ: "ru", AM: "ru", MD: "ru",
  EE: "ru", LV: "ru", LT: "ru",

  // ar（Turkey/Morocco/Levant・Gulf は en、Egypt は en に分離済み）
  TR: "ar", MA: "ar", JO: "ar", LB: "ar", DZ: "ar", TN: "ar",
  LY: "ar", SY: "ar", IQ: "ar", IR: "ar", YE: "ar", SD: "ar", PS: "ar",

  // sea（SG 除外の非英語ASEAN）
  TH: "sea", VN: "sea", ID: "sea", MY: "sea", PH: "sea", LA: "sea",

  // africa（ZA 除外・SSA）
  NG: "africa", KE: "africa", GH: "africa", TZ: "africa", CI: "africa",
  ET: "africa", UG: "africa", RW: "africa", BW: "africa", ZM: "africa",
  ZW: "africa", MW: "africa", MZ: "africa", CM: "africa", SN: "africa",
  ML: "africa", AO: "africa",

  // others（Mongolia/Myanmar/Cambodia/Caucasus 等）
  MN: "others", MM: "others", KH: "others", GE: "others",
}

/**
 * ISO-2 国コードまたは国名から SalesRegion を解決。
 * 未知の国は "others" にフォールバック（null/undefined/空文字もここに落ちる）。
 * ja 既定が欲しい callsite（CSV/未入力リード等）は呼び出し側で || "ja" を付ける。
 */
export function countryToRegion(country: string | null | undefined): SalesRegion {
  if (!country) return "others"
  const raw = String(country).trim()
  if (!raw) return "others"

  // ISO-2 大文字に正規化（"jp" → "JP"）
  const upper = raw.toUpperCase()
  if (COUNTRY_TO_REGION[upper]) return COUNTRY_TO_REGION[upper]

  // 別名テーブルを引いて ISO-2 経由で再帰判定
  const lower = raw.toLowerCase()
  const iso = COUNTRY_ALIAS[lower]
  if (iso && COUNTRY_TO_REGION[iso]) return COUNTRY_TO_REGION[iso]

  return "others"
}

/**
 * region で leads テーブルを絞り込む際の country 候補一覧を返す。
 * 使い方: `.in("country", REGION_COUNTRY_CODES["ja"])`
 * （未登録の新国コードは段階的に COUNTRY_TO_REGION に追加していく運用）
 */
export const REGION_COUNTRY_CODES: Record<SalesRegion, string[]> = (() => {
  const map: Record<SalesRegion, string[]> = {
    ja: [], ko: [], zh: [], en: [], europe: [], es: [],
    pt: [], ru: [], ar: [], sea: [], africa: [], others: [],
  }
  for (const [iso, region] of Object.entries(COUNTRY_TO_REGION)) {
    map[region].push(iso)
  }
  return map
})()

// ─── 条件ソート機能 ───────────────────────────────────────────────────
// 営業運用上の「どの地域から攻めるか」を動的に並び替え可能にする。
// RegionSwitcher ドロップダウン / /sales ダッシュボード で利用。
//
// ソート軸の使い分け:
//   - default:     日本ホーム優先 → あと PPP 降順（社内オペの初期表示）
//   - ppp:         購買力平価で買い手の財布の厚さを比較（単価設計・価格差別化）
//   - marketSize:  TAMベース・大規模案件の刈り取り優先（M&A視点）
//   - population:  人口ベース・量で稼ぐLow-Touch戦略
//   - b2bEnglish:  英語1本で攻められる順（テンプレコスト最小化）
//   - clusterType: pure(1言語)→hybrid→multilingual（テンプレ複利ROI順）
//   - alpha:       label ABC順（辞書順で探す時のみ）

export type RegionSortKey =
  | "default"
  | "ppp"
  | "marketSize"
  | "population"
  | "b2bEnglish"
  | "clusterType"
  | "alpha"

const CLUSTER_PRIORITY: Record<ClusterType, number> = {
  pure: 0,        // 1地域=1言語・テンプレ1本・キャッシュヒット最大化
  hybrid: 1,      // 多言語だが同バイヤー心理・テンプレ2-3本
  multilingual: 2, // 地域括り・テンプレ複数本・運用コスト最大
}

/**
 * 12地域を指定ソート軸で並び替え。
 * homeRegion は default モード時のみ先頭に固定（その他モードでは軸に従う）。
 */
export function sortRegions(
  regions: readonly SalesRegion[] = ALL_REGIONS,
  sortKey: RegionSortKey = "default",
  homeRegion: SalesRegion = "ja",
): SalesRegion[] {
  const arr = [...regions]

  const comparators: Record<RegionSortKey, (a: SalesRegion, b: SalesRegion) => number> = {
    default: (a, b) => {
      // homeRegion を最上位に固定（営業ホームを視線誘導）
      if (a === homeRegion) return -1
      if (b === homeRegion) return 1
      // あとは PPP 降順で買い手の支払い余力順
      return REGION_THEMES[b].ppp - REGION_THEMES[a].ppp
    },
    ppp: (a, b) => REGION_THEMES[b].ppp - REGION_THEMES[a].ppp,
    marketSize: (a, b) => REGION_THEMES[b].marketSizeUsdB - REGION_THEMES[a].marketSizeUsdB,
    population: (a, b) => REGION_THEMES[b].populationM - REGION_THEMES[a].populationM,
    b2bEnglish: (a, b) => REGION_THEMES[b].b2bEnglishScore - REGION_THEMES[a].b2bEnglishScore,
    clusterType: (a, b) => {
      const diff = CLUSTER_PRIORITY[REGION_THEMES[a].clusterType]
                 - CLUSTER_PRIORITY[REGION_THEMES[b].clusterType]
      // 同クラスター内は PPP 降順で tiebreak
      return diff !== 0 ? diff : REGION_THEMES[b].ppp - REGION_THEMES[a].ppp
    },
    alpha: (a, b) => REGION_THEMES[a].label.localeCompare(REGION_THEMES[b].label, "ja"),
  }

  return arr.sort(comparators[sortKey])
}

/** UI で一括使える形: region + theme のペア配列を返す */
export function getSortedRegionsWithTheme(
  sortKey: RegionSortKey = "default",
  homeRegion: SalesRegion = "ja",
): Array<{ region: SalesRegion; theme: RegionTheme }> {
  return sortRegions(ALL_REGIONS, sortKey, homeRegion).map((region) => ({
    region,
    theme: REGION_THEMES[region],
  }))
}

/**
 * PPP に応じた熱量カラー（ドロップダウンの濃淡で買い手の財布の厚さを可視化）
 * 🔥赤: $50K+ / 🟠橙: $25-50K / 🟡黄: $15-25K / ⚪灰: <$15K
 */
export function getPppHeatColor(region: SalesRegion): string {
  const ppp = REGION_THEMES[region].ppp
  if (ppp >= 50000) return "#EF4444" // red-500
  if (ppp >= 25000) return "#F59E0B" // amber-500
  if (ppp >= 15000) return "#FBBF24" // amber-400
  return "#9CA3AF"                    // gray-400
}

/** ソート軸のラベル（UI 表示用） */
export const SORT_KEY_LABELS: Record<RegionSortKey, string> = {
  default: "ホーム優先",
  ppp: "購買力 (PPP)",
  marketSize: "市場規模",
  population: "人口",
  b2bEnglish: "英語商談の成立度",
  clusterType: "テンプレ複利",
  alpha: "名前順",
}
