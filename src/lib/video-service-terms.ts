import type { VideoServiceLocale } from "./video-service-content"

export interface VideoServiceTermSection {
  heading: string
  paragraphs?: readonly string[]
  bullets?: readonly string[]
}

export interface VideoServiceTermsCopy {
  title: string
  description: string
  effectiveDateLabel: string
  effectiveDate: string
  intro: readonly string[]
  hierarchyTitle: string
  hierarchy: readonly string[]
  sections: readonly VideoServiceTermSection[]
  contactTitle: string
  contactBody: string
}

const JA_TERMS: VideoServiceTermsCopy = {
  title: "Video as a Service 利用規約",
  description:
    "Paradigm合同会社が事業者向けに提供するVideo as a Serviceの共通利用条件です。個別のService Orderがある場合は、その記載が優先されます。",
  effectiveDateLabel: "施行日",
  effectiveDate: "2026年7月28日",
  intro: [
    "本利用規約（以下「本規約」）は、Paradigm合同会社（以下「当社」）が提供する事業者向けVideo as a Service（以下「本サービス」）の利用条件を定めます。",
    "本サービスは、法人、団体、個人事業主その他事業として動画を利用するお客様を対象とします。消費者としての私的利用を目的とする申込みは受け付けません。",
  ],
  hierarchyTitle: "契約文書の優先順位",
  hierarchy: [
    "当社とお客様が署名または電磁的に合意したService Order、見積書、個別合意",
    "本規約",
    "提案書、Webサイト、FAQその他の説明資料",
  ],
  sections: [
    {
      heading: "1. 契約の成立",
      paragraphs: [
        "お客様による申請または相談のみでは契約は成立しません。当社がService Orderを提示し、お客様が本規約を含む条件へ合意し、当社が初回料金の入金を確認した時点で契約が成立します。",
        "当社は、制作体制、依頼内容、法令・プラットフォーム規則、利益相反、反社会的勢力との関係その他の合理的な理由により申込みを承諾しないことがあります。",
      ],
    },
    {
      heading: "2. プラン、料金および支払",
      bullets: [
        "Essentialは月額1,500米ドル、Unlimitedは月額3,500米ドル、Priorityは月額5,500米ドルを標準価格とします。税、送金手数料、為替費用および第三者費用は、Service Orderまたは請求書に別段の記載がない限りお客様の負担です。",
        "料金は各請求期間の開始前に前払いで支払うものとし、入金確認前に制作枠は確保されません。",
        "契約は月単位で自動更新されます。お客様が次回更新日前までに書面または指定ワークスペースで解約を通知した場合、次回更新日をもって終了します。",
        "アップグレードは制作枠がある場合に限り、差額支払後に当社が指定する日から適用できます。ダウングレードは次回更新日から適用します。",
      ],
    },
    {
      heading: "3. Start Dateとオンボーディング",
      paragraphs: [
        "制作運用のStart Dateは、契約成立に加え、必要なブランド資料、素材、アクセス権限、承認担当者および最初のブリーフが当社に提供され、当社がオンボーディング完了を記録した日とします。",
        "お客様側の準備不足または確認遅延によりStart Dateが遅れた場合でも、別途書面で合意しない限り請求期間は延長されません。",
      ],
    },
    {
      heading: "4. 依頼キューと制作枠",
      bullets: [
        "依頼はBacklog、Ready、Active Production、Internal QA、Client Review、Blocked、Approved、Delivered等の状態で管理します。",
        "Readyとは、目的、掲載先、尺、必要素材、参考、承認者その他当社が合理的に必要とする情報が揃った状態をいいます。",
        "EssentialおよびUnlimitedは原則1本、Priorityは原則2本までを同時にActive ProductionまたはInternal QAとして進めます。",
        "Client ReviewまたはBlockedへ移った依頼は制作枠を解放でき、次のReady依頼へ進むことがあります。フィードバック受領後はプラン優先度と現在の制作状況に基づき再配置します。",
        "Readyとなった標準依頼には原則2営業日以内に着手します。これは完成または納品を約束するものではなく、当社休業日、依頼の難易度、緊急事態または別途合意したスケジュールにより変動します。",
      ],
    },
    {
      heading: "5. Essentialの月10本",
      paragraphs: [
        "Essentialの1本は、原則として完成尺60秒以内、支給素材中心、1つの主要な目的・構成・言語・主フォーマットによる動画をいいます。主フォーマットからの簡易リサイズ1種を含みます。",
        "異なるフック、台本、構成、言語、尺、キャンペーン、広告バリエーションまたは大幅な素材差替えは別の1本として数えます。未使用枠の翌月繰越、換金および返金はありません。",
      ],
    },
    {
      heading: "6. UnlimitedおよびPriorityの意味",
      paragraphs: [
        "UnlimitedおよびPriorityにおける「無制限」は、依頼をキューへ登録できる件数および合意ブリーフ内の修正回数に上限を設けないことを意味します。月間完成本数、一定時間内の完成、即日対応、無制限の同時進行または無制限の作業時間を意味しません。",
      ],
    },
    {
      heading: "7. 修正と新規依頼",
      bullets: [
        "Essentialは各動画3回までの修正ラウンドを含みます。UnlimitedおよびPriorityは、合意した目的、台本、構成およびクリエイティブ方針の範囲内で修正ラウンドを制限しません。",
        "目的変更、台本の全面変更、新規または大幅に異なる素材、別言語、別尺、別キャンペーン、承認済み方向性の撤回その他実質的な再制作は、新規依頼または別途見積もりとします。",
        "複数の担当者から矛盾する指示がある場合、当社は指定承認者による統合指示を受領するまで依頼をBlockedにできます。",
      ],
    },
    {
      heading: "8. 納期、レビューおよび検収",
      paragraphs: [
        "納期目安は、尺、素材、表現、モーション、第三者素材、レビュー速度および外部依存を確認し、依頼ごとに共有します。成果または事業上の結果を保証する納期ではありません。",
        "お客様はレビュー版の受領後、原則5営業日以内に承認または具体的な修正指示を提出してください。期間内に回答がない場合、当社は当該依頼をClient ReviewまたはArchivedとして扱い、次の依頼へ進めることができます。",
        "最終納品後5営業日以内に、合意仕様との重大な不一致が具体的に通知されなかった場合、当該成果物は検収されたものとみなします。隠れた技術的不具合については、発見後速やかに通知してください。",
      ],
    },
    {
      heading: "9. 標準範囲外と第三者費用",
      paragraphs: [
        "現地撮影、スタジオ、出演者、ナレーター、高額または地域制限のある素材、音源、本格3DCG、複雑なVFX、同日対応、特急対応、大量同時制作、媒体入稿、広告運用その他標準プラン外の作業は、事前承認を得た追加費用または別契約となります。",
        "当社はお客様の事前承認なく有料の第三者素材を購入しません。第三者サービスの価格改定、提供停止、審査または利用条件について当社は責任を負いません。",
      ],
    },
    {
      heading: "10. お客様の義務と素材保証",
      bullets: [
        "お客様は、正確なブリーフ、適法に使用できる素材、必要な同意・許諾、ブランド・法務・プラットフォーム上の要件、および最終承認権限を持つ担当者を提供します。",
        "お客様は、提供素材、指示、商品・サービスの表示および成果物の利用が、第三者の権利、法令、業界規則、広告規制またはプラットフォーム規則を侵害しないことを保証します。",
        "当社は法的、医療的、金融的、規制上またはプラットフォーム上の適合性について専門判断を提供せず、必要な場合はお客様が専門家の確認を取得します。",
      ],
    },
    {
      heading: "11. 知的財産権",
      paragraphs: [
        "お客様が全額を支払ったことを条件として、当社は、お客様専用に制作した最終成果物について当社が保有する著作権をお客様へ譲渡します。この譲渡には著作権法第27条および第28条の権利を含みます。",
        "当社および当社が管理できる制作担当者は、法令上許される範囲で、譲渡対象となる最終成果物について著作者人格権を行使しません。",
        "お客様提供素材、第三者素材、フォント、音源、ストック、ソフトウェア、生成AIサービスの出力条件、当社が契約前から保有するテンプレート、手法、ノウハウ、ワークフロー、汎用部品および制作システムは譲渡対象外です。これらには各ライセンス条件が適用されます。",
        "標準納品は承認済みの最終書き出しデータです。編集可能なプロジェクトファイル、再利用テンプレート、制作システムおよびライセンス制限のある素材は、Service Orderに明記した場合に限り提供します。",
      ],
    },
    {
      heading: "12. AI支援ツール",
      paragraphs: [
        "当社は、企画、文字起こし、翻訳、画像・映像・音声の生成または補助、品質確認その他の工程でAI支援ツールを使用することがあります。",
        "お客様にAI利用禁止、特定ベンダー禁止、学習利用禁止、データ所在地、秘密区分その他の制約がある場合、契約前に通知しService Orderへ記載する必要があります。制約により価格、納期または対応可否が変わることがあります。",
        "AIのみで生成された要素の独占性、権利保護可能性または第三者サービスの継続性を当社は保証しません。",
      ],
    },
    {
      heading: "13. 秘密保持とデータ",
      paragraphs: [
        "各当事者は、相手方から秘密である旨が明示された情報または性質上秘密と合理的に理解される情報を、本契約の履行以外に使用せず、法令または相手方の承諾なく第三者へ開示しません。公知情報、受領前から保有した情報、正当に第三者から取得した情報および独自開発情報は除きます。",
        "当社は業務上必要な範囲で、秘密保持義務を負う役職員、業務委託先およびクラウド・制作ツール提供者に情報を取り扱わせることがあります。個人情報は当社のプライバシーポリシーに従って取り扱います。",
      ],
    },
    {
      heading: "14. 実績公開",
      paragraphs: [
        "当社は、お客様の事前の書面承認がある場合に限り、公開済みの成果物、お客様の商号およびロゴを実績として掲載できます。秘密情報、未公開キャンペーンまたは管理画面情報は掲載しません。",
      ],
    },
    {
      heading: "15. 再委託",
      paragraphs: [
        "当社は品質、専門性または制作容量の確保のため、秘密保持および知的財産に関する適切な義務を課した上で、本サービスの一部を第三者へ再委託できます。当社は再委託先の業務について本契約上の責任を負います。",
      ],
    },
    {
      heading: "16. 休止、停止および解除",
      bullets: [
        "お客様による支払遅延、必要素材・承認の長期未提供、違法または権利侵害のおそれがある依頼、当社または第三者への危険、濫用的な言動その他重大な契約違反がある場合、当社は制作を停止し、相当期間を定めて是正を求めることができます。",
        "重大な違反が是正されない場合、支払不能、破産等の申立て、反社会的勢力との関係または信頼関係を維持できない重大事由がある場合、相手方は契約を直ちに解除できます。",
        "契約終了時、支払済み期間中に承認済みで全額支払済みの成果物を引き渡します。未完成物、内部ファイルおよび未払成果物の提供義務はありません。",
      ],
    },
    {
      heading: "17. 解約、返金および再開",
      paragraphs: [
        "法令またはService Orderに別段の定めがある場合を除き、更新後の請求期間、未使用の依頼枠、制作枠、確認待ち、素材待ちその他お客様側の事情について、日割り計算、繰越または返金は行いません。",
        "解約後の再開は、当社の制作容量および再開時点の価格・条件に従います。過去の価格または制作枠は保証されません。",
      ],
    },
    {
      heading: "18. 保証の範囲",
      paragraphs: [
        "当社は専門的かつ合理的な注意をもって本サービスを提供しますが、売上、広告成果、再生数、コンバージョン、採用成果、検索順位、プラットフォーム承認、第三者権利の無侵害または特定の事業成果を保証しません。",
        "当社の責任で合意仕様に適合しない成果物がある場合、当社の第一の対応は合理的な範囲での再制作または修正とします。",
      ],
    },
    {
      heading: "19. 責任制限",
      paragraphs: [
        "当社の故意または重過失、生命・身体への損害その他法令上制限できない責任を除き、当社は、逸失利益、間接損害、特別損害、結果損害、データ喪失または第三者からの請求について責任を負いません。",
        "当社が本契約に関連して負う損害賠償責任の総額は、責任原因が生じた日以前3か月間にお客様が本サービスについて実際に支払った料金総額を上限とします。",
      ],
    },
    {
      heading: "20. 不可抗力",
      paragraphs: [
        "天災、感染症、戦争、テロ、法令・行政措置、停電、通信障害、クラウドまたは第三者サービスの重大障害、労働争議その他合理的な支配を超える事由による遅延または不履行について、当事者は責任を負いません。影響を受ける当事者は合理的な範囲で通知し、影響軽減に努めます。",
      ],
    },
    {
      heading: "21. 規約の変更",
      paragraphs: [
        "当社は、法令変更、サービス内容、セキュリティ、運用または商業条件の変更に対応するため、本規約を合理的な範囲で変更できます。変更内容と効力発生日をWebサイトまたは登録連絡先への通知により周知します。",
        "お客様に重大な不利益を及ぼす変更は、原則として30日前までに通知し、変更後の条件に同意できないお客様は効力発生日までに次回更新を解約できます。個別に合意したService Orderを変更するには別途合意が必要です。",
      ],
    },
    {
      heading: "22. 一般条項",
      bullets: [
        "お客様は当社の事前書面承諾なく契約上の地位を譲渡できません。当社は事業譲渡、組織再編または承継に伴い契約を移転できます。",
        "本規約の一部が無効でも、その他の条項は有効に存続します。権利を直ちに行使しないことは放棄を意味しません。",
        "通知はService Order記載のメール、指定ワークスペースその他当事者が合意した方法で行います。",
      ],
    },
    {
      heading: "23. 準拠法および裁判管轄",
      paragraphs: [
        "本契約は日本法に準拠します。本契約に関する紛争については、東京地方裁判所を第一審の専属的合意管轄裁判所とします。",
      ],
    },
  ],
  contactTitle: "規約・契約条件に関する連絡先",
  contactBody:
    "Paradigm合同会社 / contact@paradigmjp.com。個別案件の例外、セキュリティ要件、AI利用制限、権利処理または調達要件は、契約前にService Orderへ記載してください。",
}

const EN_TERMS: VideoServiceTermsCopy = {
  title: "Video as a Service Terms",
  description:
    "Standard business terms for Paradigm LLC's Video as a Service. An agreed Service Order controls where it expressly differs from these terms.",
  effectiveDateLabel: "Effective date",
  effectiveDate: "July 28, 2026",
  intro: [
    'These Video as a Service Terms (the "Terms") govern the business-to-business video production service provided by Paradigm LLC ("Paradigm", "we", or "us").',
    "The service is available only to companies, organizations, sole proprietors, and other customers acquiring video services for business purposes. We do not accept consumer or personal-use orders.",
  ],
  hierarchyTitle: "Order of precedence",
  hierarchy: [
    "A Service Order, estimate, or other written agreement accepted by both parties",
    "These Terms",
    "Proposals, website copy, FAQs, and other explanatory materials",
  ],
  sections: [
    {
      heading: "1. Contract formation",
      paragraphs: [
        "An application or consultation does not create a contract. A contract is formed when Paradigm issues a Service Order, the customer accepts the Service Order and these Terms, and the first payment clears.",
        "We may decline an application for reasonable capacity, scope, legal, platform-policy, conflict, safety, sanctions, or reputational reasons.",
      ],
    },
    {
      heading: "2. Plans, fees, and payment",
      bullets: [
        "The standard monthly prices are USD 1,500 for Essential, USD 3,500 for Unlimited, and USD 5,500 for Priority. Taxes, transfer fees, foreign-exchange costs, and third-party costs are additional unless the Service Order or invoice says otherwise.",
        "Fees are paid in advance before each billing period. Production capacity is not reserved until payment clears.",
        "The subscription renews monthly. A cancellation notice delivered before the next renewal date takes effect on that renewal date.",
        "An upgrade may take effect earlier if capacity is available and the fee difference is paid. A downgrade takes effect on the next renewal date.",
      ],
    },
    {
      heading: "3. Start Date and onboarding",
      paragraphs: [
        "The operational Start Date is the date Paradigm records onboarding as complete after contract formation and receipt of the required brand guidance, source assets, access, approver, and first brief.",
        "A delay caused by missing customer inputs or approvals does not extend the billing period unless the parties agree otherwise in writing.",
      ],
    },
    {
      heading: "4. Request queue and active slots",
      bullets: [
        "Requests may be managed as Backlog, Ready, Active Production, Internal QA, Client Review, Blocked, Approved, Delivered, or similar statuses.",
        "Ready means the objective, channel, duration, required assets, references, approver, and other reasonably required inputs are complete.",
        "Essential and Unlimited normally include one concurrent Active Production or Internal QA slot. Priority normally includes two.",
        "A request in Client Review or Blocked may release its active slot so another Ready request can move forward. Returned feedback re-enters the queue based on plan priority and current capacity.",
        "We normally begin a standard Ready request within two business days. This is not a completion or delivery guarantee and may vary for holidays, complexity, emergencies, or a separately agreed schedule.",
      ],
    },
    {
      heading: "5. Essential: up to ten videos",
      paragraphs: [
        "One Essential video is normally a final video up to 60 seconds, based primarily on customer-supplied footage, with one principal objective, structure, language, and primary format. One simple resize is included.",
        "Different hooks, scripts, structures, languages, durations, campaigns, ad variants, or materially replaced source assets count as separate videos. Unused capacity does not roll over, convert to cash, or create a refund.",
      ],
    },
    {
      heading: "6. Meaning of Unlimited and Priority",
      paragraphs: [
        "Unlimited and Priority remove the cap on queued requests and revision rounds within an agreed brief. They do not provide unlimited completed videos, fixed-time completion, same-day service, unlimited concurrent work, or unlimited labor hours.",
      ],
    },
    {
      heading: "7. Revisions and new requests",
      bullets: [
        "Essential includes up to three revision rounds per video. Unlimited and Priority do not cap revision rounds within the approved objective, script, structure, and creative direction.",
        "A changed objective, substantially rewritten script, new or materially different assets, another language, another duration, another campaign, reversal of approved direction, or substantial re-production is a new request or separately scoped work.",
        "If multiple customer stakeholders provide conflicting instructions, Paradigm may mark the request Blocked until the designated approver provides consolidated direction.",
      ],
    },
    {
      heading: "8. Timing, review, and acceptance",
      paragraphs: [
        "Delivery ranges are shared per request after considering duration, assets, creative complexity, motion, third-party media, review speed, and external dependencies. They are not guarantees of a business outcome.",
        "The customer should approve or provide specific consolidated feedback within five business days after a review version is delivered. If no response is received, Paradigm may move the request to Client Review or Archived and continue with another request.",
        "A final deliverable is deemed accepted unless the customer identifies a material failure to meet the agreed specification within five business days after final delivery. A latent technical defect should be reported promptly after discovery.",
      ],
    },
    {
      heading: "9. Out-of-scope work and third-party costs",
      paragraphs: [
        "Location filming, studios, talent, sourced voiceover, premium or territorially restricted media, advanced 3D or VFX, same-day or rush work, large concurrent batches, media trafficking, and ad operations require a separately approved fee or agreement.",
        "Paradigm will not purchase paid third-party assets without customer approval. We are not responsible for a third party's price changes, discontinuation, review decisions, availability, or license terms.",
      ],
    },
    {
      heading: "10. Customer responsibilities and asset warranties",
      bullets: [
        "The customer provides accurate briefs, lawfully usable assets, required consents and licenses, brand and legal requirements, platform requirements, and an authorized final approver.",
        "The customer warrants that its assets, instructions, product or service claims, and use of deliverables do not violate law, regulation, industry rules, platform rules, or third-party rights.",
        "Paradigm does not provide legal, medical, financial, regulatory, or platform-compliance advice. The customer obtains specialist review where required.",
      ],
    },
    {
      heading: "11. Intellectual property",
      paragraphs: [
        "After full payment, Paradigm assigns to the customer the copyright Paradigm owns in bespoke final deliverables created specifically for that customer, expressly including the rights described in Articles 27 and 28 of the Japanese Copyright Act.",
        "To the extent permitted by law, Paradigm and creators under Paradigm's control will not exercise moral rights in the assigned final deliverables.",
        "Customer materials, third-party media, fonts, music, stock, software, generative-AI service conditions, and Paradigm background materials—including pre-existing templates, methods, know-how, workflows, generic components, and production systems—are excluded and remain subject to their applicable licenses.",
        "Standard delivery consists of approved final exports. Editable project files, reusable templates, production systems, and license-restricted assets are delivered only when expressly included in the Service Order.",
      ],
    },
    {
      heading: "12. AI-assisted tools",
      paragraphs: [
        "Paradigm may use AI-assisted tools for ideation, transcription, translation, generation or enhancement of image, video, or audio elements, and quality review.",
        "Any no-AI, prohibited-vendor, no-training, data-residency, confidentiality-classification, or similar restriction must be disclosed before contracting and included in the Service Order. A restriction may affect price, timing, or feasibility.",
        "Paradigm does not warrant exclusivity, copyright availability, or continued third-party availability for elements generated solely by AI systems.",
      ],
    },
    {
      heading: "13. Confidentiality and data",
      paragraphs: [
        "Each party will use the other party's confidential information only to perform the contract and will not disclose it without consent or legal requirement. This does not cover public information, information already lawfully held, information lawfully received from another source, or independently developed information.",
        "Paradigm may allow personnel, subcontractors, and cloud or production-tool providers subject to appropriate confidentiality duties to process information as reasonably required. Personal information is handled under our Privacy Policy.",
      ],
    },
    {
      heading: "14. Portfolio use",
      paragraphs: [
        "Paradigm may display a published deliverable and the customer's name or logo as portfolio material only with the customer's prior written approval. We will not display confidential information, unreleased campaigns, or private dashboard content.",
      ],
    },
    {
      heading: "15. Subcontracting",
      paragraphs: [
        "Paradigm may subcontract part of the service to secure capacity or specialist skill, provided the subcontractor is subject to appropriate confidentiality and intellectual-property obligations. Paradigm remains responsible for its contractual performance.",
      ],
    },
    {
      heading: "16. Holds, suspension, and termination",
      bullets: [
        "Paradigm may pause production and request cure for late payment, prolonged missing inputs or approvals, potentially illegal or infringing work, safety risks, abusive conduct, or another material breach.",
        "Either party may terminate immediately for an uncured material breach, insolvency, bankruptcy proceedings, organized-crime affiliation, sanctions concerns, or another material event that makes the relationship untenable.",
        "At termination, Paradigm will deliver approved and fully paid final deliverables from the paid period. We do not have to provide incomplete work, internal files, or unpaid deliverables.",
      ],
    },
    {
      heading: "17. Cancellation, refunds, and restart",
      paragraphs: [
        "Except where law or the Service Order requires otherwise, renewed billing periods, unused requests or slots, review waits, asset waits, and other customer-caused holds are not prorated, rolled over, or refunded.",
        "A restart after cancellation is subject to available capacity and the prices and terms then in effect. Previous pricing or capacity is not guaranteed.",
      ],
    },
    {
      heading: "18. Limited warranty",
      paragraphs: [
        "Paradigm will provide the service with reasonable professional care but does not guarantee revenue, ad performance, views, conversion, hiring results, search ranking, platform approval, non-infringement of customer-directed content, or another business outcome.",
        "For a deliverable that materially fails to meet the agreed specification due to Paradigm, our first remedy is reasonable correction or re-performance.",
      ],
    },
    {
      heading: "19. Limitation of liability",
      paragraphs: [
        "Except for willful misconduct, gross negligence, death or personal injury, or liability that cannot legally be limited, Paradigm is not liable for lost profit, indirect, special, incidental, consequential, data-loss, or third-party-claim damages.",
        "Paradigm's aggregate liability arising from the contract is capped at the fees actually paid for the service during the three months before the event giving rise to liability.",
      ],
    },
    {
      heading: "20. Force majeure",
      paragraphs: [
        "Neither party is liable for delay or failure caused by events beyond reasonable control, including natural disaster, epidemic, war, terrorism, government action, power or communications failure, material cloud or third-party-service outage, or labor dispute. The affected party will give reasonable notice and mitigate the impact where practicable.",
      ],
    },
    {
      heading: "21. Changes to these Terms",
      paragraphs: [
        "Paradigm may reasonably amend these Terms to reflect changes in law, service scope, security, operations, or commercial conditions. We will publish or send the amended terms and their effective date.",
        "We will normally give at least 30 days' notice of a materially adverse change. A customer that does not accept that change may cancel the next renewal before the effective date. A separately agreed Service Order changes only by further agreement.",
      ],
    },
    {
      heading: "22. General",
      bullets: [
        "The customer may not assign the contract without Paradigm's prior written consent. Paradigm may transfer it in connection with a business transfer, reorganization, or succession.",
        "If part of the contract is invalid, the remaining terms continue. A delay in enforcing a right is not a waiver.",
        "Notices may be sent to the email address in the Service Order, the designated workspace, or another agreed channel.",
      ],
    },
    {
      heading: "23. Governing law and jurisdiction",
      paragraphs: [
        "The contract is governed by the laws of Japan. The Tokyo District Court has exclusive jurisdiction as the court of first instance for disputes arising from the contract.",
      ],
    },
  ],
  contactTitle: "Contract questions",
  contactBody:
    "Paradigm LLC / contact@paradigmjp.com. Any exception, security requirement, AI restriction, rights requirement, or procurement term should be documented in the Service Order before contracting.",
}

export function getVideoServiceTerms(
  locale: VideoServiceLocale,
): VideoServiceTermsCopy {
  return locale === "ja" ? JA_TERMS : EN_TERMS
}
