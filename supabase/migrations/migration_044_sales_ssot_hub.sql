-- migration_044_sales_ssot_hub.sql
-- 完全自律型AIエージェンシー向け SSOT (Single Source of Truth) スキーマ

-- ==========================================
-- 1. 抽出・水源 (SearxNG + Wappalyzer CLI)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.agency_companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name TEXT NOT NULL,
    domain TEXT UNIQUE NOT NULL,
    industry TEXT,
    tech_stack JSONB DEFAULT '{}'::jsonb, -- Wappalyzerで抽出した技術スタック
    est_loss_mrr NUMERIC DEFAULT 0,       -- 損失推定額
    status TEXT DEFAULT 'new',            -- new, contacted, meeting, closed
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ==========================================
-- 2. Directus 資料 (Marp / Gotenberg)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.agency_presentations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.agency_companies(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    slide_content JSONB DEFAULT '{}'::jsonb, -- Directusで管理するスライド構成
    pdf_url TEXT,                            -- GotenbergからR2へ上がり、差し戻されたURL
    status TEXT DEFAULT 'draft',             -- draft, published
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ==========================================
-- 3. OpenMontage 動画 (HyperFrames / R2)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.agency_videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.agency_companies(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    workflow_json JSONB DEFAULT '{}'::jsonb, -- ComfyUI/OpenMontageへの送信指示
    video_url TEXT,                          -- 最終レンダリング済みのR2動画URL
    duration_sec INTEGER DEFAULT 0,
    status TEXT DEFAULT 'pending',           -- pending, rendering, completed, failed
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ==========================================
-- 4. Astro デモHP (Keystatic GUI)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.agency_demo_sites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.agency_companies(id) ON DELETE CASCADE,
    repo_url TEXT,                           -- デモ用GitHubリポジトリURL
    deployed_url TEXT,                       -- Vercel/Coolify等でのデプロイURL
    keystatic_data JSONB DEFAULT '{}'::jsonb,-- Keystaticで管理するコンテンツデータ
    status TEXT DEFAULT 'building',          -- building, deployed
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ==========================================
-- 5. Next.js レポート (Supabase Studio)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.agency_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.agency_companies(id) ON DELETE CASCADE,
    slug TEXT UNIQUE NOT NULL,               -- 共有用URLスラッグ
    metrics JSONB DEFAULT '{}'::jsonb,       -- 診断レポートのKPI・指標データ
    view_count INTEGER DEFAULT 0,
    total_view_time_sec INTEGER DEFAULT 0,   -- PostHog等で追跡した滞在時間
    status TEXT DEFAULT 'active',            -- active, archived
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ==========================================
-- Updated_at トリガーの設定
-- ==========================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_companies_updated_at BEFORE UPDATE ON public.agency_companies FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_presentations_updated_at BEFORE UPDATE ON public.agency_presentations FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_videos_updated_at BEFORE UPDATE ON public.agency_videos FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_demo_sites_updated_at BEFORE UPDATE ON public.agency_demo_sites FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_reports_updated_at BEFORE UPDATE ON public.agency_reports FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ==========================================
-- RLS (Row Level Security) の設定
-- ==========================================
ALTER TABLE public.agency_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_presentations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_demo_sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_reports ENABLE ROW LEVEL SECURITY;

-- All tables: Service Role (backend / Trigger.dev) full access
CREATE POLICY "Enable ALL for service_role on companies" ON public.agency_companies FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Enable ALL for service_role on presentations" ON public.agency_presentations FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Enable ALL for service_role on videos" ON public.agency_videos FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Enable ALL for service_role on demo_sites" ON public.agency_demo_sites FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Enable ALL for service_role on reports" ON public.agency_reports FOR ALL USING (auth.role() = 'service_role');

-- Reports are served through authenticated server APIs. Direct anon table access is forbidden.
REVOKE ALL ON public.agency_reports FROM PUBLIC, anon, authenticated;
