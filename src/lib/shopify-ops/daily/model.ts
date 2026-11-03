export const jobKinds = [
  "products",
  "inventory",
  "orders",
  "suppliers",
  "social",
] as const;
export type JobKind = (typeof jobKinds)[number];
export const jobLabels: Record<JobKind, string> = {
  products: "Medusa商品情報の確認",
  inventory: "Medusa在庫の確認",
  orders: "Medusa注文・発送状態の確認",
  suppliers: "仕入先ページ監視",
  social: "SNS予約・販促投稿",
};
export type DailyJob = {
  kind: JobKind;
  state: "pending" | "running" | "succeeded" | "blocked" | "failed";
  cursor: string | null;
  due_at: string;
  started_at: string | null;
  completed_at: string | null;
  last_success_at: string | null;
  attempts: number;
  summary: Record<string, unknown>;
  error_message: string | null;
};
export function jobNeedsAttention(job: DailyJob, now = Date.now()) {
  return (
    job.state === "failed" ||
    job.state === "blocked" ||
    (job.state === "running" &&
      !!job.started_at &&
      now - Date.parse(job.started_at) > 5 * 60_000) ||
    now - Date.parse(job.due_at) > 45 * 60_000
  );
}
export const businessCoverage = [
  {
    label: "仕入・商品／価格・在庫",
    detail:
      "Medusa変更通知＋定期取得。外部仕入先の正確な数量・発注は許諾済みAPI待ち。",
    tab: "medusa",
  },
  {
    label: "納品・入庫・検品",
    detail:
      "倉庫契約、納品先、SKUラベル、検品結果APIの接続待ち。実入庫を確認するまで販売在庫へ加算しません。",
    tab: "medusa",
  },
  {
    label: "同梱・梱包・国際発送",
    detail:
      "倉庫の公式API待ち。配送国・送料・輸出情報・梱包条件を確定します。",
    tab: "medusa",
  },
  {
    label: "追跡・配送遅延・返品",
    detail:
      "Medusaの注文・発送状態を取得。発送通知権限、配送会社の配達証跡、返品受付先が必要です。",
    tab: "medusa",
  },
  {
    label: "SNS・プロモーション",
    detail:
      "Medusa商品向けの公開設定・SNS認証待ち。旧Shopify向け投稿は停止。有料広告・割引の自動発行は未有効。",
    tab: "medusa",
  },
  {
    label: "問い合わせ・顧客対応",
    detail:
      "問い合わせ窓口・返品受付・対応方針の確認待ち。自動回答や返品承認は未接続。",
    tab: "medusa",
  },
  {
    label: "売上・広告効果・採算",
    detail:
      "UTM付き投稿導線。広告費、返品費用、実送料と分析サービスの実測連携待ち。仮説値を実績として扱いません。",
    tab: "medusa",
  },
  {
    label: "障害・期限切れ・復旧",
    detail:
      "実行ロック、継続カーソル、失敗・遅延の可視化。送信結果が不明な投稿は再送せず要確認に止めます。",
    tab: "daily",
  },
] as const;
