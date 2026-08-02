BEGIN;

CREATE TABLE IF NOT EXISTS public.content_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND length(slug) <= 120),
  locale text NOT NULL CHECK (locale IN ('ja', 'en')),
  title text NOT NULL CHECK (length(title) BETWEEN 1 AND 240),
  summary text NOT NULL CHECK (length(summary) BETWEEN 1 AND 1000),
  content_type text NOT NULL CHECK (content_type IN ('decision_packet', 'dataset', 'report')),
  access_model text NOT NULL DEFAULT 'x402' CHECK (access_model IN ('free', 'x402')),
  price_usdc numeric(12, 6) NOT NULL DEFAULT 0 CHECK (
    (access_model = 'free' AND price_usdc = 0)
    OR (access_model = 'x402' AND price_usdc > 0)
  ),
  network text NOT NULL DEFAULT 'eip155:8453',
  preview jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(preview) = 'object'),
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
  source_url text,
  license text NOT NULL DEFAULT 'Single-request internal-use license; redistribution prohibited.',
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  is_active boolean NOT NULL DEFAULT false,
  published_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (slug, locale)
);

CREATE INDEX IF NOT EXISTS content_products_active_locale_idx
  ON public.content_products (locale, published_at DESC)
  WHERE is_active = true;

CREATE TABLE IF NOT EXISTS public.content_access_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL,
  product_id uuid REFERENCES public.content_products(id) ON DELETE SET NULL,
  product_slug text,
  locale text NOT NULL CHECK (locale IN ('ja', 'en')),
  access_channel text NOT NULL CHECK (access_channel IN ('catalog', 'public_api', 'x402')),
  outcome text NOT NULL CHECK (outcome IN ('served', 'payment_required', 'paid', 'not_found', 'unavailable', 'error')),
  http_status integer NOT NULL CHECK (http_status BETWEEN 100 AND 599),
  price_usdc numeric(12, 6),
  network text,
  payment_reference text CHECK (payment_reference IS NULL OR payment_reference ~ '^[a-f0-9]{64}$'),
  client_ip_hash text CHECK (client_ip_hash IS NULL OR client_ip_hash ~ '^[a-f0-9]{64}$'),
  user_agent text CHECK (user_agent IS NULL OR length(user_agent) <= 300),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS content_access_events_product_created_idx
  ON public.content_access_events (product_slug, created_at DESC);

CREATE INDEX IF NOT EXISTS content_access_events_paid_created_idx
  ON public.content_access_events (created_at DESC)
  WHERE outcome = 'paid';

CREATE INDEX IF NOT EXISTS content_access_events_payment_reference_idx
  ON public.content_access_events (payment_reference)
  WHERE payment_reference IS NOT NULL;

ALTER TABLE public.content_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_access_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_products FORCE ROW LEVEL SECURITY;
ALTER TABLE public.content_access_events FORCE ROW LEVEL SECURITY;

REVOKE ALL ON public.content_products FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.content_access_events FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.content_products TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.content_access_events TO service_role;

DROP POLICY IF EXISTS paradigm_service_role_all ON public.content_products;
CREATE POLICY paradigm_service_role_all
  ON public.content_products
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS paradigm_service_role_all ON public.content_access_events;
CREATE POLICY paradigm_service_role_all
  ON public.content_access_events
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

INSERT INTO public.content_products (
  slug,
  locale,
  title,
  summary,
  content_type,
  access_model,
  price_usdc,
  network,
  preview,
  payload,
  source_url,
  license,
  version,
  is_active,
  published_at,
  updated_at
)
VALUES
  (
    'japan-market-entry-decision-packet',
    'en',
    'Japan Market Entry Decision Packet',
    'A machine-readable go, revise or stop framework for foreign consumer brands evaluating Japan.',
    'decision_packet',
    'x402',
    0.25,
    'eip155:8453',
    '{"schemaVersion":"1.0","intendedFor":["D2C brands","consumer manufacturers","AI research agents"],"sections":["demand","compliance","unit economics","channel fit","decision gates"]}'::jsonb,
    '{"schemaVersion":"1.0","decision":"validate_before_launch","requiredInputs":["product category","target retail price","landed cost","gross margin target","current export markets"],"decisionGates":[{"id":"demand","question":"Is there evidence of category demand at the intended price point?","minimumEvidence":["three comparable products","two active channels","one repeat-purchase signal"]},{"id":"compliance","question":"Can the product be imported, labeled and advertised without a blocking claim?","minimumEvidence":["HS classification","applicable standards","label and claims review"]},{"id":"economics","question":"Does contribution margin survive duties, fulfillment, returns, payment and channel fees?","minimumEvidence":["landed cost model","channel fee model","returns scenario"]},{"id":"operations","question":"Can support, returns and inventory be operated in Japanese from launch?","minimumEvidence":["support owner","returns address","inventory plan"]}],"recommendedFirstProduct":{"name":"Paid Market Validation","durationWeeks":"1-2","outputs":["go-revise-stop recommendation","comparable price map","compliance risk list","channel shortlist","12-month unit economics"]},"outcomeDefinitions":{"go":"No unresolved blocking compliance issue and base-case contribution margin is positive.","revise":"Demand exists but price, claims, channel or operating design must change before launch.","stop":"A blocking compliance issue or persistently negative unit economics remains."},"nextActions":["collect evidence for every gate","run downside unit economics","approve a paid validation scope before launch build"]}'::jsonb,
    'https://paradigmjp.com/en/japan-opportunities/enter-and-operate-japan',
    'Single-request internal-use license; redistribution prohibited.',
    1,
    true,
    '2026-08-02T00:00:00Z',
    '2026-08-02T00:00:00Z'
  ),
  (
    'japan-asset-evaluation-decision-packet',
    'en',
    'Japan Asset Evaluation Decision Packet',
    'A structured screen for Japanese real assets covering costs, net yield, downside and execution risk.',
    'decision_packet',
    'x402',
    0.25,
    'eip155:8453',
    '{"schemaVersion":"1.0","intendedFor":["global investors","family offices","property research agents"],"sections":["acquisition costs","net yield","downside","liquidity","local execution"]}'::jsonb,
    '{"schemaVersion":"1.0","scope":"decision support only; not personalized investment advice","requiredInputs":["asset type","location","purchase price","financing assumptions","expected rent or revenue","holding period"],"costStack":["purchase price","brokerage","registration and license tax","real estate acquisition tax","judicial scrivener","due diligence","financing fees","initial repairs","currency conversion"],"returnModel":{"requiredOutputs":["gross yield","net operating income","unlevered net yield","levered cash-on-cash return","break-even occupancy","exit proceeds after costs"],"scenarios":["base","revenue minus 15 percent","costs plus 20 percent","yen moves 10 percent against base currency"]},"riskChecks":[{"id":"title","evidence":"title, encumbrance and boundary review"},{"id":"physical","evidence":"inspection, seismic and capex review"},{"id":"operations","evidence":"operator, management and maintenance assumptions"},{"id":"liquidity","evidence":"comparable transactions and buyer depth"},{"id":"regulatory","evidence":"zoning, licensing and foreign-owner procedures"}],"decisionRules":{"advance":"Net yield and downside remain inside the buyer mandate with no unresolved title or regulatory blocker.","reprice":"The asset is viable only below a stated purchase price or after a defined capex adjustment.","decline":"Title, compliance, physical risk or exit liquidity cannot be resolved within the mandate."},"licensedExecution":"Brokerage, legal, tax and regulated procedures must be handled by appropriately licensed partners."}'::jsonb,
    'https://paradigmjp.com/en/japan-opportunities/capital-in-japan',
    'Single-request internal-use license; redistribution prohibited. Not investment advice.',
    1,
    true,
    '2026-08-02T00:00:00Z',
    '2026-08-02T00:00:00Z'
  ),
  (
    'japan-supplier-qualification-decision-packet',
    'en',
    'Japan Supplier Qualification Decision Packet',
    'A comparable evidence model for screening Japanese suppliers before an RFQ or introduction.',
    'decision_packet',
    'x402',
    0.25,
    'eip155:8453',
    '{"schemaVersion":"1.0","intendedFor":["procurement teams","manufacturers","sourcing agents"],"sections":["capability","quality","capacity","commercial fit","export readiness"]}'::jsonb,
    '{"schemaVersion":"1.0","requiredBuyerInputs":["part or product specification","material","annual volume","target price","required certifications","delivery country","target timeline"],"qualificationFields":[{"field":"capability","evidence":["process list","equipment list","sample or reference product"]},{"field":"quality","evidence":["certificates","inspection process","traceability method"]},{"field":"capacity","evidence":["current utilization","minimum order quantity","lead time"]},{"field":"commercial","evidence":["quotation basis","tooling cost","payment terms","incoterms"]},{"field":"exportReadiness","evidence":["export markets","English contact","packing and documentation capability"]}],"scorecard":{"weights":{"capability":30,"quality":25,"capacity":15,"commercial":15,"exportReadiness":15},"rules":{"shortlist":"75 or above with no missing mandatory certificate","clarify":"55 to 74 or one evidence gap that can be resolved","reject":"below 55, a mandatory certification gap, or an unverified capability claim"}},"rfqMinimum":["drawing or specification revision","forecast and order bands","inspection standard","target delivery term","quotation deadline"],"introductionGate":"Do not introduce the buyer and supplier until capability, contact authority and the buyer requirement are confirmed."}'::jsonb,
    'https://paradigmjp.com/en/japan-opportunities/source-from-japan',
    'Single-request internal-use license; redistribution prohibited.',
    1,
    true,
    '2026-08-02T00:00:00Z',
    '2026-08-02T00:00:00Z'
  ),
  (
    'japan-market-entry-decision-packet',
    'ja',
    '日本市場参入 Decision Packet',
    '海外消費者ブランドが日本参入を判断するための、go・修正・中止を機械判定しやすい構造化フレーム。',
    'decision_packet',
    'x402',
    0.25,
    'eip155:8453',
    '{"schemaVersion":"1.0","intendedFor":["海外D2Cブランド","消費財メーカー","AIリサーチエージェント"],"sections":["需要","規制","ユニットエコノミクス","チャネル適合","判断ゲート"]}'::jsonb,
    '{"schemaVersion":"1.0","decision":"launch前に有料検証","requiredInputs":["商品カテゴリ","想定小売価格","着地原価","粗利目標","既存輸出国"],"decisionGates":[{"id":"demand","question":"想定価格帯にカテゴリ需要の根拠があるか","minimumEvidence":["比較商品3件","稼働チャネル2件","リピート需要シグナル1件"]},{"id":"compliance","question":"輸入・表示・広告表現に重大な阻害要因がないか","minimumEvidence":["HS分類","適用規格","表示・クレーム確認"]},{"id":"economics","question":"関税・物流・返品・決済・チャネル費用後も限界利益が残るか","minimumEvidence":["着地原価モデル","チャネル費用モデル","返品シナリオ"]},{"id":"operations","question":"日本語CS・返品・在庫を開始時点から運用できるか","minimumEvidence":["CS責任者","返品先","在庫計画"]}],"recommendedFirstProduct":{"name":"有料市場検証","durationWeeks":"1-2","outputs":["go・修正・中止判定","比較価格マップ","規制リスク一覧","チャネル候補","12か月ユニットエコノミクス"]},"outcomeDefinitions":{"go":"未解決の重大規制課題がなく、基本ケースの限界利益が正。","revise":"需要はあるが価格・表現・チャネル・運用設計の変更が必要。","stop":"重大な規制課題または継続的な赤字構造が残る。"},"nextActions":["各ゲートの根拠収集","下振れユニットエコノミクス","launch構築前に有料検証範囲を承認"]}'::jsonb,
    'https://paradigmjp.com/ja/japan-opportunities/enter-and-operate-japan',
    '1リクエスト・社内判断用途のライセンス。再配布禁止。',
    1,
    true,
    '2026-08-02T00:00:00Z',
    '2026-08-02T00:00:00Z'
  ),
  (
    'japan-asset-evaluation-decision-packet',
    'ja',
    '日本資産評価 Decision Packet',
    '取得費用・ネット利回り・下振れ・流動性・実行リスクを構造化した、日本の実物資産一次評価フレーム。',
    'decision_packet',
    'x402',
    0.25,
    'eip155:8453',
    '{"schemaVersion":"1.0","intendedFor":["海外投資家","ファミリーオフィス","資産調査エージェント"],"sections":["取得費用","ネット利回り","下振れ","流動性","現地実行"]}'::jsonb,
    '{"schemaVersion":"1.0","scope":"意思決定支援であり個別投資助言ではない","requiredInputs":["資産種別","所在地","取得価格","資金調達前提","想定賃料または売上","保有期間"],"costStack":["取得価格","仲介手数料","登録免許税","不動産取得税","司法書士","デューデリジェンス","融資費用","初期修繕","為替転換"],"returnModel":{"requiredOutputs":["表面利回り","NOI","アンレバードネット利回り","レバレッジ後キャッシュ利回り","損益分岐稼働率","売却費用控除後手取"],"scenarios":["基本","売上15パーセント減","費用20パーセント増","円が基準通貨に対して10パーセント変動"]},"riskChecks":[{"id":"title","evidence":"権利・担保・境界確認"},{"id":"physical","evidence":"建物調査・耐震・修繕計画"},{"id":"operations","evidence":"運営者・管理・保守前提"},{"id":"liquidity","evidence":"成約事例と買い手層"},{"id":"regulatory","evidence":"用途・許認可・海外所有手続"}],"decisionRules":{"advance":"ネット利回りと下振れが投資方針内で、権利・規制の未解決重大課題がない。","reprice":"明示した価格以下または特定修繕後のみ成立。","decline":"権利・規制・物理・出口流動性の課題を方針内で解消できない。"},"licensedExecution":"仲介・法務・税務・規制対象手続は適切な免許・資格を持つ提携先が担当する。"}'::jsonb,
    'https://paradigmjp.com/ja/japan-opportunities/capital-in-japan',
    '1リクエスト・社内判断用途のライセンス。再配布禁止。投資助言ではありません。',
    1,
    true,
    '2026-08-02T00:00:00Z',
    '2026-08-02T00:00:00Z'
  ),
  (
    'japan-supplier-qualification-decision-packet',
    'ja',
    '日本サプライヤー適格性 Decision Packet',
    'RFQや紹介前に日本企業の能力・品質・供給力・商流・輸出対応を比較する構造化エビデンスモデル。',
    'decision_packet',
    'x402',
    0.25,
    'eip155:8453',
    '{"schemaVersion":"1.0","intendedFor":["調達部門","海外メーカー","ソーシングエージェント"],"sections":["能力","品質","供給力","商流適合","輸出対応"]}'::jsonb,
    '{"schemaVersion":"1.0","requiredBuyerInputs":["部品または商品仕様","素材","年間数量","目標価格","必要認証","納入国","希望時期"],"qualificationFields":[{"field":"capability","evidence":["加工工程一覧","設備一覧","サンプルまたは実績品"]},{"field":"quality","evidence":["認証書","検査工程","トレーサビリティ方法"]},{"field":"capacity","evidence":["現行稼働率","MOQ","リードタイム"]},{"field":"commercial","evidence":["見積条件","金型費","支払条件","インコタームズ"]},{"field":"exportReadiness","evidence":["輸出国","英語窓口","梱包・書類対応"]}],"scorecard":{"weights":{"capability":30,"quality":25,"capacity":15,"commercial":15,"exportReadiness":15},"rules":{"shortlist":"75点以上かつ必須認証の欠落なし","clarify":"55から74点、または解消可能な根拠不足1件","reject":"55点未満、必須認証不足、能力主張の未検証"}},"rfqMinimum":["図面または仕様改訂番号","需要予測と発注帯","検査基準","希望納入条件","見積期限"],"introductionGate":"能力・連絡権限・買い手要件が確認できるまで紹介しない。"}'::jsonb,
    'https://paradigmjp.com/ja/japan-opportunities/source-from-japan',
    '1リクエスト・社内判断用途のライセンス。再配布禁止。',
    1,
    true,
    '2026-08-02T00:00:00Z',
    '2026-08-02T00:00:00Z'
  )
ON CONFLICT (slug, locale) DO UPDATE SET
  title = EXCLUDED.title,
  summary = EXCLUDED.summary,
  content_type = EXCLUDED.content_type,
  access_model = EXCLUDED.access_model,
  price_usdc = EXCLUDED.price_usdc,
  network = EXCLUDED.network,
  preview = EXCLUDED.preview,
  payload = EXCLUDED.payload,
  source_url = EXCLUDED.source_url,
  license = EXCLUDED.license,
  version = EXCLUDED.version,
  is_active = EXCLUDED.is_active,
  published_at = EXCLUDED.published_at,
  updated_at = EXCLUDED.updated_at;

COMMENT ON TABLE public.content_products IS
  'Versioned API content products. Public clients never read this table directly; the Next.js Content API is the only delivery surface.';

COMMENT ON TABLE public.content_access_events IS
  'Privacy-minimized Content API and x402 access ledger. Raw IP addresses and payment signatures are never stored.';

COMMIT;
