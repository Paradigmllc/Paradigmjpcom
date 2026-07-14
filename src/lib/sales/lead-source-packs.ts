import { createHash } from "node:crypto"
import type { LeadSourceFormat, LeadSourceType } from "./lead-source-records"

const WIKIDATA_ENDPOINT = "https://query.wikidata.org/sparql"
const WIKIDATA_LICENSE_URL = "https://www.wikidata.org/wiki/Wikidata:Data_access"
const CORDIS_PROVIDER_URL = "https://cordis.europa.eu/about/dataextractions"
const EC_REUSE_POLICY_URL = "https://commission.europa.eu/resources-partners/european-commission-visual-identity/copyright-and-reuse_en"
const PACK_VERSION = 1
const PACK_LIMIT = 250

const TARGET_MARKETS = [
  { code: "US", entity: "Q30", label: "米国", region: "北米" },
  { code: "CA", entity: "Q16", label: "カナダ", region: "北米" },
  { code: "GB", entity: "Q145", label: "英国", region: "欧州" },
  { code: "DE", entity: "Q183", label: "ドイツ", region: "欧州" },
  { code: "FR", entity: "Q142", label: "フランス", region: "欧州" },
  { code: "NL", entity: "Q55", label: "オランダ", region: "欧州" },
  { code: "SE", entity: "Q34", label: "スウェーデン", region: "欧州" },
  { code: "AU", entity: "Q408", label: "オーストラリア", region: "豪州" },
  { code: "SG", entity: "Q334", label: "シンガポール", region: "東南アジア" },
  { code: "AE", entity: "Q878", label: "アラブ首長国連邦", region: "中東" },
] as const

const CORDIS_MARKETS = [
  { code: "DE", dataCode: "DE", label: "ドイツ", region: "欧州" },
  { code: "ES", dataCode: "ES", label: "スペイン", region: "欧州" },
  { code: "IT", dataCode: "IT", label: "イタリア", region: "欧州" },
  { code: "FR", dataCode: "FR", label: "フランス", region: "欧州" },
  { code: "NL", dataCode: "NL", label: "オランダ", region: "欧州" },
  { code: "GB", dataCode: "UK", label: "英国", region: "欧州" },
  { code: "BE", dataCode: "BE", label: "ベルギー", region: "欧州" },
  { code: "PT", dataCode: "PT", label: "ポルトガル", region: "欧州" },
  { code: "CH", dataCode: "CH", label: "スイス", region: "欧州" },
  { code: "AT", dataCode: "AT", label: "オーストリア", region: "欧州" },
  { code: "IE", dataCode: "IE", label: "アイルランド", region: "欧州" },
  { code: "DK", dataCode: "DK", label: "デンマーク", region: "欧州" },
  { code: "SE", dataCode: "SE", label: "スウェーデン", region: "欧州" },
  { code: "FI", dataCode: "FI", label: "フィンランド", region: "欧州" },
  { code: "NO", dataCode: "NO", label: "ノルウェー", region: "欧州" },
] as const

const CORDIS_PROGRAMS = [
  { id: "horizon-europe", label: "Horizon Europe", url: "https://cordis.europa.eu/data/cordis-HORIZONprojects-csv.zip" },
  { id: "horizon-2020", label: "Horizon 2020", url: "https://cordis.europa.eu/data/cordis-h2020projects-csv.zip" },
] as const

export interface LeadSourcePack {
  id: string
  version: number
  name: string
  countryCode: string
  marketLabel: string
  region: string
  provider: string
  providerUrl: string
  description: string
  sourceType: LeadSourceType
  sourceUrl: string
  sourceFormat: LeadSourceFormat
  trustTier: number
  fieldMapping: Record<string, string>
  licenseName: string
  licenseUrl: string
  licenseCheckedAt: string
  maxRecords: number
  querySha256: string
  criteria: readonly string[]
}

function wikidataSmbQuery(countryEntity: string): string {
  return `SELECT ?company ?companyName ?website ?employees
  (GROUP_CONCAT(DISTINCT ?industryName; separator=", ") AS ?industries)
  ?sourcePage
WHERE {
  VALUES ?companyType { wd:Q783794 wd:Q4830453 wd:Q6881511 }
  ?company wdt:P31 ?companyType;
    wdt:P856 ?website;
    wdt:P1128 ?employees;
    wdt:P17 wd:${countryEntity};
    wdt:P452 ?industry;
    rdfs:label ?companyName.
  ?industry rdfs:label ?industryName.
  FILTER(LANG(?companyName) = "en")
  FILTER(LANG(?industryName) = "en")
  FILTER(?employees >= 2 && ?employees <= 249)
  FILTER(REGEX(LCASE(STR(?industryName)), "software|software as a service|e-commerce|online shopping|internet|information technology|artificial intelligence|cloud computing|cybersecurity|consumer goods|cosmetics|clothing|fashion|retail|customer service|customer support"))
  FILTER(!REGEX(LCASE(STR(?industryName)), "weapon|firearm|gambling|casino|tobacco|adult entertainment"))
  FILTER(!CONTAINS(LCASE(STR(?website)), "web.archive.org"))
  FILTER(!CONTAINS(LCASE(STR(?website)), "facebook.com"))
  FILTER(!CONTAINS(LCASE(STR(?website)), "instagram.com"))
  FILTER(!CONTAINS(LCASE(STR(?website)), "linkedin.com"))
  FILTER NOT EXISTS { ?company wdt:P576 ?dissolved }
  BIND(IRI(CONCAT("https://www.wikidata.org/wiki/", STRAFTER(STR(?company), "entity/"))) AS ?sourcePage)
}
GROUP BY ?company ?companyName ?website ?employees ?sourcePage
ORDER BY ?company
LIMIT ${PACK_LIMIT}`
}

function wikidataSourceUrl(query: string): string {
  const params = new URLSearchParams({ query })
  return `${WIKIDATA_ENDPOINT}?${params.toString()}`
}

function buildWikidataPack(market: (typeof TARGET_MARKETS)[number]): LeadSourcePack {
  const query = wikidataSmbQuery(market.entity)
  return {
    id: `wikidata-cc0-commerce-software-${market.code.toLowerCase()}`,
    version: PACK_VERSION,
    name: `Wikidata CC0 EC・SaaS SMB候補 / ${market.label} / v${PACK_VERSION}`,
    countryCode: market.code,
    marketLabel: market.label,
    region: market.region,
    provider: "Wikidata Query Service",
    providerUrl: "https://query.wikidata.org/",
    description: "企業名・公式サイト・国・従業員数・業種の構造化根拠が同時にある候補だけを取得します。リード合格を意味せず、サイト事前検査とJapan Entry適合確認は別工程です。",
    sourceType: "structured_feed",
    sourceUrl: wikidataSourceUrl(query),
    sourceFormat: "csv",
    trustTier: 2,
    fieldMapping: {
      external_id: "company",
      company_name: "companyName",
      website_url: "website",
      employee_count: "employees",
      business_type: "industries",
      source_page_url: "sourcePage",
      source_page_allowed_hosts: "www.wikidata.org",
    },
    licenseName: "Creative Commons CC0",
    licenseUrl: WIKIDATA_LICENSE_URL,
    licenseCheckedAt: "2026-07-15",
    maxRecords: PACK_LIMIT,
    querySha256: createHash("sha256").update(query).digest("hex"),
    criteria: [
      "従業員数2〜249名の明示データ",
      "EC・SaaS・ソフトウェア・対象消費財の業種根拠",
      "公式サイトURLとWikidata entity根拠",
      "アーカイブ・SNSプロフィールURLを除外",
      "解散日が登録された企業を除外",
    ],
  }
}

function buildCordisPack(program: (typeof CORDIS_PROGRAMS)[number], market: (typeof CORDIS_MARKETS)[number]): LeadSourcePack {
  const fieldMapping = {
    zip_archive_entry: "organization.csv",
    zip_csv_delimiter: ";",
    zip_required_fields: "organisationID,name,organizationURL,country,contactForm",
    zip_dataset_filter_1_field: "SME",
    zip_dataset_filter_1_value: "true",
    zip_dataset_filter_2_field: "activityType",
    zip_dataset_filter_2_value: "PRC",
    zip_view_filter_1_field: "country",
    zip_view_filter_1_value: market.dataCode,
    external_id: "organisationID",
    company_name: "name",
    website_url: "organizationURL",
    business_type: "activityType",
    source_page_url: "contactForm",
    source_page_allowed_hosts: "ec.europa.eu",
    is_sme_constant: "true",
    is_for_profit_constant: "true",
  }
  const fingerprint = JSON.stringify({ sourceUrl: program.url, fieldMapping, version: PACK_VERSION })
  return {
    id: `cordis-${program.id}-official-sme-${market.code.toLowerCase()}`,
    version: PACK_VERSION,
    name: `CORDIS ${program.label} 公式SME / ${market.label} / v${PACK_VERSION}`,
    countryCode: market.code,
    marketLabel: market.label,
    region: market.region,
    provider: "European Commission CORDIS",
    providerUrl: CORDIS_PROVIDER_URL,
    description: "欧州委員会CORDISの月次公開データから、公式SMEフラグ・民間営利組織・公式サイト・組織IDが揃う企業だけを取得します。サイト実在性・企業同一性・Japan Entry適合は後段で再検証します。",
    sourceType: "structured_feed",
    sourceUrl: program.url,
    sourceFormat: "zip_csv",
    trustTier: 3,
    fieldMapping,
    licenseName: "European Commission reuse policy (attribution required)",
    licenseUrl: EC_REUSE_POLICY_URL,
    licenseCheckedAt: "2026-07-15",
    maxRecords: 5_000,
    querySha256: createHash("sha256").update(fingerprint).digest("hex"),
    criteria: [
      "欧州委員会データ上のSME=true",
      "activityType=PRC（民間営利組織）",
      "公式サイト・CORDIS組織ID・根拠ページが存在",
      "国別に分離し、同一ドメインを重複排除",
      "後段のサイト同一性・国・商材適合ゲートは省略しない",
    ],
  }
}

const PACKS = [
  ...CORDIS_PROGRAMS.flatMap((program) => CORDIS_MARKETS.map((market) => buildCordisPack(program, market))),
  ...TARGET_MARKETS.map(buildWikidataPack),
]

export function listLeadSourcePacks(): LeadSourcePack[] {
  return PACKS.map((pack) => ({ ...pack, fieldMapping: { ...pack.fieldMapping }, criteria: [...pack.criteria] }))
}

export function getLeadSourcePack(packId: string): LeadSourcePack | null {
  const pack = PACKS.find((candidate) => candidate.id === packId)
  return pack ? { ...pack, fieldMapping: { ...pack.fieldMapping }, criteria: [...pack.criteria] } : null
}
