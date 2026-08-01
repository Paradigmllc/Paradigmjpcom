#!/usr/bin/env node
/**
 * Content-based industry classifier — analyzes real website HTML to determine business type.
 * Far more accurate than domain-name keyword matching.
 */

const INDUSTRY_PATTERNS = {
  restaurant: {
    keywords: ['menu', 'order', 'delivery', 'reservation', 'dining', 'cuisine', 'lunch', 'dinner', 'takeout', 'catering', 'メニュー', '予約', 'テイクアウト', '食べ放題', '飲み放題', 'ランチ', 'ディナー', 'food', 'drink', 'bar', 'kitchen'],
    titlePatterns: [/restaurant|dining|cafe|bistro|grill|eatery|kitchen|レストラン|食堂|料理|居酒屋/i],
    weight: 1.0,
  },
  salon: {
    keywords: ['salon', 'beauty', 'hair', 'spa', 'nails', 'style', 'barber', 'cosmetic', 'facial', 'makeup', 'skincare', 'massage', 'waxing', '美容', 'ヘア', 'ネイル', 'まつげ', '脱毛', 'トリートメント'],
    titlePatterns: [/salon|beauty|hair|spa|beauté|美容室|美容院|ヘアサロン/i],
    weight: 1.0,
  },
  clinic: {
    keywords: ['clinic', 'dental', 'dentist', 'doctor', 'medical', 'health', 'surgery', 'patient', 'treatment', '診療', '歯科', '医院', 'クリニック', '医科', '治療', '患者', '薬', 'pharmacy', 'hospital'],
    titlePatterns: [/clinic|dental|medical|hospital|クリニック|病院|医院|歯科|診療所/i],
    weight: 1.0,
  },
  construction: {
    keywords: ['construction', 'build', 'contractor', 'renovation', 'remodel', 'roofing', 'plumbing', 'electric', 'hvac', 'masonry', 'carpentry', '建設', '工務', 'リフォーム', '建築', '大工', '塗装', '配管'],
    titlePatterns: [/construction|build|contract|renovation|remodel|建設|工務|建築|リフォーム/i],
    weight: 1.0,
  },
  retail: {
    keywords: ['shop', 'store', 'buy', 'cart', 'checkout', 'products', 'shipping', 'order online', 'ショップ', '通販', 'オンラインストア', '買い物', '商品', 'カート'],
    titlePatterns: [/shop|store|boutique|market|mart|ストア|ショップ|商店/i],
    weight: 0.8,
  },
  accounting: {
    keywords: ['accounting', 'tax', 'cpa', 'bookkeeping', 'payroll', 'audit', 'financial', '会計', '税理', '確定申告', '経理', '節税', '相続'],
    titlePatterns: [/accounting|tax|cpa|会計|税理|経理/i],
    weight: 0.9,
  },
  cleaning: {
    keywords: ['cleaning', 'clean', 'janitor', 'maid', 'housekeeping', 'restoration', '清掃', 'クリーニング', '掃除', 'ハウスクリーニング'],
    titlePatterns: [/cleaning|clean|janitor|清掃|クリーニング/i],
    weight: 0.9,
  },
  it: {
    keywords: ['software', 'developer', 'hosting', 'cloud', 'server', 'tech', 'digital', 'web', 'app', 'saas', 'platform', 'data', 'api', 'システム', '開発', 'IT'],
    titlePatterns: [/software|tech|digital|cloud|dev|システム|テクノロジー/i],
    weight: 0.8,
  },
  legal: {
    keywords: ['law', 'legal', 'attorney', 'lawyer', 'counsel', 'firm', 'justice', 'litigation', '法律', '弁護', '司法'],
    titlePatterns: [/law|legal|attorney|弁護|法律/i],
    weight: 0.9,
  },
  education: {
    keywords: ['school', 'academy', 'learning', 'course', 'education', 'training', 'tutor', 'college', 'university', '学校', '教室', '塾', '教育', 'レッスン'],
    titlePatterns: [/school|academy|college|university|学校|教室|塾|教育/i],
    weight: 0.9,
  },
  real_estate: {
    keywords: ['realty', 'realtor', 'property', 'homes', 'realestate', 'broker', 'listing', 'mortgage', 'rental', '不動産', '物件', '賃貸', '売買'],
    titlePatterns: [/realty|property|homes|real\s*estate|不動産/i],
    weight: 0.9,
  },
};

function classifyContent(html, domain) {
  const text = html.replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .toLowerCase();

  const title = (html.match(/<title[^>]*>([^<]+)<\/title>/i)||[])[1]?.toLowerCase()||'';
  const metaDesc = (html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)/i)||[])[1]?.toLowerCase()||'';
  const combined = `${title} ${metaDesc} ${text.slice(0, 3000)}`;
  const domainLower = domain.toLowerCase();

  const scores = {};
  for (const [industry, config] of Object.entries(INDUSTRY_PATTERNS)) {
    let score = 0;

    // Domain keyword match
    for (const kw of config.keywords) {
      if (domainLower.includes(kw)) score += 3;
    }

    // Title match
    for (const pattern of config.titlePatterns) {
      if (pattern.test(title)) score += 8;
      if (pattern.test(combined)) score += 2;
    }

    // Content keyword match
    for (const kw of config.keywords) {
      if (text.includes(kw)) score += 1;
    }

    scores[industry] = score * config.weight;
  }

  // Find best match
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const best = sorted[0];
  const second = sorted[1];

  // Require minimum confidence
  if (best[1] < 5) return { industry: null, confidence: 0, scores };
  // Require clear differentiation
  if (second && best[1] < second[1] * 1.5) return { industry: null, confidence: 0.3, scores };

  return { industry: best[0], confidence: Math.min(best[1] / 20, 1.0), scores };
}

module.exports = { classifyContent, INDUSTRY_PATTERNS };
