// Industry-specific keyword filter for domain relevance scoring.
// Added to pipeline Stage 1 to filter Tranco domains by industry relevance.

const INDUSTRY_KEYWORDS = {
  restaurant: ['restaurant', 'food', 'dining', 'cafe', 'cuisine', 'kitchen', 'menu', 'order', 'eat', 'grill', 'bistro', 'bar', 'pizza', 'sushi', 'chef', 'catering', 'bakery', 'deli'],
  salon: ['salon', 'beauty', 'hair', 'spa', 'nails', 'style', 'barber', 'cosmetic', 'facial', 'makeup', 'skincare', 'massage', 'waxing'],
  clinic: ['clinic', 'dental', 'dentist', 'doctor', 'medical', 'health', 'surgery', 'ortho', 'pediatric', 'patient', 'pharmacy', 'care', 'therapy', 'wellness'],
  construction: ['build', 'construction', 'contractor', 'renovation', 'remodel', 'roofing', 'plumbing', 'electric', 'hvac', 'masonry', 'carpentry', 'home', 'repair', 'handyman'],
  retail: ['shop', 'store', 'buy', 'products', 'cart', 'checkout', 'order', 'shipping', 'retail', 'market', 'boutique', 'fashion', 'clothing'],
  accounting: ['accounting', 'tax', 'cpa', 'bookkeeping', 'payroll', 'audit', 'financial', 'advisor', 'wealth', 'investment'],
  cleaning: ['cleaning', 'clean', 'janitor', 'maid', 'housekeeping', 'pressure', 'wash', 'restoration', 'carpet'],
  consulting: ['consulting', 'consultant', 'advisory', 'strategy', 'solutions', 'services', 'management', 'agency', 'studio'],
  it: ['software', 'developer', 'hosting', 'cloud', 'server', 'tech', 'digital', 'web', 'app', 'saas', 'platform', 'data', 'api'],
  logistics: ['logistics', 'shipping', 'freight', 'trucking', 'transport', 'delivery', 'moving', 'warehouse', 'supply', 'distribution'],
  legal: ['law', 'legal', 'attorney', 'lawyer', 'counsel', 'firm', 'justice', 'litigation'],
  real_estate: ['realty', 'realtor', 'property', 'homes', 'realestate', 'broker', 'listing', 'mortgage', 'rental', 'lease'],
  education: ['school', 'academy', 'learning', 'course', 'education', 'training', 'tutor', 'college', 'university', 'teach'],
};

function scoreIndustryRelevance(domain, industry) {
  if (industry === 'all') return 1.0; // No filter
  const keywords = INDUSTRY_KEYWORDS[industry];
  if (!keywords) return 0.5;
  const lower = domain.toLowerCase();
  let matches = 0;
  for (const kw of keywords) {
    if (lower.includes(kw)) matches++;
  }
  // Score: 0 if no match, 0.3 if 1 match, 0.6 if 2+, 1.0 if 3+
  if (matches >= 3) return 1.0;
  if (matches >= 2) return 0.6;
  if (matches >= 1) return 0.3;
  return 0;
}

function filterByIndustry(domains, industry) {
  if (industry === 'all') return domains;
  // Score each domain, keep top-scoring ones + some random for diversity
  const scored = domains.map(d => ({ domain: d, score: scoreIndustryRelevance(d, industry) }));
  const relevant = scored.filter(s => s.score > 0).sort((a, b) => b.score - a.score);
  const random = scored.filter(s => s.score === 0).sort(() => Math.random() - 0.5);

  // 70% industry-relevant, 30% random exploration
  const relevantCount = Math.ceil(domains.length * 0.7);
  const result = [...relevant.slice(0, relevantCount), ...random.slice(0, domains.length - relevantCount)];
  return result.map(s => s.domain);
}

module.exports = { scoreIndustryRelevance, filterByIndustry, INDUSTRY_KEYWORDS };
