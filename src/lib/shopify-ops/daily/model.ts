export const jobKinds = [
  "products",
  "inventory",
  "orders",
  "suppliers",
  "social",
] as const;
export type JobKind = (typeof jobKinds)[number];
export const jobLabels: Record<JobKind, string> = {
  products: "商品情報の再照合",
  inventory: "Shopify在庫の再照合",
  orders: "注文・発送の再照合",
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
      "Shopify通知＋定期再照合。外部仕入先の正確な数量・発注は許諾済みAPI待ち。",
    tab: "suppliers",
  },
  {
    label: "納品・入庫・検品",
    detail:
      "倉庫契約、納品先、SKUラベル、検品結果APIの接続待ち。実入庫を確認するまで販売在庫へ加算しません。",
    tab: "operations",
  },
  {
    label: "同梱・梱包・国際発送",
    detail:
      "倉庫の公式Shopify連携／API待ち。配送国・送料・輸出情報・梱包条件を確定します。",
    tab: "operations",
  },
  {
    label: "追跡・配送遅延・返品",
    detail:
      "Shopifyの注文・発送を照合。発送通知権限、配送会社の配達証跡、返品受付先が必要です。",
    tab: "operations",
  },
  {
    label: "SNS・プロモーション",
    detail:
      "英語投稿の予約、公開前の商品再確認、重複投稿防止。SNS認証設定待ち。有料広告・割引の自動発行は未有効。",
    tab: "content",
  },
  {
    label: "問い合わせ・顧客対応",
    detail:
      "商品別問い合わせフォームあり。自動回答／返品承認は窓口と対応方針の接続待ち。",
    tab: "operations",
  },
  {
    label: "売上・広告効果・採算",
    detail:
      "UTM付き投稿導線。広告費、返品費用、実送料と分析サービスの実測連携待ち。仮説値を実績として扱いません。",
    tab: "metrics",
  },
  {
    label: "障害・期限切れ・復旧",
    detail:
      "実行ロック、継続カーソル、失敗・遅延の可視化。送信結果が不明な投稿は再送せず要確認に止めます。",
    tab: "daily",
  },
] as const;
