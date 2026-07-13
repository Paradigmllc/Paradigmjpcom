import type { DemoTemplate } from "./demo-templates/registry";

export function buildJapaneseSystemPrompt(): string {
  return `あなたはプロフェッショナルなビジネスコピーライターです。日本のビジネス文化に精通し、自然な「です・ます調」で説得力のある文章を作成します。

以下のルールを必ず守ってください：
1. 日本語出力は必ず「です・ます調」で書くこと（「〜だ」「〜である」調は使用禁止）
2. 不自然なAI翻訳調（機械翻訳のような表現）は避け、日本人のビジネスパーソンが実際に使う自然な表現にすること
3. 業界や企業規模に合わせた適切な専門用語を使用すること
4. 誇張表現や空虚なキャッチコピー（「革命的な」「世界初」「唯一無二」など）は避け、具体的で信頼感のある表現にすること
5. 入力に根拠がない実績、数値、沿革、代表者名、顧客名、推薦文、受賞歴、料金を創作しないこと
6. 不明な情報は創作せず「要確認」と明示すること
7. 出力は必ず有効なJSON形式のみ。JSONの前後に説明文や注釈を付けないこと`;
}

export function buildEnglishSystemPrompt(): string {
  return `You are a professional business copywriter. Write compelling, natural-sounding business copy that sounds like it was written by a native English-speaking professional.

Follow these rules strictly:
1. Output must be professional business English — natural, polished, and free of AI clichés
2. Avoid buzzwords like "revolutionary", "game-changing", "unparalleled", "world-class" unless truly justified
3. Be specific and concrete rather than vague and grandiose
4. Match the tone to the industry (formal for legal/accounting, approachable for retail/restaurant, innovative for tech)
5. Never invent results, metrics, history, people, customers, testimonials, awards, or pricing
6. Mark unsupported information as "To be confirmed"
7. Output ONLY valid JSON. No explanations before or after the JSON.`;
}

export function buildJapaneseUserPrompt(
  name: string,
  industry: string,
  prefecture: string,
  domain: string,
  techSummary: string,
  _hook: string,
  _totalLoss: string,
  _actSummaries: string,
  locale: string,
  _homeSections: string,
  heroVariant: string,
  featureLayout: string,
  cardStyle: string,
  nav: string,
  _tokens: DemoTemplate["designTokens"],
  verifiedFacts: string,
): string {
  return `以下の企業情報をもとに、4ページ構成のビジネスWebサイト（Home、About、Services、Contact）のパーソナライズされたコピーを生成してください。

【企業情報】
- 企業名: ${name}
- 業種: ${industry}
- 所在地: ${prefecture || "記載なし"}
- ドメイン: ${domain}
- 技術スタック: ${techSummary}
- 出力言語: ${locale === "ja" ? "日本語（です・ます調）" : locale}
- レイアウトスタイル: ヒーロー=${heroVariant}, 特徴=${featureLayout}, カード=${cardStyle}, ナビ=${nav}

【確認済み公開情報】
${verifiedFacts}
上記にない事実は創作せず、コピーには確認済み公開情報だけを使用してください。

【出力形式】
以下のJSON形式で出力してください。日本語はすべて「です・ます調」で記述してください。

{
  "home": {
    "hero_title": "確認済み商品・サービスを主役にした見出し（40文字以内）",
    "hero_subtitle": "来店・利用者に向けた1〜2文の案内（80文字以内）",
    "features": [
      {
        "title": "確認済み商品・サービスの魅力",
        "description": "確認済み事実だけを使った説明（60文字以内）",
        "icon": "sparkles | shield | route | star | bolt | globe | lock | target | cpu | search | chart | users | lightbulb | zap | heart | smile",
        "metric_label": "指標ラベル",
        "metric_value": "指標値"
      }
    ],
    "faq": [
      {
        "q": "よくある質問",
        "a": "自然な回答（100文字程度）"
      }
    ]
  },
  "about": {
    "story": "確認済み情報に基づく事業紹介（2〜3段落、です・ます調。沿革や創業年は創作しない）",
    "mission": "ミッションステートメント（1文）",
    "values": [
      {
        "title": "価値観",
        "description": "説明",
        "icon": "star | lightbulb | users | globe | heart | shield | zap"
      }
    ]
  },
  "services": {
    "intro": "サービス紹介のリード文（2文程度）",
    "services": [
      {
        "title": "サービス名",
        "description": "説明",
        "icon": "globe | search | cpu | chart | shield | bolt | sparkles",
        "features": ["特徴1", "特徴2", "特徴3"]
      }
    ],
    "process": [
      {"step": 1, "title": "ステップ名", "description": "説明"},
      {"step": 2, "title": "ステップ名", "description": "説明"},
      {"step": 3, "title": "ステップ名", "description": "説明"},
      {"step": 4, "title": "ステップ名", "description": "説明"}
    ]
  },
  "contact": {
    "intro": "問い合わせ導入文（2文程度）",
    "booking_cta": "予約ボタンのテキスト",
    "form_note": "フォームの補足文"
  }
}

重要: これは制作会社の改善提案LPではなく、入力企業がそのまま公式サイトとして使える顧客向けコピーです。Web改善、SEO、表示速度、診断、制作会社、Paradigm、Japan Entryには言及しないでください。features配列は3つ、FAQは4つ、valuesは4つ、servicesは3つ生成してください。根拠のない所在地、年代、沿革、営業時間、外部サービス連携、顧客の声、実績、数値は絶対に生成しないでください。`;
}

export function buildEnglishUserPrompt(
  name: string,
  industry: string,
  prefecture: string,
  domain: string,
  techSummary: string,
  _hook: string,
  _totalLoss: string,
  _actSummaries: string,
  locale: string,
  _homeSections: string,
  heroVariant: string,
  featureLayout: string,
  cardStyle: string,
  nav: string,
  _tokens: DemoTemplate["designTokens"],
  verifiedFacts: string,
): string {
  return `Generate personalized copy for a 4-page business website (Home, About, Services, Contact) based on the following company data.

[Company Info]
- Company Name: ${name}
- Industry: ${industry}
- Location: ${prefecture || "N/A"}
- Domain: ${domain}
- Tech Stack: ${techSummary}
- Output Language: ${locale === "en" ? "Professional Business English" : locale}
- Layout Style: hero=${heroVariant}, features=${featureLayout}, cards=${cardStyle}, nav=${nav}

[Verified Public Facts]
${verifiedFacts}
Use only these verified facts for company-specific copy. Do not invent missing facts.

[Output Format]
Output the following JSON. All English copy must be professional business English — natural, polished, and free of AI clichés.

{
  "home": {
    "hero_title": "Headline centered on a verified product or service (max 80 chars)",
    "hero_subtitle": "1-2 sentence customer-facing introduction (max 120 chars)",
    "features": [
      {
        "title": "Verified product or service benefit",
        "description": "Description using verified facts only (max 100 chars)",
        "icon": "sparkles | shield | route | star | bolt | globe | lock | target | cpu | search | chart | users | lightbulb | zap | heart | smile",
        "metric_label": "Metric label",
        "metric_value": "Metric value"
      }
    ],
    "faq": [
      {
        "q": "Common question",
        "a": "Natural answer (around 100 chars)"
      }
    ]
  },
  "about": {
    "story": "Business introduction based only on verified facts (2-3 paragraphs; do not invent history or founding dates)",
    "mission": "Mission statement (1 sentence)",
    "values": [
      {
        "title": "Value name",
        "description": "Description",
        "icon": "star | lightbulb | users | globe | heart | shield | zap"
      }
    ]
  },
  "services": {
    "intro": "Services intro (2 sentences)",
    "services": [
      {
        "title": "Service name",
        "description": "Description",
        "icon": "globe | search | cpu | chart | shield | bolt | sparkles",
        "features": ["Feature 1", "Feature 2", "Feature 3"]
      }
    ],
    "process": [
      {"step": 1, "title": "Step name", "description": "Description"},
      {"step": 2, "title": "Step name", "description": "Description"},
      {"step": 3, "title": "Step name", "description": "Description"},
      {"step": 4, "title": "Step name", "description": "Description"}
    ]
  },
  "contact": {
    "intro": "Contact intro (2 sentences)",
    "booking_cta": "Booking button text",
    "form_note": "Form note text"
  }
}

IMPORTANT: This is not a web-agency improvement pitch. Write customer-facing copy the input business could use as its official website. Do not mention web improvement, SEO, diagnostics, an agency, Paradigm, or Japan Entry. Generate exactly 3 features, 4 FAQs, 4 values, 3 services, and 4 process steps. Never invent locations, dates, history, opening hours, third-party platform integrations, testimonials, customer claims, or performance metrics.`;
}
