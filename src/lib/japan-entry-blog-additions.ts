import type { JapanEntryBlogPost } from "./japan-entry-blog"

/** Additional long-form articles kept separate so the editorial seed stays easy to audit. */
export const JAPAN_ENTRY_BLOG_POSTS_ADDITIONS: JapanEntryBlogPost[] = [
  {
    slug: "japan-entry-source-pack-and-approval",
    title: "The Source Pack That Keeps a Japan Launch Moving",
    excerpt:
      "Fast delivery is mostly an information problem. A small, accurate source pack lets an overseas SMB approve localization, trust content, and launch checks without a procurement maze.",
    category: "Launch Operations",
    readTime: "8 min",
    publishedAt: "2026-07-13",
    tags: ["japan-entry-public", "Launch Operations", "Approvals", "SMB"],
    content: `## Speed comes from decisions, not from skipping review

When a Japan launch stalls, the bottleneck is often not engineering. It is an unanswered question about the offer, the owner, a claim, a payment route, or a required approval. Teams then reopen the same discussion across a translator, designer, developer, and legal reviewer.

A source pack is a short, versioned set of facts that gives the delivery team one place to start. It is not a 100-page brief and it is not a substitute for professional advice. Its job is to make the first implementation decision reversible, attributable, and easy to approve.

## The minimum source pack

### 1. Offer and buyer

Write the first offer in one sentence, identify the buyer who can say yes, and state the action you want after the page is read. If there are several products, choose one launch candidate instead of asking the Japanese page to explain the entire company.

### 2. Commercial truth

Provide the price, billing timing, renewal or cancellation terms, delivery model, support route, and known exclusions. Mark anything that changes by customer, region, tax status, or provider approval. A Japanese buyer should not need to infer the commercial model from a translated feature list.

### 3. Evidence and permissions

List which logos, screenshots, customer statements, certifications, metrics, and founder claims may be published. For each item, record the owner and source. “Everyone knows this is true” is not a publication permission or a verifiable source.

### 4. Access and dependencies

Identify the domain, CMS, analytics, inbox, payment provider, social accounts, and any specialist reviewers. Note who can grant access and what happens if a provider declines or a review arrives late.

## A practical approval rhythm

Use one decision log with a question, owner, due date, decision, and evidence link. Group questions into a daily batch rather than interrupting the approver for every sentence. Escalate only decisions that change scope, legal exposure, customer promise, or launch timing.

The fixed Japan Entry scope is designed for this rhythm: the Start Date is recorded after the required inputs, cleared payment, access, and approval path are available. The agreed fixed setup is covered by a 14-business-day delivery guarantee from that date; client or third-party holds are logged and pause the clock rather than being hidden as schedule risk.

## What the source pack cannot decide

It cannot issue a legal or tax opinion, guarantee payment acceptance, approve a regulated product, or promise demand. Those decisions stay with the relevant qualified professional or provider. The useful outcome is a written handoff: what is confirmed, what is pending, who owns it, and whether it blocks launch.

For an overseas SMB, that clarity is often more valuable than another round of copy polishing. It lets the decision-maker see whether Japan is ready for a bounded first launch now, or which fact must be resolved before spending more.`
  },
  {
    slug: "japan-entry-payment-and-inquiry-routing",
    title: "Choosing a Japan Inquiry or Payment Route Before You Build",
    excerpt:
      "A Japanese page is not launch-ready until the buyer knows how to continue. Map the inquiry, booking, invoice, or payment route before committing to a checkout design.",
    category: "Commerce Readiness",
    readTime: "9 min",
    publishedAt: "2026-07-13",
    tags: ["japan-entry-public", "Payments", "Buyer Path", "Compliance"],
    content: `## The next action is part of the product

Localization often starts with the page and ends with the button. That is backwards. The buyer path should be mapped before the page is written because the route determines the information to collect, the disclosures to show, the response owner, and the external provider checks that can delay launch.

The correct route may be a qualified inquiry, a booking request, an invoice, a hosted checkout, or a domestic payment method. There is no universal “Japan payment” switch that is safe for every company.

## Four routes to compare

### Qualified inquiry

Best for B2B services, complex products, and offers that need a human fit check. The page should state the questions requested, acknowledgement timing, who reviews the request, and what happens if the offer is not a fit.

### Booking or consultation request

Useful when availability, language, or a regulated explanation must be confirmed before a contract. Make the calendar timezone, cancellation terms, and follow-up owner visible. Do not call the step a purchase if no transaction has occurred.

### Invoice or bank-transfer path

Suitable for some B2B purchasing teams, but only when the contracting entity, invoice issuer, payment timing, currency, tax treatment, and reconciliation owner are clear. A bank-transfer label alone does not answer those questions.

### Hosted checkout

Useful when the provider accepts the entity, product category, customer location, currency, and required disclosures. Provider approval, fees, chargebacks, settlement, and tax handling remain separate dependencies. A checkout mock-up is not evidence that the live route is approved.

## The routing worksheet

For each route, record the buyer action, data collected, owner, provider, approval status, customer acknowledgement, and fallback. The fallback matters: a payment error should lead to a human route or a clear recovery step rather than a dead end.

## What should be visible on the Japanese page

State the price and billing timing, what is included, the contract or inquiry next step, support and response expectations, cancellation or refund boundaries, and any provider or eligibility condition that can change the route. Keep personal-data and commercial disclosures linked from the same path.

The package can implement and test the agreed route, coordinate the relevant trust and disclosure work, and document the handover. It cannot guarantee a provider's approval or replace legal, tax, banking, or regulated advice.

The decision is complete when a Japanese buyer can take the next action and the operating team can explain who owns the result. That is a stronger launch signal than simply having a translated “Buy now” button.`
  },
  {
    slug: "japan-entry-public-signals-vs-first-party-data",
    title: "Public Market Signals vs First-Party Data: What to Measure in Japan",
    excerpt:
      "Free public sources can show visibility and readiness. They cannot prove private traffic, country share, conversion rate, or revenue. Keep the evidence layers separate.",
    category: "Measurement",
    readTime: "8 min",
    publishedAt: "2026-07-13",
    tags: ["japan-entry-public", "Measurement", "Public Signals", "Market Entry"],
    content: `## A credible report starts with a boundary

Overseas teams often ask for the Japanese traffic share or revenue of a company they do not control. Public sources cannot answer that with certainty. A rank, crawl record, sitemap, registry entry, structured-data field, or public financial filing is evidence of a public signal—not a hidden analytics export.

The distinction is commercially important. A decision-maker can invest in fixing a visible buyer-path problem without pretending to know a competitor's private conversion rate.

## Three evidence layers

### Public observation

This includes a page that can be fetched, a published sitemap, schema markup, a public ranking, a registry record, or a dated public financial disclosure. Keep the source URL, observation time, method, and confidence with every result.

### Client-provided or authorized data

First-party analytics, payment reports, CRM records, advertising accounts, and Search Console can answer questions about actual visits, country mix, conversions, and revenue when the owner authorizes access. The report should identify the system and period rather than presenting a model as a measurement.

### Unknown or not observable

If neither layer supports a number, show “not publicly observable” or “not supplied.” Unknown is a result. It prevents a free index from becoming a fabricated sales claim.

## A useful measurement baseline

For the first Japanese launch, record the page and form version, route completion, response ownership, source and observation date, public signals, and open dependencies. After launch, add first-party events only when the client can authorize them. Compare like-for-like periods and annotate changes in offer, provider, campaign, or scope.

The public Japan Entry Signal Check follows the same rule: it can score visibility and readiness signals, but actual monthly visits, country traffic share, and revenue remain null unless authorized data is supplied. This makes the result defensible in a board discussion and honest in an outbound message.

## What to do with a weak signal

Do not jump from “low public visibility” to “lost revenue.” Use it to choose the next observable action: publish the Japanese buyer path, fix identity and commercial disclosures, submit an eligible sitemap, confirm the inquiry route, or request authorized analytics. A good report narrows the next decision; it does not manufacture certainty.

The objective is not to imitate a paid intelligence platform for free. It is to give an SMB a reliable boundary between what Japan is showing publicly, what the company can verify privately, and what still needs a decision.`
  },
]

export const ARTICLE_VISUALS_ADDITIONS: Record<string, NonNullable<JapanEntryBlogPost["heroImage"]>> = {
  "japan-entry-source-pack-and-approval": {
    src: "/japan-entry/application-handover.svg",
    alt: "A source pack and approval path for a Japan Entry launch",
    caption: "A compact source of truth keeps approvals, dependencies, and ownership visible during launch.",
  },
  "japan-entry-payment-and-inquiry-routing": {
    src: "/japan-entry/package-scope.svg",
    alt: "Inquiry and payment routes connected to a Japanese buyer path",
    caption: "The next action, provider status, fallback, and owner belong in the launch design together.",
  },
  "japan-entry-public-signals-vs-first-party-data": {
    src: "/japan-entry/signal-check.svg",
    alt: "Public signals separated from first-party data and unknowns",
    caption: "A defensible market report separates public observations, authorized data, and unknowns.",
  },
}

export function textToLexical(text: string) {
  return {
    root: {
      type: "root" as const,
      direction: "ltr" as const,
      format: "" as const,
      indent: 0,
      version: 1,
      children: text.split("\n\n").filter(Boolean).map((paragraph) => ({
        type: "paragraph" as const,
        direction: "ltr" as const,
        format: "" as const,
        indent: 0,
        version: 1,
        children: [{ type: "text" as const, text: paragraph, format: 0 }],
      })),
    },
  }
}
