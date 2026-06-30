import { getServiceSalesSupabase } from "@/lib/supabase"
import type { SalesCompany } from "./types"
import { DB_TABLES } from "@/lib/sales/db-tables"
import {
  companyJapanMarketAudit, companyPainDiagnosis, companyTechStack,
  companyVisualEvidence, companyDifyResult, mergedCompanyMeta,
} from "@/lib/sales/company-data-view"

type JsonRecord = Record<string, unknown>

interface SourceQualityMetric {
  failed?: number
  timeout?: number
  lastError?: string
}

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : {}
}

export type SourceCoverageStatus =
  | "collected"
  | "configured"
  | "queued"
  | "missing"
  | "disabled"
  | "not_applicable"
  | "error"

export interface SourceCoverageItem {
  slug: string
  label: string
  category: string
  status: SourceCoverageStatus
  score: number
  detail: string
  meaning: string
  missingConsequence: string
  nextStep: string
}

export interface SourceCoverageSnapshot {
  score: number
  collected: number
  configured: number
  missing: number
  items: SourceCoverageItem[]
}

interface SourceDefinition {
  slug: string
  label: string
  category: string
  env?: string[]
  maxAgeDays?: number // migration_046: freshness threshold
  detect: (meta: JsonRecord, company: SalesCompany) => boolean
  detail: string
  meaning?: string
  missingConsequence?: string
  nextStep?: string
}

const SOURCES: SourceDefinition[] = [
  {
    slug: "pagespeed",
    label: "PageSpeed Insights",
    category: "analysis",
    maxAgeDays: 7,
    env: ["GOOGLE_PSI_API_KEY"],
    detect: (_meta, c) => c.pagespeed_mobile !== null || c.pagespeed_desktop !== null,
    detail: "Core Web Vitals and speed risk",
    meaning: "表示速度は、広告・検索・SNSから来た見込み客が最初の数秒で残るか離脱するかを左右します。",
    missingConsequence: "未取得だと「遅い気がする」以上の説明ができず、損失仮説を自分事化しにくくなります。",
    nextStep: "PageSpeed / Lighthouse を取得し、LCP・INP・CLSを改善優先度へ変換します。",
  },
  {
    slug: "html_metadata",
    label: "HTML metadata scan",
    category: "analysis",
    detect: (m) => !!(m.scan as JsonRecord | undefined)?.html_title || !!(m.scan as JsonRecord | undefined)?.html_description,
    detail: "Title, description, canonical, OGP, and visible HTML evidence",
    meaning: "検索結果・SNS共有・チャット共有で最初に見られる約束文です。弱いとクリック前に比較から落ちます。",
    missingConsequence: "未取得だと、見込み客が最初に目にする訴求のズレを診断できません。",
    nextStep: "title / description / OGP / canonical を取得し、業種別の強い訴求に置き換えます。",
  },
  {
    slug: "robots_sitemap",
    label: "robots.txt / sitemap.xml",
    category: "analysis",
    detect: (m) => !!(m.robots_sitemap as JsonRecord | undefined)?.robotsTxt || !!(m.robots_sitemap as JsonRecord | undefined)?.sitemapXml,
    detail: "Crawlability and public URL inventory",
    meaning: "GoogleやAI検索がサイト構造を理解できるかを見る台帳です。見つからないページは営業機会にもなりません。",
    missingConsequence: "未取得だと、SEO/GEOで拾われていない導線の特定が曖昧になります。",
    nextStep: "robots.txt と sitemap.xml を確認し、重要ページの発見性を整えます。",
  },
  {
    slug: "security_headers_free",
    label: "HTTP security headers",
    category: "analysis",
    detect: (m) => !!m.security_headers,
    detail: "HSTS, CSP, X-Frame-Options, nosniff, and server header",
    meaning: "B2B検討・採用・予約前の信頼性に関わる基礎防御です。小さな不備でも不安材料になります。",
    missingConsequence: "未取得だと、信頼棄損や調達審査で引っかかる可能性を説明できません。",
    nextStep: "HSTS / CSP / X-Frame-Options / nosniff を確認し、標準の堅牢化項目に落とします。",
  },
  { slug: "dataforseo", label: "DataForSEO", category: "analysis", env: ["DATAFORSEO_LOGIN", "DATAFORSEO_PASSWORD"], detect: (m) => !!m.dataforseo, detail: "SEO and lighthouse enrichment" },
  { slug: "lighthouse_api", label: "Lighthouse API", category: "analysis", env: ["GOOGLE_PSI_API_KEY", "LIGHTHOUSE_API_URL"], detect: (m, c) => !!m.lighthouse || c.pagespeed_mobile !== null || c.pagespeed_desktop !== null, detail: "Performance and Core Web Vitals details" },
  {
    slug: "wappalyzer",
    label: "Wappalyzer CLI",
    category: "analysis",
    maxAgeDays: 30,
    detect: (_m, c) => !!companyTechStack(c) || Array.isArray((_m.tech as JsonRecord | undefined)?.stack),
    detail: "CMS/framework/analytics stack",
    meaning: "CMS・計測・フレームワークは、改修難度、表示速度、セキュリティ負債、既存投資の見込みを読む材料です。",
    missingConsequence: "未取得だと、なぜAstro/Next.js差し替えが効くのか、既存環境に合わせた説明が薄くなります。",
    nextStep: "Wappalyzer/WhatWebで技術スタックを取得し、負債・移行難度・既存投資を分類します。",
  },
  { slug: "whatweb", label: "WhatWeb API", category: "analysis", env: ["WHATWEB_API_URL"], detect: (m) => !!m.whatweb || !!(m.tech as JsonRecord | undefined)?.server, detail: "Technology fingerprint fallback" },
  { slug: "urlscan", label: "urlscan.io", category: "analysis", env: ["URLSCAN_API_KEY"], detect: (m) => !!m.urlscan, detail: "Security and resource evidence" },
  { slug: "publicwww", label: "PublicWWW", category: "analysis", env: ["PUBLICWWW_API_KEY"], detect: (m) => !!m.publicwww, detail: "Tracking/script footprint" },
  { slug: "ssllabs", label: "SSL Labs", category: "analysis", detect: (m) => !!m.ssl, detail: "TLS grade and certificate risk" },
  {
    slug: "japan_market_audit",
    label: "Japan legal/payment readiness",
    category: "analysis",
    maxAgeDays: 30,
    env: ["DIFY_JAPAN_MARKET_AUDITOR_API_KEY", "DIFY_API_KEY", "CRAWL4AI_BASE_URL"],
    detect: (_m, c) => !!companyJapanMarketAudit(c),
    detail: "Tokushoho, APPI/privacy, and Japan-local payment readiness",
    meaning: "Japan-entry prospects need a buyer-ready trust path: commercial disclosure, privacy handling, and local payment familiarity. This signal turns public-page gaps into a human-reviewed sales hypothesis.",
    missingConsequence: "Without this audit, Japan-entry reports can miss the concrete friction that makes overseas SMBs hesitate or fail to convert Japanese buyers.",
    nextStep: "Run the Japan market audit, then let Dify Cloud convert only verified gaps into proposal copy. Legal or penalty claims must stay behind human review.",
  },
  { slug: "mozilla_observatory", label: "Mozilla Observatory", category: "analysis", env: ["MOZILLA_OBSERVATORY_API_URL"], detect: (m) => !!m.mozilla_observatory, detail: "HTTP security headers" },
  { slug: "securitytrails", label: "SecurityTrails", category: "analysis", env: ["SECURITYTRAILS_API_KEY"], detect: (m) => !!m.securitytrails, detail: "DNS and infrastructure history" },
  { slug: "shodan", label: "Shodan/Censys", category: "analysis", env: ["SHODAN_API_KEY", "CENSYS_API_ID"], detect: (m) => !!m.shodan || !!m.censys, detail: "Public exposure scan" },
  { slug: "gbizinfo", label: "gBizInfo API", category: "list", detect: (m) => !!m.corporate_number || !!m.gbizinfo, detail: "Official company registry facts" },
  { slug: "apollo", label: "Apollo.io / Apollo Exporter", category: "list", env: ["APOLLO_API_KEY"], detect: (m) => !!m.apollo || !!m.apollo_exporter, detail: "B2B company and contact source" },
  { slug: "fumadata", label: "Fumadata", category: "list", env: ["FUMADATA_API_KEY"], detect: (m) => !!m.fumadata, detail: "Japan business list source" },
  { slug: "bizmap", label: "BIZMap", category: "list", env: ["BIZMAP_API_KEY"], detect: (m) => !!m.bizmap, detail: "Japan SMB list source" },
  { slug: "houjin_bangou", label: "National Tax Agency", category: "list", env: ["HOUJIN_BANGOU_API_ID"], detect: (m) => !!m.national_tax_agency, detail: "Corporate number lookup" },
  { slug: "jgrants", label: "jGrants API", category: "list", env: ["JGRANTS_API_KEY"], detect: (m) => !!m.jgrants, detail: "Subsidy opportunity evidence" },
  { slug: "apify", label: "Apify API", category: "list", env: ["APIFY_API_TOKEN"], detect: (m) => !!m.apify, detail: "Crawler and dataset enrichment" },
  { slug: "outscraper", label: "Outscraper", category: "list", env: ["OUTSCRAPER_API_KEY"], detect: (m) => !!m.outscraper, detail: "Maps and local business enrichment" },
  {
    slug: "google_places",
    label: "Google Places",
    category: "list",
    maxAgeDays: 90,
    env: ["GOOGLE_PLACES_API_KEY"],
    detect: (m, _c) => !!m.place,
    detail: "Local presence and MEO facts",
    meaning: "店舗・地域ビジネスでは、口コミ、営業時間、写真、地図上の見え方が予約前の比較を決めます。",
    missingConsequence: "未取得だと、競合比較や評判ギャップを本人が納得できる形で示せません。",
    nextStep: "Google Places を取得し、口コミ・評価・営業時間・地図導線を改善項目へ変換します。",
  },
  { slug: "hunter", label: "Hunter/Apollo contacts", category: "list", env: ["HUNTER_API_KEY", "APOLLO_API_KEY"], detect: (m) => !!m.hunter || !!m.apollo, detail: "Contact discovery" },
  {
    slug: "crawlee",
    label: "Crawlee",
    category: "outreach",
    env: ["CRAWLEE_WORKER_URL"],
    detect: (m) => !!m.crawlee,
    detail: "Contact path crawl and anchor scoring",
    meaning: "問い合わせ導線が機械的に見つかるかは、ユーザーにも営業自動化にも同じくらい重要です。",
    missingConsequence: "未取得だと、フォーム営業の可否だけでなく、実ユーザーが迷う導線かどうかも判断できません。",
    nextStep: "Crawlee/Playwright worker でSPAフォームまで確認し、CAPTCHA時は人間確認へ切り替えます。",
  },
  {
    slug: "crawl4ai",
    label: "Crawl4AI form discovery",
    category: "outreach",
    env: ["CRAWL4AI_BASE_URL"],
    detect: (m) => !!m.crawl4ai || !!m.contact_form_url || !!m.form_discovery,
    detail: "Contact form URL evidence",
    meaning: "公開ページ全体から問い合わせ・資料請求・予約導線を探し、営業文面に確実な着地点を作ります。",
    missingConsequence: "未取得だと、診断レポートを見てもらう前の送信経路が不安定になります。",
    nextStep: "Crawl4AIで候補URLを抽出し、フォーム分類とpreflightへ渡します。",
  },
  {
    slug: "website_assets",
    label: "Website visual & content extraction",
    category: "outreach",
    detect: (m) => {
      const wa = m.website_assets as Record<string, unknown> | undefined
      const imgs = wa?.images as Record<string, unknown> | undefined
      const hero = imgs?.hero as Record<string, unknown> | undefined
      const c = wa?.content as Record<string, unknown> | undefined
      return !!(hero?.url) || !!(c?.about)
    },
    detail: "Real company images, brand colors, and subpage content extracted from the company's own website",
    meaning: "デモサイトのパーソナライズに使う実画像・実色・実テキストです。フリー素材やAI生成に依存せず、相手企業の本物だけを使います。",
    missingConsequence: "未取得だと、デモサイトのビジュアルと文言が汎用テンプレートのままになり、パーソナライズ感が大幅に下がります。",
    nextStep: "Playwrightで企業HPを開き、hero画像・ロゴ・ブランド色・about/serviceページの実テキストを収集します。",
  },
  {
    slug: "stagehand",
    label: "Stagehand AI Agent",
    category: "outreach",
    env: ["STAGEHAND_URL", "STAGEHAND_API_KEY"],
    detect: (m) => !!m.stagehand_submit || !!m.stagehand,
    detail: "AI-driven autonomous form submission agent"
  },
  {
    slug: "mubeng",
    label: "mubeng Proxy Rotator (disabled)",
    category: "outreach",
    env: ["MUBENG_PROXY_URL"],
    detect: () => false,
    detail: "Disabled by RevenueOS policy: no proxy, Tor, or mubeng acquisition path is allowed"
  },
  { slug: "camoufox", label: "Camoufox", category: "outreach", env: ["CAMOUFOX_WS_URL"], detect: (m) => !!m.camoufox, detail: "Fingerprint-hardened browser escalation" },
  { slug: "playwright_stealth", label: "Playwright Stealth", category: "outreach", env: ["OUTREACH_WORKER_URL"], detect: (m) => !!m.playwright_stealth || !!m.browser_worker, detail: "Final form automation worker with approval gates" },
  {
    slug: "dify",
    label: "Dify pain diagnosis",
    category: "orchestration",
    env: [
      "DIFY_DIAGNOSIS_API_KEY",
      "DIFY_KARTE_TO_REPORT_API_KEY",
      "DIFY_KARTE_TO_REPORT_KEY",
      "DIFY_KARTE_TO_SALES_MATERIAL_API_KEY",
      "DIFY_KARTE_TO_SALES_MATERIAL_KEY",
      "DIFY_API_KEY",
    ],
    detect: (_m, c) => !!companyPainDiagnosis(c) || !!companyDifyResult(c),
    detail: "Pain summary and offer mapping",
    meaning: "取得した事実を、相手の業種・国・商材に合わせた痛みと言葉へ変換する中核です。",
    missingConsequence: "未取得だと、レポートは数字の羅列に寄り、相手が自分事として理解しにくくなります。",
    nextStep: "Dify Cloud + DeepSeek V4 で、痛み・損失仮説・提案テンプレを選定します。",
  },
  { slug: "deepseek", label: "DeepSeek V4 copy", category: "orchestration", env: ["DEEPSEEK_API_KEY"], detect: (m) => !!m.personalized_copy, detail: "Personalized diagnosis copy" },
  { slug: "trigger_dev", label: "Trigger.dev", category: "orchestration", env: ["TRIGGER_SECRET_KEY", "TRIGGER_ACCESS_TOKEN", "TRIGGER_SALES_ENRICHMENT_TASK_ID"], detect: (m) => !!m.enrichment, detail: "Job execution and audit trail" },
  { slug: "chatwoot", label: "Chatwoot", category: "post_outreach", env: ["CHATWOOT_BASE_URL", "CHATWOOT_API_KEY", "CHATWOOT_ACCOUNT_ID", "CHATWOOT_WEBHOOK_URL", "TRIGGER_CHATWOOT_REPLY_TASK_ID", "TRIGGER_POST_OUTREACH_TASK_ID"], detect: (m) => !!m.chatwoot || !!m.post_outreach_reply, detail: "Unified inbox and AI reply handoff for landed outreach" },
  { slug: "calcom", label: "Cal.com", category: "post_outreach", env: ["CALCOM_BASE_URL", "CALCOM_WEBHOOK_URL"], detect: (m) => !!m.calcom || !!m.meeting_booking, detail: "Embedded scheduling and booking webhook capture" },
  { slug: "livekit", label: "LiveKit", category: "post_outreach", env: ["LIVEKIT_URL", "LIVEKIT_API_KEY", "LIVEKIT_API_SECRET", "LIVEKIT_WEBHOOK_URL", "TRIGGER_LIVEKIT_DISCOVERY_TASK_ID", "TRIGGER_POST_OUTREACH_TASK_ID"], detect: (m) => !!m.livekit || !!m.discovery_call, detail: "Realtime AI discovery-call lane and transcript capture" },
  { slug: "hermes_slack", label: "Hermes Agent / Slack", category: "orchestration", env: ["SLACK_WEBHOOK_URL", "HERMES_AGENT_WEBHOOK_URL"], detect: (m) => !!m.hermes || !!m.slack_notification, detail: "Human approval and alert routing" },
  { slug: "listmonk", label: "Listmonk / Mautic", category: "outreach", env: ["LISTMONK_BASE_URL", "MAUTIC_BASE_URL"], detect: (m) => !!m.listmonk || !!m.mautic, detail: "Email campaign routing when form is not appropriate" },
  { slug: "smartlead", label: "Smartlead.ai", category: "outreach", env: ["SMARTLEAD_API_KEY"], detect: (m) => !!m.smartlead, detail: "Email sequence fallback" },
  { slug: "resend", label: "Resend API", category: "outreach", env: ["RESEND_API_KEY"], detect: (m) => !!m.resend, detail: "Transactional email fallback" },
  { slug: "docsend", label: "DocSend", category: "outreach", env: ["DOCSEND_API_KEY"], detect: (m) => !!m.docsend, detail: "Tracked sales material delivery" },
  { slug: "twilio", label: "Twilio / IVRy", category: "outreach", env: ["TWILIO_ACCOUNT_SID", "IVRY_API_KEY"], detect: (m) => !!m.twilio || !!m.ivry, detail: "Phone outreach and call status" },
  { slug: "serp_tavily", label: "Serp API / Tavily", category: "analysis", env: ["SERPAPI_API_KEY", "TAVILY_API_KEY"], detect: (m) => !!m.serpapi || !!m.tavily, detail: "Search result and market context evidence" },
  { slug: "notion_mcp", label: "Notion MCP", category: "orchestration", env: ["NOTION_API_KEY", "NOTION_MCP_TOKEN"], detect: (m) => !!m.notion_mcp || !!m.customer_notion_url, detail: "Customer portal and handoff page integration" },
  { slug: "supabase_mcp", label: "Supabase MCP / NocoDB", category: "orchestration", env: ["SUPABASE_ACCESS_TOKEN", "NOCODB_BASE_URL"], detect: (m) => !!m.supabase_mcp || !!m.nocodb, detail: "Event-store operations and spreadsheet workbench bridge" },
  { slug: "directus", label: "Directus", category: "asset", env: ["DIRECTUS_BASE_URL", "DIRECTUS_TOKEN"], detect: (m) => !!m.directus || !!m.sales_material_cms, detail: "Asset and proposal management studio" },
  { slug: "keystatic", label: "Keystatic", category: "demo", env: ["KEYSTATIC_BASE_URL", "NEXT_PUBLIC_KEYSTATIC_URL"], detect: (m) => !!m.keystatic || !!m.demo_site_cms, detail: "Git-backed CMS for Astro demo sites" },
  { slug: "chrome_mcp", label: "Chrome MCP", category: "orchestration", env: ["CHROME_MCP_URL"], detect: (m) => !!m.chrome_mcp, detail: "Operator-side browser verification and demo review" },
  { slug: "rsshub", label: "RSSHub", category: "analysis", env: ["RSSHUB_BASE_URL"], detect: (m) => !!m.rsshub, detail: "News and content-feed monitoring" },
  { slug: "wayback_machine", label: "Wayback Machine", category: "analysis", detect: (m) => !!m.wayback || !!m.wayback_machine, detail: "Historical website change evidence" },
  { slug: "common_crawl", label: "Common Crawl", category: "list", detect: (m) => !!m.common_crawl, detail: "Public web corpus discovery and historic page evidence" },
  { slug: "tranco", label: "Tranco List", category: "analysis", detect: (m) => !!m.tranco, detail: "Website rank and traffic-priority signal" },
  { slug: "rapidapi", label: "RapidAPI wrappers", category: "analysis", env: ["RAPIDAPI_KEY"], detect: (m) => !!m.rapidapi, detail: "Unofficial wrapper fallback for niche APIs" },
  { slug: "google_crux", label: "Google CrUX API", category: "analysis", env: ["GOOGLE_CRUX_API_KEY", "GOOGLE_PSI_API_KEY"], detect: (m) => !!m.crux, detail: "Field Core Web Vitals by origin" },
  { slug: "crunchbase_open_data", label: "Crunchbase Open Data Map", category: "list", env: ["CRUNCHBASE_API_KEY"], detect: (m) => !!m.crunchbase, detail: "Funding, category and company-map enrichment" },
  { slug: "meta_ad_library", label: "Meta Ad Library API", category: "analysis", env: ["META_AD_LIBRARY_ACCESS_TOKEN"], detect: (m) => !!m.meta_ad_library, detail: "Competitor ad and creative-volume evidence" },
  { slug: "cloudflare_radar", label: "Cloudflare Radar API", category: "analysis", env: ["CLOUDFLARE_API_TOKEN"], detect: (m) => !!m.cloudflare_radar, detail: "Market, traffic and internet trend evidence" },
  { slug: "massdns", label: "MassDNS", category: "analysis", env: ["MASSDNS_BIN"], detect: (m) => !!m.massdns, detail: "High-speed DNS resolution for subdomain evidence" },
  { slug: "subfinder", label: "Subfinder", category: "analysis", env: ["SUBFINDER_BIN"], detect: (m) => !!m.subfinder, detail: "Passive subdomain discovery" },
  { slug: "httpx", label: "httpx", category: "analysis", env: ["HTTPX_BIN"], detect: (m) => !!m.httpx, detail: "HTTP service fingerprint and liveness checks" },
  { slug: "crtsh", label: "crt.sh", category: "analysis", detect: (m) => !!m.crtsh, detail: "Certificate transparency subdomain evidence" },
  { slug: "abstract_api", label: "Abstract API", category: "analysis", env: ["ABSTRACT_API_KEY"], detect: (m) => !!m.abstract_api, detail: "Email, phone, IP and company-data enrichment fallback" },
  { slug: "mozscape", label: "MozScape API", category: "analysis", env: ["MOZ_ACCESS_ID", "MOZ_SECRET_KEY"], detect: (m) => !!m.mozscape, detail: "Domain authority and link evidence" },
  { slug: "storeleads_cartleads", label: "Storeleads / CartLeads", category: "list", env: ["STORELEADS_API_KEY", "CARTLEADS_API_KEY"], detect: (m) => !!m.storeleads || !!m.cartleads, detail: "E-commerce stack and store revenue context" },
  { slug: "github_rest", label: "GitHub REST API", category: "analysis", env: ["GITHUB_TOKEN"], detect: (m) => !!m.github, detail: "Open-source and hiring/engineering activity signal" },
  { slug: "appfigures_apptweak", label: "Appfigures / AppTweak", category: "analysis", env: ["APPFIGURES_CLIENT_KEY", "APPTWEAK_API_KEY"], detect: (m) => !!m.appfigures || !!m.apptweak, detail: "Mobile-app market and ASO evidence" },
  { slug: "ahrefs_free", label: "Ahrefs Free Traffic Checker", category: "analysis", env: ["AHREFS_FREE_CHECKER_URL"], detect: (m) => !!m.ahrefs, detail: "SEO traffic estimate via approved scraping/manual fallback" },
  { slug: "similarweb_free_ui", label: "Similarweb Free Web UI", category: "analysis", env: ["SIMILARWEB_API_KEY"], detect: (m) => !!m.similarweb, detail: "Traffic and competitor estimate via API or manual UI fallback" },
  { slug: "pytrends", label: "Pytrends OSS", category: "analysis", env: ["PYTRENDS_WORKER_URL"], detect: (m) => !!m.pytrends || !!m.google_trends, detail: "Search trend interest by market and industry" },
  { slug: "myipms", label: "Myip.ms", category: "analysis", env: ["MYIPMS_WORKER_URL"], detect: (m) => !!m.myipms, detail: "Hosting, IP and Shopify/store footprint evidence" },
  { slug: "whoogle", label: "Whoogle Search", category: "analysis", env: ["WHOOGLE_BASE_URL"], detect: (m) => !!m.whoogle, detail: "Self-hosted Google-search fallback" },
  { slug: "overpass", label: "Overpass API", category: "list", env: ["OVERPASS_API_URL"], detect: (m) => !!m.overpass, detail: "OpenStreetMap local business and location evidence" },
  { slug: "yelp_graphql", label: "Yelp GraphQL API", category: "list", env: ["YELP_API_KEY"], detect: (m) => !!m.yelp, detail: "Local review and business category evidence" },
  { slug: "rsshub_jobs", label: "Indeed / Glassdoor + RSSHub", category: "list", env: ["RSSHUB_BASE_URL", "RSSHUB_JOB_ROUTE_TEMPLATE"], detect: (m) => !!m.rsshub_jobs || !!m.job_signal, detail: "Hiring signal feed for budget and staff-shortage timing" },
  { slug: "wellfound_crawl4ai", label: "Wellfound + Crawl4AI", category: "list", env: ["WELLFOUND_SEARCH_URL", "CRAWL4AI_BASE_URL"], detect: (m) => !!m.wellfound, detail: "Funded startup and hiring-stage lead source" },
  { slug: "whoisds_nrd", label: "WhoisDS newly registered domains", category: "list", env: ["WHOISDS_NRD_URL"], detect: (m) => !!m.whoisds_nrd || !!m.new_domain_signal, detail: "Fresh domains that indicate newly launched businesses" },
  { slug: "agency_directory", label: "Clutch / Sortlist", category: "list", env: ["CLUTCH_SEARCH_URL", "SORTLIST_SEARCH_URL"], detect: (m) => !!m.clutch || !!m.sortlist || !!m.agency_directory, detail: "Agency directory source for white-label and overflow production offers" },
  { slug: "platform_experts", label: "Shopify / Webflow Experts", category: "list", env: ["SHOPIFY_EXPERTS_URL", "WEBFLOW_EXPERTS_URL"], detect: (m) => !!m.shopify_experts || !!m.webflow_experts, detail: "Certified partner directories for collaboration targets" },
  { slug: "theharvester", label: "theHarvester", category: "list", env: ["THEHARVESTER_BIN", "THEHARVESTER_WORKER_URL"], detect: (m) => !!m.theharvester, detail: "OSINT contact and subdomain collection fallback" },
  { slug: "hunter_snov", label: "Hunter.io / Snov.io", category: "list", env: ["HUNTER_API_KEY", "SNOV_CLIENT_ID", "SNOV_CLIENT_SECRET"], detect: (m) => !!m.hunter || !!m.snov, detail: "Email pattern and contact discovery" },
  { slug: "events_exhibitors", label: "EventsEye / 10times", category: "list", env: ["EVENTSEYE_SEARCH_URL", "TENTIMES_SEARCH_URL"], detect: (m) => !!m.eventseye || !!m.tentimes || !!m.events_exhibitors, detail: "Exhibitor lists for active marketing-budget signals" },
  { slug: "astro_demo", label: "Astro replacement demo", category: "demo", detect: (m) => !!m.demo_site, detail: "Generated demo page for the prospect" },
  { slug: "v0_demo", label: "v0 by Vercel demo accelerator", category: "demo", env: ["V0_API_KEY", "V0_WORKER_URL"], detect: (m) => !!m.v0_demo, detail: "AI-generated component and demo-site draft accelerator" },
  { slug: "gotenberg_slidev", label: "Slidev / Gotenberg", category: "demo", env: ["GOTENBERG_URL"], detect: (m) => !!m.slidev || !!m.gotenberg || !!m.sales_material_pdf, detail: "Proposal deck and PDF generation" },
  { slug: "openmontage", label: "OpenMontage orchestration", category: "video", env: ["OPENMONTAGE_API_URL", "OPENMONTAGE_API_KEY", "NEXT_PUBLIC_OPENMONTAGE_STUDIO_URL", "OPENMONTAGE_BASE_URL"], detect: (m) => !!m.openmontage || !!m.video_asset, detail: "Authenticated video-subscription orchestration and job routing" },
  { slug: "vast_runpod", label: "Vast.ai / Runpod GPU", category: "video", env: ["VAST_API_KEY", "RUNPOD_API_KEY"], detect: (m) => !!m.vast || !!m.runpod, detail: "Elastic GPU lane for heavy ComfyUI and avatar generation" },
  { slug: "comfyui", label: "ComfyUI API", category: "video", env: ["COMFYUI_API_URL", "COMFYUI_BASE_URL", "COMFYUI_API_KEY"], detect: (m) => !!m.comfyui, detail: "Authenticated image, background, avatar and scene asset generation" },
  { slug: "hyperframes", label: "HyperFrames", category: "video", env: ["HYPERFRAMES_RENDERER_URL", "HYPERFRAMES_API_URL", "HYPERFRAMES_API_KEY"], detect: (m) => !!m.hyperframes, detail: "HTML-first sales video compositions and motion templates" },
  { slug: "remotion_video", label: "Remotion", category: "video", env: ["REMOTION_RENDER_URL", "REMOTION_RENDERER_URL"], detect: (m) => !!m.remotion || !!m.video_asset, detail: "React-based data-driven sales video rendering" },
  { slug: "faster_whisper", label: "Faster Whisper", category: "video", env: ["FASTER_WHISPER_URL"], detect: (m) => !!m.faster_whisper, detail: "Fast transcription for captions and voiceover alignment" },
  { slug: "moviepy_short_video", label: "MoviePy / Short Video Maker", category: "video", env: ["MOVIEPY_WORKER_URL", "SHORT_VIDEO_MAKER_URL"], detect: (m) => !!m.moviepy || !!m.short_video_maker, detail: "Programmatic cuts, compilation and short-form output" },
  { slug: "liveportrait", label: "LivePortrait", category: "video", env: ["LIVEPORTRAIT_WORKER_URL"], detect: (m) => !!m.liveportrait, detail: "Talking-head and avatar motion generation" },
  { slug: "tts_stack", label: "Edge-TTS / CosyVoice / XTTSv2", category: "video", env: ["EDGE_TTS_WORKER_URL", "COSYVOICE_WORKER_URL", "XTTSV2_WORKER_URL"], detect: (m) => !!m.edge_tts || !!m.cosyvoice || !!m.xttsv2, detail: "Voiceover, multilingual narration and voice cloning lane" },
  { slug: "ffcreator_editly_ffmpeg", label: "FFCreator / Editly / FFmpeg", category: "video", env: ["FFCREATOR_WORKER_URL", "EDITLY_WORKER_URL", "FFMPEG_BIN"], detect: (m) => !!m.ffcreator || !!m.editly || !!m.ffmpeg, detail: "Final assembly, transitions, encoding and packaging" },
  { slug: "whisperx", label: "WhisperX", category: "video", env: ["WHISPERX_WORKER_URL"], detect: (m) => !!m.whisperx, detail: "Word-level subtitle timing and diarization" },
  { slug: "r2_video_delivery", label: "Cloudflare R2 delivery", category: "video", env: ["CLOUDFLARE_R2_ACCOUNT_ID", "CLOUDFLARE_R2_ACCESS_KEY_ID", "CLOUDFLARE_R2_SECRET_ACCESS_KEY", "CLOUDFLARE_R2_BUCKET", "R2_BUCKET", "CLOUDFLARE_R2_PUBLIC_BASE_URL", "R2_PUBLIC_BASE_URL"], detect: (m) => !!m.r2_asset || !!m.video_asset, detail: "Authenticated asset delivery for video and reports" },
  { slug: "stagehand", label: "Stagehand AI browser", category: "outreach", env: ["STAGEHAND_URL", "STAGEHAND_API_KEY"], detect: (m) => !!m.stagehand, detail: "AI browser agent for site extraction, form discovery and structured data" },
  { slug: "steel", label: "Steel.dev browser automation", category: "outreach", env: ["STEEL_BASE_URL"], detect: (m) => !!m.steel, detail: "Headless browser automation with stealth for page scraping and screenshots" },
  { slug: "skyvern", label: "Skyvern (legacy)", category: "outreach", env: ["SKYVERN_BASE_URL"], detect: (m) => !!m.skyvern, detail: "Legacy AI browser agent — replaced by Stagehand" },
  { slug: "dns_doh", label: "DNS records (DoH)", category: "analysis", env: [], detect: (m) => !!m.dns, detail: "DNS record analysis via Cloudflare DNS-over-HTTPS" },
  { slug: "w3c_validator", label: "W3C HTML Validator", category: "analysis", env: [], detect: (m) => !!m.w3c_validation, detail: "HTML standards compliance check" },
  { slug: "emailrep", label: "EmailRep.io", category: "analysis", env: [], detect: (m) => !!m.email_reputation, detail: "Email domain reputation check" },
  { slug: "phishtank", label: "PhishTank", category: "analysis", env: [], detect: (m) => !!m.phishtank, detail: "Phishing database check" },
  { slug: "opencorporates", label: "OpenCorporates", category: "list", env: [], detect: (m) => !!m.opencorporates, detail: "Global company registry search" },
  { slug: "green_web", label: "Green Web Foundation", category: "analysis", env: [], detect: (m) => !!m.green_hosting, detail: "Green hosting verification" },
  { slug: "builtwith_free", label: "BuiltWith Free", category: "analysis", env: [], detect: (m) => !!m.builtwith, detail: "Technology stack lookup via BuiltWith" },
  { slug: "whois_xml", label: "WhoisXML API", category: "analysis", env: ["WHOISXML_API_KEY"], detect: (m) => !!m.whois, detail: "Domain WHOIS ownership data" },
  { slug: "smb_signals", label: "SMB Signals", category: "analysis", env: [], detect: (m) => !!m.smb_signals, detail: "Small business digital presence signals" },
  { slug: "market_data", label: "e-Stat Market Data", category: "analysis", env: [], detect: (m) => !!m.market_data, detail: "Industry market statistics from e-Stat API" },
  { slug: "flowsint", label: "Flowsint OSINT", category: "list", env: ["FLOWSINT_API_URL", "FLOWSINT_API_TOKEN"], detect: (m) => !!m.flowsint, detail: "Flowsint internal OSINT aggregation" },
  { slug: "whoxy", label: "Whoxy API WHOIS", category: "list", env: ["WHOXY_API_KEY"], detect: (m) => !!m.whoxy, detail: "Whoxy WHOIS company name, country, email, registrar, dates" },
  { slug: "country_nic", label: "Country NIC RDAP", category: "list", env: [], detect: (m) => !!m.country_nic, detail: "Official NIC RDAP lookup — UK/DE/AU/JP/US/CA registries" },
  { slug: "manta", label: "Manta.com SMB", category: "list", env: [], detect: (m) => !!m.manta, detail: "US SMB directory — <10 employees, category, location" },
  { slug: "bbb", label: "BBB.org Businesses", category: "list", env: [], detect: (m) => !!m.bbb, detail: "US/CA BBB accredited local businesses — rating, years in business" },
  { slug: "hello_work", label: "Hello Work Jobs (JP)", category: "list", env: [], detect: (m) => !!m.hello_work, detail: "Japan Hello Work job postings — hiring SMBs by prefecture/industry" },
  { slug: "smb_purification", label: "SMB Pipeline 3-Stage", category: "orchestration", env: ["CRAWL4AI_BASE_URL"], detect: (m) => !!m.smb_pipeline, detail: "CZDS→Enterprise exclusion→Crawl4AI→Wappalyzer 3-stage filter" },
]

function hasConfiguredEnv(names?: string[]): boolean {
  if (!names || names.length === 0) return false
  return names.some((name) => {
    const value = process.env[name]
    return typeof value === "string" && value.trim().length > 0
  })
}

function scoreFor(status: SourceCoverageStatus): number {
  if (status === "collected") return 100
  if (status === "configured") return 65
  if (status === "queued") return 45
  if (status === "not_applicable") return 50
  return 0
}

function genericMeaning(source: SourceDefinition): string {
  if (source.category === "analysis") return "診断の根拠を増やし、技術的な事実を事業上の改善優先度に変換します。"
  if (source.category === "list") return "企業属性・地域・連絡先・予算シグナルを補強し、提案の外し方を減らします。"
  if (source.category === "outreach") return "レポートを届ける経路と営業実行の安全性を確認します。"
  if (source.category === "orchestration") return "人間判断・文面生成・ジョブ実行をつなぎ、営業を止めないための運用情報です。"
  if (source.category === "video") return "診断内容を短い動画に変換し、理解と共有の摩擦を下げます。"
  if (source.category === "demo") return "改善後の未来を見える化し、検討を抽象論から具体案に進めます。"
  return "営業判断に必要な追加証拠を補強します。"
}

function genericMissingConsequence(source: SourceDefinition): string {
  return `${source.label} が未取得のため、${source.detail} を根拠にした断定は避け、仮説として扱います。`
}

function genericNextStep(source: SourceDefinition): string {
  if (source.env?.length) return `${source.env[0]} を設定し、次回のカルテ生成ジョブで再取得します。`
  return `${source.label} の取得ジョブを再実行し、取得できない場合は手動確認キューに回します。`
}

const SOURCE_QUALITY_ALIASES: Record<string, string[]> = {
  pagespeed: ["scan"],
  lighthouse_api: ["scan"],
  html_metadata: ["scan"],
  security_headers_free: ["scan"],
  wappalyzer: ["wappalyzer"],
  whatweb: ["wappalyzer"],
  ssllabs: ["ssllabs"],
  gbizinfo: ["gbizinfo"],
  form_discovery_http: ["form_discovery"],
  crawl4ai: ["form_discovery"],
  cloudflare_radar: ["cloudflare_radar"],
  mozilla_observatory: ["mozilla_observatory"],
  dns_doh: ["dns"],
  hsts_preload: ["hsts"],
  wayback_machine: ["wayback"],
  open_corporates: ["opencorp"],
  github_rest: ["github"],
  common_crawl: ["commoncrawl"],
  spiderfoot: ["spiderfoot"],
  katana: ["katana"],
  maigret: ["maigret"],
  stagehand: ["stagehand_extract", "stagehand_forms"],
  steel: ["steel"],
  crawlee: ["crawlee"],
  schema_org: ["schema_org"],
  sitemap: ["sitemap"],
  safe_browsing: ["safe_browsing"],
  green_web: ["green_web"],
  builtwith_free: ["builtwith"],
  jina_reader: ["jina_reader"],
  website_assets: ["website_assets"],
  subfinder: ["subfinder"],
  trufflehog: ["trufflehog"],
}

function sourceQualityError(meta: JsonRecord, slug: string): string | null {
  const salesOs = asRecord(meta.sales_os)
  const sourceQuality = asRecord(salesOs.source_quality)
  const aliases = SOURCE_QUALITY_ALIASES[slug] ?? [slug]

  for (const alias of aliases) {
    const metric = asRecord(sourceQuality[alias]) as SourceQualityMetric
    const failed = typeof metric.failed === "number" ? metric.failed : 0
    const timeout = typeof metric.timeout === "number" ? metric.timeout : 0
    if (failed > 0 || timeout > 0) {
      const reason = typeof metric.lastError === "string" && metric.lastError.trim()
        ? metric.lastError.trim()
        : timeout > 0
          ? "timeout"
          : "source fetch failed"
      return `${alias}: ${reason}`
    }
  }

  return null
}

export function computeSourceCoverage(company: SalesCompany): SourceCoverageSnapshot {
  const meta = mergedCompanyMeta(company)
  const items = SOURCES.map((source): SourceCoverageItem => {
    const collected = source.detect(meta, company)
    const configured = hasConfiguredEnv(source.env)
    const sourceError = collected ? null : sourceQualityError(meta, source.slug)
    const status: SourceCoverageStatus = collected ? "collected" : sourceError ? "error" : configured ? "configured" : "missing"
    // ── Freshness scoring (migration_046): degrade score for stale data ──
    const maxAgeDays = source.maxAgeDays ?? null
    let freshnessScore = scoreFor(status)
    if (status === "collected" && maxAgeDays) {
      const measuredAt = getSourceMeasuredAt(company, source.slug)
      if (measuredAt) {
        const ageDays = (Date.now() - new Date(measuredAt).getTime()) / (1000 * 60 * 60 * 24)
        if (ageDays > maxAgeDays * 2) freshnessScore = 25
        else if (ageDays > maxAgeDays) freshnessScore = 50
      }
    }
    return {
      slug: source.slug,
      label: source.label,
      category: source.category,
      status,
      score: freshnessScore,
      detail: sourceError ? `${source.detail} / last error: ${sourceError}` : source.detail,
      meaning: source.meaning ?? genericMeaning(source),
      missingConsequence: source.missingConsequence ?? genericMissingConsequence(source),
      nextStep: sourceError ? `${source.label} failed previously; rerun the company enrichment job and keep this source isolated if it fails again.` : source.nextStep ?? genericNextStep(source),
    }
  })
  const scored = items.filter((item) => item.status !== "not_applicable")
  const total = scored.reduce((sum, item) => sum + item.score, 0)
  return {
    score: scored.length > 0 ? Math.round(total / scored.length) : 0,
    collected: items.filter((item) => item.status === "collected").length,
    configured: items.filter((item) => item.status === "configured").length,
    missing: items.filter((item) => item.status === "missing").length,
    items,
  }
}

function getSourceMeasuredAt(company: SalesCompany, slug: string): string | null {
  switch (slug) {
    case "pagespeed":
    case "lighthouse_api":
      return company.report_generated_at
    case "wappalyzer":
    case "whatweb":
      return companyTechStack(company) ? company.report_generated_at : null
    case "google_places":
      return typeof company.meta?.place === "object" && company.meta.place ? company.report_generated_at : null
    case "browser_screenshot":
      return companyVisualEvidence(company) ? company.report_generated_at : null
    case "japan_market_audit":
      return companyJapanMarketAudit(company) ? company.report_generated_at : null
    default:
      return null
  }
}

export async function saveSourceCoverageRows(company: SalesCompany): Promise<void> {
  const sb = getServiceSalesSupabase()
  if (!sb) return
  const coverage = computeSourceCoverage(company)
  const measuredAt = new Date().toISOString()
  const rows = coverage.items.map((item) => ({
    company_id: company.id,
    source_slug: item.slug,
    category: item.category,
    status: item.status,
    score: item.score,
    details: {
      label: item.label,
      detail: item.detail,
      meaning: item.meaning,
      missingConsequence: item.missingConsequence,
      nextStep: item.nextStep,
    },
    measured_at: measuredAt,
  }))

  const { error } = await sb
    .from(DB_TABLES.SALES_SOURCE_RUNS)
    .upsert(rows, { onConflict: "company_id,source_slug" })
  if (error) console.error("[source-coverage] upsert failed:", error.message)
}
