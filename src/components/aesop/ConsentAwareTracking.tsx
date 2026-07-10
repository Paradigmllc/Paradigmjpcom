"use client"

import Script from "next/script"
import { useEffect, useState } from "react"
import {
  CONSENT_CHANGED_EVENT,
  hasAnalyticsConsent,
  readStoredConsent,
  type StoredConsent,
} from "@/lib/cookie-consent"

type TrackingSettings = {
  gtmId?: string | null
  ga4Id?: string | null
  metaPixelId?: string | null
  headScripts?: string | null
  bodyScripts?: string | null
}

type Props = {
  tracking: TrackingSettings
  umamiHost?: string | null
  umamiWebsiteId?: string | null
}

function validTrackingId(value: string | null | undefined) {
  const trimmed = value?.trim()
  return trimmed && /^[A-Za-z0-9_-]+$/.test(trimmed) ? trimmed : null
}

function validUmamiHost(value: string | null | undefined) {
  if (!value) return null
  try {
    const url = new URL(value)
    if (url.protocol !== "https:" && url.hostname !== "localhost") return null
    return url.toString().replace(/\/$/, "")
  } catch (error) {
    console.error("[tracking] Invalid Umami host:", error)
    return null
  }
}

export default function ConsentAwareTracking({
  tracking,
  umamiHost,
  umamiWebsiteId,
}: Props) {
  const [allowed, setAllowed] = useState(false)

  useEffect(() => {
    const stored = readStoredConsent()
    setAllowed(hasAnalyticsConsent(stored))

    const onConsentChanged = (event: Event) => {
      const detail = (event as CustomEvent<StoredConsent>).detail
      setAllowed(hasAnalyticsConsent(detail ?? null))
    }
    window.addEventListener(CONSENT_CHANGED_EVENT, onConsentChanged)
    return () => window.removeEventListener(CONSENT_CHANGED_EVENT, onConsentChanged)
  }, [])

  if (!allowed) return null

  const gtmId = validTrackingId(tracking.gtmId)
  const ga4Id = validTrackingId(tracking.ga4Id)
  const metaPixelId = validTrackingId(tracking.metaPixelId)
  const normalizedUmamiHost = validUmamiHost(umamiHost)
  const normalizedUmamiId = validTrackingId(umamiWebsiteId)

  return (
    <>
      {gtmId && (
        <Script id="paradigm-gtm" strategy="afterInteractive">
          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer',${JSON.stringify(gtmId)});`}
        </Script>
      )}
      {ga4Id && (
        <>
          <Script id="paradigm-ga4-source" src={`https://www.googletagmanager.com/gtag/js?id=${ga4Id}`} strategy="afterInteractive" />
          <Script id="paradigm-ga4-config" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config',${JSON.stringify(ga4Id)});`}
          </Script>
        </>
      )}
      {metaPixelId && (
        <Script id="paradigm-meta-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init',${JSON.stringify(metaPixelId)});fbq('track','PageView');`}
        </Script>
      )}
      {normalizedUmamiHost && normalizedUmamiId && (
        <Script id="paradigm-umami" src={`${normalizedUmamiHost}/script.js`} data-website-id={normalizedUmamiId} strategy="afterInteractive" />
      )}
      {tracking.headScripts && (
        <Script id="paradigm-custom-head-tracking" strategy="afterInteractive" dangerouslySetInnerHTML={{ __html: tracking.headScripts }} />
      )}
      {tracking.bodyScripts && (
        <Script id="paradigm-custom-body-tracking" strategy="lazyOnload" dangerouslySetInnerHTML={{ __html: tracking.bodyScripts }} />
      )}
    </>
  )
}
