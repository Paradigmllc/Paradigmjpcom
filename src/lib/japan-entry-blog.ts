export type JapanEntryBlogPost = {
  slug: string
  title: string
  excerpt: string
  category: string
  readTime: string
  publishedAt: string
  tags: string[]
  content: string
}

/**
 * English, Japan-entry-specific editorial content.
 *
 * These articles are intentionally practical rather than generic agency SEO.
 * Every public English post carries the publication marker used by
 * blog-cms.ts, so unrelated legacy sales copy cannot leak into the funnel.
 */
export const JAPAN_ENTRY_BLOG_POSTS: JapanEntryBlogPost[] = [
  {
    slug: "enter-japan-without-hiring-local-team",
    title: "How to Enter Japan Without Hiring a Local Team",
    excerpt:
      "A practical way for an established overseas SMB to test a Japan revenue path without starting with a local entity, a full-time hire, or a fragmented agency stack.",
    category: "Japan Entry",
    readTime: "8 min",
    publishedAt: "2026-07-11",
    tags: ["japan-entry-public", "Japan Entry", "SMB", "Market Entry"],
    content: `## The decision is usually not “Japan or no Japan”

For many overseas SMBs, the harder question is how to move forward without creating a second company before demand is understood. A local hire, a new office, several specialist vendors, and an unfinished Japanese site can consume months before a buyer has a clear way to respond.

The first useful step is a bounded launch path: one accountable operator, a written scope, a Japanese buyer-facing revenue path, and a clear handover. This does not remove legal, tax, banking, licensing, fulfilment, or product obligations. It makes the commercial and operational work visible before those decisions are made.

## What a practical first launch should contain

- A Japanese-language buyer path that explains the offer in the way Japanese buyers need to evaluate it.
- Trust and compliance coordination, with unresolved professional advice separated from implementation work.
- An eligible inquiry or payment route for the actual offer.
- Local discovery and search-readiness foundations that can be inspected and measured.
- Bilingual support rules, human escalation, ownership, and handover documentation.

The point is not to promise a ranking, revenue number, or frictionless incorporation. The point is to leave the company with a launchable system and a written list of remaining dependencies.

## When this model fits

It fits a company with a real offer, an empowered approver, source material that can be shared quickly, and a willingness to make decisions without a long procurement cycle. Headcount and industry matter less than decision speed, offer clarity, and the ability to provide feedback.

It does not fit a company that expects a single launch package to replace legal advice, inventory, logistics, paid advertising, or every future feature request.

## The commercial shape

The Japan Entry package uses a fixed $12,000 one-time setup. The standard monthly operation is included at no additional monthly charge for the first six months. From month seven, the ongoing service is $995/month under the signed terms. Third-party costs and approved work outside the written scope remain separate.

That structure gives a decision-maker one number to approve for setup, a defined period to operate the launch, and a clear recurring price before the work begins.`
  },
  {
    slug: "japan-entry-21-business-day-readiness",
    title: "Japan Market Entry: A 21-Business-Day Readiness Checklist",
    excerpt:
      "The 21-business-day target is a gated launch plan, not a promise that external providers or client approvals can be rushed. Here is what must be ready.",
    category: "Japan Entry",
    readTime: "7 min",
    publishedAt: "2026-07-11",
    tags: ["japan-entry-public", "Japan Entry", "Launch Plan", "SMB"],
    content: `## What the 21-business-day target means

The target covers the agreed implementation work after kickoff. It assumes that the decision-maker, source materials, account access, feedback, and required third-party reviews arrive on time. It is a planning target, not an unconditional launch guarantee.

## Before kickoff

The fastest projects settle five questions first:

1. What is the first Japanese offer, and who is it for?
2. Who can approve copy, scope, access, and launch decisions?
3. Which existing assets can be reused, and which need localization?
4. What payment, support, fulfilment, and regulated obligations apply?
5. Which external platforms or providers can delay launch?

If any of these remain unclear, the blocker should be recorded before implementation starts rather than hidden inside the timeline.

## The gated delivery sequence

### Days 1–5: fit and source review

Confirm the offer, buyer path, access, source content, ownership, and acceptance criteria. Decide what is in the fixed scope and what requires written approval.

### Days 6–15: localized implementation

Build the agreed revenue site, trust elements, inquiry or payment route, discovery foundation, search-readiness baseline, and bilingual support workflow. Sensitive or uncertain responses receive a defined human escalation path.

### Days 16–21: approval and handover

Run launch checks, resolve agreed revisions, document ownership and operating steps, and hand over the system. The clock moves when required client inputs and approvals are available.

## The client-side checklist

Prepare the current offer, brand assets, product facts, proof that may be published, access to required accounts, preferred launch date, and one empowered approver. Also identify any claims that require legal, tax, banking, or regulatory review.

The strongest preparation is not a large document pack. It is a short, accurate source of truth and fast decisions when a dependency is discovered.`
  },
  {
    slug: "localization-vs-translation-japan-buyers",
    title: "Localization vs Translation: What Japanese Buyers Actually Need",
    excerpt:
      "A translated page can still feel unsafe to buy from. The difference is information design, proof, support, and the next action—not just language.",
    category: "Japan Entry",
    readTime: "8 min",
    publishedAt: "2026-07-11",
    tags: ["japan-entry-public", "Localization", "Buyer Trust", "Japan Entry"],
    content: `## Translation changes words; localization changes the buying path

A direct translation can preserve the original sentence while losing the reason a Japanese buyer should trust it. Buyers need to understand who is responsible, what happens after an inquiry, how support works, what is included, and which claims are independently verifiable.

Localization therefore starts with the decision path. It asks what a buyer must know before contacting a foreign company and where uncertainty should be answered on the page.

## Five areas that usually need more than translation

- **Offer framing:** explain the customer problem and the deliverable before listing features.
- **Trust signals:** identify the company, operating location, ownership, support route, and evidence that can be inspected.
- **Commercial clarity:** show price, billing timing, exclusions, third-party costs, and cancellation terms without euphemisms.
- **Interaction design:** make the inquiry, payment, or next-step route clear on mobile as well as desktop.
- **Support boundaries:** define what automation can answer, when a human reviews the request, and who owns the follow-up.

## What should remain in the original language

Product names, legal terms, technical identifiers, and claims that require a professional review should not be casually rewritten. They should be translated carefully, then checked against the source of truth and the applicable market context.

## The useful acceptance test

Ask a buyer who was not involved in the project to answer three questions after reading the page:

1. What exactly can I buy?
2. What will happen after I submit the form?
3. What is not included?

If the answers are vague, the page is not ready even if every sentence is grammatically correct.

Localization is complete when the buyer can make the next decision with less uncertainty—not when the source text has been copied into another language.`
  },
  {
    slug: "japanese-entity-bank-account-needed",
    title: "Do You Need a Japanese Entity or Bank Account to Sell in Japan?",
    excerpt:
      "The answer depends on what you sell, how you collect payment, and which obligations apply. Use this as a preparation guide—not as legal or tax advice.",
    category: "Japan Entry",
    readTime: "7 min",
    publishedAt: "2026-07-11",
    tags: ["japan-entry-public", "Japan Entry", "Compliance", "Market Entry"],
    content: `## There is no universal yes or no

Some companies can validate demand from overseas before creating a Japanese entity. Others need local structure, regulated permissions, a domestic payment route, local fulfilment, or a different tax and invoicing arrangement before they can operate responsibly.

The right answer depends on the product, customer, payment flow, delivery model, data handled, and any sector-specific rules. A website or launch operator cannot replace qualified legal, tax, banking, or licensing advice.

## Questions to answer early

- Where is the customer contract formed?
- Who receives payment and issues the invoice?
- Where are goods stored, shipped, returned, or serviced?
- Does the product or service require a licence or local professional?
- What personal data crosses borders, and which provider handles it?
- Who is responsible for Japanese-language support and complaints?

These questions turn “Do we need a company?” into a concrete dependency list.

## What an entry package can and cannot do

A fixed launch package can coordinate the buyer-facing site, trust information, inquiry or payment route, operating ownership, and the handoff to the specialists who must decide legal or tax matters. It can also document which dependency blocks launch and what evidence is still needed.

It should not imply that incorporation, tax opinions, regulated licences, banking approval, inventory, logistics, or advertising spend are included unless they are explicitly written into the engagement.

## The practical next step

Prepare a short description of the offer, customer location, payment flow, fulfilment model, support model, and any regulated features. A qualified adviser can then review the actual facts instead of a generic market-entry checklist.`
  },
  {
    slug: "japan-entry-cost-hiring-agency-fixed-scope",
    title: "The Real Cost of Entering Japan: Hiring, Agencies, and Fixed-Scope Delivery",
    excerpt:
      "Compare the full operating shape—not just the quoted fee—when choosing between a local hire, multiple specialists, or one fixed Japan Entry setup.",
    category: "Japan Entry",
    readTime: "8 min",
    publishedAt: "2026-07-11",
    tags: ["japan-entry-public", "Pricing", "SMB", "Japan Entry"],
    content: `## The cheapest quote is rarely the cheapest launch

The visible fee is only one part of the decision. A launch also consumes founder time, internal coordination, localization review, account setup, approval cycles, and the cost of fixing unclear ownership later.

### A local hire

A hire can become a long-term asset, but it also creates recruiting, employment, management, training, and workload risk before the Japan offer is proven. One person rarely covers localization, web implementation, discovery, support, and operations at the same depth.

### Several specialist vendors

Specialists can be excellent at their lane. The risk is the gap between lanes: one vendor owns the site, another owns search, another owns support, and nobody owns the launch decision. The client becomes the integration layer.

### A fixed-scope launch operator

A fixed package is useful when the company wants a defined starting system, one accountable owner, explicit dependencies, and a known handover. It is not a substitute for every specialist or every future request. Its value is reducing coordination risk and making the first launch decision concrete.

## The Paradigm commercial structure

The Japan Entry setup is $12,000 one time. The standard monthly operation is included with no additional monthly charge for the first six months. From month seven, the ongoing service is $995/month under the signed terms. Third-party charges and approved work outside scope remain separate.

Before comparing providers, ask each one to show the same items: deliverables, client inputs, acceptance criteria, exclusions, ownership, launch dependencies, ongoing responsibilities, and what stops when the engagement ends.

The right choice is the one whose scope matches the decision you are actually ready to make.`
  },
  {
    slug: "build-trust-with-japanese-buyers",
    title: "How an Overseas SMB Can Build Trust with Japanese Buyers",
    excerpt:
      "Trust is not a decorative section on a translated page. It is the sum of clear ownership, evidence, response expectations, and predictable next steps.",
    category: "Japan Entry",
    readTime: "8 min",
    publishedAt: "2026-07-11",
    tags: ["japan-entry-public", "Buyer Trust", "Localization", "Japan Entry"],
    content: `## Trust begins before the first conversation

Japanese buyers evaluating an overseas company often have to resolve more uncertainty than a domestic buyer: who is responsible, where support comes from, how problems are handled, and whether the company will still respond after payment.

The answer is not a louder claim. It is a more inspectable operating path.

## Six trust signals worth making visible

1. **A named company and accountable contact route.** Do not hide who operates the site.
2. **A precise offer.** State what is included, what is excluded, and how changes are approved.
3. **Real operating expectations.** Explain response, review, escalation, and handover boundaries without promising instant results.
4. **Evidence that can be inspected.** Show the workflow, process, deliverables, and current company information rather than anonymous claims.
5. **A predictable application path.** Tell the buyer what information is requested and what happens after submission.
6. **Respect for professional boundaries.** Separate implementation coordination from legal, tax, banking, and licensing advice.

## What weakens trust

Unverifiable rankings, unsupported superlatives, vague low-commitment promises, hidden recurring fees, and a page that says “contact us” without explaining the next step all increase perceived risk.

## A useful content test

Read the page as a skeptical finance or operations lead. Can they identify the supplier, scope, price, dependency, owner, and next action in five minutes? If not, add clarity before adding more animation or more claims.

Trust is the confidence that the same promise will still be understandable after the contract is signed.`
  },
]

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
