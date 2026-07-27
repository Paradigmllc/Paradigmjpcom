export const VIDEO_SERVICE_INTENT = "video-as-a-service" as const

export const VIDEO_SERVICE_PLAN_IDS = [
  "essential",
  "unlimited",
  "priority",
] as const

export type VideoServicePlanId = (typeof VIDEO_SERVICE_PLAN_IDS)[number]
export type VideoServiceLocale = "ja" | "en"

export function isVideoServicePlanId(
  value: string | null | undefined,
): value is VideoServicePlanId {
  return VIDEO_SERVICE_PLAN_IDS.includes(value as VideoServicePlanId)
}

export interface VideoServicePlanCopy {
  id: VideoServicePlanId
  name: string
  price: string
  cadence: string
  label: string
  summary: string
  capacity: string
  activeRequests: string
  start: string
  revisions: string
  features: readonly string[]
  boundary: string
  featured?: boolean
}

const JA_PLANS: readonly VideoServicePlanCopy[] = [
  {
    id: "essential",
    name: "Essential",
    price: "$1,500",
    cadence: "/月",
    label: "SHORT-FORM",
    summary: "継続的なショート動画編集を、明確な月間枠で始めるプラン。",
    capacity: "月10本まで",
    activeRequests: "同時進行 1本",
    start: "Ready後、原則2営業日以内に着手",
    revisions: "各動画3回まで",
    features: [
      "完成尺60秒までのショート動画",
      "支給素材を中心とした編集",
      "テロップ・字幕・BGM・簡易モーション",
      "主フォーマット＋簡易リサイズ1種",
      "共有ワークスペースとレビュー管理",
    ],
    boundary:
      "異なるフック、言語、構成、尺、広告バリエーションは別の1本として数えます。未使用枠の翌月繰越はありません。",
  },
  {
    id: "unlimited",
    name: "Unlimited",
    price: "$3,500",
    cadence: "/月",
    label: "MOST POPULAR",
    summary: "企画・構成から任せられる、オンデマンド動画制作チーム。",
    capacity: "依頼登録 無制限",
    activeRequests: "同時進行 1本",
    start: "Ready後、原則2営業日以内に着手",
    revisions: "合意ブリーフ内は無制限",
    features: [
      "企画・台本・ストーリーボード支援",
      "広告、デモ、説明、SNS、採用動画",
      "モーショングラフィックス・AI生成素材",
      "日英字幕・ローカライズ・派生版",
      "共有ワークスペースとレビュー管理",
    ],
    boundary:
      "無制限とは依頼キューと合意ブリーフ内の修正回数を指し、月間の完成本数や即日納品を保証するものではありません。",
    featured: true,
  },
  {
    id: "priority",
    name: "Priority",
    price: "$5,500",
    cadence: "/月",
    label: "HIGH CAPACITY",
    summary: "複数キャンペーンを同時に進める企業・代理店向けの優先枠。",
    capacity: "依頼登録 無制限",
    activeRequests: "同時進行 2本",
    start: "Ready後、原則2営業日以内＋優先キュー",
    revisions: "合意ブリーフ内は無制限",
    features: [
      "Unlimitedの全内容",
      "2本の同時アクティブ制作",
      "新規着手・修正の優先キュー",
      "複数キャンペーン・ブランド運用",
      "月次コンテンツ計画レビュー",
    ],
    boundary:
      "優先対応は他プランより先に次の制作枠へ入ることを意味します。すべての依頼の完成時間を固定するものではありません。",
  },
] as const

const EN_PLANS: readonly VideoServicePlanCopy[] = [
  {
    id: "essential",
    name: "Essential",
    price: "$1,500",
    cadence: "/month",
    label: "SHORT-FORM",
    summary: "A defined monthly editing plan for consistent short-form output.",
    capacity: "Up to 10 videos / month",
    activeRequests: "1 active production slot",
    start: "Normally starts within 2 business days once Ready",
    revisions: "Up to 3 rounds per video",
    features: [
      "Short-form videos up to 60 seconds",
      "Editing based primarily on supplied footage",
      "Captions, music, sound, and basic motion",
      "One primary format plus one simple resize",
      "Shared workspace and review trail",
    ],
    boundary:
      "Different hooks, languages, structures, durations, or ad variants count as separate videos. Unused monthly capacity does not roll over.",
  },
  {
    id: "unlimited",
    name: "Unlimited",
    price: "$3,500",
    cadence: "/month",
    label: "MOST POPULAR",
    summary: "An on-demand video production team, including concept and structure.",
    capacity: "Unlimited request queue",
    activeRequests: "1 active production slot",
    start: "Normally starts within 2 business days once Ready",
    revisions: "Unlimited within the agreed brief",
    features: [
      "Concept, scripting, and storyboard support",
      "Ads, demos, explainers, social, and recruiting",
      "Motion graphics and AI-assisted visuals",
      "EN/JA subtitles, localization, and variants",
      "Shared workspace and review trail",
    ],
    boundary:
      "Unlimited refers to queued requests and revision rounds within the agreed brief. It does not guarantee a fixed number of completed videos or same-day delivery.",
    featured: true,
  },
  {
    id: "priority",
    name: "Priority",
    price: "$5,500",
    cadence: "/month",
    label: "HIGH CAPACITY",
    summary: "Priority capacity for companies and agencies running parallel campaigns.",
    capacity: "Unlimited request queue",
    activeRequests: "2 active production slots",
    start: "Normally starts within 2 business days once Ready, with priority",
    revisions: "Unlimited within the agreed brief",
    features: [
      "Everything in Unlimited",
      "Two concurrent active production slots",
      "Priority queue for starts and revisions",
      "Multi-campaign and multi-brand support",
      "Monthly content planning review",
    ],
    boundary:
      "Priority means the next eligible production slot is allocated ahead of standard plans. It is not a fixed completion-time guarantee for every request.",
  },
] as const

export function getVideoServicePlans(
  locale: VideoServiceLocale,
): readonly VideoServicePlanCopy[] {
  return locale === "ja" ? JA_PLANS : EN_PLANS
}

export interface VideoServiceStepCopy {
  title: string
  body: string
}

const JA_STEPS: readonly VideoServiceStepCopy[] = [
  {
    title: "プランを選んで申請",
    body: "会社情報、月間需要、素材状況、希望開始時期、最初に作りたい動画を送信します。申請だけでは契約は成立しません。",
  },
  {
    title: "適合確認とService Order",
    body: "原則1営業日以内に適合可否を回答し、プラン、請求日、対象ブランド、除外事項、担当者をService Orderへ記載します。",
  },
  {
    title: "契約・初回決済",
    body: "Service Orderと利用規約へ合意し、初月料金を前払いします。決済確認前に制作枠は確保されません。",
  },
  {
    title: "オンボーディング",
    body: "共有ワークスペースを作成し、ブランド資料、素材、アクセス、承認者、最初の優先依頼を登録します。",
  },
  {
    title: "Readyから制作開始",
    body: "ブリーフと必要素材が揃った依頼をReadyとし、原則2営業日以内に制作へ着手します。Priorityは次の枠へ優先配置します。",
  },
  {
    title: "レビュー・納品・次の依頼",
    body: "タイムコード付きで確認し、承認後に最終データを納品します。確認待ちの間は次のReady依頼へ進められます。",
  },
] as const

const EN_STEPS: readonly VideoServiceStepCopy[] = [
  {
    title: "Choose a plan and apply",
    body: "Submit your company, monthly demand, asset readiness, preferred start, and first video need. An application alone does not create a contract.",
  },
  {
    title: "Fit review and Service Order",
    body: "We normally respond within one business day and document the plan, billing date, brands, exclusions, and owners in a Service Order.",
  },
  {
    title: "Agreement and first payment",
    body: "Accept the Service Order and service terms, then pay the first month in advance. Capacity is not reserved before payment clears.",
  },
  {
    title: "Onboarding",
    body: "We create the shared workspace and collect brand guidance, source assets, access, the approver, and the first priority request.",
  },
  {
    title: "Production starts from Ready",
    body: "A request becomes Ready when the brief and required assets are complete. Production normally starts within two business days; Priority enters the next slot first.",
  },
  {
    title: "Review, delivery, and continue",
    body: "Review with time-coded feedback, approve the final output, and move to the next Ready request. Client-review waits do not need to stop the queue.",
  },
] as const

export function getVideoServiceSteps(
  locale: VideoServiceLocale,
): readonly VideoServiceStepCopy[] {
  return locale === "ja" ? JA_STEPS : EN_STEPS
}

export interface VideoServiceFaqCopy {
  question: string
  answer: string
}

const JA_FAQS: readonly VideoServiceFaqCopy[] = [
  {
    question: "「無制限」とは何が無制限ですか？",
    answer:
      "UnlimitedとPriorityでは依頼を何件でもキューへ登録でき、合意したブリーフの範囲内で修正回数を制限しません。実際の制作は同時進行枠に沿って進むため、月間完成本数や即日納品が無制限になる意味ではありません。",
  },
  {
    question: "48時間以内に動画が完成しますか？",
    answer:
      "いいえ。完成したブリーフと必要素材が揃い、Readyになった標準依頼へ原則2営業日以内に着手する運用です。納品目安は尺、素材、表現、モーション、確認回数、外部依存を確認して依頼ごとに共有します。",
  },
  {
    question: "Essentialの「1本」はどう数えますか？",
    answer:
      "完成尺60秒まで、支給素材中心、1つの主要構成と主フォーマットを基本とします。簡易リサイズ1種は含みますが、異なるフック、言語、構成、長さ、広告バリエーションは別の1本として数えます。",
  },
  {
    question: "月に何本納品できますか？",
    answer:
      "Essentialは条件を満たすショート動画を月10本までです。UnlimitedとPriorityは本数ではなく制作キューと同時進行数で管理するため、動画の複雑さとレビュー速度によって完成本数が変わります。",
  },
  {
    question: "修正は本当に無制限ですか？",
    answer:
      "UnlimitedとPriorityでは、承認した目的・構成・表現方針の範囲内で修正回数を制限しません。目的変更、台本の全面変更、新素材への差替え、別言語・別尺・別キャンペーン化は新しい依頼として扱います。Essentialは各動画3回までです。",
  },
  {
    question: "確認が遅れた場合、制作枠は止まりますか？",
    answer:
      "クライアント確認または素材待ちになった依頼はClient ReviewまたはBlockedへ移し、次のReady依頼を制作できます。回答後は優先順位と現在の制作状況を見てキューへ戻します。",
  },
  {
    question: "撮影や出演者の手配も含まれますか？",
    answer:
      "標準プランはリモート完結型です。現地撮影、スタジオ、出演者、ナレーター、高額素材、本格3DCGなどは事前承認を得た別見積もりになります。",
  },
  {
    question: "編集可能なプロジェクトファイルも納品されますか？",
    answer:
      "標準納品は承認済みの最終書き出しデータです。編集プロジェクト、再利用テンプレート、制作システム、ライセンス制限のある素材は含まれません。必要な場合は第三者ライセンスを確認し、Service Orderで別途定めます。",
  },
  {
    question: "完成動画の権利は誰に帰属しますか？",
    answer:
      "全額支払い後、クライアント専用に制作した最終成果物の著作権は、第三者素材とParadigmの既存資産を除き、Service Orderと利用規約に従ってクライアントへ移転します。素材ライセンスの条件は引き続き適用されます。",
  },
  {
    question: "生成AIは使用しますか？",
    answer:
      "制作速度と表現のためにAI支援ツールを使用する場合があります。機密情報、ブランドルール、利用制限を確認し、AI利用禁止または特定ツール禁止の要件がある場合は契約前に共有してください。",
  },
  {
    question: "プラン変更や解約はいつできますか？",
    answer:
      "アップグレードは制作枠が確保できる場合に差額精算で反映できます。ダウングレードと解約は次回更新日から適用します。更新後の期間、未使用枠、クライアント都合の停止に対する日割り返金はありません。",
  },
  {
    question: "日本語と英語の両方に対応できますか？",
    answer:
      "対応できます。字幕、テロップ、ナレーション原稿、ローカライズ、各市場向けの表現調整を依頼できます。翻訳量や別構成の必要性に応じて独立した依頼として扱う場合があります。",
  },
] as const

const EN_FAQS: readonly VideoServiceFaqCopy[] = [
  {
    question: "What is actually unlimited?",
    answer:
      "Unlimited and Priority let you add any number of requests to the queue and do not cap revision rounds within an agreed brief. Production still follows the active-slot limit, so this is not a promise of unlimited completed videos or same-day delivery.",
  },
  {
    question: "Will the video be finished within 48 hours?",
    answer:
      "No. The operating commitment is to normally begin a standard request within two business days after the brief and required assets are complete and the request is marked Ready. Delivery ranges are shared per request.",
  },
  {
    question: "What counts as one Essential video?",
    answer:
      "One video is normally up to 60 seconds, based mainly on supplied footage, with one primary structure and format. One simple resize is included. Different hooks, languages, structures, durations, or ad variants count as separate videos.",
  },
  {
    question: "How many videos can be delivered each month?",
    answer:
      "Essential includes up to ten qualifying short-form videos per billing month. Unlimited and Priority are governed by the production queue and active slots, so output depends on complexity and review speed.",
  },
  {
    question: "Are revisions really unlimited?",
    answer:
      "Unlimited and Priority do not cap revision rounds within the approved objective, structure, and creative direction. A new objective, rewritten script, replacement source material, new language, new duration, or new campaign becomes a new request. Essential includes three rounds per video.",
  },
  {
    question: "What happens when our review is delayed?",
    answer:
      "A request waiting for client feedback or assets moves to Client Review or Blocked, allowing another Ready request to enter production. When feedback arrives, it returns to the queue based on priority and current capacity.",
  },
  {
    question: "Are filming and talent included?",
    answer:
      "The standard plans are remote-first. Location filming, studios, talent, voiceover sourcing, premium media, and advanced 3D require a separately approved scope and cost.",
  },
  {
    question: "Do you deliver editable source projects?",
    answer:
      "Standard delivery includes approved final exports. Editable project files, reusable templates, production systems, and restricted third-party assets are excluded unless the Service Order expressly includes them.",
  },
  {
    question: "Who owns the finished video?",
    answer:
      "After full payment, copyright in bespoke final deliverables transfers to the client under the Service Order and service terms, excluding third-party materials and Paradigm background assets. Third-party license conditions still apply.",
  },
  {
    question: "Do you use generative AI?",
    answer:
      "We may use AI-assisted tools to improve speed or create approved elements. Share any no-AI, confidentiality, model, or vendor restrictions before contracting so they can be documented in the Service Order.",
  },
  {
    question: "When can we change plans or cancel?",
    answer:
      "Upgrades can take effect sooner when capacity is available and the difference is paid. Downgrades and cancellation take effect on the next renewal date. Renewed periods, unused capacity, and client-caused holds are not prorated or refunded.",
  },
  {
    question: "Can you work in both Japanese and English?",
    answer:
      "Yes. You can request subtitles, on-screen copy, voiceover scripts, localization, and market-specific adaptations. A different language or materially different structure may be handled as a separate request.",
  },
] as const

export function getVideoServiceFaqs(
  locale: VideoServiceLocale,
): readonly VideoServiceFaqCopy[] {
  return locale === "ja" ? JA_FAQS : EN_FAQS
}
