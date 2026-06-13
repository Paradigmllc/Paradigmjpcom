/**
 * CMS footprint + JS signature search query builder.
 * Uses CMS-specific HTML fingerprints + JS code signatures + city names.
 * "Powered by Shopify" Mumbai ↁEactual Shopify stores, not Shopify docs.
 * "js.stripe.com" Bangalore ↁEStripe-using businesses, not Stripe docs.
 */

const CMS_FOOTPRINTS: Record<string, string[]> = {
  WordPress: ['"Powered by WordPress"', '"Proudly powered by WordPress"', "wp-content"],
  Wix: ['"Made with Wix"', '"Built with Wix"', "wixstatic.com"],
  Webflow: ['"Made in Webflow"', '"Powered by Webflow"', "webflow.io"],
  WooCommerce: ['"WooCommerce"', '"Powered by WooCommerce"'],
  Magento: ['"Powered by Magento"', '"Magento Commerce"'],
  PrestaShop: ['"Powered by PrestaShop"', "PrestaShop"],
  Squarespace: ['"Powered by Squarespace"', "Squarespace"],
  Drupal: ['"Powered by Drupal"', "Drupal"],
  Joomla: ['"Powered by Joomla"', "Joomla!"],
  Ghost: ['"Proudly published with Ghost"', "Ghost CMS"],
  Jimdo: ['"Jimdo"', "jimdo.com"],
  TYPO3: ['"TYPO3"', '"TYPO3 CMS"'],
  "HubSpot CMS": ['"hs-scripts.com"', '"Powered by HubSpot"'],
  "EC-CUBE": ['"EC-CUBE"'],
  MakeShop: ['"makeshop.jp"', '"MakeShop"'],
  "BASE (EC)": ['"thebase.in"', '"BASE株式会社"'],
  "STORES.jp": ['"stores.jp"'],
  ColorMe: ['"shop-pro.jp"', '"カラーミ�EショチE�E"'],
  Welcart: ['"Welcart"', '"usces_item"'],
}

// JS code signatures  Edetect payment/analytics/marketing tools via their JS URLs
// These find businesses USING the tool, not the tool's own documentation
const JS_SIGNATURES: Record<string, string[]> = {
  Stripe: ['"js.stripe.com"', '"stripe.com/v3"', '"billing.stripe.com"'],
  Klarna: ['"klarna-core.js"', '"async-klarna"', '"klarnacdn.net"'],
  PayPal: ['"paypal.com/sdk/js"', '"smart-payment-buttons"', '"paypalobjects.com"'],
  GooglePay: ['"pay.google.com/gp/p/js/pay.js"'],
  "Google Analytics": ['"googletagmanager.com/gtag"', '"google-analytics.com/analytics.js"'],
  GTM: ['"googletagmanager.com/gtm.js"'],
  Klaviyo: ['"klaviyo.com/onsite"', '"a.klaviyo.com"'],
  Hotjar: ['"hotjar.com"', '"static.hotjar.com"'],
  Intercom: ['"intercom.io"', '"js.intercomcdn.com"'],
  HubSpot: ['"js.hs-scripts.com"', '"js.hubspot.com"'],
  Mailchimp: ['"mailchimp.com"', '"mc.us17.list-manage.com"'],
  Calendly: ['"calendly.com/assets"'],
  Typeform: ['"typeform.com"', '"embed.typeform.com"'],
  Zendesk: ['"zendesk.com"', '"static.zdassets.com"'],
}

const CITY_MAP: Record<string, string[]> = {
  IN: [
    "Mumbai", "Delhi", "Bangalore", "Chennai", "Hyderabad",
    "Kolkata", "Pune", "Ahmedabad", "Jaipur", "Surat",
    "Lucknow", "Nagpur", "Indore", "Thane", "Bhopal",
    "Visakhapatnam", "Chandigarh", "Coimbatore", "Kochi", "Vadodara",
  ],
  VN: ["Hanoi", "Ho Chi Minh", "Da Nang", "Hai Phong", "Nha Trang"],
  JP: ["Tokyo", "Osaka", "Nagoya", "Fukuoka", "Sapporo", "Kyoto", "Yokohama", "Kobe", "Sendai", "Hiroshima"],
  US: [
    "New York", "Los Angeles", "Chicago", "Houston", "Phoenix",
    "San Francisco", "Seattle", "Miami", "Atlanta", "Boston",
    "Dallas", "Denver", "Portland", "Austin", "San Diego",
  ],
  GB: ["London", "Manchester", "Birmingham", "Leeds", "Glasgow", "Liverpool", "Bristol", "Edinburgh"],
  DE: ["Berlin", "Munich", "Hamburg", "Frankfurt", "Cologne", "Stuttgart", "Dusseldorf"],
  FR: ["Paris", "Marseille", "Lyon", "Toulouse", "Nice", "Bordeaux", "Lille"],
  KR: ["Seoul", "Busan", "Incheon", "Daegu", "Daejeon", "Gwangju"],
  TW: ["Taipei", "Taichung", "Kaohsiung", "Tainan", "Hsinchu"],
  TH: ["Bangkok", "Chiang Mai", "Phuket", "Pattaya", "Khon Kaen", "Krabi", "Hua Hin"],
  ID: ["Jakarta", "Surabaya", "Bandung", "Medan", "Semarang", "Yogyakarta"],
  SG: ["Singapore"],
  AU: ["Sydney", "Melbourne", "Brisbane", "Perth", "Adelaide", "Gold Coast"],
  CH: ["Zurich", "Geneva", "Basel", "Bern", "Lausanne", "Lucerne", "Winterthur"],
  IL: ["Tel Aviv", "Jerusalem", "Haifa", "Petah Tikva", "Netanya", "Eilat", "Herzliya"],
}

function pickCities(countryCode: string, count: number): string[] {
  const cities = CITY_MAP[countryCode] ?? []
  if (cities.length === 0) return []
  // Pick evenly distributed cities
  const step = Math.max(1, Math.floor(cities.length / count))
  const picked: string[] = []
  for (let i = 0; i < cities.length && picked.length < count; i += step) {
    picked.push(cities[i])
  }
  return picked
}

export interface FootprintQuery {
  query: string
  cms: string
  city: string
}

export function buildFootprintQueries(
  countryCode: string,
  techStacks: string[],
  citiesPerTech = 5,
): FootprintQuery[] {
  const cities = pickCities(countryCode, citiesPerTech)
  if (cities.length === 0) return []

  const queries: FootprintQuery[] = []

  for (const tech of techStacks) {
    const footprints = CMS_FOOTPRINTS[tech] ?? JS_SIGNATURES[tech]
    if (!footprints || footprints.length === 0) {
      // No specific footprint  Euse city + generic business signal
      for (const city of cities) {
        queries.push({
          query: `${city} ${tech} business contact`,
          cms: tech,
          city,
        })
      }
      continue
    }

    const fp = footprints[0]
    for (const city of cities) {
      queries.push({
        query: `${fp} ${city}`,
        cms: tech,
        city,
      })
    }
  }

  return queries
}

/**
 * Build a bulk search query string for SearXNG.
 * Combines multiple footprint+city pairs into one query using OR.
 */
export function buildFootprintSearchQuery(
  countryCode: string,
  techStacks: string[],
  maxQueries = 3,
): string | null {
  const all = buildFootprintQueries(countryCode, techStacks, 2)
  if (all.length === 0) return null

  // Take first N and OR them together
  return all.slice(0, maxQueries).map(q => q.query).join(" OR ")
}
