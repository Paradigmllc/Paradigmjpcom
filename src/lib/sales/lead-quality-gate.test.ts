import { describe, expect, it } from "vitest"
import { extractFirstPartyProductEvidence } from "./lead-product-evidence"
import { detectFirstPartyJapanPresence, evaluateLeadQualityGate, readLimitedText, type HomepageQualityProfile } from "./lead-quality-gate"
import type { LeadSourceConfig, LeadSourceRecord } from "./lead-source-records"

const source: LeadSourceConfig = {
  id: "source-1",
  name: "Official Export Directory",
  country_code: "US",
  source_type: "export_directory",
  source_url: "https://directory.example/exporters",
  source_format: "json",
  trust_tier: 3,
  field_mapping: {},
  active: true,
  terms_checked: true,
  approval_status: "approved",
  approved_by: "Sato",
  approved_at: "2026-07-14T00:00:00.000Z",
  last_preview: { accepted: 1 },
  last_previewed_at: "2026-07-14T00:00:00.000Z",
  pilot_approved_by: "Sato",
  pilot_approved_at: "2026-07-14T00:00:00.000Z",
  last_preflight: {},
  last_preflighted_at: null,
  last_status: "ready",
  last_error: null,
  last_record_count: 1,
  last_ingested_at: "2026-07-14T00:00:00.000Z",
  created_at: "2026-07-14T00:00:00.000Z",
  updated_at: "2026-07-14T00:00:00.000Z",
}

function record(patch: Partial<LeadSourceRecord> & { source?: LeadSourceConfig } = {}): LeadSourceRecord & { source: LeadSourceConfig } {
  return {
    id: "record-1",
    source_config_id: source.id,
    external_id: "123",
    company_name: "Example Commerce LLC",
    domain: "examplecommerce.com",
    website_url: "https://examplecommerce.com",
    country_code: "US",
    source_page_url: "https://directory.example/exporters/example-commerce",
    business_type: "Consumer products",
    employee_count: 24,
    annual_revenue_usd: 4_000_000,
    is_for_profit: true,
    evidence: {},
    observed_at: "2026-07-14T00:00:00.000Z",
    source,
    ...patch,
  }
}

function homepage(patch: Partial<HomepageQualityProfile> = {}): HomepageQualityProfile {
  return {
    url: "https://examplecommerce.com",
    html: "",
    title: "Example Commerce | Independent products",
    description: "Shop our products online with shipping across the United States.",
    organizationNames: ["Example Commerce"],
    organizationTypes: ["Organization", "OnlineStore"],
    visibleText: "Example Commerce is an independent business. Shop now. Add to cart. Shipping and returns. United States USD $120.",
    ...patch,
  }
}

const countrySignals = [{ countryCode: "US", signalType: "address", confidence: 84, evidence: "United States" }]
const shopify = [{ name: "Shopify", category: "EC", confidence: 92 }]

describe("evaluateLeadQualityGate", () => {
  it("caps oversized homepage bodies to a safe prefix instead of rejecting the company", async () => {
    const response = new Response("0123456789", {
      headers: { "content-length": "10", "content-type": "text/html" },
    })

    await expect(readLimitedText(response, 5)).resolves.toBe("01234")
  })

  it("passes a source-identified, country-verified, explicit SMB commerce company", () => {
    const result = evaluateLeadQualityGate({ sourceRecord: record(), homepage: homepage(), countrySignals, detections: shopify, enterpriseLike: false })

    expect(result.status).toBe("passed")
    expect(result.smb.score).toBe(100)
    expect(result.offerFit.passed).toBe(true)
  })

  it("rejects enterprise and excluded media records before form discovery", () => {
    const result = evaluateLeadQualityGate({
      sourceRecord: record({ company_name: "Example Media Inc", business_type: "Magazine publisher", employee_count: 900 }),
      homepage: homepage({ title: "Example Media Magazine", organizationNames: ["Example Media"], description: "Investor relations and global offices" }),
      countrySignals,
      detections: shopify,
      enterpriseLike: true,
    })

    expect(result.status).toBe("rejected")
    expect(result.reasons).toEqual(expect.arrayContaining(["enterprise_signal"]))
    expect(result.business.passed).toBe(false)
  })

  it("quarantines unknown SMB size instead of assigning a constant score", () => {
    const result = evaluateLeadQualityGate({
      sourceRecord: record({ employee_count: null, annual_revenue_usd: null }),
      homepage: homepage({ visibleText: "Example Commerce. Shop now. Add to cart. United States USD $120." }),
      countrySignals,
      detections: shopify,
      enterpriseLike: false,
    })

    expect(result.status).toBe("review_required")
    expect(result.reasons).toContain("smb_evidence_missing")
    expect(result.smb.score).toBe(0)
  })

  it("accepts an official Tier 3 SME flag while still applying the other quality gates", () => {
    const result = evaluateLeadQualityGate({
      sourceRecord: record({ employee_count: null, annual_revenue_usd: null, is_sme: true }),
      homepage: homepage({ visibleText: "Example Commerce. Shop now. Add to cart. United States USD $120." }),
      countrySignals,
      detections: shopify,
      enterpriseLike: false,
    })

    expect(result.status).toBe("passed")
    expect(result.smb).toMatchObject({ passed: true, score: 98 })
    expect(result.smb.evidence).toContain("official_sme_flag:Official Export Directory")
  })

  it("accepts official Tier 3 country evidence when the homepage omits an address", () => {
    const result = evaluateLeadQualityGate({
      sourceRecord: record({ is_sme: true }),
      homepage: homepage({ visibleText: "Example Commerce. Shop now. Add to cart. Shipping and returns." }),
      countrySignals: [],
      detections: shopify,
      enterpriseLike: false,
    })

    expect(result.country.passed).toBe(true)
    expect(result.status).toBe("passed")
  })

  it("does not replace an official company name with a generic homepage title", () => {
    const result = evaluateLeadQualityGate({
      sourceRecord: record({ company_name: "Metascape L.L.C.", domain: "metascape.dev", website_url: "https://metascape.dev" }),
      homepage: homepage({
        url: "https://metascape.dev",
        title: "Home: Data Virtualization using Neural Networks",
        organizationNames: ["Home: Data Virtualization using Neural Networks"],
      }),
      countrySignals,
      detections: shopify,
      enterpriseLike: false,
    })

    expect(result.status).toBe("rejected")
    expect(result.reasons).toContain("identity_mismatch")
    expect(result.identity.canonicalName).toBeUndefined()
  })

  it("uses a site name only when that name itself matches the official identity", () => {
    const result = evaluateLeadQualityGate({
      sourceRecord: record({ company_name: "Metascape L.L.C.", domain: "metascape.dev", website_url: "https://metascape.dev" }),
      homepage: homepage({
        url: "https://metascape.dev",
        title: "Home: Data Virtualization using Neural Networks",
        organizationNames: ["Home: Data Virtualization using Neural Networks", "Metascape"],
      }),
      countrySignals,
      detections: shopify,
      enterpriseLike: false,
    })

    expect(result.identity).toMatchObject({ passed: true, canonicalName: "Metascape" })
  })

  it("does not mistake a generic pricing page for a SaaS product", () => {
    const result = evaluateLeadQualityGate({
      sourceRecord: record({ business_type: "Professional services" }),
      homepage: homepage({
        description: "See our pricing and book a consultation.",
        visibleText: "Example Commerce is an independent business in the United States. Pricing and book a consultation.",
      }),
      countrySignals,
      detections: [],
      enterpriseLike: false,
    })

    expect(result.status).toBe("review_required")
    expect(result.reasons).toContain("japan_entry_offer_fit_missing")
  })

  it("accepts a live product manufacturer only when a Tier 3 source establishes official SME status", () => {
    const result = evaluateLeadQualityGate({
      sourceRecord: record({ is_sme: true, employee_count: null, annual_revenue_usd: null }),
      homepage: homepage({
        title: "Example Commerce | Scientific instruments",
        description: "We design and manufacture scientific instruments for laboratory teams.",
        organizationTypes: ["Organization", "Product"],
        visibleText: "Our product portfolio includes scientific instruments and laboratory hardware. We design and manufacture every system in the United States.",
      }),
      countrySignals,
      detections: [],
      enterpriseLike: false,
    })

    expect(result.status).toBe("passed")
    expect(result.offerFit).toMatchObject({ passed: true, score: 90 })
    expect(result.offerFit.evidence).toEqual(expect.arrayContaining([
      "product_schema:Product",
      "product_maker_signal:We design",
    ]))
    expect(result.offerFit.evidence.some((value) => value.startsWith("product_catalog_signal:"))).toBe(true)
  })

  it("does not grant product-brand fit to Tier 2 discovery sources", () => {
    const result = evaluateLeadQualityGate({
      sourceRecord: record({
        is_sme: true,
        employee_count: null,
        annual_revenue_usd: null,
        source: { ...source, trust_tier: 2 },
      }),
      homepage: homepage({
        organizationTypes: ["Organization", "Product"],
        visibleText: "Our product portfolio includes scientific instruments. We design and manufacture every system.",
      }),
      countrySignals,
      detections: [],
      enterpriseLike: false,
    })

    expect(result.status).toBe("review_required")
    expect(result.reasons).toContain("japan_entry_offer_fit_missing")
  })

  it("does not treat consulting language with a product word as a scalable product", () => {
    const result = evaluateLeadQualityGate({
      sourceRecord: record({ is_sme: true, employee_count: null, annual_revenue_usd: null }),
      homepage: homepage({
        organizationTypes: ["Organization"],
        description: "We develop product strategy for clients.",
        visibleText: "Our consultants develop product strategy and provide bespoke advisory services.",
      }),
      countrySignals,
      detections: [],
      enterpriseLike: false,
    })

    expect(result.status).toBe("review_required")
    expect(result.reasons).toContain("japan_entry_offer_fit_missing")
  })

  it("accepts an official SME with multiple distinct first-party product detail pages", () => {
    const productEvidence = extractFirstPartyProductEvidence(`
      <html><body>
        <a href="/product/pd-replica">PD Replica</a>
        <a href="https://examplecommerce.com/product/pd-sim">PD Sim</a>
        <a href="https://other.example/product/not-ours">External product</a>
      </body></html>
    `, "https://www.examplecommerce.com")
    const result = evaluateLeadQualityGate({
      sourceRecord: record({ is_sme: true, employee_count: null, annual_revenue_usd: null }),
      homepage: homepage({
        description: "Simulation technology for autonomous systems.",
        visibleText: "Example Commerce builds simulation technology in the United States.",
        productEvidence,
      }),
      countrySignals,
      detections: [],
      enterpriseLike: false,
    })

    expect(productEvidence.detailLinks).toEqual(["/product/pd-replica", "/product/pd-sim"])
    expect(result.status).toBe("passed")
    expect(result.offerFit.evidence).toEqual(expect.arrayContaining([
      "product_detail_link:/product/pd-replica",
      "product_detail_link:/product/pd-sim",
    ]))
  })

  it("accepts a first-party product hub only when a grounded maker claim corroborates it", () => {
    const productEvidence = extractFirstPartyProductEvidence(`
      <html><body>
        <a href="/products">Products</a>
        <p>We design and manufacture scientific instruments for laboratory teams worldwide.</p>
      </body></html>
    `, "https://examplecommerce.com")
    const result = evaluateLeadQualityGate({
      sourceRecord: record({ is_sme: true, employee_count: null, annual_revenue_usd: null }),
      homepage: homepage({
        description: "Scientific instrumentation company.",
        visibleText: "Example Commerce is based in the United States.",
        productEvidence,
      }),
      countrySignals,
      detections: [],
      enterpriseLike: false,
    })

    expect(result.status).toBe("passed")
    expect(result.offerFit.evidence).toEqual(expect.arrayContaining([
      "product_hub_link:/products",
      "product_claim:We design and manufacture scientific instruments for laboratory teams worldwide.",
    ]))
  })

  it("recognizes a catalog of manufactured specialty molecules as grounded product evidence", () => {
    const productEvidence = extractFirstPartyProductEvidence(`
      <html><body>
        <a href="/product-categories">Shop Our Molecules</a>
        <p>Our synthetic process produces glycolipid surfactants in greater than 95% purity.</p>
      </body></html>
    `, "https://examplecommerce.com")
    const result = evaluateLeadQualityGate({
      sourceRecord: record({ is_sme: true, employee_count: null, annual_revenue_usd: null }),
      homepage: homepage({
        description: "Specialty surfactant manufacturer.",
        visibleText: "Example Commerce specialty molecules in the United States.",
        productEvidence,
      }),
      countrySignals,
      detections: [],
      enterpriseLike: false,
    })

    expect(productEvidence.hubLinks).toEqual(["/product-categories"])
    expect(productEvidence.claims).toHaveLength(1)
    expect(result.status).toBe("passed")
  })

  it("keeps Products & Services consultancies out of the product-brand lane", () => {
    const productEvidence = extractFirstPartyProductEvidence(`
      <html><body>
        <a href="/products-and-services">Products &amp; Services</a>
        <a href="/products/consulting">Consulting</a>
        <p>We develop product strategy and custom product development services for clients.</p>
      </body></html>
    `, "https://examplecommerce.com")
    const result = evaluateLeadQualityGate({
      sourceRecord: record({ is_sme: true, employee_count: null, annual_revenue_usd: null }),
      homepage: homepage({
        description: "A product development consultancy.",
        visibleText: "Products and services for clients in the United States.",
        productEvidence,
      }),
      countrySignals,
      detections: [],
      enterpriseLike: false,
    })

    expect(productEvidence).toEqual({ hubLinks: [], detailLinks: [], claims: [] })
    expect(result.status).toBe("review_required")
    expect(result.reasons).toContain("japan_entry_offer_fit_missing")
  })

  it("does not count store account, cart, checkout or login utilities as product details", () => {
    const productEvidence = extractFirstPartyProductEvidence(`
      <a href="/store/account">Account</a>
      <a href="/store/cart">Cart</a>
      <a href="/shop/checkout">Checkout</a>
      <a href="/products/login">Login</a>
      <a href="/product/aao-wafers">AAO Wafers</a>
    `, "https://examplecommerce.com")

    expect(productEvidence.detailLinks).toEqual(["/product/aao-wafers"])
  })

  it("does not let product links bypass official Tier 3 SME provenance", () => {
    const productEvidence = extractFirstPartyProductEvidence(`
      <a href="/products/alpha">Alpha</a><a href="/products/beta">Beta</a>
    `, "https://examplecommerce.com")
    const result = evaluateLeadQualityGate({
      sourceRecord: record({
        is_sme: true,
        employee_count: null,
        annual_revenue_usd: null,
        source: { ...source, trust_tier: 2 },
      }),
      homepage: homepage({ productEvidence }),
      countrySignals,
      detections: [],
      enterpriseLike: false,
    })

    expect(result.status).toBe("review_required")
    expect(result.reasons).toContain("japan_entry_offer_fit_missing")
  })

  it("recognizes a branded products navigation hub without weakening service exclusions", () => {
    const productEvidence = extractFirstPartyProductEvidence(`
      <a href="/lix-products">LiX Products</a>
      <a href="/engineering-services">Engineering Services</a>
    `, "https://examplecommerce.com")

    expect(productEvidence.hubLinks).toEqual(["/lix-products"])
    expect(productEvidence.detailLinks).toEqual([])
  })

  it("rejects a company that already exposes first-party Japanese localization", () => {
    const html = `
      <html><head><link rel="alternate" hreflang="ja-JP" href="/ja/"></head>
      <body><a href="/ja/" hreflang="ja">日本語</a></body></html>
    `
    const japanPresenceSignals = detectFirstPartyJapanPresence(html, "https://examplecommerce.com")
    const result = evaluateLeadQualityGate({
      sourceRecord: record(),
      homepage: homepage({
        productEvidence: { hubLinks: ["/products"], detailLinks: ["/products/a", "/products/b"], claims: [] },
        japanPresenceSignals,
      }),
      countrySignals,
      detections: [],
      enterpriseLike: false,
    })

    expect(japanPresenceSignals).toContain("hreflang:ja-jp")
    expect(result.status).toBe("rejected")
    expect(result.reasons).toContain("existing_japan_presence")
  })

  it("treats billion-unit scale as current enterprise evidence despite historical SME data", () => {
    const result = evaluateLeadQualityGate({
      sourceRecord: record(),
      homepage: homepage({
        visibleText: "The company has shipped billions of units worldwide.",
        productEvidence: { hubLinks: ["/products"], detailLinks: ["/products/a", "/products/b"], claims: [] },
      }),
      countrySignals,
      detections: [],
      enterpriseLike: false,
    })

    expect(result.status).toBe("rejected")
    expect(result.reasons).toContain("enterprise_signal")
    expect(result.smb.score).toBe(0)
  })
})
