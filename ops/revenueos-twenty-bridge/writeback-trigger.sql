-- revenueos-twenty-bridge: writeback 側のイベント源。
-- sales_companies.pipeline_status が 'report_ready' に「遷移」した瞬間だけ NOTIFY を撃つ。
-- 既存の 'report_ready' 行の無関係な UPDATE では撃たない (OLD IS DISTINCT FROM で遷移のみ検出)。
-- ブリッジ (revenueos-twenty-bridge) が LISTEN twenty_writeback で受け、per-company writeback を叩く。
-- pg_net 等の HTTP 拡張は不要 (このDBには無い) — 通知だけ撃ち、HTTP はブリッジ側が担う。
-- 冪等: 再実行しても安全。

CREATE OR REPLACE FUNCTION public.notify_twenty_writeback()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.pipeline_status = 'report_ready'
     AND (TG_OP = 'INSERT' OR OLD.pipeline_status IS DISTINCT FROM NEW.pipeline_status) THEN
    PERFORM pg_notify('twenty_writeback', NEW.id::text);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_twenty_writeback ON public.sales_companies;
CREATE TRIGGER trg_twenty_writeback
  AFTER INSERT OR UPDATE OF pipeline_status ON public.sales_companies
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_twenty_writeback();
