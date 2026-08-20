-- revenueos-twenty-bridge: pull 側のイベント源 (Twenty DB 内)。
-- Twenty で company が追加/編集/削除された瞬間、pg_notify('twenty_pull', <id>) を撃つ。
-- ブリッジ (revenueos-twenty-bridge) が Twenty DB を LISTEN twenty_pull で待受け、debounce して
-- RevenueOS の pull を1回叩く。Twenty の native webhook が raw-insert を配送しないため DB event で代替。
--
-- 関数は public に置く (Twenty のマイグレーションは workspace スキーマを触るが public は不変)。
-- トリガーだけは company テーブルに付くため、万一テーブル再構築で外れても:
--   ① ブリッジ起動時 reconcile が full pull で取りこぼしを回収 ② 本SQLを再適用すれば復旧。
-- 冪等: 再実行しても安全。

CREATE OR REPLACE FUNCTION public.notify_revenueos_pull()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM pg_notify('twenty_pull', COALESCE(NEW.id, OLD.id)::text);
  RETURN NULL;  -- AFTER トリガーなので戻り値は無視される
END;
$$;

DROP TRIGGER IF EXISTS trg_revenueos_pull ON workspace_9kspo1xh6b9m9zcgmzj6c34k6.company;
CREATE TRIGGER trg_revenueos_pull
  AFTER INSERT OR UPDATE OR DELETE ON workspace_9kspo1xh6b9m9zcgmzj6c34k6.company
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_revenueos_pull();
