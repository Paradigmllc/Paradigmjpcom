-- ============================================================
-- migration_058_theme_demo_pages.sql
-- Date: 2026-06-18
-- Purpose: Theme-based demo page storage for Dify-driven Astro SSR.
--          Replaces the old web_demos / CF Pages pipeline.
--
-- Tables:
--   theme_demo_pages — JSON blueprint per demo slug
--     slug    TEXT PK       e.g. "tokyo-sushi-diagnostic"
--     theme   TEXT          'astrowind' | 'screwfast' | 'astroship'
--     blocks  JSONB         [{id, type, props}] — widget type = theme widget name
--     meta    JSONB         {title, description, industry, locale, accentColor, ...}
--     company_id UUID?      FK → sales_companies (nullable)
--     is_published BOOL     default true
--     created_at / updated_at TIMESTAMPTZ
--
-- RLS: anon can SELECT published pages; service_role manages all.
-- ============================================================

-- 1. Create table
CREATE TABLE IF NOT EXISTS public.theme_demo_pages (
  slug         TEXT PRIMARY KEY,
  theme        TEXT NOT NULL DEFAULT 'astrowind'
               CHECK (theme IN ('astrowind', 'screwfast', 'astroship')),
  title        TEXT,
  blocks       JSONB NOT NULL DEFAULT '[]'::jsonb,
  meta         JSONB NOT NULL DEFAULT '{}'::jsonb,
  company_id   UUID REFERENCES public.sales_companies(id) ON DELETE SET NULL,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Indexes
CREATE INDEX IF NOT EXISTS idx_theme_demo_pages_theme
  ON public.theme_demo_pages(theme);
CREATE INDEX IF NOT EXISTS idx_theme_demo_pages_company
  ON public.theme_demo_pages(company_id);
CREATE INDEX IF NOT EXISTS idx_theme_demo_pages_published
  ON public.theme_demo_pages(is_published)
  WHERE is_published = true;

-- 3. Auto-update updated_at
CREATE OR REPLACE FUNCTION public.theme_demo_pages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_theme_demo_pages_updated_at ON public.theme_demo_pages;
CREATE TRIGGER trg_theme_demo_pages_updated_at
  BEFORE UPDATE ON public.theme_demo_pages
  FOR EACH ROW EXECUTE FUNCTION public.theme_demo_pages_updated_at();

-- 4. RLS — enable
ALTER TABLE public.theme_demo_pages ENABLE ROW LEVEL SECURITY;

-- anon: read published pages only
DROP POLICY IF EXISTS "anon_select_published" ON public.theme_demo_pages;
CREATE POLICY "anon_select_published" ON public.theme_demo_pages
  FOR SELECT USING (is_published = true);

-- service_role: full access (handled by Supabase service key, no policy needed
-- but we add explicit ALL for safety)
DROP POLICY IF EXISTS "service_all" ON public.theme_demo_pages;
CREATE POLICY "service_all" ON public.theme_demo_pages
  FOR ALL USING (true)
  WITH CHECK (true);

-- 5. Seed sample with AstroWind template (for testing / gallery)
INSERT INTO public.theme_demo_pages (slug, theme, title, blocks, meta, is_published)
VALUES (
  'sample-consulting-diagnostic',
  'astrowind',
  'Strategy Lab Inc. — 改善デモ',
  '[
    {"id":"hero-1","type":"Hero","props":{"title":"データが証明する Web 改善の新基準","subtitle":"御社の公開データを解析し、集客力を最大化する構成で再設計しました。","tagline":"データ診断済み · 改善提案","actions":[{"variant":"primary","text":"無料診断を申し込む","href":"https://cal.com/paradigm-jp/15min"},{"variant":"secondary","text":"詳細を見る","href":"#features"}]}},
    {"id":"features-1","type":"Features","props":{"title":"改善ソリューション","subtitle":"コンサルティングの特性に合わせた最適プラン","items":[{"title":"SEO/MEO対策","description":"検索流入を最大化し、競合より先に選ばれる仕組みを構築","icon":"tabler:search"},{"title":"Webサイト刷新","description":"ファーストビューから問い合わせまで、離脱率を最小化する導線設計","icon":"tabler:palette"},{"title":"データ分析基盤","description":"Google Analytics 4 と Search Console の統合ダッシュボード","icon":"tabler:chart-bar"}]}},
    {"id":"stats-1","type":"Stats","props":{"title":"改善シミュレーション","subtitle":"同業他社での改善実績に基づく想定インパクト","stats":[{"amount":"2.4","title":"問合せ増加倍率","icon":"tabler:trending-up"},{"amount":92,"title":"PageSpeed スコア","icon":"tabler:bolt"},{"amount":"38","title":"CVR 改善率 (%)","icon":"tabler:chart-pie"},{"amount":"3","title":"主要KW 順位","icon":"tabler:search"}]}},
    {"id":"testimonials-1","type":"Testimonials","props":{"title":"導入事例","subtitle":"データドリブンな改善で成果を出した企業様の声","testimonials":[{"title":"問合せ数が3倍に","testimonial":"サイトをリニューアルしてから3ヶ月で問い合わせが3倍に増加。投資回収も3ヶ月と想定以上に早かったです。","name":"A社 代表取締役","job":"CEO"},{"title":"SEO順位が大幅改善","testimonial":"主要キーワードで1ページ目にランクイン。毎月の安定した流入が得られるようになりました。","name":"B社 マーケティング部長","job":"Marketing Director"}]}},
    {"id":"faqs-1","type":"FAQs","props":{"title":"よくあるご質問","items":[{"title":"どのくらいの期間で完成しますか？","description":"診断から改善案提示まで3営業日。実装は規模により4〜8週間です。"},{"title":"費用の目安を教えてください","description":"業界・規模によって異なりますが、Web制作は50万円〜、SEO/MEOは月5万円〜が目安です。"},{"title":"すでにサイトがあるのですが改修できますか？","description":"可能です。既存サイトの診断から開始し、必要な改修範囲を特定してご提案します。"}]}},
    {"id":"cta-1","type":"CallToAction","props":{"title":"まずは無料診断から","subtitle":"15分のオンライン診断で改善余地を可視化します","callToAction":{"variant":"primary","text":"無料診断を申し込む","href":"https://cal.com/paradigm-jp/15min"}}}
  ]'::jsonb,
  '{
    "title": "Strategy Lab Inc. — 改善デモサイト",
    "description": "15分の無料Web診断に基づく改善提案デモ",
    "industry": "consulting",
    "appeal": "diagnostic",
    "locale": "ja",
    "accentColor": "#7c3aed",
    "accentColorDark": "#5b21b6",
    "accentColorLight": "#a78bfa",
    "calBookingUrl": "https://cal.com/paradigm-jp/15min",
    "generator": "manual_seed"
  }'::jsonb,
  true
) ON CONFLICT (slug) DO NOTHING;
