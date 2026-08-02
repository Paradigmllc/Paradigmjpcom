-- Tiny Shops of Japan / Shopify operations SSOT
-- Service-role only: the browser never talks to these tables directly.

CREATE TABLE IF NOT EXISTS public.shopify_ops_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku text NOT NULL UNIQUE,
  name text NOT NULL,
  category text NOT NULL,
  tier text NOT NULL DEFAULT 'a',
  status text NOT NULL DEFAULT 'candidate',
  is_hero boolean NOT NULL DEFAULT false,
  procurement_cost_jpy integer NOT NULL DEFAULT 0,
  domestic_shipping_jpy integer NOT NULL DEFAULT 0,
  price_usd numeric(10, 2) NOT NULL DEFAULT 0,
  weight_grams integer NOT NULL DEFAULT 0,
  inventory_on_hand integer NOT NULL DEFAULT 0,
  clip_target integer NOT NULL DEFAULT 20,
  clip_ready integer NOT NULL DEFAULT 0,
  photo_target integer NOT NULL DEFAULT 8,
  photo_ready integer NOT NULL DEFAULT 0,
  shopify_product_id text,
  shopify_handle text,
  supplier_url text,
  risk_flags text[] NOT NULL DEFAULT '{}',
  notes text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT shopify_ops_products_tier_check CHECK (tier IN ('s_plus', 's', 'a', 'b', 'c', 'd')),
  CONSTRAINT shopify_ops_products_status_check CHECK (status IN ('candidate', 'sourcing', 'sample_ready', 'listing_ready', 'live', 'paused', 'sold_out')),
  CONSTRAINT shopify_ops_products_cost_check CHECK (procurement_cost_jpy >= 0 AND domestic_shipping_jpy >= 0 AND price_usd >= 0),
  CONSTRAINT shopify_ops_products_inventory_check CHECK (inventory_on_hand >= 0),
  CONSTRAINT shopify_ops_products_asset_check CHECK (
    clip_target >= 0 AND clip_ready >= 0 AND clip_ready <= clip_target
    AND photo_target >= 0 AND photo_ready >= 0 AND photo_ready <= photo_target
  )
);

CREATE TABLE IF NOT EXISTS public.shopify_ops_content_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES public.shopify_ops_products (id) ON DELETE SET NULL,
  content_code text NOT NULL UNIQUE,
  platform text NOT NULL DEFAULT 'multi',
  content_type text NOT NULL,
  status text NOT NULL DEFAULT 'idea',
  locale text NOT NULL DEFAULT 'en',
  hook text NOT NULL,
  post_url text,
  utm_campaign text,
  video_views integer NOT NULL DEFAULT 0,
  profile_visits integer NOT NULL DEFAULT 0,
  link_clicks integer NOT NULL DEFAULT 0,
  orders_attributed integer NOT NULL DEFAULT 0,
  revenue_usd numeric(12, 2) NOT NULL DEFAULT 0,
  scheduled_for timestamptz,
  published_at timestamptz,
  error_message text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT shopify_ops_content_platform_check CHECK (platform IN ('multi', 'tiktok', 'instagram', 'youtube', 'pinterest')),
  CONSTRAINT shopify_ops_content_type_check CHECK (content_type IN ('discovery', 'product_demo', 'usage', 'gift', 'comparison', 'brand', 'shipping', 'ugc')),
  CONSTRAINT shopify_ops_content_status_check CHECK (status IN ('idea', 'scripted', 'filmed', 'edited', 'scheduled', 'published', 'blocked')),
  CONSTRAINT shopify_ops_content_metrics_check CHECK (
    video_views >= 0 AND profile_visits >= 0 AND link_clicks >= 0
    AND orders_attributed >= 0 AND revenue_usd >= 0
  )
);

CREATE TABLE IF NOT EXISTS public.shopify_ops_daily_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_date date NOT NULL UNIQUE,
  sessions integer NOT NULL DEFAULT 0,
  video_views integer NOT NULL DEFAULT 0,
  profile_visits integer NOT NULL DEFAULT 0,
  link_clicks integer NOT NULL DEFAULT 0,
  product_views integer NOT NULL DEFAULT 0,
  add_to_carts integer NOT NULL DEFAULT 0,
  checkouts integer NOT NULL DEFAULT 0,
  orders integer NOT NULL DEFAULT 0,
  revenue_usd numeric(12, 2) NOT NULL DEFAULT 0,
  variable_cost_jpy integer NOT NULL DEFAULT 0,
  returns_count integer NOT NULL DEFAULT 0,
  tiktok_followers integer NOT NULL DEFAULT 0,
  instagram_followers integer NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT shopify_ops_daily_metrics_nonnegative_check CHECK (
    sessions >= 0 AND video_views >= 0 AND profile_visits >= 0 AND link_clicks >= 0
    AND product_views >= 0 AND add_to_carts >= 0 AND checkouts >= 0 AND orders >= 0
    AND revenue_usd >= 0 AND variable_cost_jpy >= 0 AND returns_count >= 0
    AND tiktok_followers >= 0 AND instagram_followers >= 0
  )
);

CREATE INDEX IF NOT EXISTS idx_shopify_ops_products_status
  ON public.shopify_ops_products (is_hero DESC, status, sort_order);
CREATE INDEX IF NOT EXISTS idx_shopify_ops_content_status
  ON public.shopify_ops_content_items (status, scheduled_for, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_shopify_ops_content_product
  ON public.shopify_ops_content_items (product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_shopify_ops_metrics_date
  ON public.shopify_ops_daily_metrics (metric_date DESC);

INSERT INTO public.shopify_ops_products (
  sku, name, category, tier, is_hero, procurement_cost_jpy, domestic_shipping_jpy,
  price_usd, weight_grams, clip_target, photo_target, sort_order, risk_flags, notes
) VALUES
  ('TSJ-SEAL-001', 'カタカナ名前印＋書道カード', 'パーソナライズ', 's_plus', true, 4000, 500, 139, 120, 20, 8, 10, '{}', 'デジタル校正後に制作。カスタム品の返品条件を商品ページへ明記。'),
  ('TSJ-NAIL-001', '金箔・和柄ネイルチップ', 'ネイルチップ', 's_plus', true, 2200, 400, 79, 80, 20, 8, 20, '{"size_guide"}', '接着剤などの液体は同梱せず、サイズガイドを必須化。'),
  ('TSJ-MIZUHIKI-001', '水引ヘアアクセサリー', '水引・つまみ細工', 's', true, 3200, 500, 99, 100, 20, 8, 30, '{"metal_allergy"}', '金属素材、寸法、アレルギー注意を表示。'),
  ('TSJ-MINI-001', '食品サンプル・ミニチュア', 'ミニチュア', 's', true, 3500, 500, 119, 180, 20, 8, 40, '{"fragile"}', '供給量を確認し、Drop形式で販売上限を管理。'),
  ('TSJ-OBI-001', '一点物の帯カメラストラップ', '着物・帯リメイク', 's', true, 6500, 700, 169, 260, 20, 8, 50, '{}', 'One-of-One表記と素材由来の個体差を表示。'),
  ('TSJ-ART-001', '名前入り小型書画', 'パーソナライズ', 's_plus', true, 4500, 500, 159, 140, 20, 8, 60, '{}', '額縁なしで発送し、校正承認後に制作。'),
  ('TSJ-ZINE-001', '小型版画・ZINEセット', 'アート・文具', 's', false, 2500, 400, 79, 220, 15, 8, 70, '{}', '作家紹介カードを同梱。'),
  ('TSJ-TEA-001', '日本茶＋風呂敷ギフト', '日本茶・テキスタイル', 'a', false, 4200, 600, 127, 430, 15, 8, 80, '{"food_regulation","expiry"}', '販売国ごとの食品表示・輸入条件が確認できるまで公開しない。'),
  ('TSJ-WASHI-001', '和紙カードセット', 'カート追加', 's_plus', false, 400, 200, 12, 40, 8, 6, 90, '{}', '$120送料無料への追加購入商品。'),
  ('TSJ-WRAP-001', 'ギフトラッピング', 'カート追加', 's_plus', false, 500, 0, 15, 60, 8, 6, 100, '{}', '商品と同梱し単独販売しない。'),
  ('TSJ-MYSTERY-001', 'ミステリー・ミニアイテム', 'カート追加', 's', false, 900, 200, 29, 90, 10, 6, 110, '{}', 'カテゴリーと安全性を事前に固定。'),
  ('TSJ-STATIONERY-001', '和紙・スタンプ小物', 'カート追加', 's', false, 800, 200, 24, 100, 10, 6, 120, '{}', 'Hero商品のクロスセル用。')
ON CONFLICT (sku) DO NOTHING;

ALTER TABLE public.shopify_ops_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopify_ops_content_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopify_ops_daily_metrics ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.shopify_ops_products FROM anon, authenticated;
REVOKE ALL ON public.shopify_ops_content_items FROM anon, authenticated;
REVOKE ALL ON public.shopify_ops_daily_metrics FROM anon, authenticated;

DROP POLICY IF EXISTS shopify_ops_products_service_role_all ON public.shopify_ops_products;
CREATE POLICY shopify_ops_products_service_role_all
  ON public.shopify_ops_products FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS shopify_ops_content_service_role_all ON public.shopify_ops_content_items;
CREATE POLICY shopify_ops_content_service_role_all
  ON public.shopify_ops_content_items FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS shopify_ops_metrics_service_role_all ON public.shopify_ops_daily_metrics;
CREATE POLICY shopify_ops_metrics_service_role_all
  ON public.shopify_ops_daily_metrics FOR ALL TO service_role USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.shopify_ops_products TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shopify_ops_content_items TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shopify_ops_daily_metrics TO service_role;

NOTIFY pgrst, 'reload schema';
