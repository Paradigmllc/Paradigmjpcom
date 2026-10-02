const links = [
  [
    "注文・出荷・返品",
    "注文の支払状況、配送、追跡番号、返品受付をShopifyで管理します。",
    "orders",
  ],
  [
    "配送と配達",
    "配送地域、送料、配送元、出荷ルールを確認します。",
    "settings/shipping",
  ],
  [
    "海外販売の設定",
    "販売対象国・通貨・ドメインをMarketsで管理します。",
    "markets",
  ],
  [
    "商品と在庫",
    "公開済み商品、バリエーション、ロケーション別在庫を確認します。",
    "products",
  ],
] as const;
export function ShopifyOperationsLinks() {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">日々の運営</h2>
        <p className="mt-2 text-sm text-zinc-600">
          注文や配送の正本はShopifyです。倉庫アプリを接続するまでは、注文を自動出荷済みに変更しません。
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {links.map(([title, text, path]) => (
          <a
            key={path}
            href={`https://admin.shopify.com/store/g2d5th-zr/${path}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-xl border border-zinc-200 bg-white p-5 hover:border-emerald-800 focus-visible:outline-2"
          >
            <h3 className="font-bold">{title} ↗</h3>
            <p className="mt-2 text-sm leading-relaxed text-zinc-600">{text}</p>
          </a>
        ))}
      </div>
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
        <h3 className="font-bold">接続前に必要な情報</h3>
        <p className="mt-2 text-sm leading-relaxed">
          倉庫契約・入庫先・SKUラベル・検品条件・返品受入先を確定し、契約済み倉庫のShopify連携アプリまたはAPIを接続します。APIキーや個人住所はこの画面に入力しないでください。
        </p>
      </div>
    </section>
  );
}
