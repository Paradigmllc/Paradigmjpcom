import { ArrowRight, BellRing, Check, CircleDollarSign, FileSpreadsheet, History, LockKeyhole, ShieldCheck, Sparkles, Users } from "lucide-react"
import { QuoteRecoveryContractLink } from "@/components/quote-recovery/QuoteRecoveryContractLink"

const plans = [
  { name: "Starter", price: "29,800", seats: "3名", rows: "月2,000件", emphasis: false, description: "小規模な営業チームの見積フォローを標準化" },
  { name: "Team", price: "49,800", seats: "10名", rows: "月10,000件", emphasis: true, description: "複数担当者・拠点で回収状況を共有" },
] as const

const faqs = [
  ["既存の販売管理システムを入れ替える必要がありますか？", "ありません。現在のシステムから見積CSVを出力し、Quote Recoveryへ取り込むだけで始められます。"],
  ["無料トライアルはありますか？", "ありません。診断機能は無料で利用できますが、データ保存とチーム運用は月額契約開始後に利用できます。"],
  ["どの列が必要ですか？", "見積番号、顧客名、見積日、見積金額の4列が必須です。担当者、最終接触日、次回アクション日、ステータスも取り込めます。"],
  ["契約期間と解約方法を教えてください。", "月単位の契約です。Stripeの請求ポータルから支払い方法の変更や解約予約を行えます。"],
  ["データは他社から見えませんか？", "組織単位でデータを分離し、サーバー側の認可とデータベースRLSで他組織からの参照を拒否します。"],
] as const

export function QuoteRecoveryProductPreview() {
  return (
    <section id="product" className="scroll-mt-24 bg-slate-950 px-5 py-20 text-white sm:px-8 lg:py-28">
      <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.72fr_1.28fr] lg:items-center">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-300">Daily workspace</p>
          <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">今日追うべき見積が、開いた瞬間に分かる。</h2>
          <p className="mt-5 text-sm leading-7 text-slate-300">金額・経過日数・次回予定・担当設定から優先度を説明付きで算出。担当者の勘だけに頼らず、チームで同じ順番に動けます。</p>
          <ul className="mt-7 space-y-4 text-sm text-slate-200">
            {[
              [FileSpreadsheet, "既存CSVを取り込み、同じ見積番号は更新"],
              [BellRing, "放置・次回予定なしを通知"],
              [History, "電話・メール・商談・メモを履歴化"],
              [Users, "担当・権限・利用上限を組織で管理"],
            ].map(([Icon, label]) => { const ItemIcon = Icon as typeof FileSpreadsheet; return <li key={String(label)} className="flex items-center gap-3"><span className="flex size-9 items-center justify-center rounded-xl bg-white/10"><ItemIcon className="size-4 text-violet-300" aria-hidden="true" /></span>{String(label)}</li> })}
          </ul>
        </div>
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-slate-900 shadow-2xl">
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4"><div><p className="text-xs text-slate-400">Quote Recovery</p><p className="mt-1 font-bold">回収状況</p></div><span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-bold text-emerald-300">Starter・契約中</span></div>
          <div className="grid gap-3 p-5 sm:grid-cols-3">
            {[["回収優先金額", "¥18,420,000", "8件が要対応"], ["次回予定なし", "12件", "フォロー漏れ候補"], ["今月の取込", "684件", "3回"]].map(([label, value, note]) => <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"><p className="text-xs text-slate-400">{label}</p><p className="mt-3 text-xl font-bold">{value}</p><p className="mt-2 text-xs text-slate-400">{note}</p></div>)}
          </div>
          <div className="mx-5 mb-5 overflow-hidden rounded-2xl border border-white/10">
            <div className="grid grid-cols-[56px_1fr_auto] gap-3 bg-white/[0.06] px-4 py-3 text-xs text-slate-400"><span>優先度</span><span>顧客 / 見積番号</span><span>金額</span></div>
            {[["緊急", "北陸パーツ工業 / Q-2403", "¥8,200,000"], ["優先", "東都精機株式会社 / Q-2401", "¥4,800,000"], ["優先", "中央オートメーション / Q-2405", "¥3,100,000"]].map(([priority, customer, amount], index) => <div key={customer} className="grid grid-cols-[56px_1fr_auto] items-center gap-3 border-t border-white/10 px-4 py-4 text-sm"><span className={`rounded-full px-2 py-1 text-center text-[11px] font-bold ${index === 0 ? "bg-rose-400/10 text-rose-300" : "bg-amber-400/10 text-amber-300"}`}>{priority}</span><span className="truncate font-semibold">{customer}</span><span className="font-bold">{amount}</span></div>)}
          </div>
        </div>
      </div>
    </section>
  )
}

export function QuoteRecoveryCommercialSections() {
  return (
    <>
      <section id="workflow" className="scroll-mt-24 px-5 py-20 sm:px-8 lg:py-28">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl"><p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-600">Start in three steps</p><h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">システム改修なしで、今日から運用開始。</h2></div>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {[["01", "CSVを出力", "Excel・kintone・販売管理システムから、見積一覧をCSVで出力します。"], ["02", "取込前に確認", "読込件数とエラーを確認してから保存。同じ見積番号は最新内容へ更新します。"], ["03", "優先順にフォロー", "緊急・優先案件から連絡し、担当・次回予定・活動履歴を残します。"]].map(([number, title, text]) => <article key={number} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><span className="text-sm font-bold text-violet-600">{number}</span><h3 className="mt-7 text-xl font-bold">{title}</h3><p className="mt-3 text-sm leading-7 text-slate-600">{text}</p></article>)}
          </div>
        </div>
      </section>

      <section className="bg-slate-50 px-5 py-20 sm:px-8 lg:py-28">
        <div className="mx-auto max-w-6xl">
          <div className="text-center"><p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-600">From spreadsheet to action</p><h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">Excel管理を残したまま、フォロー漏れだけを減らす。</h2></div>
          <div className="mt-10 overflow-hidden rounded-3xl border border-slate-200 bg-white">
            <div className="grid grid-cols-[1fr_1fr] bg-slate-950 px-5 py-4 text-sm font-bold text-white sm:grid-cols-[1.2fr_1fr_1fr]"><span className="hidden sm:block">比較項目</span><span>従来の一覧表</span><span className="text-violet-300">Quote Recovery</span></div>
            {[["優先順位", "担当者の経験で判断", "金額・日数・未設定から自動判定"], ["次回対応", "セルを探して確認", "予定なし・期限超過を一覧化"], ["活動履歴", "個人メモやメールに分散", "案件単位でチーム共有"], ["導入負荷", "新システムへの全面移行", "既存CSVをそのまま取込"]].map(([label, before, after]) => <div key={label} className="grid grid-cols-[1fr_1fr] border-t border-slate-100 px-5 py-5 text-sm sm:grid-cols-[1.2fr_1fr_1fr]"><span className="hidden font-bold sm:block">{label}</span><span className="pr-4 text-slate-500">{before}</span><span className="font-semibold text-slate-950"><Check className="mr-2 inline size-4 text-emerald-600" aria-hidden="true" />{after}</span></div>)}
          </div>
        </div>
      </section>

      <section id="security" className="scroll-mt-24 px-5 py-20 sm:px-8 lg:py-28">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.75fr_1.25fr] lg:items-center">
          <div><span className="flex size-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700"><ShieldCheck aria-hidden="true" /></span><h2 className="mt-6 text-3xl font-bold tracking-tight sm:text-4xl">見積データを扱うための、標準装備。</h2><p className="mt-5 text-sm leading-7 text-slate-600">診断時の元CSV・見積明細は保存せず、契約後の業務データは組織単位で分離します。</p></div>
          <div className="grid gap-4 sm:grid-cols-2">{[[LockKeyhole, "組織別データ分離", "認可とRLSの二重チェック"], [History, "監査ログ", "契約・取込・更新・権限変更を記録"], [CircleDollarSign, "Stripe本番決済", "カード情報はStripeが安全に処理"], [Sparkles, "復旧可能な運用", "CSV出力と取込履歴で引継ぎ可能"]].map(([Icon, title, text]) => { const ItemIcon = Icon as typeof LockKeyhole; return <article key={String(title)} className="rounded-2xl border border-slate-200 p-5"><ItemIcon className="size-5 text-violet-600" aria-hidden="true" /><h3 className="mt-4 font-bold">{String(title)}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{String(text)}</p></article> })}</div>
        </div>
      </section>

      <section id="pricing" className="scroll-mt-24 bg-violet-50 px-5 py-20 sm:px-8 lg:py-28">
        <div className="mx-auto max-w-5xl">
          <div className="text-center"><p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-700">Simple pricing</p><h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">無料トライアルなし。月単位で始められます。</h2><p className="mt-4 text-sm text-slate-600">初期費用0円・税込価格。契約直後からデータ保存とチーム運用を利用できます。</p></div>
          <div className="mt-10 grid gap-5 md:grid-cols-2">{plans.map((plan) => <article key={plan.name} className={`relative rounded-3xl border bg-white p-7 shadow-sm ${plan.emphasis ? "border-violet-500 ring-4 ring-violet-500/10" : "border-slate-200"}`}>{plan.emphasis && <span className="absolute right-5 top-5 rounded-full bg-violet-100 px-3 py-1 text-xs font-bold text-violet-700">おすすめ</span>}<p className="text-sm font-bold text-violet-700">{plan.name}</p><p className="mt-4 text-4xl font-bold tracking-tight">¥{plan.price}<span className="text-sm font-medium text-slate-500"> / 月</span></p><p className="mt-3 text-sm text-slate-600">{plan.description}</p><ul className="mt-6 space-y-3 text-sm"><li><Check className="mr-2 inline size-4 text-emerald-600" />{plan.seats}まで</li><li><Check className="mr-2 inline size-4 text-emerald-600" />見積{plan.rows}</li><li><Check className="mr-2 inline size-4 text-emerald-600" />CSV取込・出力、活動履歴、権限管理</li><li><Check className="mr-2 inline size-4 text-emerald-600" />Stripe請求ポータル</li></ul><QuoteRecoveryContractLink className={`mt-7 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-5 text-sm font-bold ${plan.emphasis ? "bg-violet-600 text-white hover:bg-violet-700" : "border border-slate-300 text-slate-800 hover:border-violet-400"}`}>{plan.name}を契約<ArrowRight className="size-4" /></QuoteRecoveryContractLink></article>)}</div>
        </div>
      </section>

      <section id="faq" className="scroll-mt-24 px-5 py-20 sm:px-8 lg:py-28">
        <div className="mx-auto max-w-4xl"><div className="text-center"><p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-600">FAQ</p><h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">導入前によくある質問</h2></div><div className="mt-10 divide-y divide-slate-200 rounded-3xl border border-slate-200 px-5 sm:px-7">{faqs.map(([question, answer]) => <details key={question} className="group py-5"><summary className="cursor-pointer list-none pr-8 font-bold marker:content-none">{question}<span className="float-right text-violet-600 group-open:rotate-45">＋</span></summary><p className="mt-3 pr-6 text-sm leading-7 text-slate-600">{answer}</p></details>)}</div></div>
      </section>

      <section className="px-5 pb-20 sm:px-8 lg:pb-28"><div className="mx-auto max-w-6xl rounded-3xl bg-slate-950 px-6 py-12 text-center text-white sm:px-10"><h2 className="text-3xl font-bold tracking-tight">見積を出した後の「そのまま」を、今日で終わらせる。</h2><p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-slate-300">まず無料診断で放置金額を確認するか、そのまま契約してチーム運用を開始できます。</p><div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row"><a href="#diagnostic" className="inline-flex min-h-12 items-center justify-center rounded-xl bg-white px-6 text-sm font-bold text-slate-950">無料CSV診断</a><QuoteRecoveryContractLink className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-violet-600 px-6 text-sm font-bold text-white">契約を開始<ArrowRight className="size-4" /></QuoteRecoveryContractLink></div></div></section>
    </>
  )
}
