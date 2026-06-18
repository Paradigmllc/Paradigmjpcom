/**
 * Dify Workflow: Demo Site JSON Generation
 * ==========================================
 *
 * このファイルは Dify ワークフローに注入するプロンプトと設定定義です。
 *
 * 使い方:
 * 1. Dify で新しい Chatflow ワークフローを作成
 * 2. 入力変数: diagnostic_report (JSON), company_profile (JSON)
 * 3. LLM ノードにこのプロンプトを System プロンプトとして設定
 * 4. 出力を Code ノードでバリデーション + Supabase API に POST
 *
 * 生成フロー:
 *   Sales OS → 診断レポート → Dify → JSONブループリント → Supabase → Astro SSR
 */

export const DIFY_SYSTEM_PROMPT = `あなたはプロのWeb制作ディレクター兼デザイナーです。
クライアント企業の診断レポートに基づいて、最高品質のWebサイト構成（JSONブループリント）を生成してください。

## 入力データ
{diagnostic_report} — 企業のPageSpeed・SEO・競合分析などの診断結果
{company_profile}   — 企業名・業種・地域・規模などの基本情報

## 出力フォーマット
以下の JSON スキーマに厳密に従って出力してください：

{
  "theme": "astrowind" | "screwfast" | "astroship",
  "blocks": [
    {
      "id": "一意のID",
      "type": "Widget名（Widgetカタログ参照）",
      "props": { Widget固有のプロパティ }
    }
  ],
  "meta": {
    "title": "ページタイトル",
    "description": "メタディスクリプション（120文字以内）",
    "industry": "業種コード",
    "locale": "ja" | "en",
    "accentColor": "#HEXカラー",
    "accentColorDark": "#HEXカラー",
    "accentColorLight": "#HEXカラー",
    "calBookingUrl": "https://cal.com/paradigm-jp/15min",
    "phone": "電話番号",
    "email": "メールアドレス",
    "address": "住所",
    "representative_name": "代表者名",
    "capital": "資本金",
    "established_date": "設立年月",
    "business_description": "事業内容",
    "return_policy": "返品ポリシー",
    "payment_methods": "支払方法"
  }
}

## テーマ選択基準
- astrowind: デジタルエージェンシー、SaaS、コンサル、会計、医療（モダン・洗練）
- screwfast: 建設、物流、製造、清掃、B2B（重厚・信頼感・エンタープライズ）
- astroship: 飲食、小売、美容、EC、ローカル店舗（親しみやすさ・シンプル）

## 必須Widget構成
以下の順序で最低6ブロックを含めてください：
1. Hero — ファーストインプレッション（企業名 + 診断結果の核心 + CTA）
2. Features — 改善施策3〜6項目
3. Stats — 診断指標（PageSpeedスコア / 推定損失額 / 改善余地 / SEOスコア）
4. CallToAction — 中間CTA（無料相談誘導）
5. Testimonials — 想定改善効果（業種別ベンチマーク）
6. CallToAction — 最終CTA

## 推奨追加Widget（企業規模・業種に応じて選択）
- Pricing — 料金プランがある場合（3ティア）
- FAQs — よくある質問（業種別FAQ）
- Steps — プロジェクトの流れ（4〜6ステップ）
- Brands — 取引先ロゴ・認証・パートナー
- Content — 詳細な説明が必要な場合
- Contact — 問い合わせフォーム

## コピー生成ルール
- 診断レポートの具体的な数値（PageSpeedスコア、推定損失額、検出課題数）を必ず盛り込む
- 業種固有の専門用語を適切に使用する
- 日本語の場合は「です・ます」調、英語の場合はプロフェッショナルなトーン
- Heroのタイトルは20〜30文字、サブタイトルは40〜60文字
- CTAテキストは「無料診断を申し込む」「今すぐ改善案を見る」など行動喚起型
- 誇大表現禁止（「日本一」「業界最高」などは使わない）
- 具体的な数字がある場合は必ず入れる（「PageSpeed 92点」「推定損失 月38万円」）

## カラー選定基準
- 医療系: 信頼の青系 (#0161ef, #0154cf, #6d28d9)
- 飲食系: 温かみのオレンジ系 (#f97316, #c2410c, #fdba74)
- 建設系: 安定の紺系 (#1e3a5f, #0f2440, #3b5d8a)
- 美容系: 華やかさのピンク系 (#ec4899, #be185d, #f9a8d4)
- コンサル系: 知性の紫系 (#7c3aed, #5b21b6, #a78bfa)
- デフォルト: #7c3aed, #5b21b6, #a78bfa

## 品質チェックリスト
- [ ] 全WidgetのtypeがWidgetカタログに存在するか
- [ ] 最初のブロックは必ずHero
- [ ] 最低1つのCTAが含まれているか
- [ ] 診断数値が最低1つ含まれているか
- [ ] 企業名がHeroに含まれているか
- [ ] calBookingUrlが設定されているか
- [ ] accentColorが業種に適しているか`

export const DIFY_OUTPUT_SCHEMA = {
  type: 'object',
  required: ['theme', 'blocks', 'meta'],
  properties: {
    theme: { type: 'string', enum: ['astrowind', 'screwfast', 'astroship'] },
    blocks: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'type', 'props'],
        properties: {
          id: { type: 'string' },
          type: { type: 'string' },
          props: { type: 'object' },
        },
      },
    },
    meta: {
      type: 'object',
      required: ['title', 'description', 'industry', 'locale'],
      properties: {
        title: { type: 'string' },
        description: { type: 'string', maxLength: 160 },
        industry: { type: 'string', enum: ['dental', 'restaurant', 'construction', 'consulting', 'retail', 'beauty_salon', 'accounting', 'cleaning'] },
        locale: { type: 'string', enum: ['ja', 'en'] },
        accentColor: { type: 'string', pattern: '^#[0-9a-fA-F]{6}$' },
        accentColorDark: { type: 'string', pattern: '^#[0-9a-fA-F]{6}$' },
        accentColorLight: { type: 'string', pattern: '^#[0-9a-fA-F]{6}$' },
        calBookingUrl: { type: 'string', format: 'uri' },
        company_name: { type: 'string' },
        phone: { type: 'string' },
        email: { type: 'string', format: 'email' },
        address: { type: 'string' },
        representative_name: { type: 'string' },
        capital: { type: 'string' },
        established_date: { type: 'string' },
        business_description: { type: 'string' },
        return_policy: { type: 'string' },
        payment_methods: { type: 'string' },
      },
    },
  },
}

/** Dify から叩く API エンドポイント仕様 */
export const DIFY_API_CONFIG = {
  endpoint: 'https://paradigmjp.com/api/demo-pages/{slug}',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-admin-secret': '${ADMIN_SCRIPT_SECRET}',
  },
  body: '${JSONブループリント}',
  successCode: 201,
  note: 'slug は企業ドメインから自動生成 (例: tokyo-sushi.example.com → tokyo-sushi-demo)',
}

/**
 * Dify ワークフロー構築手順（Code ノード用 TypeScript）
 *
 * 1. LLM ノードの出力をパース
 * 2. JSON スキーマでバリデーション
 * 3. Supabase に直接 upsert（または API 経由で POST）
 */
export const DIFY_CODE_NODE_SCRIPT = `
// Dify Code Node — JSONバリデーション + Supabase保存
const apiUrl = 'https://paradigmjp.com/api/demo-pages/' + slug;
const adminSecret = env.ADMIN_SCRIPT_SECRET;

// 1. LLMの出力をJSONとしてパース
const llmOutput = JSON.parse(llm.text);

// 2. スキーマバリデーション
if (!['astrowind', 'screwfast', 'astroship'].includes(llmOutput.theme)) {
  throw new Error('Invalid theme: ' + llmOutput.theme);
}
if (!llmOutput.blocks || !Array.isArray(llmOutput.blocks) || llmOutput.blocks.length < 4) {
  throw new Error('Minimum 4 blocks required');
}
const firstBlock = llmOutput.blocks[0];
if (firstBlock.type !== 'Hero' && !firstBlock.type.startsWith('Hero')) {
  throw new Error('First block must be Hero');
}

// 3. API に POST
const response = await fetch(apiUrl, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-admin-secret': adminSecret,
  },
  body: JSON.stringify(llmOutput),
});

if (response.ok) {
  return { success: true, demoUrl: 'https://demo.paradigmjp.com/demo/' + slug };
} else {
  const err = await response.json();
  throw new Error('API error: ' + (err.error || response.status));
}
`
