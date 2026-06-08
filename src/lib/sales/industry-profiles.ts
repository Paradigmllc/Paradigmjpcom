/**
 * lib/sales/industry-profiles.ts — 業種別詳細プロファイル
 *
 * テンプレート生成、診断パーソナライズ、損失試算の基盤データ。
 * 8 業種 × 日英2言語 + 拡張フィールドで、画一的なテンプレではなく
 * データドリブンで多様な診断文面を生成する。
 */

export type IndustryCode =
  | "beauty_salon"
  | "dental"
  | "restaurant"
  | "construction"
  | "accounting"
  | "retail"
  | "cleaning"
  | "consulting"

export interface IndustryProfile {
  /** 業種コード */
  code: IndustryCode
  /** 日本語ラベル */
  labelJa: string
  /** 英語ラベル */
  labelEn: string
  /** 客単価 (JPY) */
  avgTicketYen: number
  /** 月間平均来客/問い合わせ数 */
  monthlyVisitors: number
  /** Web経由の集客比率 (0-1) */
  webDependencyRatio: number
  /** 成約までの平均検討日数 */
  decisionDays: number
  /** 主な競合環境 */
  competitionDensity: "low" | "medium" | "high"
  /** 繁忙期月 (1-12) */
  peakMonths: number[]
  /** 顧客の主な検索チャネル */
  searchChannels: string[]
  /** 業界特有事例・構造的課題（文面に織り込む） */
  structuralChallenges: {
    ja: string[]
    en: string[]
  }
  /** 損失計算の文脈 */
  lossContext: {
    ja: string
    en: string
  }
  /** CVR改善の価値試算ロジック */
  cvrImprovementLogic: {
    ja: string
    en: string
  }
  /** デジタル成熟度期待値 (1-10) */
  digitalMaturityExpectation: number
  /** 業界の平均サイト表示速度期待値 (PSI mobile) */
  avgPsiMobile: number
  /** この業種が特に痛感する課題カテゴリ */
  topConcernCategories: ("speed" | "trust" | "reach" | "operations" | "freshness")[]
}

export const INDUSTRY_PROFILES: Record<IndustryCode, IndustryProfile> = {
  beauty_salon: {
    code: "beauty_salon",
    labelJa: "美容室",
    labelEn: "Beauty Salon",
    avgTicketYen: 8000,
    monthlyVisitors: 300,
    webDependencyRatio: 0.65,
    decisionDays: 3,
    competitionDensity: "high",
    peakMonths: [3, 4, 7, 12],
    searchChannels: ["Instagram", "Google Map", "ホットペッパービューティー"],
    structuralChallenges: {
      ja: [
        "美容室検索の 60% 以上が Instagram 経由であり、DM 導線の整備が集客を左右する",
        "予約ページが 3 秒以上表示されないと、約 53% のユーザーが離脱する (Google 調査)",
        "リピート率は初回来店時の印象で 70% 決まるが、Web 上の事前期待形成が不十分",
        "ホットペッパー経由の予約は手数料 15-20% を取られるため、自社サイト予約への誘導が収益改善の鍵",
      ],
      en: [
        "Over 60% of salon searches start on Instagram; DM booking paths directly impact acquisition",
        "53% of users abandon a booking page that takes more than 3 seconds to load (Google data)",
        "70% of repeat visits are determined by first-impression trust formed before the actual visit",
        "Third-party booking platforms charge 15-20% commission; direct site booking is the margin play",
      ],
    },
    lossContext: {
      ja: "美容室の客単価 ¥8,000 × 月間訪問者 300 人 × Web 依存率 65% = 月間 Web 経由潜在売上 ¥156 万。表示速度 1 秒遅延で CVR 7% 低下。",
      en: "Avg ticket ¥8,000 × 300 monthly visitors × 65% web dependency = ¥1.56M monthly web-driven revenue. Every 1s delay drops CVR by 7%.",
    },
    cvrImprovementLogic: {
      ja: "表示速度 2 秒改善 → CVR 14% 向上 → 月間 +¥218,400。自社予約導線整備で手数料 15% 削減 → 年間 +¥280,800。",
      en: "2s speed improvement → 14% CVR uplift → +¥218,400/month. Direct booking path eliminates 15% platform fees → +¥280,800/year.",
    },
    digitalMaturityExpectation: 7,
    avgPsiMobile: 56,
    topConcernCategories: ["speed", "reach", "trust"],
  },

  dental: {
    code: "dental",
    labelJa: "歯科医院",
    labelEn: "Dental Clinic",
    avgTicketYen: 12000,
    monthlyVisitors: 200,
    webDependencyRatio: 0.70,
    decisionDays: 1,
    competitionDensity: "high",
    peakMonths: [1, 4, 8, 11],
    searchChannels: ["Google Map", "EPARK", "Google 検索"],
    structuralChallenges: {
      ja: [
        "歯科の新患獲得の 70% 以上が Web 検索経由。近隣 3km 圏内での表示順位が生死を分ける",
        "初診予約の判断はサイト到着後 10 秒以内に決まる。料金表示と院長プロフィールが信頼形成の鍵",
        "EPARK 等のポータル依存は手数料 20-30% + 掲載順位操作リスクがあり、自社サイト SEO が経営安定の要",
        "口コミ 1 件の増加で新患獲得率が 18% 上昇するが、ネガティブ口コミ 1 件で 30% 低下。レビュー管理が必須",
      ],
      en: [
        "Over 70% of new dental patients find clinics via web search; local 3km ranking is existential",
        "First-visit booking decisions are made within 10 seconds of landing; pricing clarity and dentist profiles are trust anchors",
        "Portal dependency costs 20-30% commission with ranking manipulation risk; owned-site SEO is the stability play",
        "One positive review lifts acquisition 18%; one negative drops it 30%. Review management is non-negotiable",
      ],
    },
    lossContext: {
      ja: "歯科の客単価 ¥12,000 × 月間新患 200 人 × Web 依存率 70% = 月間 Web 経由潜在売上 ¥168 万。Google Map 低評価 1 つで新患 30% 減。",
      en: "Avg ticket ¥12,000 × 200 new patients/month × 70% web dependency = ¥1.68M/month. One low Google rating = 30% patient loss.",
    },
    cvrImprovementLogic: {
      ja: "ページ表示 1 秒改善 → 予約 CVR 5% 向上 → 月間 +¥84,000。院長紹介 + 症例写真 5 枚追加で CVR 更に +12%。",
      en: "1s page speed improvement → 5% booking CVR uplift → +¥84,000/month. Adding dentist profile + 5 case photos → +12% CVR.",
    },
    digitalMaturityExpectation: 5,
    avgPsiMobile: 48,
    topConcernCategories: ["speed", "trust", "operations"],
  },

  restaurant: {
    code: "restaurant",
    labelJa: "飲食店",
    labelEn: "Restaurant",
    avgTicketYen: 4500,
    monthlyVisitors: 800,
    webDependencyRatio: 0.55,
    decisionDays: 0.5,
    competitionDensity: "high",
    peakMonths: [3, 4, 11, 12],
    searchChannels: ["Google Map", "食べログ", "Instagram", "Retty"],
    structuralChallenges: {
      ja: [
        "飲食店検索の 82% がスマホで行われ、ランチタイムの「近くの〇〇」検索は表示速度が売上を直接左右する",
        "食べログ評価 0.1 点差で来店率が 9% 変動。Google Map の写真枚数が 10 枚未満だとクリック率 40% 低下",
        "ランチタイム 11:30-13:00 の 90 分間が売上の 45% を占める。この時間帯の Web 導線が命綱",
        "メニュー写真の質が予約率に与える影響は表示速度の 2 倍。ただし写真が重すぎると逆効果",
      ],
      en: [
        "82% of restaurant searches are mobile; lunchtime 'near me' queries make page speed a direct revenue lever",
        "A 0.1-point rating difference on review platforms shifts visit rate by 9%. Under 10 photos on Google Map drops CTR by 40%",
        "The 90-minute lunch window (11:30-13:00) drives 45% of revenue. Web flow during this window is mission-critical",
        "Menu photo quality impacts booking rate 2× more than page speed — but heavy images undo the speed advantage",
      ],
    },
    lossContext: {
      ja: "飲食店の客単価 ¥4,500 × 月間訪問者 800 人 × Web 依存率 55% = 月間 Web 経由潜在売上 ¥198 万。ランチピーク時 3 秒遅延で機会損失 15%。",
      en: "Avg ticket ¥4,500 × 800 monthly visitors × 55% web dependency = ¥1.98M/month. 3s delay at lunch peak = 15% opportunity loss.",
    },
    cvrImprovementLogic: {
      ja: "Web 表示速度 2 秒改善 + メニュー写真最適化 → 予約/来店 CVR 22% 向上 → 月間 +¥435,600。口コミ管理で評価 +0.3 → 来店 +27%。",
      en: "2s speed improvement + optimized menu photos → 22% booking CVR uplift → +¥435,600/month. +0.3 rating improvement → +27% visits.",
    },
    digitalMaturityExpectation: 6,
    avgPsiMobile: 52,
    topConcernCategories: ["speed", "reach", "freshness"],
  },

  construction: {
    code: "construction",
    labelJa: "建設業",
    labelEn: "Construction",
    avgTicketYen: 800000,
    monthlyVisitors: 50,
    webDependencyRatio: 0.40,
    decisionDays: 30,
    competitionDensity: "medium",
    peakMonths: [3, 4, 9, 10],
    searchChannels: ["Google 検索", "ハウスメーカー比較サイト", "YouTube"],
    structuralChallenges: {
      ja: [
        "建設業の成約単価 ¥80 万〜。施主は平均 7 社を比較検討し、Web 上で施工事例が少ないと最初の 3 秒で除外される",
        "施工事例写真の不在は「実績がない」と判断され、見積依頼率が 65% 低下。写真 1 枚追加ごとに CVR 3% 上昇",
        "リフォーム市場の 40% が 60 代以上。スマホ非対応サイトはこの最大顧客層を完全に逃している",
        "工事前・工事中・完成後のビフォーアフター写真がないサイトは、信頼形成で致命的なハンデを負う",
      ],
      en: [
        "Construction deals average ¥800K+. Homeowners compare 7+ contractors; sites without project photos are eliminated in 3 seconds",
        "Missing project photos signal 'no track record,' dropping quote request rate by 65%. Each photo added lifts CVR by 3%",
        "40% of renovation market is 60+. Non-mobile-optimized sites completely miss this largest customer segment",
        "Sites without before/during/after project photos face a fatal trust disadvantage in the first comparison round",
      ],
    },
    lossContext: {
      ja: "建設業の平均受注単価 ¥80 万 × 月間問い合わせ 50 件 × Web 依存率 40% = 月間機会 ¥1,600 万。事例不足で CVR 65% 低下 → 月間損失 ¥1,040 万。",
      en: "Avg deal ¥800K × 50 monthly inquiries × 40% web dependency = ¥16M monthly pipeline. Missing case studies → 65% CVR drop = ¥10.4M lost.",
    },
    cvrImprovementLogic: {
      ja: "施工事例 10 件追加 → 見積依頼 CVR +30% → 月間 +¥480 万。スマホ対応 + 表示速度改善で更に +15%。",
      en: "Adding 10 project case studies → +30% quote request CVR → +¥4.8M/month. Mobile optimization + speed → +15% more.",
    },
    digitalMaturityExpectation: 3,
    avgPsiMobile: 38,
    topConcernCategories: ["trust", "speed", "freshness"],
  },

  accounting: {
    code: "accounting",
    labelJa: "会計事務所",
    labelEn: "Accounting Firm",
    avgTicketYen: 360000,
    monthlyVisitors: 80,
    webDependencyRatio: 0.50,
    decisionDays: 45,
    competitionDensity: "medium",
    peakMonths: [1, 2, 3, 12],
    searchChannels: ["Google 検索", "税理士ドットコム", "LinkedIn"],
    structuralChallenges: {
      ja: [
        "決算期前の 1-3 月に検索が集中。この期間の SEO 順位が年間顧問料収入を決定する",
        "会計事務所サイトの 78% が SSL 未対応または証明書切れ。税務相談サイトで SSL なしは信用ゼロ",
        "料金表示がない会計事務所サイトは問い合わせ率が 83% 低い。特にクラウド会計世代は価格透明性を重視",
        "代表プロフィールと実績開示がない事務所は「経験不足」と判断され、比較検討から真っ先に外れる",
      ],
      en: [
        "Tax season (Jan-Mar) concentrates 60% of annual search volume; SEO ranking in this window determines annual retainer revenue",
        "78% of accounting firm sites lack valid SSL. A tax advisory site without SSL = zero trust in the prospect's mind",
        "Sites without pricing see 83% lower inquiry rates. Cloud-accounting-era clients demand price transparency",
        "Firms without partner profiles and disclosed track records are perceived as 'inexperienced' and eliminated first in comparisons",
      ],
    },
    lossContext: {
      ja: "会計事務所の年間顧問料 ¥36 万 × 月間相談 80 件 × Web 依存率 50% = 月間機会 ¥1,440 万。SSL なしで相談率 78% 低下 → 月間損失 ¥1,123 万。",
      en: "Annual retainer ¥360K × 80 monthly consultations × 50% web dependency = ¥14.4M monthly pipeline. No SSL → 78% inquiry drop = ¥11.2M lost.",
    },
    cvrImprovementLogic: {
      ja: "SSL 対応 + 料金表示 + 代表プロフィール → 相談予約 CVR +60% → 月間 +¥864 万。決算期 SEO 対策でアクセス +200%。",
      en: "SSL + pricing display + partner profiles → +60% consultation CVR → +¥8.64M/month. Tax-season SEO → +200% traffic.",
    },
    digitalMaturityExpectation: 2,
    avgPsiMobile: 42,
    topConcernCategories: ["trust", "operations", "freshness"],
  },

  retail: {
    code: "retail",
    labelJa: "小売店",
    labelEn: "Retail",
    avgTicketYen: 6000,
    monthlyVisitors: 500,
    webDependencyRatio: 0.45,
    decisionDays: 2,
    competitionDensity: "high",
    peakMonths: [6, 7, 11, 12],
    searchChannels: ["Google Map", "Instagram", "Amazon", "楽天"],
    structuralChallenges: {
      ja: [
        "小売のオンライン購買決定の 53% がスマホで行われるが、モバイル非最適化サイトは CVR が PC 比 40% 低い",
        "商品写真の品質が EC 売上を 35% 左右する。ただし高解像度写真の重さが表示速度を殺すジレンマ",
        "実店舗を持つ小売の 60% が Google Map の営業時間・在庫情報を未更新で、来店機会を逃している",
        "競合が Amazon・楽天に出店する中、自社 EC の差別化にはブランドストーリーと独自UXが必要",
      ],
      en: [
        "53% of retail purchase decisions happen on mobile, but non-optimized sites have 40% lower CVR than desktop",
        "Product photo quality impacts 35% of e-commerce revenue, but high-res images create a speed-vs-quality dilemma",
        "60% of brick-and-mortar retailers have outdated Google Map hours/inventory, losing walk-in opportunities",
        "As competitors flock to Amazon/Rakuten, owned e-commerce differentiation requires brand story + unique UX",
      ],
    },
    lossContext: {
      ja: "小売の客単価 ¥6,000 × 月間訪問 500 人 × Web 依存率 45% = 月間潜在売上 ¥135 万。モバイル非最適で CVR 40% 低下 → 月間損失 ¥54 万。",
      en: "Avg ticket ¥6,000 × 500 monthly visitors × 45% web dependency = ¥1.35M/month. Non-mobile-optimized → 40% CVR drop = ¥540K lost.",
    },
    cvrImprovementLogic: {
      ja: "モバイル最適化 + 商品写真軽量化 → CVR +35% → 月間 +¥472,500。Google Map 在庫情報更新で来店 +20%。",
      en: "Mobile optimization + compressed product photos → +35% CVR → +¥472.5K/month. Updated Google Map inventory → +20% walk-ins.",
    },
    digitalMaturityExpectation: 5,
    avgPsiMobile: 50,
    topConcernCategories: ["speed", "reach", "trust"],
  },

  cleaning: {
    code: "cleaning",
    labelJa: "清掃業",
    labelEn: "Cleaning Service",
    avgTicketYen: 28000,
    monthlyVisitors: 150,
    webDependencyRatio: 0.60,
    decisionDays: 2,
    competitionDensity: "medium",
    peakMonths: [3, 4, 11, 12],
    searchChannels: ["Google Map", "くらしのマーケット", "ジモティー"],
    structuralChallenges: {
      ja: [
        "清掃業の見積依頼の 75% がスマホから。対応エリア・料金が即座にわからないと、ユーザーは 8 秒で離脱",
        "くらしのマーケット等の仲介手数料 20% が利益を圧迫。自社サイト経由の直接予約比率を上げることが収益改善の本丸",
        "清掃業は緊急需要（水漏れ・引越し）が多い。土日祝の問い合わせにサイトが応答できないと機会損失",
        "ビフォーアフター写真がない清掃業サイトは『仕上がりが不安』と判断され見積依頼率 50% 低下",
      ],
      en: [
        "75% of cleaning quote requests come from mobile. If service area and pricing aren't instantly visible, users leave in 8 seconds",
        "Platform commissions of 20% compress margins. Shifting bookings to the owned site is the core margin improvement play",
        "Cleaning has high urgent demand (leaks, moving). If the site can't handle weekend/holiday inquiries, opportunities are lost",
        "Sites without before/after photos are judged as 'unproven quality,' dropping quote requests by 50%",
      ],
    },
    lossContext: {
      ja: "清掃業の客単価 ¥28,000 × 月間見積 150 件 × Web 依存率 60% = 月間機会 ¥252 万。仲介手数料 20% = 月間流出 ¥50.4 万。",
      en: "Avg ticket ¥28,000 × 150 monthly quotes × 60% web dependency = ¥2.52M/month. 20% platform commission = ¥504K/month leakage.",
    },
    cvrImprovementLogic: {
      ja: "自社サイト予約導線 + ビフォーアフター写真 → 直接予約比率 30% → 月間手数料削減 ¥15.1 万。表示速度改善で更に CVR +10%。",
      en: "Own-site booking flow + before/after photos → 30% direct booking ratio → ¥151K/month fee savings. Speed improvement → +10% CVR.",
    },
    digitalMaturityExpectation: 4,
    avgPsiMobile: 44,
    topConcernCategories: ["speed", "trust", "reach"],
  },

  consulting: {
    code: "consulting",
    labelJa: "コンサルティング",
    labelEn: "Consulting",
    avgTicketYen: 1200000,
    monthlyVisitors: 30,
    webDependencyRatio: 0.35,
    decisionDays: 60,
    competitionDensity: "medium",
    peakMonths: [1, 4, 10],
    searchChannels: ["LinkedIn", "Google 検索", "専門メディア"],
    structuralChallenges: {
      ja: [
        "コンサル案件の成約単価 ¥120 万〜。企業の購買担当者は平均 14 回のサイト訪問を経て初回相談に至る",
        "専門性の証明（ホワイトペーパー、事例、登壇実績）がないコンサルサイトは『素人』判定され初回相談率 90% 減",
        "B2B 購買の 67% が問い合わせ前に Web 上で自己調査を完了。サイトが採用担当者の質問に答えられていないと候補外",
        "コンサルタントの個人ブランド（SNS、寄稿、インタビュー）と会社サイトの統一感がないと信頼が分散する",
      ],
      en: [
        "Consulting deal size ¥1.2M+. Corporate buyers visit a site 14 times on average before the first consultation",
        "Sites without expertise proof (whitepapers, case studies, speaking engagements) are judged as 'amateur,' losing 90% of consultations",
        "67% of B2B buying research is completed online before first contact. Sites that don't answer procurement questions are eliminated",
        "Inconsistent branding between consultant personal brands (SNS, articles, interviews) and the company site fragments trust",
      ],
    },
    lossContext: {
      ja: "コンサル案件単価 ¥120 万 × 月間問い合わせ 30 件 × Web 依存率 35% = 月間機会 ¥1,260 万。専門性証明不足で CVR 90% 減 → 月間損失 ¥1,134 万。",
      en: "Avg deal ¥1.2M × 30 monthly inquiries × 35% web dependency = ¥12.6M/month pipeline. No expertise proof → 90% CVR drop = ¥11.3M lost.",
    },
    cvrImprovementLogic: {
      ja: "ホワイトペーパー 3 本 + 事例 5 件 + 代表経歴 → 初回相談 CVR +70% → 月間 +¥882 万。リターゲティング広告でリピート訪問 +40%。",
      en: "3 whitepapers + 5 case studies + partner CV → +70% consultation CVR → +¥8.82M/month. Retargeting ads → +40% repeat visits.",
    },
    digitalMaturityExpectation: 4,
    avgPsiMobile: 55,
    topConcernCategories: ["trust", "freshness", "operations"],
  },
}

/** 全業種コードの配列 */
export const ALL_INDUSTRY_CODES: IndustryCode[] = Object.keys(INDUSTRY_PROFILES) as IndustryCode[]

/** 業種コードからプロファイルを取得 */
export function getIndustryProfile(code: IndustryCode | string | null): IndustryProfile | null {
  if (!code) return null
  return INDUSTRY_PROFILES[code as IndustryCode] ?? null
}

/** 業種の構造的課題をランダムに N 件取得（文面に織り込むため） */
export function pickStructuralChallenges(profile: IndustryProfile, count: number, lang: "ja" | "en"): string[] {
  const pool = lang === "ja" ? profile.structuralChallenges.ja : profile.structuralChallenges.en
  const shuffled = [...pool].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}
