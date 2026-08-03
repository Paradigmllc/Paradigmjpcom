import Link from "next/link"
import { Check, Clock3, FileCheck2, LifeBuoy, LockKeyhole, ReceiptText } from "lucide-react"
import { PET_MOVIE_DELIVERY_BUSINESS_DAYS, PET_MOVIE_PLANS } from "@/lib/pet-life-movie/commercial"

type Locale = "ja" | "en" | "es" | "pt"

const copy = {
  ja: {
    eyebrow: "料金と提供条件",
    title: "注文前に、すべて明確に。",
    lead: "3プランとも買い切りです。定期課金・追加送料はありません。表示USD価格が当社への支払総額です。",
    oneTime: "一回払い",
    reviewed: "人による最終品質確認",
    delivery: `支払確認後${PET_MOVIE_DELIVERY_BUSINESS_DAYS}営業日以内に専用ページへ納品`,
    privacy: "原本は非公開。無料プロジェクトは30日、有料プロジェクトは90日で自動削除。いつでも即時削除できます。",
    remedy: `制作開始後のお客様都合による取消しはできません。${PET_MOVIE_DELIVERY_BUSINESS_DAYS}営業日以内に納品できない場合、または重大な不具合がある場合は、修正・再制作または返金で対応します。`,
    support: "納品・削除・不具合は support@paradigmjp.com へ。通常2営業日以内に返信します。",
    terms: "Pet Life Movie提供条件",
    commerce: "特定商取引法に基づく表記",
    privacyLink: "プライバシーポリシー",
    refund: "返金ポリシー",
    faqTitle: "よくある質問",
    faq: [
      ["無料プレビューで課金されますか？", "いいえ。プランを選び、Stripeの確認画面で支払いを完了するまで料金は発生しません。"],
      ["AIが実在しない思い出を作りますか？", "作りません。入力された名前・一緒に過ごした時間・思い出だけを字幕に使います。"],
      ["家族も追加できますか？", "はい。14日で失効する招待リンクから、権利確認済みの写真と思い出を追加できます。"],
      ["どこまで非公開ですか？", "写真・動画はprivate storageに保存し、共有URLを知る人だけが期限付きURLで閲覧できます。"],
      ["動画の品質に問題があったら？", "人の最終確認を通過した動画だけを納品します。重大な不具合は修正・再制作または返金で対応します。"],
    ],
  },
  en: {
    eyebrow: "Pricing and service terms", title: "Everything clear before you order.", lead: "Every plan is a one-time purchase with no subscription or shipping charge. The displayed USD price is the total paid to us.", oneTime: "One-time payment", reviewed: "Human final quality review", delivery: `Delivered to your private page within ${PET_MOVIE_DELIVERY_BUSINESS_DAYS} business days after payment confirmation`, privacy: "Originals stay private. Free projects expire after 30 days and paid projects after 90 days. You can delete everything immediately at any time.", remedy: `Customer-requested cancellation is unavailable after production starts. If we do not deliver within ${PET_MOVIE_DELIVERY_BUSINESS_DAYS} business days or the deliverable has a material defect, we provide correction, re-production, or a refund.`, support: "For delivery, deletion, or defects, email support@paradigmjp.com. We normally respond within two business days.", terms: "Pet Life Movie terms", commerce: "Commerce disclosure", privacyLink: "Privacy policy", refund: "Refund policy", faqTitle: "Frequently asked questions", faq: [["Does the free preview charge me?", "No. Nothing is charged until you select a plan and complete payment on Stripe's confirmation page."], ["Will AI invent memories?", "No. Captions only use the name, time together, and memories supplied by the family."], ["Can family members contribute?", "Yes. A 14-day invitation lets them add rights-cleared photos and real memories."], ["How private is it?", "Files remain in private storage. Only people with the unlisted URL can access short-lived signed media links."], ["What if there is a quality problem?", "Only human-reviewed films are delivered. Material defects are handled by correction, re-production, or refund."]],
  },
  es: {
    eyebrow: "Precios y condiciones", title: "Todo claro antes de comprar.", lead: "Todos los planes son de pago único, sin suscripción ni envío. El precio mostrado en USD es el total pagado a Paradigm.", oneTime: "Pago único", reviewed: "Revisión humana final", delivery: `Entrega en tu página privada dentro de ${PET_MOVIE_DELIVERY_BUSINESS_DAYS} días laborables tras confirmar el pago`, privacy: "Los originales son privados. Los proyectos gratuitos caducan en 30 días y los pagados en 90. Puedes eliminar todo inmediatamente.", remedy: `No se admite cancelación por preferencia personal una vez iniciada la producción. Si no entregamos en ${PET_MOVIE_DELIVERY_BUSINESS_DAYS} días laborables o existe un defecto importante, corregimos, rehacemos o reembolsamos.`, support: "Para entregas, eliminación o defectos: support@paradigmjp.com. Respondemos normalmente en dos días laborables.", terms: "Condiciones de Pet Life Movie", commerce: "Información comercial", privacyLink: "Privacidad", refund: "Reembolsos", faqTitle: "Preguntas frecuentes", faq: [["¿La vista previa gratis realiza un cargo?", "No. Solo se cobra al elegir un plan y completar el pago en Stripe."], ["¿La IA inventará recuerdos?", "No. Los textos usan únicamente los datos y recuerdos aportados por la familia."], ["¿Puede colaborar mi familia?", "Sí. Una invitación válida durante 14 días permite añadir fotos autorizadas y recuerdos reales."], ["¿Quién puede verlo?", "Los archivos son privados. Solo quien conoce el enlace puede abrir enlaces multimedia firmados y temporales."], ["¿Qué ocurre si hay un problema?", "Solo entregamos vídeos revisados por una persona. Corregimos, rehacemos o reembolsamos los defectos importantes."]],
  },
  pt: {
    eyebrow: "Preços e condições", title: "Tudo claro antes da compra.", lead: "Todos os planos são de pagamento único, sem assinatura ou frete. O preço em USD é o total pago à Paradigm.", oneTime: "Pagamento único", reviewed: "Revisão humana final", delivery: `Entrega na página privada em até ${PET_MOVIE_DELIVERY_BUSINESS_DAYS} dias úteis após a confirmação do pagamento`, privacy: "Os originais ficam privados. Projetos grátis expiram em 30 dias e pagos em 90. Você pode apagar tudo imediatamente.", remedy: `Não há cancelamento por preferência pessoal após o início da produção. Se não entregarmos em ${PET_MOVIE_DELIVERY_BUSINESS_DAYS} dias úteis ou houver defeito relevante, corrigimos, refazemos ou reembolsamos.`, support: "Para entrega, exclusão ou defeitos: support@paradigmjp.com. Normalmente respondemos em dois dias úteis.", terms: "Termos do Pet Life Movie", commerce: "Informações comerciais", privacyLink: "Privacidade", refund: "Reembolsos", faqTitle: "Perguntas frequentes", faq: [["A prévia grátis faz alguma cobrança?", "Não. A cobrança só ocorre após escolher um plano e concluir o pagamento no Stripe."], ["A IA inventa memórias?", "Não. As legendas usam apenas os dados e memórias fornecidos pela família."], ["Minha família pode contribuir?", "Sim. Um convite válido por 14 dias permite adicionar fotos autorizadas e memórias reais."], ["Quem pode ver?", "Os arquivos são privados. Somente quem conhece o link acessa URLs de mídia assinadas e temporárias."], ["E se houver problema de qualidade?", "Só entregamos filmes revisados por uma pessoa. Defeitos relevantes recebem correção, nova produção ou reembolso."]],
  },
} as const

const paymentCopy = {
  ja: "支払方法・時期：Stripeで利用可能なクレジット／デビットカードにより、注文確定時に一回払いで決済します。",
  en: "Payment method and timing: one-time charge at order confirmation using a credit or debit card available through Stripe.",
  es: "Método y momento del pago: un único cargo al confirmar el pedido con una tarjeta de crédito o débito disponible en Stripe.",
  pt: "Método e momento do pagamento: cobrança única na confirmação do pedido com cartão de crédito ou débito disponível no Stripe.",
} as const

const productionCopy = {
  ja: "有料本編：同意済み写真からGPUで短い自然動作を生成。顔立ち・毛並み・体型の一致基準を下回るショットは採用せず、制作担当がドラフトと最終版を確認します。",
  en: "Paid film: subtle natural motion is GPU-generated from consented photos. Shots below the face, fur, and body-shape fidelity threshold are rejected before draft and final human review.",
  es: "Película de pago: la GPU genera movimientos naturales sutiles a partir de fotos autorizadas. Se rechazan los planos que no conserven rostro, pelaje y forma corporal antes de dos revisiones humanas.",
  pt: "Filme pago: a GPU gera movimentos naturais sutis a partir de fotos autorizadas. Cenas que não preservam rosto, pelagem e formato corporal são rejeitadas antes de duas revisões humanas.",
} as const

export default function PetMovieCommercialDetails({ locale }: { locale: Locale }) {
  const t = copy[locale]
  return (
    <section id="pricing" className="border-y border-paradigm-line bg-paradigm-paper-card py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-5 md:px-8">
        <div className="mx-auto max-w-3xl text-center"><p className="text-xs font-semibold uppercase tracking-[.18em] text-paradigm-accent">{t.eyebrow}</p><h2 className="mt-4 font-display text-4xl tracking-tight md:text-6xl">{t.title}</h2><p className="mt-5 leading-7 text-paradigm-ink-soft">{t.lead}</p><p className="mt-3 text-sm font-medium text-paradigm-ink">{paymentCopy[locale]}</p></div>
        <div className="mx-auto mt-8 max-w-4xl rounded-2xl border border-paradigm-accent/25 bg-paradigm-accent/5 p-5 text-sm leading-6 text-paradigm-ink-soft">{productionCopy[locale]}</div>
        <div className="mt-12 grid gap-5 md:grid-cols-3">{PET_MOVIE_PLANS.map((plan) => <article key={plan.id} className={`rounded-3xl border bg-paradigm-paper p-7 ${plan.id === "story" ? "border-paradigm-accent shadow-lg" : "border-paradigm-line"}`}><div className="flex items-start justify-between gap-4"><div><h3 className="font-display text-2xl">{plan.name}</h3><p className="mt-1 text-sm text-paradigm-ink-mute">{plan.durationSeconds} sec · {plan.formats.join(" + ")}</p></div><p className="text-3xl font-bold">${plan.priceUsd}</p></div><ul className="mt-7 space-y-3 text-sm text-paradigm-ink-soft"><li className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-paradigm-accent" aria-hidden="true" />{t.oneTime}</li><li className="flex gap-2"><FileCheck2 className="h-4 w-4 shrink-0 text-paradigm-accent" aria-hidden="true" />{t.reviewed}</li><li className="flex gap-2"><LockKeyhole className="h-4 w-4 shrink-0 text-paradigm-accent" aria-hidden="true" />Private delivery</li></ul></article>)}</div>
        <div className="mt-8 grid gap-4 lg:grid-cols-3"><div className="rounded-2xl border border-paradigm-line p-5"><Clock3 className="mb-3 h-5 w-5 text-paradigm-accent" aria-hidden="true" /><p className="text-sm leading-6">{t.delivery}</p></div><div className="rounded-2xl border border-paradigm-line p-5"><LockKeyhole className="mb-3 h-5 w-5 text-paradigm-accent" aria-hidden="true" /><p className="text-sm leading-6">{t.privacy}</p></div><div className="rounded-2xl border border-paradigm-line p-5"><LifeBuoy className="mb-3 h-5 w-5 text-paradigm-accent" aria-hidden="true" /><p className="text-sm leading-6">{t.support}</p></div></div>
        <div className="mt-5 rounded-2xl bg-paradigm-paper-deep p-5 text-sm leading-6 text-paradigm-ink-soft"><ReceiptText className="mb-3 h-5 w-5 text-paradigm-accent" aria-hidden="true" />{t.remedy}</div>
        <div className="mt-6 flex flex-wrap justify-center gap-x-6 gap-y-3 text-sm font-medium underline underline-offset-4"><Link href={`/${locale}/pet-life-movie/terms`}>{t.terms}</Link><Link href={`/${locale}/legal`}>{t.commerce}</Link><Link href={`/${locale}/privacy`}>{t.privacyLink}</Link><Link href={`/${locale}/refund`}>{t.refund}</Link></div>
        <div className="mx-auto mt-20 max-w-3xl"><h2 className="text-center font-display text-4xl">{t.faqTitle}</h2><div className="mt-8 divide-y divide-paradigm-line rounded-3xl border border-paradigm-line bg-paradigm-paper">{t.faq.map(([question, answer]) => <details key={question} className="group p-6"><summary className="cursor-pointer list-none font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-paradigm-accent">{question}<span className="float-right text-paradigm-accent group-open:rotate-45" aria-hidden="true">＋</span></summary><p className="mt-4 text-sm leading-7 text-paradigm-ink-soft">{answer}</p></details>)}</div></div>
      </div>
    </section>
  )
}
