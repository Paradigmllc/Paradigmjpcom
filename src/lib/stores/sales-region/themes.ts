/**
 * lib/stores/sales-region/themes.ts — REGION_THEMES catalog (12 regions)
 *
 * 役割: 各 sales region のカラーテーマ・通貨・代表言語・代表絵文字 etc.
 * 入力: なし (静的)
 * 出力: REGION_THEMES (Record<SalesRegion, RegionTheme>)
 *
 * 2026-05-01 audit fix: AE-PHP-1 (≤500 行) 準拠のため
 *                      sales-region.ts (675 行) から分離。
 */

import type { SalesRegion, ClusterType, RegionTheme } from "./types"

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
