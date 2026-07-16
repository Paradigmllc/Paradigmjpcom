import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { OpportunityOfferPanel } from "@/components/opportunity/OpportunityOfferPanel";

describe("OpportunityOfferPanel", () => {
  const callHref = "https://cal.com/paradigm-jp/15min?name=Our%20Place";
  const contactHref = "/en/contact?intent=japan-entry&company=Our%20Place";

  it("shows the fixed terms, limited offer and all seven workstreams", () => {
    const html = renderToStaticMarkup(
      <OpportunityOfferPanel
        callHref={callHref}
        contactHref={contactHref}
        isJa={false}
      />,
    );

    expect(html).toContain("$12,000");
    expect(html).toContain("paid upfront");
    expect(html).toContain("continuation pricing is agreed separately after the included period");
    expect(html).toContain("available for a limited time");
    expect(html).toContain("small number of accepted companies");
    expect(html).toContain("form submission alone does not reserve a place");
    expect(html.match(/<li/g)).toHaveLength(7);
    expect(html).toContain("Market and offer framing");
    expect(html).toContain("Launch operations, shared workspace and handover");
  });

  it("renders exactly the booking and application CTAs with company context", () => {
    const html = renderToStaticMarkup(
      <OpportunityOfferPanel
        callHref={callHref}
        contactHref={contactHref}
        isJa={false}
      />,
    );

    expect(html.match(/<a /g)).toHaveLength(2);
    expect(html).toContain("Book the 15-minute review");
    expect(html).toContain("Apply via the form");
    expect(html).toContain(
      "href=\"https://cal.com/paradigm-jp/15min?name=Our%20Place\"",
    );
    expect(html).toContain(
      "href=\"/en/contact?intent=japan-entry&amp;company=Our%20Place\"",
    );
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
  });

  it("renders the Japanese application label", () => {
    const html = renderToStaticMarkup(
      <OpportunityOfferPanel
        callHref={callHref}
        contactHref="/ja/contact?intent=japan-entry&company=Our%20Place"
        isJa
      />,
    );

    expect(html).toContain("期間限定・数組限定");
    expect(html).toContain("申込（フォーム）");
  });
});
