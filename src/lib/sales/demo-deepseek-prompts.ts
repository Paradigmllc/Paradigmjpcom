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
7. メニュー名だけが確認済みでも、材料、食感、製法、味、提供方法、予約可否、決済方法、返信時期まで推測しないこと
8. 画像が生成素材か公式素材か、権利確認済みかを本文で断定しないこと
9. 公式SNSのURLがあっても、DM受付、予約受付、返信期限を推測しないこと
10. 出力は必ず有効なJSON形式のみ。JSONの前後に説明文や注釈を付けないこと`;
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
7. Do not infer ingredients, taste, texture, preparation, reservation policy, payment methods, contact channels, or response times from a product name
8. Do not claim that images are official or rights-cleared
9. Output ONLY valid JSON. No explanations before or after the JSON.`;
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
  candidateTemplates = "1. template_id=default",
  candidateCount = 3,
): string {
  return `ビジネスWebサイトの創造的な中核コピー（Home、About、Services）を生成してください。FAQとContactは確認済みデータから別工程で生成するため、出力しないでください。

以下の出力仕様と安全規則は全案件共通です。末尾の企業固有入力だけを参照してコピーを作成してください。
「フレンチトースト」が確認済みでも「外はカリッと中はふわふわ」「卵と牛乳」「焼き加減」は未確認です。
「ドリップコーヒー」が確認済みでも「一杯ずつハンドドリップ」「豆本来の風味」は未確認です。
「公式Instagram」が確認済みでも「DMで予約可能」「翌営業日に返信」は未確認です。
確認済みでない詳細は魅力的に補完せず、事実の範囲内で簡潔に書いてください。

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
  "art_directions": [
    {
      "template_id": "候補のtemplate_idをそのまま記載",
      "concept": "この企業固有の視覚コンセプト（8〜50文字）",
      "typography_style": "editorial-serif | humanist-sans | modern-grotesk | technical-sans",
      "hero_composition": "cinematic | editorial-split | precision-split | mosaic",
      "service_layout": "editorial-list | salon-catalogue | precision-grid",
      "works_layout": "journal | salon-lookbook | case-grid",
      "palette_mood": "warm-neutral | cool-professional | earth | monochrome | soft-contrast",
      "density": "airy | balanced | compact",
      "motion": "restrained | editorial | expressive",
      "signature_motif": "hairline | numbered-index | framed-media | offset-grid | kinetic-rail"
    }
  ]
}

重要: これは制作会社の改善提案LPではなく、入力企業がそのまま公式サイトとして使える顧客向けコピーです。Web改善、SEO、表示速度、診断、制作会社、Paradigm、Japan Entryには言及しないでください。features配列は3つ、valuesは4つ、servicesは3つ生成してください。FAQとContactは出力しないでください。art_directionsは下記${candidateCount}候補と同じtemplate_idで必ず${candidateCount}件生成し、タイポグラフィ、hero、サービス、実績、色調、密度、動き、モチーフの組合せが候補間で明確に異なるようにしてください。根拠のない所在地、年代、沿革、営業時間、外部サービス連携、顧客の声、実績、数値、材料、味、食感、製法、予約可否、問い合わせ手段、返信時期、画像の出自・権利状態は絶対に生成しないでください。

【企業固有入力・ここから末尾だけ案件ごとに変化】
- 企業名: ${name}
- 業種: ${industry}
- 所在地: ${prefecture || "記載なし"}
- ドメイン: ${domain}
- 技術スタック: ${techSummary}
- 出力言語: ${locale === "ja" ? "日本語（です・ます調）" : locale}
- レイアウトスタイル: ヒーロー=${heroVariant}, 特徴=${featureLayout}, カード=${cardStyle}, ナビ=${nav}

【実装可能なデザイン候補】
${candidateTemplates}

【確認済み公開情報】
${verifiedFacts}
上記にない事実は創作せず、確認済み公開情報だけを使用してください。`;
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
  candidateTemplates = "1. template_id=default",
  candidateCount = 3,
): string {
  return `Generate the creative core copy for a business website (Home, About, Services). FAQ and Contact are generated separately from verified data, so do not output them.

The output schema and safety rules below are shared by every request. Use only the company-specific input appended at the end.
An official social URL does not prove that direct messages, reservations, or replies are offered. A menu name does not prove its ingredients, texture, preparation, or taste. Do not infer any of those details.

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
  "art_directions": [
    {
      "template_id": "copy an exact candidate template_id",
      "concept": "company-specific visual concept",
      "typography_style": "editorial-serif | humanist-sans | modern-grotesk | technical-sans",
      "hero_composition": "cinematic | editorial-split | precision-split | mosaic",
      "service_layout": "editorial-list | salon-catalogue | precision-grid",
      "works_layout": "journal | salon-lookbook | case-grid",
      "palette_mood": "warm-neutral | cool-professional | earth | monochrome | soft-contrast",
      "density": "airy | balanced | compact",
      "motion": "restrained | editorial | expressive",
      "signature_motif": "hairline | numbered-index | framed-media | offset-grid | kinetic-rail"
    }
  ]
}

IMPORTANT: This is not a web-agency improvement pitch. Write customer-facing copy the input business could use as its official website. Do not mention web improvement, SEO, diagnostics, an agency, Paradigm, or Japan Entry. Generate exactly 3 features, 4 values, 3 services, and 4 process steps. Do not output FAQ or Contact. Generate exactly ${candidateCount} art_directions using the exact candidate template_ids below, with visibly different typography, hero, service, works, palette, density, motion, and motif choices. Never invent locations, dates, history, opening hours, third-party integrations, testimonials, customer claims, performance metrics, ingredients, taste, texture, preparation, reservation policy, contact channels, response times, or image provenance.

[Company-specific input — only this suffix varies per request]
- Company Name: ${name}
- Industry: ${industry}
- Location: ${prefecture || "N/A"}
- Domain: ${domain}
- Tech Stack: ${techSummary}
- Output Language: ${locale === "en" ? "Professional Business English" : locale}
- Layout Style: hero=${heroVariant}, features=${featureLayout}, cards=${cardStyle}, nav=${nav}

[Executable design candidates]
${candidateTemplates}

[Verified Public Facts]
${verifiedFacts}
Use only these verified facts. Do not invent missing facts.`;
}
