/**
 * /[locale]/optout — opt-out 完了ページ.
 * /api/mvp/track/optout/[token] が redirect で着地.
 */

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string }>;
}

const COPY: Record<string, { title: string; success: string; invalid: string; subtitle: string }> = {
  ja: {
    title: "配信停止のお手続き",
    success: "配信停止を承りました。今後、Paradigm 合同会社からのフォーム経由のご案内は配信いたしません。",
    invalid: "リンクが無効または期限切れです。お手数ですが、再度メッセージ内の配信停止リンクからお試しください。",
    subtitle: "ご不便をおかけして申し訳ございません。",
  },
  en: {
    title: "Unsubscribe",
    success: "Your unsubscribe request has been processed. We will no longer send form-based outreach from Paradigm.",
    invalid: "This link is invalid or expired. Please try the unsubscribe link in the original message.",
    subtitle: "We're sorry for any inconvenience.",
  },
};

export default async function OptoutPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { status } = await searchParams;
  const copy = COPY[locale] ?? COPY.en;
  const isSuccess = status === "success";
  const message = isSuccess ? copy.success : copy.invalid;

  return (
    <main className="min-h-[60vh] container mx-auto px-6 py-16 max-w-2xl">
      <h1 className="text-3xl font-bold mb-4">{copy.title}</h1>
      <p className="text-gray-600 mb-6">{copy.subtitle}</p>
      <div className={`p-6 rounded-lg border ${isSuccess ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}>
        <p className="text-base">{message}</p>
      </div>
    </main>
  );
}
