export interface SecurityHeader {
  key: string
  value: string
}

const productionOnlyDirectives = ["upgrade-insecure-requests"] as const

const contentSecurityPolicyDirectives = [
  "default-src 'self'",
  "base-uri 'self'",
  "font-src 'self' data: https://fonts.gstatic.com",
  "form-action 'self'",
  "frame-ancestors 'self'",
  // Reports can embed customer demos and generated video players. Keep HTTPS
  // frames available while preventing HTTP and plugin content.
  "frame-src 'self' blob: https:",
  "img-src 'self' data: blob: https:",
  "media-src 'self' data: blob: https:",
  "object-src 'none'",
  // Next.js emits inline bootstrap code. The remaining origins are the public
  // integrations rendered by the application after consent or on the contact
  // form. Do not replace these with a blanket https: source.
  "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com https://www.googletagmanager.com https://connect.facebook.net",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  // Browser requests stay on HTTPS. This covers analytics collection, the
  // Turnstile challenge, and configurable API/media origins used by reports.
  "connect-src 'self' https: wss:",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
] as const

export function buildContentSecurityPolicy(isProduction: boolean): string {
  return [
    ...contentSecurityPolicyDirectives,
    ...(isProduction ? productionOnlyDirectives : []),
  ].join("; ")
}

export function buildSecurityHeaders(isProduction: boolean): SecurityHeader[] {
  return [
    {
      key: "Content-Security-Policy",
      value: buildContentSecurityPolicy(isProduction),
    },
    {
      key: "Strict-Transport-Security",
      // Do not includeSubDomains until every legacy operations hostname is
      // confirmed HTTPS-only. The public application itself is still pinned.
      value: "max-age=31536000",
    },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "SAMEORIGIN" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    {
      key: "Permissions-Policy",
      value:
        "browsing-topics=(), camera=(), geolocation=(), microphone=(), payment=(), usb=()",
    },
    { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
    { key: "X-DNS-Prefetch-Control", value: "on" },
    { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
  ]
}
