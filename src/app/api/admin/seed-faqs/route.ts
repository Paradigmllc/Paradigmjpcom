/**
 * /api/admin/seed-faqs — FAQ seed endpoint
 *
 * Payload `faqs` collection に JA + EN 各18問のFAQを投入。
 * 既存の seed-services / seed-pricing と同じパターンで実装。
 *
 * 認証: x-admin-secret ヘッダ必須 (env ADMIN_SCRIPT_SECRET)
 * 冪等性: question で既存チェック → upsert
 */

import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"
export const maxDuration = 60

interface SeedFaq {
  question: { ja: string; en: string }
  answer: { ja: string; en: string }
  category: { ja: string; en: string }
  sortOrder: number
}

function lexicalFromText(text: string): unknown {
  return {
    root: {
      children: [
        {
          children: [
            { detail: 0, format: 0, mode: "normal", style: "", text, type: "text", version: 1 },
          ],
          direction: "ltr",
          format: "",
          indent: 0,
          type: "paragraph",
          version: 1,
        },
      ],
      direction: "ltr",
      format: "",
      indent: 0,
      type: "root",
      version: 1,
    },
  }
}

const FAQS: SeedFaq[] = [
  {
    question: { ja: "初回相談は無料ですか？", en: "Is the initial consultation free?" },
    answer: {
      ja: "はい、初回のオンライン相談（30分）は完全無料です。現状の課題整理と最適な施策のご提案をさせていただきます。その後の見積もり提出までも無料です。営業電話は一切行いませんので、お気軽にご相談ください。",
      en: "Yes, the initial online consultation (30 minutes) is completely free. We'll assess your current challenges and propose the best approach. The quote is also free of charge. We never make unsolicited sales calls, so feel free to reach out.",
    },
    category: { ja: "お申し込み前", en: "Before Ordering" },
    sortOrder: 1,
  },
  {
    question: { ja: "制作期間はどのくらいですか？", en: "How long does production take?" },
    answer: {
      ja: "Web制作の場合、ライトプラン（5ページ以内）で2〜3週間、スタンダード（10ページ以内）で1〜2ヶ月、プレミアム（無制限）で2〜3ヶ月が目安です。MEO対策は初回効果が見えるまで1〜3ヶ月、SEOは3〜6ヶ月が標準的な成果スパンです。",
      en: "For web development: Light plan (≤5 pages) takes 2-3 weeks, Standard (≤10 pages) 1-2 months, Premium (unlimited) 2-3 months. MEO typically shows initial results in 1-3 months, SEO in 3-6 months.",
    },
    category: { ja: "制作・納期", en: "Production & Timeline" },
    sortOrder: 2,
  },
  {
    question: { ja: "支払い方法は何がありますか？", en: "What payment methods do you accept?" },
    answer: {
      ja: "銀行振込、クレジットカード（Stripe決済）、請求書払いに対応しています。Web制作は着手金50%＋納品時50%の分割払いが標準です。月額サービスは月末締め翌月末払いとなります。",
      en: "We accept bank transfer, credit card (via Stripe), and invoice payment. Web projects are typically 50% upfront + 50% on delivery. Monthly services are billed at the end of each month, due the following month.",
    },
    category: { ja: "お支払い", en: "Payment" },
    sortOrder: 3,
  },
  {
    question: { ja: "追加費用は発生しますか？", en: "Are there any additional costs?" },
    answer: {
      ja: "プランに明記された内容については追加費用は発生しません。ただし、当初の仕様から大きく外れる追加機能のご依頼や、プラン範囲外の対応（写真撮影の追加、多言語翻訳など）については別途お見積りとなります。",
      en: "No additional costs for items included in your plan. However, significant scope changes beyond the original spec, or services outside your plan (extra photography, translations, etc.) will be quoted separately.",
    },
    category: { ja: "お支払い", en: "Payment" },
    sortOrder: 4,
  },
  {
    question: { ja: "保守・運用はどうなりますか？", en: "What about maintenance and operations?" },
    answer: {
      ja: "Web制作には公開後の保守プラン（月額19,800円〜）をご用意しています。SSL証明書の更新、サーバー監視、バックアップ、軽微な修正が含まれます。MEO/SEOの月額プランには定期的なレポートと改善提案が標準で含まれています。",
      en: "We offer a maintenance plan for websites (from ¥19,800/month) covering SSL renewal, server monitoring, backups, and minor fixes. MEO/SEO monthly plans include regular reporting and improvement recommendations as standard.",
    },
    category: { ja: "保守・運用", en: "Maintenance" },
    sortOrder: 5,
  },
  {
    question: { ja: "途中解約は可能ですか？", en: "Can I cancel mid-contract?" },
    answer: {
      ja: "月額サービス（MEO/SEO）の最低契約期間は6ヶ月です。6ヶ月未満の解約の場合は残期間の50%を違約金として頂戴します。Web制作の途中解約は、作業進捗に応じた清算となります。詳しくは契約時にご説明します。",
      en: "Monthly services (MEO/SEO) have a 6-month minimum contract. Early cancellation incurs 50% of the remaining period as a fee. For web projects, mid-project cancellation is settled based on work completed. Details are explained at contract signing.",
    },
    category: { ja: "契約・解約", en: "Contract & Cancellation" },
    sortOrder: 6,
  },
  {
    question: { ja: "MEO対策とは具体的に何をしますか？", en: "What exactly does MEO involve?" },
    answer: {
      ja: "MEO（Map Engine Optimization）はGoogleビジネスプロフィール（旧Googleマイビジネス）を最適化し、Googleマップ検索で上位表示を目指す施策です。具体的には、プロフィール情報の最適化、口コミ獲得施策、定期的な投稿運用、写真/動画の最適化、順位トラッキング、競合分析などを行います。",
      en: "MEO (Map Engine Optimization) optimizes your Google Business Profile to rank higher in Google Maps search. This includes profile optimization, review generation strategies, regular posts, photo/video optimization, rank tracking, and competitor analysis.",
    },
    category: { ja: "MEO対策", en: "MEO" },
    sortOrder: 7,
  },
  {
    question: { ja: "SEOの効果が出るまでどのくらいかかりますか？", en: "How long until SEO shows results?" },
    answer: {
      ja: "SEOは即効性のある施策ではなく、通常3〜6ヶ月で検索順位の変動が見え始めます。新規サイトの場合はさらに時間がかかることもあります。当社では月次レポートで順位推移を可視化し、PDCAを回しながら改善を続けます。平均でオーガニック流入が約2.5倍に増加した実績があります。",
      en: "SEO is not an instant fix — ranking changes typically become visible after 3-6 months. New sites may take longer. We provide monthly ranking reports to visualize progress and continuously improve. On average, our clients see ~2.5x increase in organic traffic.",
    },
    category: { ja: "SEO/GEO対策", en: "SEO/GEO" },
    sortOrder: 8,
  },
  {
    question: { ja: "GEO（AI検索対策）とは何ですか？", en: "What is GEO (AI search optimization)?" },
    answer: {
      ja: "GEO（Generative Engine Optimization）はChatGPT、Gemini、PerplexityなどのAI検索エンジンで自社情報が引用・推薦されるように最適化する施策です。FAQの構造化、エンティティSEO、信頼性シグナルの強化などを通じて、AIが「信頼できる情報源」と判断する状態を構築します。Paradigmの独自サービスです。",
      en: "GEO (Generative Engine Optimization) optimizes your content to be cited and recommended by AI search engines like ChatGPT, Gemini, and Perplexity. Through FAQ structuring, entity SEO, and authority signal building, we position your brand as a trusted source for AI. This is a Paradigm-exclusive service.",
    },
    category: { ja: "SEO/GEO対策", en: "SEO/GEO" },
    sortOrder: 9,
  },
  {
    question: { ja: "AI導入支援ではどんなことができますか？", en: "What can AI integration do for my business?" },
    answer: {
      ja: "AI導入支援では、AIチャットボットの構築（FAQ自動応答）、業務自動化（Trigger.dev/Difyによるワークフロー自動化）、AIコンテンツ生成、データ分析・可視化、社内AI研修、カスタムAI開発まで一貫して対応します。導入実績として業務時間の平均40%削減を達成しています。",
      en: "Our AI integration covers: AI chatbot deployment (auto FAQ responses), workflow automation (via Trigger.dev/Dify), AI content generation, data analytics & dashboards, in-house AI training, and custom AI development. Clients average a 40% reduction in operating time.",
    },
    category: { ja: "AI導入支援", en: "AI Integration" },
    sortOrder: 10,
  },
  {
    question: { ja: "対応エリアはどこですか？", en: "What areas do you cover?" },
    answer: {
      ja: "オンライン完結のため、日本全国・海外からもご利用いただけます。打ち合わせはZoom/Google Meetで実施し、チャット（Slack）で随時ご連絡が可能です。MEO対策は地域ビジネス向けのため、特定エリアに集中した対策も可能です。",
      en: "Everything is online, so we serve clients across Japan and internationally. Meetings are via Zoom/Google Meet, with ongoing communication via Slack. For MEO, we can focus on specific geographic areas as needed.",
    },
    category: { ja: "お申し込み前", en: "Before Ordering" },
    sortOrder: 11,
  },
  {
    question: { ja: "WordPressとNext.jsの違いは？どちらを選べばいいですか？", en: "WordPress vs Next.js — which should I choose?" },
    answer: {
      ja: "WordPressは管理画面が充実しており、自分で更新したい方におすすめです。Next.jsは表示速度が非常に速く、SEOに強く、より高度な機能実装が可能です。どちらが適しているかはサイトの目的や更新頻度によって異なります。無料相談時にヒアリングの上、最適な方をご提案します。",
      en: "WordPress has a rich admin panel — ideal if you want to update content yourself. Next.js offers superior speed, SEO performance, and advanced functionality. The best choice depends on your site's purpose and update frequency. We'll recommend the optimal stack during your free consultation.",
    },
    category: { ja: "Web制作", en: "Web Development" },
    sortOrder: 12,
  },
  {
    question: { ja: "デザインの修正は何回まで可能ですか？", en: "How many design revisions are included?" },
    answer: {
      ja: "スタンダードプラン以上ではデザインカンプの修正は3回まで無料です。ライトプランは2回まで。いずれも「思っていたのと違う」を防ぐため、制作前に詳細なヒアリングと方向性のすり合わせを徹底しています。",
      en: "Standard plan and above includes up to 3 free design revisions. Light plan includes 2. To avoid mismatches, we conduct thorough discovery and alignment before production begins.",
    },
    category: { ja: "Web制作", en: "Web Development" },
    sortOrder: 13,
  },
  {
    question: { ja: "ドメインやサーバーの手配もお願いできますか？", en: "Can you handle domain and server setup?" },
    answer: {
      ja: "はい、ドメイン取得からサーバー契約、DNS設定、SSL証明書の導入まで一括で代行可能です。すでにドメインをお持ちの場合はそのままご利用いただけます。サーバーはVercel（Next.js）またはCPI/さくら（WordPress）など、サイトに最適な環境を選定します。",
      en: "Yes, we can handle everything from domain registration to server setup, DNS configuration, and SSL certificate installation. If you already have a domain, we can use it as-is. We select the optimal hosting environment (Vercel for Next.js, or standard hosting for WordPress).",
    },
    category: { ja: "Web制作", en: "Web Development" },
    sortOrder: 14,
  },
  {
    question: { ja: "納品後のトラブル対応はどうなりますか？", en: "What about post-launch support?" },
    answer: {
      ja: "全プランに公開後の無料サポート期間（ライト1ヶ月/スタンダード3ヶ月/プレミアム6ヶ月）が含まれています。期間中は不具合修正・軽微な更新を無料で承ります。期間終了後は保守プラン（月額19,800円〜）にご加入いただくか、スポット対応（都度見積）となります。",
      en: "All plans include a post-launch support period (Light: 1 month, Standard: 3 months, Premium: 6 months) with free bug fixes and minor updates. After that, you can subscribe to our maintenance plan (from ¥19,800/month) or request spot support (quoted per case).",
    },
    category: { ja: "保守・運用", en: "Maintenance" },
    sortOrder: 15,
  },
  {
    question: { ja: "見積もりだけでも大丈夫ですか？", en: "Can I just get a quote?" },
    answer: {
      ja: "もちろんです。無料相談（30分）でヒアリングの上、無料でお見積りを提出します。見積もり後のご判断はご自由です。お見積りだけでご発注いただけなくても問題ありません。",
      en: "Absolutely. After a 30-minute free consultation, we'll provide a free quote. There's no obligation to proceed — we're happy to help even if you're just exploring options.",
    },
    category: { ja: "お申し込み前", en: "Before Ordering" },
    sortOrder: 16,
  },
  {
    question: { ja: "多言語対応は可能ですか？", en: "Do you support multiple languages?" },
    answer: {
      ja: "はい、当社は日本語・英語をはじめ12言語に対応しています。Webサイトの多言語化、多言語SEO、各国のPPP（購買力平価）を考慮した価格設定まで、インバウンド・アウトバウンド両方の多言語戦略を支援します。",
      en: "Yes, we support 12 languages including Japanese and English. From multilingual websites and SEO to PPP-adjusted pricing for different markets, we provide comprehensive multilingual strategies for both inbound and outbound growth.",
    },
    category: { ja: "Web制作", en: "Web Development" },
    sortOrder: 17,
  },
  {
    question: { ja: "競合他社と比べて何が違いますか？", en: "What makes you different from competitors?" },
    answer: {
      ja: "最大の違いは3点です。①「AI×デジタル」の融合：最新のAI技術（DeepSeek、Dify等）を活用し、人間だけでは実現できない効率と品質を提供します。②「一気通貫」：Web制作からMEO/SEO/GEO/AI導入までワンストップ。複数ベンダー管理の手間がなくなります。③「成果保証」：MEO/SEOは一定期間内に成果が出なければ返金対応。リスクなく始められます。",
      en: "Three key differences: ① AI × Digital fusion: we leverage cutting-edge AI (DeepSeek, Dify, etc.) for efficiency and quality beyond human-only approaches. ② End-to-end: web development through MEO/SEO/GEO/AI — one partner instead of multiple vendors. ③ Results guarantee: MEO/SEO plans include a money-back guarantee if targets aren't met within the agreed timeframe. Start risk-free.",
    },
    category: { ja: "お申し込み前", en: "Before Ordering" },
    sortOrder: 18,
  },
]

export async function POST(req: Request) {
  // ─── 認証 ─────────────────────────────────────────
  const secret = req.headers.get("x-admin-secret")
  const expected = process.env.ADMIN_SCRIPT_SECRET
  if (!expected) {
    return NextResponse.json({ error: "ADMIN_SCRIPT_SECRET not configured" }, { status: 500 })
  }
  if (secret !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const dryRun = body.dryRun === true

  if (dryRun) {
    return NextResponse.json({
      dryRun: true,
      would_seed: FAQS.map(f => ({ q_ja: f.question.ja, q_en: f.question.en, category: f.category.ja })),
      total: FAQS.length,
      hint: "{ confirm: true } で実行",
    })
  }

  if (!body.confirm) {
    return NextResponse.json({
      error: "Send { confirm: true } to execute",
      hint: "{ dryRun: true } で内容確認・{ confirm: true } で seed 実行",
    }, { status: 400 })
  }

  // ─── 実行 ─────────────────────────────────────────
  const [{ getPayload }, { default: config }] = await Promise.all([
    import("payload"),
    import("@payload-config"),
  ])
  const payload = await getPayload({ config })
  const results: Array<{ q: string; action: "created" | "updated" | "error"; error?: string }> = []

  for (const faq of FAQS) {
    try {
      const { docs: existing } = await payload.find({
        collection: "faqs",
        where: { question: { equals: faq.question.ja } },
        limit: 1,
        locale: "ja",
      })

      const baseData = {
        question: faq.question.ja,
        answer: lexicalFromText(faq.answer.ja),
        category: faq.category.ja,
        sortOrder: faq.sortOrder,
        availableLocales: ["ja", "en"],
      }

      let docId: string | number
      if (existing.length > 0) {
        const updated = (await payload.update({
          collection: "faqs",
          id: existing[0].id,
          data: baseData,
          locale: "ja",
        } as unknown as Parameters<typeof payload.update>[0])) as { id: string | number }
        docId = updated.id
        results.push({ q: faq.question.ja, action: "updated" })
      } else {
        const created = (await payload.create({
          collection: "faqs",
          data: baseData,
          locale: "ja",
        } as unknown as Parameters<typeof payload.create>[0])) as { id: string | number }
        docId = created.id
        results.push({ q: faq.question.ja, action: "created" })
      }

      // ── EN locale を update ──
      await payload.update({
        collection: "faqs",
        id: docId,
        data: {
          question: faq.question.en,
          answer: lexicalFromText(faq.answer.en),
          category: faq.category.en,
        },
        locale: "en",
      } as unknown as Parameters<typeof payload.update>[0])
    } catch (e) {
      results.push({ q: faq.question.ja, action: "error", error: (e as Error).message })
    }
  }

  return NextResponse.json({
    success: true,
    seeded: results,
    total_attempted: FAQS.length,
    total_ok: results.filter(r => r.action !== "error").length,
    total_errors: results.filter(r => r.action === "error").length,
  })
}
