/**
 * lib/sales/issue-profiles.ts — 課題コード別詳細プロファイル
 *
 * 各課題の技術的説明、ビジネスインパクト、業種別影響度を定義。
 * 業種プロファイルと組み合わせて、データドリブンで多様な診断文面を生成する。
 */

import type { IndustryCode } from "./industry-profiles"

export type IssueCode =
  | "speed_critical"
  | "ssl_expired"
  | "wp_outdated"
  | "no_ogp"
  | "no_sns"
  | "copyright_old"
  | "ua_残存"

export interface IssueProfile {
  /** 課題コード */
  code: IssueCode
  /** 日本語ラベル */
  labelJa: string
  /** 英語ラベル */
  labelEn: string
  /** 深刻度 */
  severity: "critical" | "warning" | "info"
  /** アイコンラベル */
  icon: string
  /** 指標名 (ja) */
  metricLabelJa: string
  /** 指標名 (en) */
  metricLabelEn: string
  /** 指標単位 */
  metricUnit: string
  /** 業界ベンチマーク値 (1-100 のスコアと解釈) */
  industryBenchmark: Record<IndustryCode, { value: number | string; interpretation: string }>
  /** 技術的説明 */
  technicalExplanation: {
    ja: string
    en: string
  }
  /** ビジネスインパクト（文面生成用） */
  businessImpact: {
    ja: string[]
    en: string[]
  }
  /** 改善難易度 (1-10) */
  fixDifficulty: number
  /** 改善にかかる概算工数（時間） */
  fixEffortHours: number
  /** 改善しない場合の 3/6/12 ヶ月後予測 */
  deteriorationForecast: {
    ja: { months3: string; months6: string; months12: string }
    en: { months3: string; months6: string; months12: string }
  }
}

export const ISSUE_PROFILES: Record<IssueCode, IssueProfile> = {
  speed_critical: {
    code: "speed_critical",
    labelJa: "スマホ表示速度",
    labelEn: "Mobile Page Speed",
    severity: "critical",
    icon: "SPEED",
    metricLabelJa: "モバイル表示スコア",
    metricLabelEn: "Mobile Performance Score",
    metricUnit: "点 (100点満点)",
    industryBenchmark: {
      beauty_salon: { value: 56, interpretation: "美容室サイト平均 56 点。貴社は大きく下回っています。" },
      dental: { value: 48, interpretation: "歯科医院サイト平均 48 点。貴社はこの水準にも達していません。" },
      restaurant: { value: 52, interpretation: "飲食店サイト平均 52 点。ランチピーク時の離脱が深刻です。" },
      construction: { value: 38, interpretation: "建設業サイト平均 38 点。写真多用が速度を圧迫しています。" },
      accounting: { value: 42, interpretation: "会計事務所サイト平均 42 点。SSL と速度の両面で課題があります。" },
      retail: { value: 50, interpretation: "小売サイト平均 50 点。商品画像の最適化が急務です。" },
      cleaning: { value: 44, interpretation: "清掃業サイト平均 44 点。見積フォームの読み込みが遅延しています。" },
      consulting: { value: 55, interpretation: "コンサルサイト平均 55 点。案件獲得に致命的なハンデです。" },
    },
    technicalExplanation: {
      ja: "Google PageSpeed Insights のモバイルスコアが 50 点未満。主な原因は画像の非圧縮、JavaScript のブロッキング、サーバー応答の遅延。Google の調査では、表示に 3 秒以上かかると 53% のユーザーが離脱します。",
      en: "Google PageSpeed Insights mobile score under 50. Main causes: uncompressed images, render-blocking JavaScript, slow server response. Google research shows 53% of users abandon a page that takes over 3 seconds to load.",
    },
    businessImpact: {
      ja: [
        "スマホユーザーの 53% が 3 秒以内に表示されないページから離脱。これは直接的な機会損失です。",
        "Google の検索ランキングはモバイル表示速度を評価指標に含めており、低速サイトは SEO 順位が下がります。",
        "ページの表示速度が 1 秒遅くなるごとにコンバージョン率が 7% 低下します。",
        "競合サイトが 2 秒で表示される中、御社サイトが 6 秒かかっている場合、検討リストから最初に外れます。",
      ],
      en: [
        "53% of mobile users abandon pages that don't load within 3 seconds — direct revenue loss.",
        "Google search ranking factors include mobile speed; slow sites are penalized in SEO position.",
        "Every 1-second delay in page load time reduces conversion rate by 7%.",
        "When competitor sites load in 2 seconds and yours takes 6, you're eliminated from consideration first.",
      ],
    },
    fixDifficulty: 5,
    fixEffortHours: 8,
    deteriorationForecast: {
      ja: {
        months3: "3 ヶ月後: 検索順位が 3-5 位低下。月間アクセス数が 15-20% 減少します。",
        months6: "6 ヶ月後: 競合に SEO で大きく水をあけられ、新規流入が半減。モバイル CVR が業界平均の 40% 下に。",
        months12: "12 ヶ月後: Web 経由の売上が 50% 以上減少。モバイル検索からの流入が壊滅的になります。",
      },
      en: {
        months3: "3 months: Search ranking drops 3-5 positions. Monthly traffic declines 15-20%.",
        months6: "6 months: Competitors pull far ahead in SEO. New organic traffic is cut in half. Mobile CVR falls 40% below industry average.",
        months12: "12 months: Web-driven revenue drops over 50%. Mobile search traffic becomes negligible.",
      },
    },
  },

  ssl_expired: {
    code: "ssl_expired",
    labelJa: "SSL証明書",
    labelEn: "SSL Certificate",
    severity: "warning",
    icon: "TRUST",
    metricLabelJa: "SSL有効期限",
    metricLabelEn: "SSL Expiry",
    metricUnit: "日",
    industryBenchmark: {
      beauty_salon: { value: 365, interpretation: "SSL 証明書は最低 30 日以上の有効期限が必要です。" },
      dental: { value: 365, interpretation: "医療系サイトは SSL が必須。未対応は致命的な信用毀損です。" },
      restaurant: { value: 365, interpretation: "予約フォームのある飲食サイトは SSL 必須です。" },
      construction: { value: 365, interpretation: "見積依頼フォームに SSL がないと、個人情報送信を躊躇されます。" },
      accounting: { value: 365, interpretation: "税務相談サイトで SSL なしは信用ゼロ。即座に候補から外されます。" },
      retail: { value: 365, interpretation: "EC 機能がある場合 SSL なしは法的にも問題があります。" },
      cleaning: { value: 365, interpretation: "見積依頼に個人情報を入力するため SSL は最低条件です。" },
      consulting: { value: 365, interpretation: "B2B サイトで SSL なしは情報管理能力を疑問視されます。" },
    },
    technicalExplanation: {
      ja: "SSL/TLS 証明書が期限切れ、または未設定。ブラウザが「このサイトは安全ではありません」と警告を表示。ユーザーの 84% が SSL 未対応サイトでの個人情報入力を拒否します。",
      en: "SSL/TLS certificate expired or not configured. Browsers display 'Not Secure' warnings. 84% of users refuse to enter personal information on non-SSL sites.",
    },
    businessImpact: {
      ja: [
        "ブラウザの「保護されていません」警告で、訪問者の 84% が即座に離脱します。",
        "SSL 未対応サイトは Google 検索でペナルティを受け、SEO 順位が低下します。",
        "問い合わせフォームや予約フォームがある場合、個人情報保護の観点から信用を完全に失います。",
        "特に会計、医療、法律関連では SSL なしは『情報管理がずさん』と判断され致命的です。",
      ],
      en: [
        "84% of visitors leave immediately upon seeing browser 'Not Secure' warnings.",
        "Non-SSL sites receive Google search ranking penalties, lowering SEO position.",
        "Any site with contact or booking forms completely loses trust on data privacy grounds without SSL.",
        "In accounting, medical, and legal fields, missing SSL signals 'negligent information management' — fatal to credibility.",
      ],
    },
    fixDifficulty: 2,
    fixEffortHours: 2,
    deteriorationForecast: {
      ja: {
        months3: "3 ヶ月後: ブラウザ警告により直帰率が 80% 以上に。検索順位が 5-10 位低下します。",
        months6: "6 ヶ月後: 問い合わせ数が激減。SSL 未対応が常態化し、競合が SEO 上位を独占します。",
        months12: "12 ヶ月後: Web 経由の売上が壊滅。ブラウザ警告が常態化し、新規顧客獲得が不可能になります。",
      },
      en: {
        months3: "3 months: Browser warnings push bounce rate above 80%. Search ranking drops 5-10 positions.",
        months6: "6 months: Inquiry volume collapses. Missing SSL becomes normalized; competitors dominate SEO.",
        months12: "12 months: Web-driven revenue is destroyed. Browser warnings are permanent; new customer acquisition becomes impossible.",
      },
    },
  },

  wp_outdated: {
    code: "wp_outdated",
    labelJa: "CMS運用基盤",
    labelEn: "CMS Foundation",
    severity: "warning",
    icon: "OPS",
    metricLabelJa: "CMSバージョン",
    metricLabelEn: "CMS Version",
    metricUnit: "世代",
    industryBenchmark: {
      beauty_salon: { value: 6.7, interpretation: "最新バージョンから 2 世代以上遅れています。" },
      dental: { value: 6.7, interpretation: "旧バージョンの WordPress には既知の脆弱性があります。" },
      restaurant: { value: 6.7, interpretation: "CMS の旧バージョン継続利用はセキュリティリスクです。" },
      construction: { value: 6.7, interpretation: "古い CMS は表示速度の低下とセキュリティホールを生みます。" },
      accounting: { value: 6.7, interpretation: "顧客データを扱う会計事務所で旧 CMS は情報漏洩リスクがあります。" },
      retail: { value: 6.7, interpretation: "旧 CMS は EC 機能の不具合や決済セキュリティのリスクがあります。" },
      cleaning: { value: 6.7, interpretation: "古い CMS は更新作業が滞り、サイト鮮度の低下を招きます。" },
      consulting: { value: 6.7, interpretation: "旧 CMS の継続利用は『IT に疎い』印象を与え、専門性を損ないます。" },
    },
    technicalExplanation: {
      ja: "WordPress または他 CMS のバージョンが最新から 2 世代以上遅れている。既知の脆弱性が放置され、改ざん・情報漏洩のリスクがある。またプラグインの互換性問題で表示速度が低下する。",
      en: "WordPress or other CMS is 2+ major versions behind. Known vulnerabilities are unpatched, creating defacement and data breach risks. Plugin compatibility issues also degrade page speed.",
    },
    businessImpact: {
      ja: [
        "旧バージョンの CMS には公開済みの脆弱性があり、サイト改ざんや情報漏洩のリスクがあります。",
        "プラグインの互換性問題で管理画面が遅くなり、更新作業が滞ります。これが鮮度低下の悪循環を生みます。",
        "ハッキング被害を受けた場合、復旧費用 30-100 万円 + Google のブラックリスト登録で SEO が壊滅します。",
        "WordPress の場合、WP 4.x 以前には自動更新機能がなく、手動更新を怠ると改ざんリスクが急上昇します。",
      ],
      en: [
        "Outdated CMS versions have publicly known vulnerabilities — defacement and data breach risks are real.",
        "Plugin compatibility issues slow down the admin panel, blocking content updates. This creates a freshness death spiral.",
        "A hack incident costs ¥300K-1M in recovery + Google blacklisting that destroys SEO.",
        "For WordPress, versions before 4.x lack auto-update; manual update neglect causes exponentially rising defacement risk.",
      ],
    },
    fixDifficulty: 6,
    fixEffortHours: 12,
    deteriorationForecast: {
      ja: {
        months3: "3 ヶ月後: 未パッチ脆弱性が攻撃者に発見される確率が上昇。管理画面の操作不能リスクが高まります。",
        months6: "6 ヶ月後: 改ざん被害の確率が 40% 超。SEO スパム注入による Google ペナルティが現実化します。",
        months12: "12 ヶ月後: サイト乗っ取り・顧客情報流出のリスクが極めて高い状態。復旧不能になる可能性があります。",
      },
      en: {
        months3: "3 months: Unpatched vulnerabilities are increasingly discoverable. Admin panel may become inoperable.",
        months6: "6 months: Defacement probability exceeds 40%. SEO spam injection triggers real Google penalties.",
        months12: "12 months: Site takeover and customer data breach risk is critically high. Recovery may be impossible.",
      },
    },
  },

  no_ogp: {
    code: "no_ogp",
    labelJa: "SNS共有表示",
    labelEn: "Social Preview",
    severity: "warning",
    icon: "SNS",
    metricLabelJa: "OGP設定数",
    metricLabelEn: "OGP Tags Set",
    metricUnit: "種類 (最大6)",
    industryBenchmark: {
      beauty_salon: { value: 6, interpretation: "Instagram 共有時のサムネイル表示に最低 4 種の OGP タグが必要です。" },
      dental: { value: 6, interpretation: "SNS 経由の口コミ拡散に OGP 設定は不可欠です。" },
      restaurant: { value: 6, interpretation: "料理写真が SNS 共有時に正しく表示されません。" },
      construction: { value: 6, interpretation: "施工事例の共有時にサムネイルが表示されず、クリック率が低下します。" },
      accounting: { value: 4, interpretation: "最低限 title/description の OGP 設定がありません。" },
      retail: { value: 6, interpretation: "商品写真の SNS 共有時にサムネイルが欠落し、購買意欲を損なっています。" },
      cleaning: { value: 4, interpretation: "SNS 共有時の表示情報が不足しています。" },
      consulting: { value: 6, interpretation: "LinkedIn 共有時のプレビューが不完全で、専門性の訴求機会を逃しています。" },
    },
    technicalExplanation: {
      ja: "Open Graph Protocol (OGP) タグが未設定または不完全。SNS で URL を共有した際にサムネイル、タイトル、説明文が表示されない。og:image が欠落するとクリック率が 40% 低下。",
      en: "Open Graph Protocol (OGP) tags are missing or incomplete. When URLs are shared on social media, thumbnails, titles, and descriptions don't appear. Missing og:image reduces click-through rate by 40%.",
    },
    businessImpact: {
      ja: [
        "SNS で URL を共有してもサムネイルが表示されず、クリック率が 40% 低下します。",
        "LINE や Facebook での共有時にサイトの第一印象を形成する情報が欠落します。",
        "特に Instagram 集客に依存する美容室・飲食店では、OGP 不全が集客に直結します。",
        "クライアントや顧客がサイトを共有しても、プロフェッショナルに見えず信頼を損ないます。",
      ],
      en: [
        "Shared URLs on social media show no thumbnail, reducing click-through rate by 40%.",
        "LINE and Facebook shares lack the visual first impression that captures attention.",
        "For Instagram-dependent businesses (salons, restaurants), missing OGP directly impacts customer acquisition.",
        "Client and customer shares of your site appear unprofessional, damaging perceived credibility.",
      ],
    },
    fixDifficulty: 2,
    fixEffortHours: 2,
    deteriorationForecast: {
      ja: {
        months3: "3 ヶ月後: SNS 経由のアクセスが 30% 減少。シェアされてもクリックされない状態が常態化します。",
        months6: "6 ヶ月後: SNS 集客チャネルが実質機能停止。競合の OGP 最適化された投稿に完全に負けます。",
        months12: "12 ヶ月後: SNS マーケティング全体の ROI が激減。ブランド露出の機会を恒常的に失います。",
      },
      en: {
        months3: "3 months: Social traffic drops 30%. Shared content is habitually ignored.",
        months6: "6 months: Social acquisition channels effectively stop working. Competitors' OGP-optimized posts dominate.",
        months12: "12 months: Social marketing ROI collapses. Brand exposure opportunities are permanently lost.",
      },
    },
  },

  no_sns: {
    code: "no_sns",
    labelJa: "SNS外部接点",
    labelEn: "Social Presence",
    severity: "warning",
    icon: "REACH",
    metricLabelJa: "SNSリンク数",
    metricLabelEn: "SNS Links",
    metricUnit: "件",
    industryBenchmark: {
      beauty_salon: { value: 3, interpretation: "Instagram + LINE + Google Map の 3 チャネル最低限必要です。" },
      dental: { value: 3, interpretation: "Google Map + Instagram + LINE の口コミ導線が不足しています。" },
      restaurant: { value: 4, interpretation: "Instagram + Google Map + 食べログ + LINE の導線が求められます。" },
      construction: { value: 2, interpretation: "YouTube + Instagram の施工事例発信導線がありません。" },
      accounting: { value: 1, interpretation: "最低限 LinkedIn の導線がありません。" },
      retail: { value: 3, interpretation: "Instagram + LINE + Google Map の購買導線が不足しています。" },
      cleaning: { value: 2, interpretation: "Instagram + LINE の口コミ拡散導線が不足しています。" },
      consulting: { value: 2, interpretation: "LinkedIn + X(Twitter) の専門性発信導線がありません。" },
    },
    technicalExplanation: {
      ja: "Web サイトから SNS アカウント（Instagram, LINE, LinkedIn, YouTube 等）へのリンクが欠落している。ユーザーはサイトだけでは信頼判断できず、SNS での活動実績を確認できないと離脱する。",
      en: "Links to social media accounts (Instagram, LINE, LinkedIn, YouTube, etc.) are missing from the website. Users cannot verify activity and credibility through social channels, leading to abandonment.",
    },
    businessImpact: {
      ja: [
        "サイト訪問者は SNS での実績や口コミを確認できないと、信頼形成が不完全なまま離脱します。",
        "業種によって必要な SNS チャネルは異なりますが、ゼロでは『活動していない』印象を与えます。",
        "特に美容室、飲食店では Instagram 不在が致命的。『この店は本当に営業しているのか』と疑われます。",
        "B2B（会計・コンサル）では LinkedIn 不在が『業界との接点がない』と判断され、専門性を疑われます。",
      ],
      en: [
        "Visitors who can't verify your track record and reviews on social media leave with incomplete trust.",
        "Required social channels vary by industry, but having zero creates an impression of 'inactive business.'",
        "For salons and restaurants, missing Instagram is fatal — prospects question whether the business is even operating.",
        "In B2B (accounting, consulting), missing LinkedIn signals 'no industry connections' and erodes perceived expertise.",
      ],
    },
    fixDifficulty: 1,
    fixEffortHours: 1,
    deteriorationForecast: {
      ja: {
        months3: "3 ヶ月後: 信頼形成の補完情報がないため、競合に SNS 経由で顧客を奪われます。",
        months6: "6 ヶ月後: サイト訪問者の直帰率が上昇。SNS クロスチェックできないことが離脱の主因になります。",
        months12: "12 ヶ月後: オンラインプレゼンスが競合に完全に劣後。新規顧客の信頼獲得が極めて困難になります。",
      },
      en: {
        months3: "3 months: Without trust-reinforcing social proof, competitors capture customers via social channels.",
        months6: "6 months: Site bounce rate rises. Inability to cross-check on social becomes the primary exit reason.",
        months12: "12 months: Online presence is comprehensively inferior to competitors. New customer trust is extremely hard to earn.",
      },
    },
  },

  copyright_old: {
    code: "copyright_old",
    labelJa: "更新鮮度",
    labelEn: "Content Freshness",
    severity: "info",
    icon: "FRESH",
    metricLabelJa: "最終更新年",
    metricLabelEn: "Last Update Year",
    metricUnit: "年 (西暦)",
    industryBenchmark: {
      beauty_salon: { value: 2026, interpretation: "コピーライトが古いと『閉業したのでは』と誤解されます。" },
      dental: { value: 2026, interpretation: "コピーライトが 2 年以上前だと休廃業を疑われます。" },
      restaurant: { value: 2026, interpretation: "コピーライトが古いと営業継続しているか不安視されます。" },
      construction: { value: 2026, interpretation: "コピーライトが古いと最新の施工実績がない印象を与えます。" },
      accounting: { value: 2026, interpretation: "コピーライトが古いと最新の税制対応ができていない印象を与えます。" },
      retail: { value: 2026, interpretation: "コピーライトが古いと商品の入れ替わりがない印象を与えます。" },
      cleaning: { value: 2026, interpretation: "コピーライトが古いと営業継続の有無を不安視されます。" },
      consulting: { value: 2026, interpretation: "コピーライトが古いと最新の知見がない印象を与え、専門性を損ないます。" },
    },
    technicalExplanation: {
      ja: "フッターのコピーライト年が 2 年以上前のまま。これは『最終更新が 2 年以上前』『事業が活動していない可能性がある』という強いネガティブシグナルを発する。",
      en: "Footer copyright year is 2+ years old. This sends a strong negative signal: 'last updated 2+ years ago' and 'business may no longer be active.'",
    },
    businessImpact: {
      ja: [
        "コピーライトが 2 年以上前のままのサイトは『閉業したのでは』『更新が止まっている』と判断されます。",
        "特に新規顧客はコピーライト年を無意識にチェックし、事業継続性を判断します。",
        "コピーライトが古い + 他の課題（速度・SSL・WP 旧版）が重なると『完全放置サイト』と見なされます。",
        "更新頻度の低さは SEO にも悪影響。Google は鮮度の低いサイトを低く評価します。",
      ],
      en: [
        "Sites with 2+ year-old copyright dates are judged as 'closed' or 'abandoned.'",
        "New customers unconsciously check the copyright year to assess business continuity.",
        "An old copyright combined with other issues (speed, SSL, outdated CMS) signals a 'completely neglected site.'",
        "Low update frequency hurts SEO — Google penalizes stale content.",
      ],
    },
    fixDifficulty: 1,
    fixEffortHours: 0.5,
    deteriorationForecast: {
      ja: {
        months3: "3 ヶ月後: 新規顧客の 30% がコピーライト古さで離脱。事業停止疑惑が口コミで広がります。",
        months6: "6 ヶ月後: Google がサイト鮮度を低評価。SEO 順位が更に低下します。",
        months12: "12 ヶ月後: サイト全体が『廃業済み』と誤解され、新規顧客獲得が不可能になります。",
      },
      en: {
        months3: "3 months: 30% of new prospects leave due to perceived business closure. Closure rumors spread via word of mouth.",
        months6: "6 months: Google penalizes the site for low freshness. SEO ranking drops further.",
        months12: "12 months: The entire site is misperceived as 'out of business.' New customer acquisition becomes impossible.",
      },
    },
  },

  ua_残存: {
    code: "ua_残存",
    labelJa: "Googleアナリティクス移行",
    labelEn: "Analytics Migration",
    severity: "warning",
    icon: "DATA",
    metricLabelJa: "GA4 移行状況",
    metricLabelEn: "GA4 Migration",
    metricUnit: "状態",
    industryBenchmark: {
      beauty_salon: { value: "移行済", interpretation: "UA は 2023 年 7 月に計測停止。GA4 に移行していないとアクセス解析ができていません。" },
      dental: { value: "移行済", interpretation: "UA のデータ計測は完全停止。GA4 未移行は患者導線の可視化が不可能です。" },
      restaurant: { value: "移行済", interpretation: "UA 停止済み。GA4 なしでは予約導線の分析ができません。" },
      construction: { value: "移行済", interpretation: "UA 終了。GA4 未移行では見積依頼の流入元分析が不可能です。" },
      accounting: { value: "移行済", interpretation: "UA 停止。GA4 未導入では問い合わせ導線のデータが取れていません。" },
      retail: { value: "移行済", interpretation: "UA 計測終了。GA4 なしでは EC 購買導線分析ができません。" },
      cleaning: { value: "移行済", interpretation: "UA 停止。GA4 未導入では見積依頼の効果測定が不可能です。" },
      consulting: { value: "移行済", interpretation: "UA 終了。GA4 未移行ではサイト経由のリード獲得状況が把握できません。" },
    },
    technicalExplanation: {
      ja: "Google ユニバーサルアナリティクス（UA）が 2023 年 7 月 1 日に計測を完全停止。GA4 への移行が行われておらず、現在のアクセス解析が機能していない状態。サイト改善のためのデータが一切取得できていない。",
      en: "Google Universal Analytics (UA) permanently stopped processing data on July 1, 2023. Migration to GA4 has not occurred, meaning current analytics are non-functional. Zero data is being collected for site improvement decisions.",
    },
    businessImpact: {
      ja: [
        "UA は 2023 年 7 月に完全停止。現在アクセス解析が一切機能しておらず、どのページが何件見られているか把握できていません。",
        "どの流入元（検索・SNS・広告）から何件の問い合わせがあるか測定できないため、マーケティング投資の判断ができません。",
        "コンバージョン計測不能 = サイト改善の優先順位が付けられず、闇雲な改修になります。",
        "競合は GA4 データに基づいて毎月 PDCA を回している中、御社だけデータなしで手探りの状態です。",
      ],
      en: [
        "UA permanently stopped in July 2023. Analytics are completely non-functional — you have no data on which pages get how many views.",
        "Cannot measure how many inquiries come from which source (search, social, ads), making marketing investment decisions impossible.",
        "No conversion measurement = cannot prioritize site improvements, leading to directionless fixes.",
        "Competitors are running monthly PDCA cycles based on GA4 data while your business operates blindly without data.",
      ],
    },
    fixDifficulty: 3,
    fixEffortHours: 3,
    deteriorationForecast: {
      ja: {
        months3: "3 ヶ月後: アクセス解析データの空白期間が拡大。前年比較ができず、施策の効果測定が不可能な状態が続きます。",
        months6: "6 ヶ月後: 半年分のデータロスト。マーケティング投資の判断根拠が完全に消失します。",
        months12: "12 ヶ月後: 1 年分のデータ欠損。競合は GA4 ベースの改善サイクルで 1 年分先を行き、差は埋められなくなります。",
      },
      en: {
        months3: "3 months: Data gap widens. Year-over-year comparison is impossible; campaign effectiveness cannot be measured.",
        months6: "6 months: Half a year of data permanently lost. All marketing investment decisions are made blind.",
        months12: "12 months: Full year of data irretrievably lost. Competitors have a 1-year GA4-based improvement lead that can't be closed.",
      },
    },
  },
}

/** 全課題コードの配列 */
export const ALL_ISSUE_CODES: IssueCode[] = Object.keys(ISSUE_PROFILES) as IssueCode[]

/** 課題コードからプロファイルを取得 */
export function getIssueProfile(code: IssueCode | string | null): IssueProfile | null {
  if (!code) return null
  return ISSUE_PROFILES[code as IssueCode] ?? null
}

/** 深刻度順にソートされた課題コード */
export const ISSUES_BY_SEVERITY: IssueCode[] = (["critical", "warning", "info"] as const).flatMap((severity) =>
  ALL_ISSUE_CODES.filter((code) => ISSUE_PROFILES[code].severity === severity),
)
