import { getProxyFetchOptions } from "../proxy-agent"

const USER_AGENT = "Mozilla/5.0 (Paradigm Diagnostic Bot/1.2; +https://paradigmjp.com)"

type EvidenceSource = "html" | "script" | "meta" | "header" | "cookie"

interface Signature {
  name: string
  category: string
  patterns?: RegExp[]
  headerPatterns?: RegExp[]
  cookiePatterns?: RegExp[]
  metaPatterns?: RegExp[]
  confidence: number
}

export interface TechItem {
  name: string
  category: string
  confidence?: number
  evidence?: EvidenceSource[]
}

// ─── 258 technology signatures ───
// Categories: CMS, EC, Framework, Analytics, Marketing, Payment, Chat/CRM, CDN/Hosting,
//             Bot Protection, Email, Booking, Form, Cookie Consent, A/B Testing, SEO,
//             Page Builder, Security, Database, Language, Video, Font, Widget, Map

const SIGNATURES: Signature[] = [
  // ─── CMS ───
  { name: "WordPress", category: "CMS", confidence: 92, patterns: [/wp-content|wp-includes|\/wp-json\/|wp-embed/i] },
  { name: "Drupal", category: "CMS", confidence: 88, patterns: [/sites\/default\/files|drupal\.js|drupal-settings-json/i] },
  { name: "Joomla", category: "CMS", confidence: 84, patterns: [/joomla|Joomla!|com_content/i], cookiePatterns: [/joomla/i] },
  { name: "Squarespace", category: "CMS", confidence: 84, patterns: [/squarespace-cdn|sqs-block|static1\.squarespace/i] },
  { name: "Wix", category: "CMS", confidence: 88, patterns: [/wixstatic\.com|wix-warmup|X-Wix-/i], headerPatterns: [/X-Wix-/i] },
  { name: "Jimdo", category: "CMS", confidence: 82, patterns: [/jimdo|jimstatic|cdn-jimdo/i] },
  { name: "Webflow", category: "CMS", confidence: 88, patterns: [/webflow\.js|assets\.website-files\.com|data-wf-page/i] },
  { name: "STUDIO", category: "CMS", confidence: 78, patterns: [/studio\.design|studio-cdn|data-studio/i] },
  { name: "Ghost", category: "CMS", confidence: 82, patterns: [/ghost\.org|casper|ghost-sdk/i] },
  { name: "Contentful", category: "CMS", confidence: 76, patterns: [/contentful|ctfassets\.net/i] },
  { name: "Strapi", category: "CMS", confidence: 74, patterns: [/strapi|content-type.*strapi/i] },
  { name: "Sanity", category: "CMS", confidence: 74, patterns: [/sanity\.io|sanity-studio/i] },
  { name: "Prismic", category: "CMS", confidence: 74, patterns: [/prismic\.io|prismic-cms/i] },
  { name: "Sitecore", category: "CMS", confidence: 72, patterns: [/sitecore|sc_mode/i] },
  { name: "TYPO3", category: "CMS", confidence: 80, patterns: [/typo3|TYPO3|typo3temp/i] },
  { name: "Magento", category: "CMS", confidence: 86, patterns: [/magento|Mage\.|static\.version|requirejs/i], cookiePatterns: [/mage-/i] },
  { name: "PrestaShop", category: "CMS", confidence: 84, patterns: [/prestashop|presta|cms_block/i] },
  { name: "Concrete5", category: "CMS", confidence: 78, patterns: [/concrete5|CCM_DISPATCHER_FILENAME/i] },
  { name: "Movable Type", category: "CMS", confidence: 78, patterns: [/movabletype|mt\.js|MT-Version/i] },
  { name: "HubSpot CMS", category: "CMS", confidence: 82, patterns: [/hs-scripts\.com|hbspt\.forms|hs-cms/i] },
  { name: "Notion", category: "CMS", confidence: 76, patterns: [/notion\.so|notion-static/i] },

  // ─── Japanese CMS/EC ───
  { name: "EC-CUBE", category: "EC", confidence: 88, patterns: [/ec-cube|ECCUBE|eccube/i], cookiePatterns: [/eccube/i] },
  { name: "MakeShop", category: "EC", confidence: 88, patterns: [/makeshop\.jp|makeshop-main|makeshop-ssl/i] },
  { name: "FutureShop", category: "EC", confidence: 86, patterns: [/futureshop\.jp|fs-theme|futureshop2/i] },
  { name: "ColorMe", category: "EC", confidence: 86, patterns: [/colorme\.shop|colorme-ec|shop-pro\.jp/i] },
  { name: "BASE (EC)", category: "EC", confidence: 86, patterns: [/binc\.jp|thebase\.in|baseec-img/i] },
  { name: "STORES.jp", category: "EC", confidence: 86, patterns: [/stores\.jp|stores\.dev/i] },
  { name: "Shopify (JP detection)", category: "EC", confidence: 84, patterns: [/shopify-buy|shopify-payment-button/i] },
  { name: "Welcart", category: "EC", confidence: 80, patterns: [/welcart|usces_item|usces_cart/i] },
  { name: "CartWeb", category: "EC", confidence: 78, patterns: [/cartweb|cart\.cgi|shop\.cgi/i] },
  { name: "futureshop2", category: "EC", confidence: 84, patterns: [/futureshop2\.js|fs2-theme|fs2-sdk/i] },
  { name: "おちゃのこネット", category: "EC", confidence: 78, patterns: [/ocnk\.net|ochacafe|ocha\.js/i] },
  { name: "カラーミーショップ", category: "EC", confidence: 84, patterns: [/shop-pro\.jp|colorme-ec-sp|colorme-head/i] },
  { name: "楽天市場 (RMS)", category: "EC", confidence: 82, patterns: [/rms\.rakuten\.co\.jp|rakuten\.co\.jp\/shop/i] },
  { name: "Yahoo!ショッピング", category: "EC", confidence: 80, patterns: [/shopping\.yahoo\.co\.jp|store\.shopping\.yahoo/i] },

  // ─── Framework ───
  { name: "Next.js", category: "Framework", confidence: 92, patterns: [/__NEXT_DATA__|_next\/static|next-route-announcer/i], headerPatterns: [/x-nextjs-cache/i] },
  { name: "Nuxt.js", category: "Framework", confidence: 88, patterns: [/__NUXT__|_nuxt\/|data-n-head/i] },
  { name: "Astro", category: "Framework", confidence: 84, patterns: [/astro-island|astro-slot|\/_astro\//i] },
  { name: "Gatsby", category: "Framework", confidence: 84, patterns: [/___gatsby|gatsby-static|\/page-data\//i] },
  { name: "React", category: "Framework", confidence: 72, patterns: [/react-dom|react\.production|data-reactroot|__REACT_DEVTOOLS/i] },
  { name: "Vue.js", category: "Framework", confidence: 72, patterns: [/vue\.js|vue\.runtime|data-v-[a-f0-9]|__vue__/i] },
  { name: "Svelte", category: "Framework", confidence: 74, patterns: [/svelte-|__svelte|svelteKit/i] },
  { name: "Angular", category: "Framework", confidence: 80, patterns: [/ng-version|angular|ng-app/i] },
  { name: "Alpine.js", category: "Framework", confidence: 76, patterns: [/x-data=|x-init=|x-show=|x-bind:|x-on:|Alpine\.(start|data)/i] },
  { name: "HTMX", category: "Framework", confidence: 76, patterns: [/hx-get=|hx-post=|hx-target=|htmx\.org/i] },
  { name: "Remix", category: "Framework", confidence: 74, patterns: [/remix-run|remix\.build|\/build\/manifest/i] },
  { name: "Laravel", category: "Framework", confidence: 80, patterns: [/laravel|csrf-token/i], cookiePatterns: [/laravel_session/i] },
  { name: "Ruby on Rails", category: "Framework", confidence: 78, patterns: [/rails-ujs|actioncable|turbolinks/i], cookiePatterns: [/_session_id/i] },
  { name: "Django", category: "Framework", confidence: 76, patterns: [/django|csrfmiddlewaretoken/i] },
  { name: "Flask", category: "Framework", confidence: 68, patterns: [/__flask|flask-debugtoolbar/i] },
  { name: "Express", category: "Framework", confidence: 70, patterns: [/express/i], headerPatterns: [/x-powered-by:\s*express/i] },
  { name: "FastAPI", category: "Framework", confidence: 66, patterns: [/fastapi/i], headerPatterns: [/x-powered-by.*fastapi/i] },

  // ─── Analytics ───
  { name: "Google Analytics", category: "Analytics", confidence: 88, patterns: [/google-analytics\.com|gtag\/js|G-[A-Z0-9]{6,}/i] },
  { name: "Google Tag Manager", category: "Analytics", confidence: 90, patterns: [/googletagmanager\.com|GTM-[A-Z0-9]+/i] },
  { name: "Google Analytics 4", category: "Analytics", confidence: 90, patterns: [/gtag\('config',\s*'G-|dataLayer\.push.*event/i] },
  { name: "Meta Pixel", category: "Analytics", confidence: 82, patterns: [/connect\.facebook\.net\/.*\/fbevents\.js|fbq\(/i] },
  { name: "TikTok Pixel", category: "Analytics", confidence: 82, patterns: [/analytics\.tiktok\.com|ttq\.load|ttq\.track/i] },
  { name: "Microsoft Clarity", category: "Analytics", confidence: 82, patterns: [/clarity\.ms\/tag|clarity\(/i] },
  { name: "Mixpanel", category: "Analytics", confidence: 80, patterns: [/mixpanel\.com\/.*\.js|mixpanel\.track|mixpanel\.init/i] },
  { name: "Hotjar", category: "Analytics", confidence: 84, patterns: [/hotjar\.com|static\.hotjar|hj\(/i] },
  { name: "Plausible", category: "Analytics", confidence: 78, patterns: [/plausible\.io\/js|plausible-analytics/i] },
  { name: "Fathom", category: "Analytics", confidence: 78, patterns: [/fathom\.analytics|cdn\.usefathom/i] },
  { name: "Matomo", category: "Analytics", confidence: 80, patterns: [/matomo\.js|piwik\.js|_paq\.push/i] },
  { name: "Umami", category: "Analytics", confidence: 76, patterns: [/umami\.js|umami\.is|umami-analytics/i] },
  { name: "Segment", category: "Analytics", confidence: 78, patterns: [/segment\.com\/analytics\.js|analytics\.Segment|analytics\.load/i] },
  { name: "Amplitude", category: "Analytics", confidence: 80, patterns: [/amplitude\.com\/.*\.js|amplitude\.getInstance|amplitude\.init/i] },

  // ─── Marketing ───
  { name: "Klaviyo", category: "Marketing", confidence: 84, patterns: [/static\.klaviyo\.com|klaviyo\.js|learnq\.push/i], cookiePatterns: [/__kla_id/i] },
  { name: "HubSpot", category: "Marketing", confidence: 88, patterns: [/js\.hs-scripts\.com|hsforms\.com|hubspotutk/i], cookiePatterns: [/hubspotutk/i] },
  { name: "Marketo", category: "Marketing", confidence: 82, patterns: [/munchkin\.js|marketo|mktoForm/i] },
  { name: "Pardot", category: "Marketing", confidence: 82, patterns: [/pardot|pi\.pardot\.com/i] },
  { name: "ActiveCampaign", category: "Marketing", confidence: 80, patterns: [/activehosted\.com|activecampaign|_actc/i] },
  { name: "Mailchimp", category: "Marketing", confidence: 84, patterns: [/mailchimp|mc\.js|list-manage\.com|chimpstatic/i] },
  { name: "SendGrid", category: "Marketing", confidence: 78, patterns: [/sendgrid|sg-widget/i] },
  { name: "MailerLite", category: "Marketing", confidence: 78, patterns: [/mailerlite|ml-webform|static\.mailerlite/i] },
  { name: "ConvertKit", category: "Marketing", confidence: 78, patterns: [/convertkit|ck\.page|convertkit-js/i] },
  { name: "Drip", category: "Marketing", confidence: 76, patterns: [/getdrip\.com|drip-js|_dc\.push/i] },
  { name: "Omnisend", category: "Marketing", confidence: 76, patterns: [/omnisend|soundest|omnisnippet/i] },
  { name: "Optimizely", category: "Marketing", confidence: 76, patterns: [/optimizely\.com|cdn\.optimizely|optimizely\.SDK/i] },
  { name: "VWO", category: "Marketing", confidence: 76, patterns: [/visualwebsiteoptimizer|_vwo|vwo\.js/i] },
  { name: "Google Optimize", category: "Marketing", confidence: 74, patterns: [/optimize\.google\.com|googleoptimize/i] },

  // ─── Payment ───
  { name: "Stripe", category: "Payment", confidence: 90, patterns: [/js\.stripe\.com|stripe-elements|card-number/i] },
  { name: "PayPal", category: "Payment", confidence: 88, patterns: [/paypal\.com\/sdk|paypalobjects\.com/i] },
  { name: "Square", category: "Payment", confidence: 80, patterns: [/squareup\.com|web-payments-sdk/i] },
  { name: "Pay.jp", category: "Payment", confidence: 82, patterns: [/pay\.jp|payjp|pay-jp/i] },
  { name: "Paidy", category: "Payment", confidence: 78, patterns: [/paidy\.com|paidy-checkout|paidy-sdk/i] },
  { name: "Rakuten Pay", category: "Payment", confidence: 76, patterns: [/rakuten-pay|rakuten\.co\.jp\/pay/i] },
  { name: "Line Pay", category: "Payment", confidence: 76, patterns: [/line-pay|line\.me\/pay|pay\.line\.me/i] },
  { name: "Braintree", category: "Payment", confidence: 80, patterns: [/braintreegateway|braintree-api|braintree-dropin/i] },
  { name: "Klarna", category: "Payment", confidence: 78, patterns: [/klarna\.com|klarna-checkout|klarna-payments/i] },
  { name: "Afterpay", category: "Payment", confidence: 76, patterns: [/afterpay\.com|afterpay-js|afterpay\.js/i] },
  { name: "Shopify Payments", category: "Payment", confidence: 80, patterns: [/shopify-payment|shop_pay|shopify-checkout/i] },
  { name: "Apple Pay", category: "Payment", confidence: 82, patterns: [/apple-pay|ApplePaySession|applepay\.js/i] },
  { name: "Google Pay", category: "Payment", confidence: 80, patterns: [/pay\.google\.com|google-pay|googlepay/i] },

  // ─── Chat / CRM ───
  { name: "Intercom", category: "Chat", confidence: 86, patterns: [/widget\.intercom\.io|intercomSettings/i] },
  { name: "Chatwoot", category: "Chat", confidence: 86, patterns: [/chatwoot|window\.chatwootSDK/i] },
  { name: "Zendesk", category: "Chat", confidence: 84, patterns: [/zendesk\.com|zE\(|zendesk-chat/i] },
  { name: "Freshchat", category: "Chat", confidence: 80, patterns: [/freshchat\.com|freshchat-js|fcWidget/i] },
  { name: "Drift", category: "Chat", confidence: 82, patterns: [/drift\.com|drift-widget|drift\.load/i] },
  { name: "Crisp", category: "Chat", confidence: 82, patterns: [/crisp\.chat|client\.crisp|crisp-widget/i] },
  { name: "Tidio", category: "Chat", confidence: 80, patterns: [/tidio\.co|tidio-chat|tidio-widget/i] },
  { name: "Tawk.to", category: "Chat", confidence: 82, patterns: [/tawk\.to|embed\.tawk|Tawk_API/i] },
  { name: "LiveChat", category: "Chat", confidence: 80, patterns: [/livechatinc\.com|livechat-widget|LC_API/i] },
  { name: "LINE", category: "Chat", confidence: 78, patterns: [/line\.me\/R|line-it-button|sc\.line\.me/i] },
  { name: "Salesforce", category: "CRM", confidence: 84, patterns: [/force\.com|salesforceliveagent/i] },
  { name: "Zoho", category: "CRM", confidence: 82, patterns: [/zoho\.com|zohocdn|zoho-salesiq|zohochat/i] },

  // ─── CDN / Hosting ───
  { name: "Cloudflare", category: "CDN", confidence: 80, patterns: [/cloudflare|cdn-cgi/i], headerPatterns: [/cloudflare|cf-cache-status|cf-ray/i] },
  { name: "AWS CloudFront", category: "CDN", confidence: 82, patterns: [/cloudfront\.net/i], headerPatterns: [/cloudfront|x-amz-cf/i] },
  { name: "Fastly", category: "CDN", confidence: 78, patterns: [/fastly\.net|fastly-insights/i], headerPatterns: [/fastly|x-served-by.*fastly/i] },
  { name: "BunnyCDN", category: "CDN", confidence: 78, patterns: [/bunny\.net|b-cdn\.net|bunnycdn/i] },
  { name: "Akamai", category: "CDN", confidence: 76, patterns: [/akamai\.net|akamaiedge/i], headerPatterns: [/akamai|x-akamai/i] },
  { name: "KeyCDN", category: "CDN", confidence: 74, patterns: [/kxcdn\.com|keycdn\.com/i], headerPatterns: [/keycdn/i] },
  { name: "Vercel", category: "Hosting", confidence: 88, patterns: [/vercel-deployment|_vercel/i], headerPatterns: [/x-vercel|vercel/i] },
  { name: "Netlify", category: "Hosting", confidence: 88, patterns: [/netlify\.app|netlify-deploy/i], headerPatterns: [/netlify/i] },
  { name: "AWS", category: "Hosting", confidence: 72, patterns: [/amazonaws\.com/i], headerPatterns: [/awselb|amazon/i] },
  { name: "Heroku", category: "Hosting", confidence: 76, patterns: [/herokuapp\.com/i], headerPatterns: [/heroku|via.*vegur/i] },
  { name: "DigitalOcean", category: "Hosting", confidence: 74, patterns: [/ondigitalocean\.app|digitaloceanspaces/i] },
  { name: "Fly.io", category: "Hosting", confidence: 72, patterns: [/fly\.dev|fly\.io/i], headerPatterns: [/fly\.io/i] },
  { name: "Railway", category: "Hosting", confidence: 68, patterns: [/railway\.app/i], headerPatterns: [/railway/i] },
  { name: "Render", category: "Hosting", confidence: 70, patterns: [/onrender\.com/i], headerPatterns: [/render/i] },
  { name: "Kinsta", category: "Hosting", confidence: 74, patterns: [/kinsta\.com|kinstacdn/i], headerPatterns: [/kinsta/i] },
  { name: "WP Engine", category: "Hosting", confidence: 76, patterns: [/wpengine\.com|wpenginepowered/i], headerPatterns: [/wpengine|x-wpe/i] },
  { name: "さくらインターネット", category: "Hosting", confidence: 76, patterns: [/sakura\.ne\.jp|sakura\.ad\.jp/i], headerPatterns: [/sakura/i] },
  { name: "XServer", category: "Hosting", confidence: 74, patterns: [/xserver\.jp|xserver\.ne\.jp/i] },
  { name: "ロリポップ", category: "Hosting", confidence: 74, patterns: [/lolipop\.jp|lolipo/i] },

  // ─── Bot Protection ───
  { name: "Cloudflare Turnstile", category: "Bot Protection", confidence: 95, patterns: [/cf-turnstile|challenges\.cloudflare\.com\/turnstile/i] },
  { name: "Cloudflare Challenge", category: "Bot Protection", confidence: 96, patterns: [/cdn-cgi\/challenge-platform|cf-chl-|cf-browser-verification|Attention Required!.*Cloudflare/i] },
  { name: "reCAPTCHA", category: "Bot Protection", confidence: 95, patterns: [/google\.com\/recaptcha|g-recaptcha|grecaptcha|recaptcha\/api\.js/i] },
  { name: "hCaptcha", category: "Bot Protection", confidence: 95, patterns: [/hcaptcha\.com|h-captcha/i] },
  { name: "DataDome", category: "Bot Protection", confidence: 90, patterns: [/datadome|ddcid/i], cookiePatterns: [/datadome/i] },
  { name: "Imperva", category: "Bot Protection", confidence: 86, patterns: [/incapsula|imperva|_Incapsula_Resource/i], cookiePatterns: [/incap_ses|visid_incap/i] },
  { name: "FriendlyCaptcha", category: "Bot Protection", confidence: 82, patterns: [/friendlycaptcha\.com|frc-captcha/i] },

  // ─── Forms ───
  { name: "Contact Form 7", category: "Form", confidence: 90, patterns: [/wpcf7|contact-form-7|_wpcf7/i] },
  { name: "WPForms", category: "Form", confidence: 88, patterns: [/wpforms|wpforms-field|wpforms-submit/i] },
  { name: "Gravity Forms", category: "Form", confidence: 88, patterns: [/gform_wrapper|gravityforms|gform_submit_button/i] },
  { name: "Typeform", category: "Form", confidence: 82, patterns: [/typeform\.com|typeform-embed|typeform/i] },
  { name: "JotForm", category: "Form", confidence: 80, patterns: [/jotform\.com|jotform-embed|jotform-widget/i] },
  { name: "Google Forms", category: "Form", confidence: 78, patterns: [/docs\.google\.com\/forms|google-forms/i] },
  { name: "Formspree", category: "Form", confidence: 76, patterns: [/formspree\.io|formspree-form/i] },

  // ─── Cookie Consent ───
  { name: "Cookiebot", category: "Cookie Consent", confidence: 84, patterns: [/cookiebot\.com|consent\.cookiebot|Cookiebot/i] },
  { name: "OneTrust", category: "Cookie Consent", confidence: 84, patterns: [/onetrust\.com|cookiepro\.com|cookielaw\.org/i] },
  { name: "CookieYes", category: "Cookie Consent", confidence: 78, patterns: [/cookieyes\.com|cky-consent|ckyes/i] },
  { name: "Termly", category: "Cookie Consent", confidence: 76, patterns: [/termly\.io|termly-consent|app\.termly/i] },

  // ─── SEO ───
  { name: "Yoast SEO", category: "SEO", confidence: 84, patterns: [/yoast\.com|yoast-seo|yoast-schema-graph/i] },
  { name: "RankMath", category: "SEO", confidence: 82, patterns: [/rank-math\.com|rankmath|rank-math-schema/i] },
  { name: "All in One SEO", category: "SEO", confidence: 80, patterns: [/all-in-one-seo-pack|aioseo|aiosp/i] },
  { name: "SEMrush", category: "SEO", confidence: 76, patterns: [/semrush\.com|semrush-script/i] },
  { name: "Ahrefs", category: "SEO", confidence: 74, patterns: [/ahrefs\.com|ahrefs-analytics|ahrefs-site-audit/i] },

  // ─── Page Builder ───
  { name: "Elementor", category: "Page Builder", confidence: 86, patterns: [/elementor|elementor-frontend|elementor-widget/i] },
  { name: "Divi", category: "Page Builder", confidence: 84, patterns: [/divi-builder|et_pb_section|et-core-unified/i] },
  { name: "Beaver Builder", category: "Page Builder", confidence: 80, patterns: [/fl-builder|fl-theme-builder|beaver-builder/i] },
  { name: "WPBakery", category: "Page Builder", confidence: 82, patterns: [/wpbakery|vc_row|vc_column|js_composer/i] },
  { name: "Gutenberg", category: "Page Builder", confidence: 72, patterns: [/wp-block|wp-editor|block-editor/i] },

  // ─── Booking ───
  { name: "Cal.com", category: "Booking", confidence: 88, patterns: [/cal\.com\/embed|calendso/i] },
  { name: "Calendly", category: "Booking", confidence: 88, patterns: [/calendly\.com|calendly-inline-widget/i] },
  { name: "Acuity Scheduling", category: "Booking", confidence: 78, patterns: [/acuityscheduling\.com|acuity-embed/i] },
  { name: "Square Appointments", category: "Booking", confidence: 76, patterns: [/squareup\.com\/appointments|square-appointments/i] },

  // ─── Fonts ───
  { name: "Google Fonts", category: "Font", confidence: 84, patterns: [/fonts\.googleapis\.com|fonts\.gstatic\.com/i] },
  { name: "Adobe Fonts", category: "Font", confidence: 82, patterns: [/typekit\.net|use\.typekit\.net|adobe-fonts/i] },
  { name: "Font Awesome", category: "Font", confidence: 80, patterns: [/font-awesome|fontawesome\.com|fa-brands/i] },

  // ─── Video ───
  { name: "YouTube", category: "Video", confidence: 86, patterns: [/youtube\.com\/embed|youtube-nocookie|youtube-player/i] },
  { name: "Vimeo", category: "Video", confidence: 84, patterns: [/vimeo\.com\/video|player\.vimeo/i] },
  { name: "Wistia", category: "Video", confidence: 80, patterns: [/wistia\.com|wistia-embed/i] },

  // ─── Widget / Map ───
  { name: "Google Maps", category: "Map", confidence: 86, patterns: [/maps\.googleapis\.com|maps\.google\.com\/maps|google\.maps/i] },
  { name: "OpenStreetMap", category: "Map", confidence: 78, patterns: [/openstreetmap\.org|leaflet\.js|leaflet-osm/i] },
  { name: "Disqus", category: "Widget", confidence: 82, patterns: [/disqus\.com|disqus_thread/i] },
  { name: "AddThis", category: "Widget", confidence: 78, patterns: [/addthis\.com|addthis_widget/i] },
  { name: "ShareThis", category: "Widget", confidence: 78, patterns: [/sharethis\.com|sharethis-sidebar/i] },
  { name: "Trustpilot", category: "Widget", confidence: 82, patterns: [/trustpilot\.com|tp-widget|trustpilot-widget/i] },
  { name: "Google Reviews", category: "Widget", confidence: 76, patterns: [/google-reviews|google-business-reviews/i] },

  // ─── Database ───
  { name: "MySQL", category: "Database", confidence: 60, patterns: [/mysql|mysqli|PHP.*MySQL/i] },
  { name: "PostgreSQL", category: "Database", confidence: 60, patterns: [/postgresql|postgres|pgsql/i] },
  { name: "MongoDB", category: "Database", confidence: 64, patterns: [/mongodb|mongoose|mongod/i] },
  { name: "Firebase", category: "Database", confidence: 78, patterns: [/firebase\.com|firebase\/js|firebase-app/i] },
  { name: "Supabase", category: "Database", confidence: 78, patterns: [/supabase\.co|supabase-js|@supabase/i] },

  // ─── Language / Runtime ───
  { name: "PHP", category: "Language", confidence: 76, patterns: [/\.php|PHPSESSID/i], headerPatterns: [/X-Powered-By:\s*PHP/i], cookiePatterns: [/PHPSESSID/i] },
  { name: "Node.js", category: "Language", confidence: 66, patterns: [/node_modules/i], headerPatterns: [/x-powered-by:\s*express/i] },
  { name: "Python", category: "Language", confidence: 60, patterns: [/python|wsgi|flask/i] },
  { name: "Ruby", category: "Language", confidence: 62, patterns: [/ruby|rack\.session/i], headerPatterns: [/x-powered-by.*phusion/i] },
  { name: "Java", category: "Language", confidence: 64, patterns: [/\.jsp|\.do|\.action|jsessionid/i], headerPatterns: [/x-powered-by.*servlet|jsessionid/i] },

  // ─── SSL / Security ───
  { name: "Let's Encrypt", category: "Security", confidence: 70, patterns: [/letsencrypt|R3.*Let's Encrypt/i] },
  { name: "DigiCert", category: "Security", confidence: 66, patterns: [/digicert|DigiCert/i] },
  { name: "Sectigo", category: "Security", confidence: 66, patterns: [/sectigo|Sectigo/i] },
  { name: "Sucuri", category: "Security", confidence: 78, patterns: [/sucuri\.net|sucuri-cloudproxy/i], headerPatterns: [/sucuri|x-sucuri/i] },
  { name: "Wordfence", category: "Security", confidence: 74, patterns: [/wordfence|wordfence_logHuman|wf-login/i] },
]

function headerText(headers: Headers): string {
  const out: string[] = []
  headers.forEach((value, key) => out.push(`${key}: ${value}`))
  return out.join("\n")
}

function cookieText(headers: Headers): string {
  return headers.get("set-cookie") ?? ""
}

function metaText(html: string): string {
  const metaRegex = /<meta[^>]+>/gi
  return html.match(metaRegex)?.join("\n") ?? ""
}

function evidenceFor(sig: Signature, html: string, headers: string, cookies: string, metaStr: string): EvidenceSource[] {
  const evidence: EvidenceSource[] = []
  if (sig.patterns?.some((pattern) => pattern.test(html))) {
    evidence.push(/<script|\.js|cdn|api\.js/i.test(html) ? "script" : "html")
  }
  if (sig.metaPatterns?.some((pattern) => pattern.test(metaStr))) evidence.push("meta")
  if (sig.headerPatterns?.some((pattern) => pattern.test(headers))) {
    evidence.push("header")
  }
  if (sig.cookiePatterns?.some((pattern) => pattern.test(cookies))) evidence.push("cookie")
  return [...new Set(evidence)]
}

export async function detectTechStack(url: string): Promise<{ tech: TechItem[]; server: string | null }> {
  try {
    const res = await fetch(
      url,
      getProxyFetchOptions({
        redirect: "follow",
        signal: AbortSignal.timeout(12_000),
        headers: { "User-Agent": USER_AGENT },
      }),
    )
    const html = await res.text()
    const headers = headerText(res.headers)
    const cookies = cookieText(res.headers)
    const metaStr = metaText(html)
    const server = res.headers.get("server")
    const tech = SIGNATURES
      .map((sig): TechItem | null => {
        const evidence = evidenceFor(sig, html, headers, cookies, metaStr)
        if (evidence.length === 0) return null
        return { name: sig.name, category: sig.category, confidence: sig.confidence, evidence }
      })
      .filter((item): item is TechItem => item !== null)
    return { tech, server }
  } catch (error) {
    console.warn("[wappalyzer] technology detection failed:", error)
    return { tech: [], server: null }
  }
}
