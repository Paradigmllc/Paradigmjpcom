/**
 * MaintenanceScreen.tsx — admin-controlled maintenance mode UI
 *
 * 役割: PayloadCMS Settings global の maintenanceMode が true のとき
 *       layout.tsx から render される全画面メンテナンス通知。
 * 入力: { locale, message? }
 * 出力: locale-aware フルスクリーン (Aesop minimal)
 *
 * 配線元: src/app/[locale]/layout.tsx (getSiteSettings 経由)
 */
import { getTranslations } from "next-intl/server"

interface Props {
  locale: string
  message?: string | null
}

export default async function MaintenanceScreen({ locale, message }: Props) {
  const t = await getTranslations({ locale, namespace: "maintenancePage" })

  return (
    <div className="min-h-screen flex items-center justify-center bg-paradigm-paper">
      <div className="paradigm-mesh opacity-30 absolute inset-0" />
      <div className="relative z-10 max-w-xl mx-auto px-6 md:px-8 text-center">
        <p className="paradigm-eyebrow text-paradigm-accent mb-4">{t("eyebrow")}</p>
        <h1 className="font-display text-[32px] md:text-[44px] leading-[1.15] tracking-[-0.025em] text-paradigm-ink mb-6">
          <span className="bg-gradient-to-br from-paradigm-ink via-paradigm-accent to-paradigm-tech bg-clip-text text-transparent">
            {t("title")}
          </span>
        </h1>
        <p className="text-[14px] md:text-[15px] text-paradigm-ink-soft leading-[1.8] mb-8 whitespace-pre-line">
          {message ?? t("desc")}
        </p>
        <p className="text-[12px] text-paradigm-ink-mute">{t("contact")}</p>
      </div>
    </div>
  )
}
