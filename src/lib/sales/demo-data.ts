import type { DiagnosticReportData } from "@/lib/sales/diagnostic"
import type { SourceCoverageSnapshot } from "@/lib/sales/source-coverage"
import type { CompanyIntelligence } from "@/lib/sales/company-intelligence"
import type { ReportLocale, TemplateVariant } from "@/lib/sales/routing"
import type { Industry } from "@/lib/sales/types"
import { buildVisualEvidenceStory } from "@/lib/sales/diagnostic/visual-story"

interface VariantDemoData {
  companyName: { ja: string; en: string }
  industry: string
  hook: { ja: string; en: string }
  acts: Array<{
    type: string
    icon: string
    headline: { ja: string; en: string }
    body: { ja: string; en: string }
    metric_label: { ja: string; en: string }
    metric_value: string | { ja: string; en: string }
    metric_unit: string | { ja: string; en: string }
    metric_bench: { ja: string; en: string }
    severity: string
  }>
  totalLoss: { ja: string; en: string }
  cta: { ja: string; en: string }
}

const VARIANT_DEMO_DATA: Record<string, VariantDemoData> = {
  japan_entry: {
    companyName: { ja: "GreenTech Solutions Inc.", en: "GreenTech Solutions Inc." },
    industry: "consulting",
    hook: {
      ja: "日本市場で御社の製品を購入しようとした消費者が、特商法表示の不備を理由に離脱しています。競合のEcoVantage社は半年前に弊社支援で日本参入し、すでに月商1,200万円を達成。御社の参入遅れは月間280万円の機会損失です。",
      en: "Japanese consumers attempting to purchase your product are abandoning due to missing commercial law disclosures. Competitor EcoVantage entered Japan 6 months ago through our support and is now generating $82,000/month. Your delay is costing ~$19,000/month in lost revenue.",
    },
    acts: [
      {
        type: "pain", icon: "TRUST", headline: { ja: "日本市場で御社のブランドが信用されていない", en: "Your brand lacks trust signals for Japanese consumers" },
        body: { ja: "日本消費者は購入前に必ず「特定商取引法に基づく表記」を確認します。これがないサイトからの購入率は8%以下。御社の現状では、せっかくの日本流入トラフィックの92%が信用不足で離脱しています。これは競合EcoVantageが獲得している月間1,200万円の売上を、そのまま取りこぼしている計算です。", en: "Japanese consumers check Commercial Law disclosures before ANY purchase. Without them, conversion drops below 8%. Your current state means 92% of Japan-bound traffic leaves without buying. This is revenue EcoVantage is capturing instead — $82,000/month that should be yours." },
        metric_label: { ja: "信頼スコア", en: "Trust score" }, metric_value: "8/100", metric_unit: { ja: "点", en: "pts" }, metric_bench: { ja: "最低限: 特商法 + プライバシーポリシー", en: "Minimum: Commercial Law + Privacy Policy" }, severity: "critical",
      },
      {
        type: "fear", icon: "OPS", headline: { ja: "このまま放置すると取り返しがつかない", en: "Delay is compounding your competitive disadvantage" },
        body: { ja: "日本EC市場は年率12%で成長中（2026年市場規模22兆円）。EcoVantageに続き、同業3社が2026年下期の日本参入を計画しています。先発優位の窓はあと3〜6ヶ月。このタイミングを逃すと、後発として認知獲得コストが3倍になります。", en: "Japan's e-commerce market is growing 12% YoY (¥22T in 2026). Three competitors are planning H2 2026 Japan entry, following EcoVantage. The first-mover window is 3-6 months. Missing it triples customer acquisition costs as a late entrant." },
        metric_label: { ja: "残り猶予", en: "Window remaining" }, metric_value: { ja: "3-6ヶ月", en: "3-6 months" }, metric_unit: "", metric_bench: { ja: "今すぐ着手が最適", en: "Start now for optimal timing" }, severity: "warning",
      },
      {
        type: "hope", icon: "REACH", headline: { ja: "最短30日で日本参入・売上化が可能", en: "Japan entry and revenue in 30 days is achievable" },
        body: { ja: "弊社の日本参入パッケージでは、特商法対応・決済導入・日本語サイト構築を全て並行して進め、最短30日で販売開始できます。EcoVantageの事例では、参入初月から月商320万円、3ヶ月目には1,200万円に到達。御社の製品力があれば、これを上回る成果が十分可能です。", en: "Our Japan entry package handles commercial law compliance, payment integration, and Japanese site build in parallel — go live in 30 days. EcoVantage's case: $22K in month 1, $82K by month 3. With your product strength, exceeding this is entirely realistic." },
        metric_label: { ja: "最短納期", en: "Fastest delivery" }, metric_value: { ja: "30日", en: "30 days" }, metric_unit: "", metric_bench: { ja: "通常3-6ヶ月 -> 弊社なら30日", en: "Typical 3-6 months -> 30 days with us" }, severity: "info",
      },
    ],
    totalLoss: { ja: "¥2,800,000", en: "$19,000" },
    cta: {
      ja: "まずは15分の無料診断で、御社の日本参入に必要な具体的ステップを明確にします。EcoVantageと同様の成果を、より早く達成するロードマップをお渡しします。",
      en: "In a 15-minute free assessment, we'll map your exact Japan entry steps. You'll get a roadmap to achieve — and exceed — EcoVantage-level results, faster.",
    },
  },
  website_diagnostic: {
    companyName: { ja: "株式会社サンプル美容室", en: "Sample Beauty Salon Inc." },
    industry: "beauty_salon",
    hook: {
      ja: "検索から予約までの導線で、訪問者の約60%が価値提案を見る前に離脱しています。",
      en: "About 60% of visitors leave before seeing your value proposition.",
    },
    acts: [
      {
        type: "pain", icon: "SPEED", headline: { ja: "モバイル表示速度が機会損失を生んでいる", en: "Mobile speed creating opportunity loss" },
        body: { ja: "モバイル表示速度38点は、美容室業界平均（71点）を大きく下回ります。訪問者の約6割が3秒以内に離脱し、月間約85万円相当の予約機会が競合に流出している計算です。", en: "Mobile speed 38/100 is far below beauty industry average (71). ~60% leave within 3 seconds, losing ~$7,700/month in bookings." },
        metric_label: { ja: "スマホ表示スコア", en: "Mobile speed score" }, metric_value: "38", metric_unit: { ja: "点", en: "pts" }, metric_bench: { ja: "目安: 75点以上", en: "Target: 75+" }, severity: "critical",
      },
      {
        type: "fear", icon: "TRUST", headline: { ja: "SSLとセキュリティ表示が信頼を損なう", en: "SSL and security display eroding trust" },
        body: { ja: "SSLグレードBは、最新ブラウザで「保護された通信」と表示されず、B2B取引審査や予約フォームの離脱率を15%上昇させます。", en: "SSL grade B doesn't show 'Secure' in modern browsers. This increases booking form abandonment by 15%." },
        metric_label: { ja: "信頼表示リスク", en: "Trust signal risk" }, metric_value: { ja: "要確認", en: "Verify" }, metric_unit: "", metric_bench: { ja: "証明書とHTTPSが正常", en: "HTTPS and certificate healthy" }, severity: "warning",
      },
      {
        type: "hope", icon: "SNS", headline: { ja: "SNS共有プレビューの改善で集客力を上げる", en: "Improve social previews for better reach" },
        body: { ja: "OGP設定がないため、LINEやInstagramでURLを共有しても文字化け表示になります。美容室の新規集客の60%がSNS経由であることを踏まえると、この改善だけで月間15件以上の新規予約獲得が期待できます。", en: "Without OGP, shared URLs appear garbled. With 60% of beauty salon discovery via social, fixing this alone could bring 15+ new bookings/month." },
        metric_label: { ja: "SNS共有の見え方", en: "Social share preview" }, metric_value: { ja: "未整備", en: "Not set" }, metric_unit: "", metric_bench: { ja: "タイトル、説明文、画像が整っている", en: "Title, description, and image ready" }, severity: "info",
      },
    ],
    totalLoss: { ja: "¥2,450,000", en: "$22,000" },
    cta: {
      ja: "診断結果をもとに、売上機会、信頼低下、問い合わせ導線、運用負荷のどこから直すべきかを30分で整理します。",
      en: "Based on this assessment, we will identify the highest-impact area to fix first.",
    },
  },
  meo: {
    companyName: { ja: "イタリアンダイニング Buono", en: "Buono Italian Dining" },
    industry: "restaurant",
    hook: {
      ja: "Googleマップで「渋谷 イタリアン」と検索した840人のうち、御社を選んだのはたった12人。競合のTrattoria SolはMEO最適化で月間来店数が3倍に。御社のMEOスコア15点は、月間120万円の予約機会損失です。",
      en: "Of 840 people searching 'Italian Shibuya' on Google Maps, only 12 chose you. Competitor Trattoria Sol tripled monthly visits through MEO optimization. Your MEO score of 15/100 is costing $8,200/month in lost bookings.",
    },
    acts: [
      { type: "pain", icon: "MAP", headline: { ja: "地図で選ばれていない", en: "Not being chosen on the map" }, body: { ja: "Googleマップでの「渋谷 イタリアン」検索表示順位は15位。写真3枚・口コミ5件では、1位の競合（写真48枚・口コミ127件）に勝てません。検索〜来店のコンバージョン率は競合の1/7。MEO対策だけで月間120万円の売上増が見込めます。", en: "Your Google Maps ranking for 'Italian Shibuya' is #15. With 3 photos and 5 reviews vs. competitor's 48 photos and 127 reviews, your search-to-visit conversion is 1/7th of theirs. MEO optimization alone could add $8,200/month." }, metric_label: { ja: "MEOスコア", en: "MEO score" }, metric_value: "15/100", metric_unit: { ja: "点", en: "pts" }, metric_bench: { ja: "50点以上で集客安定", en: "50+ for stable traffic" }, severity: "critical" },
      { type: "fear", icon: "REACH", headline: { ja: "このままでは口コミ格差が広がる一方", en: "The review gap is widening daily" }, body: { ja: "競合Trattoria Solは週1回の口コミ返信と写真更新で、月間口コミ数が毎月15%増加。御社が何もしなければ、3ヶ月後には表示順位がさらに5位下がり、月間損失は180万円に拡大します。", en: "Competitor Trattoria Sol grows reviews 15%/month through weekly responses and photo updates. If you do nothing, your ranking drops 5 more positions in 3 months, expanding monthly losses to $12,300." }, metric_label: { ja: "口コミ増加率", en: "Review growth rate" }, metric_value: "0%/月", metric_unit: "", metric_bench: { ja: "月10%以上が目安", en: "10%+/month target" }, severity: "warning" },
      { type: "hope", icon: "SNS", headline: { ja: "45日でMEOスコア50点・来店数2倍を達成可能", en: "50 MEO score + 2x visits in 45 days" }, body: { ja: "弊社のMEO最適化パッケージでは、Googleビジネスプロフィール最適化・口コミ促進・写真定期更新・競合分析を一括実施。Trattoria Solは導入45日でMEOスコアが15->68点に向上し、月間来店数が3倍になりました。御社も同様の成果が可能です。", en: "Our MEO package handles Google Business Profile optimization, review generation, photo updates, and competitor analysis. Trattoria Sol went from 15->68 MEO score in 45 days, tripling monthly visits. Same results are achievable for you." }, metric_label: { ja: "最短改善期間", en: "Fastest improvement" }, metric_value: "45日", metric_unit: "", metric_bench: { ja: "通常3ヶ月 -> 弊社なら45日", en: "Typical 3mo -> 45 days with us" }, severity: "info" },
    ],
    totalLoss: { ja: "¥1,200,000", en: "$8,200" },
    cta: { ja: "まずは無料MEO診断で、御社のGoogleマップ表示順位を競合と比較します。15分で改善ポイントと具体的な数値目標をお伝えします。", en: "Start with a free MEO audit comparing your Google Maps ranking against competitors. In 15 minutes, you'll get specific improvement points and numeric targets." },
  },
  security: {
    companyName: { ja: "MediCare Plus 株式会社", en: "MediCare Plus Inc." },
    industry: "dental",
    hook: {
      ja: "御社の患者予約サイトが、Google Chromeで「保護されていない通信」と赤く表示されています。これを見た患者の73%は予約を完了せず離脱。さらにSSL脆弱性により、2026年4月の改正個人情報保護法の監査で指摘事項となり得ます。",
      en: "Your patient booking site shows a red 'Not Secure' warning in Chrome. 73% of patients who see this abandon without booking. Additionally, SSL vulnerabilities put you at risk for privacy law audit flags under 2026 regulation updates.",
    },
    acts: [
      { type: "pain", icon: "TRUST", headline: { ja: "患者が予約前に離脱している", en: "Patients are leaving before booking" }, body: { ja: "Chromeの「保護されていない通信」警告により、予約フォーム到達者の73%が離脱。月間約180件の予約機会が失われています。競合のSmile Dental ClinicはSSL対応＋HSTS設定で離脱率を12%まで改善し、月商が1.8倍に。", en: "Chrome's 'Not Secure' warning causes 73% abandonment at your booking form. ~180 appointments/month are lost. Competitor Smile Dental reduced abandonment to 12% with SSL+HSTS, doubling monthly revenue." }, metric_label: { ja: "セキュリティスコア", en: "Security score" }, metric_value: "22/100", metric_unit: { ja: "点", en: "pts" }, metric_bench: { ja: "80点以上が安全圏", en: "80+ is safe" }, severity: "critical" },
      { type: "fear", icon: "OPS", headline: { ja: "個人情報保護法の監査リスクが迫っている", en: "Privacy law audit risk is approaching" }, body: { ja: "2026年4月の改正個人情報保護法では、医療関連サイトのSSL対応が実質義務化。未対応の場合、最大1億円の罰金と行政指導の対象になります。同業3院がすでに対応済み。御社だけが未対応のまま放置すれば、患者信頼の決定的な低下を招きます。", en: "The 2026 privacy law update effectively mandates SSL for healthcare sites. Non-compliance risks fines up to $685K and administrative sanctions. Three peer clinics have already complied. Being the only holdout will cause decisive trust loss." }, metric_label: { ja: "猶予期間", en: "Time remaining" }, metric_value: { ja: "2ヶ月", en: "2 months" }, metric_unit: "", metric_bench: { ja: "今月中の対応を推奨", en: "Address this month" }, severity: "warning" },
      { type: "hope", icon: "SPEED", headline: { ja: "2週間でフルSSL対応・監査リスク解消", en: "Full SSL compliance + audit risk eliminated in 2 weeks" }, body: { ja: "弊社のセキュリティ対策パッケージでは、SSL証明書更新・HSTS Preload・CSPヘッダー設定・WAF導入を並行実施。Smile Dentalでは導入2週間でセキュリティスコアが22->85点に改善し、予約完了率が3.2倍に。改正法対応の証明書類も完備します。", en: "Our security package handles SSL cert renewal, HSTS Preload, CSP headers, and WAF deployment in parallel. Smile Dental improved from 22->85 security score in 2 weeks, with booking completion rate up 3.2x. Full compliance documentation included." }, metric_label: { ja: "最短納期", en: "Fastest delivery" }, metric_value: { ja: "2週間", en: "2 weeks" }, metric_unit: "", metric_bench: { ja: "通常1-2ヶ月 -> 弊社なら2週間", en: "Typical 1-2mo -> 2 weeks with us" }, severity: "info" },
    ],
    totalLoss: { ja: "¥3,600,000", en: "$24,500" },
    cta: { ja: "まずは無料セキュリティ診断で、御社のサイトが患者にどう見えているか確認します。改正法対応の優先順位も明確にします。", en: "Start with a free security audit to see what your patients see. We'll also clarify your compliance priorities for the regulation update." },
  },
  video_subscription: {
    companyName: { ja: "CrossFit Zone 日本", en: "CrossFit Zone Japan" },
    industry: "beauty_salon",
    hook: {
      ja: "御社のInstagram運用に毎月15時間を費やしても、フォロワー増加率は月1.2%。競合のFitBoost Studioは弊社の動画サブスクで週4本のショート動画を配信し、3ヶ月でフォロワーが12,000->58,000に。動画経由の入会数が月間42件増加しています。",
      en: "Despite spending 15 hours/month on Instagram, your follower growth is only 1.2%/month. Competitor FitBoost Studio uses our video subscription to publish 4 shorts/week — growing from 12K to 58K followers in 3 months, with 42 new members/month from video alone.",
    },
    acts: [
      { type: "pain", icon: "VIDEO", headline: { ja: "15時間の努力が成果に結びついていない", en: "15 hours of effort not converting to results" }, body: { ja: "月間15時間のInstagram運用が、リーチ2,400・エンゲージメント率0.8%という結果に終わっています。動画コンテンツ不在が主因。競合FitBoostは週4本のショート動画でリーチ18万・エンゲージメント率6.2%を達成。御社の非効率な運用は、月間42件の入会機会損失に相当します。", en: "15 hours/month of Instagram work yields only 2,400 reach and 0.8% engagement. The missing factor: video content. Competitor FitBoost achieves 180K reach and 6.2% engagement with 4 shorts/week. Your inefficient approach equals 42 lost memberships/month." }, metric_label: { ja: "動画コンテンツ数", en: "Video content/week" }, metric_value: "0本", metric_unit: "", metric_bench: { ja: "週4本以上が成長ライン", en: "4+/week for growth" }, severity: "critical" },
      { type: "fear", icon: "REACH", headline: { ja: "動画不在がジム存続の脅威に", en: "Video absence threatens gym survival" }, body: { ja: "フィットネス業界では、動画コンテンツを持つジムの入会率が持たないジムの3.8倍。2025年以降、Instagramのアルゴリズムは動画優先に完全移行。静止画だけの御社の投稿は、すでにフォロワーの12%にしか表示されていません。", en: "In fitness, gyms with video content see 3.8x higher membership rates. Instagram's algorithm fully prioritizes video since 2025. Your photo-only posts now reach just 12% of followers." }, metric_label: { ja: "リーチ率", en: "Reach rate" }, metric_value: "12%", metric_unit: "", metric_bench: { ja: "動画投稿で40%以上", en: "40%+ with video" }, severity: "warning" },
      { type: "hope", icon: "REACH", headline: { ja: "月額$799で週4本のプロ動画を配信", en: "$799/month for 4 pro videos/week" }, body: { ja: "弊社の動画サブスクリプションでは、撮影・編集・投稿最適化・分析まで全て代行。FitBoostは導入1ヶ月でリーチが4.2倍、3ヶ月でフォロワー4.8倍・月間入会数42件増を達成。御社の施設と知識があれば、さらに高い成果が期待できます。", en: "Our video subscription handles filming, editing, posting optimization, and analytics. FitBoost saw 4.2x reach in month 1, 4.8x followers by month 3, and 42 new members/month. Your facility and expertise can exceed these results." }, metric_label: { ja: "月額費用", en: "Monthly cost" }, metric_value: "$799", metric_unit: "", metric_bench: { ja: "内製コストの1/3以下", en: "<1/3 of in-house cost" }, severity: "info" },
    ],
    totalLoss: { ja: "¥1,260,000", en: "$8,400" },
    cta: { ja: "まずは無料で御社のInstagramアカウントを監査し、動画化できるコンテンツ棚卸をします。15分の分析で、最初の4本の動画企画をお渡しします。", en: "We'll audit your Instagram for free and inventory content that can become videos. In 15 minutes, you'll get concepts for your first 4 videos." },
  },
  subsidy: {
    companyName: { ja: "株式会社ナカムラ精機", en: "Nakamura Precision Instruments" },
    industry: "construction",
    hook: {
      ja: "御社が2025年度に受けられる補助金・助成金の総額は最大820万円ですが、申請期限まであと45日です。同業の山田工業は弊社支援で昨年640万円の採択を受け、NC工作機2台を導入。御社がこの期限を逃すと、同額の投資を全額自己負担する必要があります。",
      en: "Your company qualifies for up to $56,000 in 2025 subsidies and grants — but the application deadline is 45 days away. Peer company Yamada Industries received $44,000 through our support last year, funding 2 CNC machines. Missing this deadline means self-funding the full amount.",
    },
    acts: [
      { type: "pain", icon: "DATA", headline: { ja: "使える補助金を知らないまま期限が迫っている", en: "Deadlines approaching while eligible subsidies go unclaimed" }, body: { ja: "御社の事業内容と地域から、ものづくり補助金（最大1,000万円）・事業再構築補助金（最大8,000万円）・IT導入補助金（最大450万円）の3つに適合します。しかし申請書類の準備には通常4〜6週間かかり、今から着手してもギリギリです。同業他社の申請採択率は68%。御社も十分に採択圏内です。", en: "Your business profile and location qualify for 3 major subsidies: Manufacturing (up to $68K), Business Restructuring (up to $545K), and IT Adoption (up to $30K). But applications take 4-6 weeks to prepare — starting now is already tight. Peer company approval rate is 68%. You're well within qualification range." }, metric_label: { ja: "適合補助金数", en: "Eligible programs" }, metric_value: "3件", metric_unit: "", metric_bench: { ja: "申請期限まで45日", en: "45 days to deadline" }, severity: "critical" },
      { type: "fear", icon: "OPS", headline: { ja: "期限切れ＝全額自己負担", en: "Deadline expiry = 100% self-funded" }, body: { ja: "申請期限まで45日。書類不備で不採択になった企業の82%は「時間不足」が原因です。また採択されても実績報告の不備で交付取消になるケースが年間14%あります。自社だけで申請した場合の採択率は31%ですが、専門家支援ありでは68%に跳ね上がります。", en: "45 days to deadline. 82% of rejected applications fail due to 'insufficient time.' Even if approved, 14% annually have grants revoked due to reporting errors. Self-filed applications have 31% success rate vs. 68% with expert support." }, metric_label: { ja: "自己申請の採択率", en: "Self-filed success rate" }, metric_value: "31%", metric_unit: "", metric_bench: { ja: "専門家支援で68%", en: "68% with expert support" }, severity: "warning" },
      { type: "hope", icon: "REACH", headline: { ja: "採択率68%・申請から報告まで一括代行", en: "68% success rate — end-to-end support" }, body: { ja: "弊社の補助金申請代行サービスでは、適合制度の調査・事業計画書作成・申請書類一式・採択後の実績報告まで一貫してサポート。山田工業は弊社支援で申請から42日で640万円の交付決定を受け、NC工作機2台を導入。御社も同様に、最短30日で申請完了が可能です。", en: "Our grant application service covers program matching, business plan writing, full application package, and post-award reporting. Yamada Industries received $44K funding decision in 42 days, acquiring 2 CNC machines. Your application can be complete in as little as 30 days." }, metric_label: { ja: "採択率", en: "Success rate" }, metric_value: "68%", metric_unit: "", metric_bench: { ja: "自己申請31% -> 弊社支援68%", en: "Self 31% -> 68% with us" }, severity: "info" },
    ],
    totalLoss: { ja: "¥8,200,000", en: "$56,000" },
    cta: { ja: "まずは無料で御社の適合補助金を全てリストアップします。申請期限と必要書類も合わせて15分でご説明します。", en: "We'll list every eligible grant for your company for free. In 15 minutes, you'll have deadlines and required documents clearly laid out." },
  },
  outreach: {
    companyName: { ja: "株式会社ビズネクスト", en: "BizNext Corporation" },
    industry: "consulting",
    hook: {
      ja: "御社の問い合わせフォームは、毎月58件の入力があるにも関わらず、自動返信もなければ営業担当への通知もないため、平均返信時間が47時間です。この遅延により問い合わせの34%が競合に流出。自動化すれば月間12件の商談が増加します。",
      en: "Your contact form receives 58 submissions/month but has no auto-reply or sales notification — average response time is 47 hours. This delay causes 34% of inquiries to go to competitors. Automation would add 12 sales conversations/month.",
    },
    acts: [
      { type: "pain", icon: "REACH", headline: { ja: "せっかくの問い合わせを47時間も放置している", en: "58 monthly inquiries — abandoned for 47 hours each" }, body: { ja: "月間58件の問い合わせに対し、返信までの平均47時間という応答速度は、B2B業界平均（4時間）の12倍遅れです。この遅延だけで問い合わせの34%が返信前に競合へ流出。月間約12件の商談機会を失っています。1件あたりの平均契約額95万円で計算すると、月間1,140万円の機会損失です。", en: "Your 47-hour average response time is 12x slower than the B2B industry average of 4 hours. This alone causes 34% of inquiries to go to competitors before you reply. You're losing ~12 sales conversations/month. At $6,500 average deal size, that's $78,000/month in lost opportunity." }, metric_label: { ja: "平均返信時間", en: "Avg response time" }, metric_value: { ja: "47時間", en: "47 hrs" }, metric_unit: "", metric_bench: { ja: "B2B平均: 4時間", en: "B2B avg: 4 hrs" }, severity: "critical" },
      { type: "fear", icon: "OPS", headline: { ja: "問い合わせの34%が返信前に離脱", en: "34% of inquiries gone before you reply" }, body: { ja: "1時間以内の返信で商談化率は62%ですが、24時間以上だと12%まで低下します。御社の47時間では理論上5%以下。さらにフォーム自動判定がないため、競合の営業・採用応募・サポート依頼が全て同じフローで処理され、優先順位付けも不可能です。", en: "Sub-1-hour replies convert at 62% to sales conversations. 24+ hour replies drop to 12%. Your 47 hours means theoretically under 5%. Without form auto-classification, competitor sales inquiries, job applications, and support requests all go through the same flow with no prioritization." }, metric_label: { ja: "商談化率", en: "Conversation rate" }, metric_value: { ja: "推定5%以下", en: "Est. <5%" }, metric_unit: "", metric_bench: { ja: "1時間以内返信で62%", en: "62% if <1hr reply" }, severity: "warning" },
      { type: "hope", icon: "SNS", headline: { ja: "自動化で返信時間47時間->3分・商談+12件/月", en: "47hrs -> 3min response, +12 conversations/month" }, body: { ja: "弊社のアウトリーチ自動化パッケージでは、フォーム自動分類・AI自動返信・Slack通知・CRM連携を一括導入。導入企業の平均で返信時間が47時間->3分に短縮、商談化率が5%->48%に改善、月間商談数が12件増加しています。", en: "Our outreach automation package delivers form auto-classification, AI auto-reply, Slack notifications, and CRM integration. Average client results: 47hrs->3min response time, 5%->48% conversation rate, +12 qualified conversations/month." }, metric_label: { ja: "改善後の返信時間", en: "Response time after" }, metric_value: { ja: "3分", en: "3 min" }, metric_unit: "", metric_bench: { ja: "商談化率48%に改善", en: "48% conversation rate" }, severity: "info" },
    ],
    totalLoss: { ja: "¥11,400,000", en: "$78,000" },
    cta: { ja: "まずは無料で御社の問い合わせフォームを分析します。15分で自動化の具体的な改善案と費用対効果をお伝えします。", en: "We'll analyze your contact form for free. In 15 minutes, you'll get specific automation proposals with ROI calculations." },
  },
  dx_ai_package: {
    companyName: { ja: "株式会社テックイノベート", en: "TechInnovate Inc." },
    industry: "consulting",
    hook: {
      ja: "御社の見積・請求・在庫管理はExcelと口頭で運用され、毎月120時間の工数ロスが発生しています。弊社のDX＋AI導入パッケージで受発注フローを自動化した同業のデジタルフォース社は、月間工数を78%削減し、年間2,400万円のコスト削減を達成しました。御社の現状維持は年間3,600万円の機会損失です。",
      en: "Your quoting, invoicing, and inventory management run on Excel and verbal handoffs, wasting 120 hours/month. Competitor DigitalForce automated their order-to-cash flow with our DX+AI package, achieving 78% labor reduction and $160K/year savings. Your status quo is costing $240K/year.",
    },
    acts: [
      { type: "pain", icon: "OPS", headline: { ja: "属人的な業務フローが成長の足枷に", en: "Manual workflows blocking growth" }, body: { ja: "見積作成に平均45分、請求書発行に30分、在庫確認に15分。月間120時間が非効率な手作業に消えています。この工数は年商5億円規模の同業平均（40時間/月）の3倍。DX化だけで年間2名分の採用コスト相当を削減可能です。", en: "45min per quote, 30min per invoice, 15min per stock check. 120 hours/month lost to manual work — 3x the industry average of 40hrs. DX alone could save the equivalent of 2 headcounts annually." }, metric_label: { ja: "月間無駄工数", en: "Monthly waste" }, metric_value: "120時間", metric_unit: "", metric_bench: { ja: "同業平均: 40時間/月", en: "Industry avg: 40 hrs/mo" }, severity: "critical" },
      { type: "fear", icon: "DATA", headline: { ja: "AI導入に出遅れると競争力を失う", en: "Falling behind on AI means losing competitive edge" }, body: { ja: "2026年の中小企業白書によると、AI導入企業の営業利益率は非導入企業の2.4倍。同業3社がすでにRPAとAI-OCRを導入し、見積回答速度を3倍に改善。御社がこのままExcel依存を続ければ、3年以内に入札・見積競争から淘汰されるリスクがあります。", en: "2026 SME whitepaper: AI-adopting companies have 2.4x higher operating margins. 3 competitors already deployed RPA+AI-OCR, tripling quote turnaround. Staying on Excel risks being outcompeted in bids within 3 years." }, metric_label: { ja: "AI導入率", en: "AI adoption" }, metric_value: "0%", metric_unit: "", metric_bench: { ja: "3年以内に必須化", en: "Essential within 3 years" }, severity: "warning" },
      { type: "hope", icon: "REACH", headline: { ja: "月額20万円〜 自動化＋AI導入で年間2,400万円削減", en: "From $1,300/month — automation + AI saves $160K/year" }, body: { ja: "弊社のDX＋AIパッケージでは、受発注自動化・AI-OCR帳票処理・在庫ダッシュボード・AIチャットボット問い合わせ対応を一括導入。デジタルフォース社は導入60日で月間工数が120→26時間に激減し、社員をコア業務に再配置。御社も同様の成果が十分可能です。", en: "Our DX+AI package delivers order automation, AI-OCR document processing, inventory dashboard, and AI chatbot support. DigitalForce went from 120→26 hrs/month in 60 days, redeploying staff to core work. Same results are entirely achievable." }, metric_label: { ja: "月額費用", en: "Monthly cost" }, metric_value: "¥200,000〜", metric_unit: "", metric_bench: { ja: "内製開発の1/5以下", en: "1/5th of in-house dev cost" }, severity: "info" },
    ],
    totalLoss: { ja: "¥3,600,000", en: "$240,000" },
    cta: { ja: "まずは無料で御社の業務フローを可視化し、自動化できる領域を特定します。15分のヒアリングで、最初の3つの改善施策と費用対効果をお伝えします。", en: "We'll map your workflows for free and identify automation opportunities. In a 15-minute call, you'll get the first 3 improvements with ROI estimates." },
  },
}

function localeStr(value: string | { ja: string; en: string }, lang: string): string {
  if (typeof value === "string") return value
  return lang === "ja" ? value.ja : value.en
}

export function buildDemoData(variant: string, lang: string): DiagnosticReportData {
  const isJa = lang === "ja"
  const data = VARIANT_DEMO_DATA[variant] ?? VARIANT_DEMO_DATA.website_diagnostic!
  const companyName = localeStr(data.companyName, lang)

  // Localize acts
  const acts = data.acts.map((act) => ({
    type: act.type,
    icon: act.icon,
    headline: localeStr(act.headline, lang),
    body: localeStr(act.body, lang),
    metric_label: localeStr(act.metric_label, lang),
    metric_value: localeStr(act.metric_value, lang),
    metric_unit: localeStr(act.metric_unit, lang),
    metric_bench: localeStr(act.metric_bench, lang),
    severity: act.severity,
  })) as DiagnosticReportData["acts"]

  const sourceCoverage: SourceCoverageSnapshot = {
    score: 72,
    collected: 18,
    configured: 5,
    missing: 8,
    items: [
      { slug: "pagespeed", label: "PageSpeed", category: "analysis", status: "collected", score: 85, detail: "Mobile 38/100", meaning: "Speed score proxy", missingConsequence: "", nextStep: "" },
      { slug: "ssl", label: "SSL Labs", category: "security", status: "collected", score: 75, detail: "Grade B", meaning: "TLS quality", missingConsequence: "", nextStep: "" },
      { slug: "wappalyzer", label: "Tech Stack", category: "analysis", status: "collected", score: 90, detail: "WordPress + Stripe", meaning: "Technology profile", missingConsequence: "", nextStep: "" },
      { slug: "dns", label: "DNS Records", category: "security", status: "collected", score: 65, detail: "No DMARC", meaning: "Email security", missingConsequence: "", nextStep: "" },
      { slug: "places", label: "Google Places", category: "company", status: "missing", score: 0, detail: "Not found", meaning: "Local presence", missingConsequence: "Missing local proof", nextStep: "Verify GMB" },
      { slug: "crtsh", label: "crt.sh", category: "security", status: "collected", score: 80, detail: "3 certs found", meaning: "Certificate history", missingConsequence: "", nextStep: "" },
      { slug: "radar", label: "Cloudflare Radar", category: "analysis", status: "collected", score: 70, detail: "Top 500k", meaning: "Traffic ranking", missingConsequence: "", nextStep: "" },
      { slug: "observatory", label: "Mozilla Observatory", category: "security", status: "collected", score: 55, detail: "Score 65/100", meaning: "Security posture", missingConsequence: "", nextStep: "" },
      { slug: "w3c", label: "W3C Validator", category: "analysis", status: "collected", score: 40, detail: "12 errors", meaning: "HTML quality", missingConsequence: "", nextStep: "" },
    ],
  }

  const intelligence: CompanyIntelligence = {
    signals: [
      { id: "speed", label: isJa ? "モバイル速度" : "Mobile speed", value: "38/100", source: "PageSpeed", category: "website", tone: "critical", detail: isJa ? "直帰率増加の主要原因" : "Primary cause of bounce", whyItMatters: isJa ? "訪問者の6割が表示前に離脱" : "60% leave before content loads" },
      { id: "ssl", label: isJa ? "SSL証明書" : "SSL Certificate", value: "Grade B", source: "SSL Labs", category: "security", tone: "warning", detail: isJa ? "A+まで改善余地あり" : "Room for A+ improvement", whyItMatters: isJa ? "ブラウザ警告リスク" : "Browser warning risk" },
      { id: "tech", label: isJa ? "技術スタック" : "Tech stack", value: "WordPress", source: "Wappalyzer", category: "website", tone: "warning", detail: isJa ? "保守・セキュリティリスク" : "Maintenance + security risk", whyItMatters: isJa ? "静的サイト移行で解決可能" : "Solve with static site migration" },
      { id: "ogp", label: "OGP", value: isJa ? "未設定" : "Not set", source: "HTML Scan", category: "seo", tone: "warning", detail: isJa ? "SNS共有プレビュー欠落" : "Missing social preview", whyItMatters: isJa ? "クリック率低下" : "Lower click-through" },
      { id: "dns", label: isJa ? "メールセキュリティ" : "Email security", value: isJa ? "DMARC未設定" : "No DMARC", source: "DNS", category: "security", tone: "warning", detail: isJa ? "なりすましリスク" : "Spoofing risk", whyItMatters: isJa ? "ドメイン評判に影響" : "Affects domain reputation" },
      { id: "form", label: isJa ? "問合せフォーム" : "Contact form", value: isJa ? "検出済み" : "Detected", source: "Crawlee", category: "outreach", tone: "good", detail: isJa ? "問合せ導線あり" : "Inquiry path exists", whyItMatters: isJa ? "営業自動化可能" : "Outreach ready" },
      { id: "ranking", label: isJa ? "トラフィック" : "Traffic", value: "Top 500k", source: "Cloudflare Radar", category: "seo", tone: "neutral", detail: isJa ? "グローバル評価" : "Global ranking", whyItMatters: isJa ? "市場規模の目安" : "Market size indicator" },
      { id: "history", label: isJa ? "サイト履歴" : "Site history", value: isJa ? "5年稼働" : "5yr active", source: "Wayback", category: "company", tone: "good", detail: isJa ? "長期運用の証" : "Proof of longevity", whyItMatters: isJa ? "信頼材料" : "Trust signal" },
      { id: "emailrep", label: isJa ? "メール評判" : "Email reputation", value: isJa ? "良好" : "Good", source: "EmailRep", category: "security", tone: "good", detail: isJa ? "ブラックリストなし" : "Not blacklisted", whyItMatters: isJa ? "送信到達率に影響" : "Affects deliverability" },
    ],
    painPoints: [
      { id: "speed", title: isJa ? "モバイル速度が業界平均を大きく下回る" : "Mobile speed significantly below average", severity: "critical", evidence: isJa ? "PageSpeed Mobile 38/100" : "PageSpeed Mobile 38/100", implication: isJa ? "訪問者の約6割が価値提案を見る前に離脱" : "~60% leave before seeing value proposition", recommendedAction: isJa ? "画像最適化・JS削減・Astro移行を提案" : "Propose image optimization, JS reduction, Astro migration" },
      { id: "ssl", title: isJa ? "SSLグレードがB — 信頼表示に改善余地" : "SSL grade B — trust display needs improvement", severity: "warning", evidence: isJa ? "SSL Labs Grade B" : "SSL Labs Grade B", implication: isJa ? "B2B審査や購買プロセスで減点対象" : "Deducted in B2B audits and procurement", recommendedAction: isJa ? "HSTS Preload + CSPヘッダー追加" : "Add HSTS Preload + CSP headers" },
      { id: "ogp", title: isJa ? "SNSプレビュー未設定 — 共有時の初回信頼が低下" : "Missing social previews hurt first-click trust", severity: "warning", evidence: isJa ? "OGP metadata 不在" : "No OGP metadata", implication: isJa ? "LINE/Slack/Xでの共有クリック率が業界平均の40%以下" : "Share click rate below 40% of average", recommendedAction: isJa ? "OGP画像 + title + description を設定" : "Configure OGP image + title + description" },
    ],
    nextActions: [
      isJa ? "PageSpeedスコア改善（画像圧縮・CDN導入）を最優先で実施" : "Prioritize PageSpeed improvement (image compression, CDN)",
      isJa ? "SSL証明書の更新とHSTS Preload設定" : "Update SSL cert and enable HSTS Preload",
      isJa ? "OGPメタデータの全ページ設定" : "Configure OGP metadata on all pages",
      isJa ? "診断レポートを添えて提案メールを送信" : "Send proposal email with diagnostic report attached",
      isJa ? "Astro移行デモサイトを作成し改善後の姿を見せる" : "Create Astro migration demo to show improved state",
    ],
  }

  const meta = {
    scan: { mobile_score: 38, desktop_score: 52, is_wordpress: true, hasHsts: false, hasCsp: false, copyrightYear: 2022 },
    tech: { stack: ["WordPress", "Stripe", "Google Analytics", "Cloudflare"] },
    ssl: { grade: "B", daysUntilExpiry: 45 },
    dns: { email_security_ok: false, hasDnssec: true, dkim_selectors: ["google"] },
    crtsh: { total_certs: 3, latest_cert: { issuer: "Let's Encrypt" } },
    place: { name: "サンプル美容室", rating: 4.2, address: "東京都渋谷区", reviewCount: 28 },
    mozilla_observatory: { score: 65, grade: "C+" },
    w3c_validation: { errors: 12, warnings: 5, is_clean: false },
    cloudflare_radar: { rank: 450000, rank_bucket: "top-500k" },
    wayback_machine: { total_snapshots: 48, first_snapshot: "2019-03", last_snapshot: "2024-11", years_active: 5 },
    email_reputation: { reputation: "good", suspicious: false },
    japan_market_audit: { tokushoho_missing: false, appi_missing: true, local_payments_missing: false },
    contact_form_url: "https://example.com/contact",
  }
  const visualStory = buildVisualEvidenceStory({
    meta,
    acts,
    sourceCoverage,
    templateVariant: variant as TemplateVariant,
    reportLocale: lang,
  })
  const demoScreenshotUrl = "https://image.thum.io/get/width/1200/crop/800/https://paradigmjp.com"
  const demoMobileScreenshotUrl = "https://image.thum.io/get/width/400/crop/900/https://paradigmjp.com"

  return {
    company_name: companyName,
    report_locale: lang as ReportLocale,
    target_country: "JP",
    template_variant: variant as TemplateVariant,
    industry: data.industry as Industry,
    prefecture: isJa ? "東京都渋谷区" : "Shibuya, Tokyo",
    expires_at: new Date(Date.now() + 30 * 86400000).toISOString(),
    hook: localeStr(data.hook, lang),
    total_loss: localeStr(data.totalLoss, lang),
    acts,
    cta_text: localeStr(data.cta, lang),
    video_thumbnail: null,
    demo_url: `https://paradigm-astro-demo.pages.dev/?slug=${variant}-demo`,
     screenshot_url: demoScreenshotUrl,
     screenshot_mobile_url: demoMobileScreenshotUrl,
      evidence_screenshot_url: demoScreenshotUrl,
      evidence_screenshot_kind: "desktop",
      visual_annotations: visualStory.visualAnnotations,
      improvement_preview: visualStory.improvementPreview,
      visitor_journey: visualStory.visitorJourney,
      source_coverage: sourceCoverage,
    intelligence,
    video_url: variant === "japan_entry"
      ? `https://pub-ac30eb86a32747f1a27e304aa9c6f95a.r2.dev/videos/demo/${variant}/${lang}/diagnostic-${variant}.mp4`
      : null,
    meta,
    contactFormUrl: "https://example.com/contact",
    content_template: {
      title: isJa ? "Web制作診断テンプレート" : "Website Production Diagnostic",
      purpose: isJa ? "Web集客改善の優先順位を明確にする" : "Clarify web marketing priorities",
      quality_bar: isJa ? "すべての数値は実測データに基づくこと。推測や一般論は禁止。" : "All numbers must be based on measured data. No speculation.",
      dify_selection_rule: `industry=beauty_salon&variant=${variant}`,
      prompt_template: "",
      offer_code: "jp_web_production",
      appeal_angle: "speed_conversion",
    },
    report_url: `https://paradigmjp.com/${lang}/report/demo/${variant}`,
    localized_report_urls: [],
  }
}
