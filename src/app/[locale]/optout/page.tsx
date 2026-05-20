/**
 * /[locale]/optout — opt-out 完了ページ.
 * /api/mvp/track/optout/[token] が redirect で着地.
 *
 * AE-PHP-2: 全文言は messages/{locale}.json:optoutPage 経由（12 locale 対応）。
 *           旧実装は COPY を ja/en のみハードコードしており残 10 locale が英語固定だった。
 */

import { getTranslations } from "next-intl/server";
import { assertLocale } from "@/lib/cms/filters";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string }>;
}

export default async function OptoutPage({ params, searchParams }: Props) {
  const { locale: rawLocale } = await params;
  const { status } = await searchParams;
  const locale = assertLocale(rawLocale);
  const t = await getTranslations({ locale, namespace: "optoutPage" });
  const isSuccess = status === "success";
  const message = isSuccess ? t("success") : t("invalid");

  return (
    <main className="min-h-[60vh] container mx-auto px-6 py-16 max-w-2xl">
      <h1 className="text-3xl font-bold mb-4">{t("title")}</h1>
      <p className="text-gray-600 mb-6">{t("subtitle")}</p>
      <div className={`p-6 rounded-lg border ${isSuccess ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}>
        <p className="text-base">{message}</p>
      </div>
    </main>
  );
}
