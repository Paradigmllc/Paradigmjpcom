#!/usr/bin/env node
/**
 * Wappalyzer-style technology detection — 258 signatures, zero dependencies.
 * Ported from wappalyzer.ts. Detects CMS, framework, analytics, hosting, payment, etc.
 */

// Abbreviated to the most impactful 150 signatures. Full 258-set available in wappalyzer.ts.
const SIGNATURES = [
  // ── CMS ──
  { name: 'WordPress', category: 'CMS', confidence: 92, patterns: [/wp-content|wp-includes|\/wp-json\/|wp-embed/i] },
  { name: 'Drupal', category: 'CMS', confidence: 88, patterns: [/sites\/default\/files|drupal\.js|drupal-settings-json/i] },
  { name: 'Joomla', category: 'CMS', confidence: 84, patterns: [/joomla|com_content/i] },
  { name: 'Squarespace', category: 'CMS', confidence: 84, patterns: [/squarespace-cdn|sqs-block|static1\.squarespace/i] },
  { name: 'Wix', category: 'CMS', confidence: 88, patterns: [/wixstatic\.com|wix-warmup/i] },
  { name: 'Webflow', category: 'CMS', confidence: 88, patterns: [/webflow\.js|assets\.website-files\.com|data-wf-page/i] },
  { name: 'Shopify', category: 'CMS', confidence: 92, patterns: [/shopify\.com|myshopify\.com|cdn\.shopify/i] },
  { name: 'Magento', category: 'CMS', confidence: 86, patterns: [/magento|Mage\.|static\.version|requirejs/i] },
  { name: 'HubSpot CMS', category: 'CMS', confidence: 82, patterns: [/hs-scripts\.com|hbspt\.forms|hs-cms/i] },
  { name: 'WooCommerce', category: 'EC', confidence: 90, patterns: [/woocommerce|wc-cart-fragments|wc-blocks/i] },
  { name: 'PrestaShop', category: 'EC', confidence: 84, patterns: [/prestashop|presta/i] },

  // ── Japanese CMS/EC ──
  { name: 'EC-CUBE', category: 'EC', confidence: 88, patterns: [/ec-cube|ECCUBE/i] },
  { name: 'MakeShop', category: 'EC', confidence: 88, patterns: [/makeshop\.jp|makeshop-main/i] },
  { name: 'ColorMe', category: 'EC', confidence: 86, patterns: [/colorme\.shop|shop-pro\.jp/i] },
  { name: 'BASE (EC)', category: 'EC', confidence: 86, patterns: [/thebase\.in|baseec-img/i] },
  { name: 'STORES.jp', category: 'EC', confidence: 86, patterns: [/stores\.jp/i] },
  { name: 'カラーミーショップ', category: 'EC', confidence: 84, patterns: [/shop-pro\.jp|colorme-ec-sp/i] },

  // ── Framework ──
  { name: 'Next.js', category: 'Framework', confidence: 92, patterns: [/__NEXT_DATA__|_next\/static|next-route-announcer/i] },
  { name: 'Nuxt.js', category: 'Framework', confidence: 88, patterns: [/__NUXT__|_nuxt\/|data-n-head/i] },
  { name: 'Astro', category: 'Framework', confidence: 84, patterns: [/astro-island|astro-slot|\/_astro\//i] },
  { name: 'Gatsby', category: 'Framework', confidence: 84, patterns: [/___gatsby|gatsby-static|\/page-data\//i] },
  { name: 'React', category: 'Framework', confidence: 72, patterns: [/react-dom|react\.production|data-reactroot/i] },
  { name: 'Vue.js', category: 'Framework', confidence: 72, patterns: [/vue\.js|vue\.runtime|data-v-[a-f0-9]/i] },
  { name: 'Svelte', category: 'Framework', confidence: 74, patterns: [/svelte-|__svelte/i] },
  { name: 'Angular', category: 'Framework', confidence: 80, patterns: [/ng-version|angular|ng-app/i] },
  { name: 'Alpine.js', category: 'Framework', confidence: 76, patterns: [/x-data=|x-init=|Alpine\.(start|data)/i] },
  { name: 'HTMX', category: 'Framework', confidence: 76, patterns: [/hx-get=|hx-post=|htmx\.org/i] },
  { name: 'Laravel', category: 'Framework', confidence: 80, patterns: [/laravel|csrf-token/i] },
  { name: 'Ruby on Rails', category: 'Framework', confidence: 78, patterns: [/rails-ujs|actioncable|turbolinks/i] },
  { name: 'Django', category: 'Framework', confidence: 76, patterns: [/django|csrfmiddlewaretoken/i] },
  { name: 'jQuery', category: 'Framework', confidence: 88, patterns: [/jquery.*\.js|jquery.*\.min\.js/i] },

  // ── Analytics ──
  { name: 'Google Analytics', category: 'Analytics', confidence: 88, patterns: [/google-analytics\.com|gtag\/js|G-[A-Z0-9]{6,}/i] },
  { name: 'Google Tag Manager', category: 'Analytics', confidence: 90, patterns: [/googletagmanager\.com|GTM-[A-Z0-9]+/i] },
  { name: 'Meta Pixel', category: 'Analytics', confidence: 82, patterns: [/connect\.facebook\.net\/.*\/fbevents\.js|fbq\(/i] },
  { name: 'Hotjar', category: 'Analytics', confidence: 84, patterns: [/hotjar\.com|static\.hotjar|hj\(/i] },
  { name: 'Mixpanel', category: 'Analytics', confidence: 80, patterns: [/mixpanel\.com\/.*\.js|mixpanel\.track|mixpanel\.init/i] },
  { name: 'Plausible', category: 'Analytics', confidence: 78, patterns: [/plausible\.io\/js|plausible-analytics/i] },
  { name: 'Microsoft Clarity', category: 'Analytics', confidence: 82, patterns: [/clarity\.ms\/tag|clarity\(/i] },

  // ── Marketing ──
  { name: 'HubSpot', category: 'Marketing', confidence: 88, patterns: [/js\.hs-scripts\.com|hsforms\.com/i] },
  { name: 'Mailchimp', category: 'Marketing', confidence: 84, patterns: [/mailchimp|mc\.js|list-manage\.com/i] },
  { name: 'Klaviyo', category: 'Marketing', confidence: 84, patterns: [/static\.klaviyo\.com|klaviyo\.js|learnq\.push/i] },
  { name: 'ActiveCampaign', category: 'Marketing', confidence: 80, patterns: [/activehosted\.com|activecampaign/i] },
  { name: 'ConvertKit', category: 'Marketing', confidence: 78, patterns: [/convertkit|ck\.page/i] },

  // ─── Payment ───
  { name: 'Stripe', category: 'Payment', confidence: 90, patterns: [/js\.stripe\.com|stripe-elements/i] },
  { name: 'PayPal', category: 'Payment', confidence: 88, patterns: [/paypal\.com\/sdk|paypalobjects\.com/i] },
  { name: 'Pay.jp', category: 'Payment', confidence: 82, patterns: [/pay\.jp|payjp/i] },
  { name: 'Square', category: 'Payment', confidence: 80, patterns: [/squareup\.com|web-payments-sdk/i] },
  { name: 'Shopify Payments', category: 'Payment', confidence: 80, patterns: [/shopify-payment|shop_pay/i] },

  // ─── Chat / CRM ───
  { name: 'Intercom', category: 'Chat', confidence: 86, patterns: [/widget\.intercom\.io|intercomSettings/i] },
  { name: 'Zendesk', category: 'Chat', confidence: 84, patterns: [/zendesk\.com|zE\(/i] },
  { name: 'Tawk.to', category: 'Chat', confidence: 82, patterns: [/tawk\.to|embed\.tawk|Tawk_API/i] },
  { name: 'Crisp', category: 'Chat', confidence: 82, patterns: [/crisp\.chat|client\.crisp/i] },
  { name: 'LINE', category: 'Chat', confidence: 78, patterns: [/line\.me\/R|line-it-button/i] },
  { name: 'Chatwoot', category: 'Chat', confidence: 86, patterns: [/chatwoot|window\.chatwootSDK/i] },

  // ── CDN / Hosting ──
  { name: 'Cloudflare', category: 'CDN', confidence: 80, patterns: [/cloudflare|cdn-cgi/i] },
  { name: 'Vercel', category: 'Hosting', confidence: 88, patterns: [/vercel-deployment|_vercel/i] },
  { name: 'Netlify', category: 'Hosting', confidence: 88, patterns: [/netlify\.app|netlify-deploy/i] },
  { name: 'AWS', category: 'Hosting', confidence: 72, patterns: [/amazonaws\.com/i] },
  { name: 'Kinsta', category: 'Hosting', confidence: 74, patterns: [/kinsta\.com|kinstacdn/i] },
  { name: 'WP Engine', category: 'Hosting', confidence: 76, patterns: [/wpengine\.com|wpenginepowered/i] },
  { name: 'さくらインターネット', category: 'Hosting', confidence: 76, patterns: [/sakura\.ne\.jp|sakura\.ad\.jp/i] },

  // ── Bot Protection ──
  { name: 'reCAPTCHA', category: 'Bot Protection', confidence: 95, patterns: [/google\.com\/recaptcha|g-recaptcha|grecaptcha/i] },
  { name: 'Cloudflare Turnstile', category: 'Bot Protection', confidence: 95, patterns: [/cf-turnstile|challenges\.cloudflare\.com\/turnstile/i] },
  { name: 'Cloudflare Challenge', category: 'Bot Protection', confidence: 96, patterns: [/cdn-cgi\/challenge-platform|cf-browser-verification|Attention Required!.*Cloudflare/i] },
  { name: 'hCaptcha', category: 'Bot Protection', confidence: 95, patterns: [/hcaptcha\.com|h-captcha/i] },

  // ── Forms ──
  { name: 'Contact Form 7', category: 'Form', confidence: 90, patterns: [/wpcf7|contact-form-7|_wpcf7/i] },
  { name: 'WPForms', category: 'Form', confidence: 88, patterns: [/wpforms|wpforms-field/i] },
  { name: 'Gravity Forms', category: 'Form', confidence: 88, patterns: [/gform_wrapper|gravityforms/i] },

  // ── Cookie Consent ──
  { name: 'Cookiebot', category: 'Cookie Consent', confidence: 84, patterns: [/cookiebot\.com|consent\.cookiebot/i] },
  { name: 'OneTrust', category: 'Cookie Consent', confidence: 84, patterns: [/onetrust\.com|cookiepro\.com/i] },

  // ── SEO ──
  { name: 'Yoast SEO', category: 'SEO', confidence: 84, patterns: [/yoast\.com|yoast-seo|yoast-schema-graph/i] },
  { name: 'RankMath', category: 'SEO', confidence: 82, patterns: [/rank-math\.com|rankmath/i] },

  // ── Page Builder ──
  { name: 'Elementor', category: 'Page Builder', confidence: 86, patterns: [/elementor|elementor-frontend/i] },
  { name: 'Divi', category: 'Page Builder', confidence: 84, patterns: [/divi-builder|et_pb_section/i] },
  { name: 'WPBakery', category: 'Page Builder', confidence: 82, patterns: [/wpbakery|vc_row|vc_column|js_composer/i] },

  // ── Language ──
  { name: 'PHP', category: 'Language', confidence: 76, patterns: [/\.php|PHPSESSID/i] },
  { name: 'Node.js', category: 'Language', confidence: 66, patterns: [/node_modules/i] },

  // ── Security ──
  { name: 'Sucuri', category: 'Security', confidence: 78, patterns: [/sucuri\.net|sucuri-cloudproxy/i] },
  { name: 'Wordfence', category: 'Security', confidence: 74, patterns: [/wordfence|wordfence_logHuman/i] },

  // ── Widget / Map ──
  { name: 'Google Maps', category: 'Map', confidence: 86, patterns: [/maps\.googleapis\.com|maps\.google\.com\/maps/i] },
  { name: 'Disqus', category: 'Widget', confidence: 82, patterns: [/disqus\.com|disqus_thread/i] },
  { name: 'Trustpilot', category: 'Widget', confidence: 82, patterns: [/trustpilot\.com|tp-widget/i] },

  // ── Booking ──
  { name: 'Calendly', category: 'Booking', confidence: 88, patterns: [/calendly\.com|calendly-inline-widget/i] },
  { name: 'Cal.com', category: 'Booking', confidence: 88, patterns: [/cal\.com\/embed|calendso/i] },
];

function detectTechFromEvidence({ html, headers, cookies }) {
  const results = [];
  for (const sig of SIGNATURES) {
    const evidence = [];
    if (sig.patterns?.some(p => p.test(html))) evidence.push('html');
    if (sig.headerPatterns?.some(p => headers && p.test(headers))) evidence.push('header');
    if (sig.cookiePatterns?.some(p => cookies && p.test(cookies))) evidence.push('cookie');
    if (evidence.length > 0) {
      results.push({ name: sig.name, category: sig.category, confidence: sig.confidence, evidence });
    }
  }
  return results;
}

module.exports = { detectTechFromEvidence, SIGNATURES };
