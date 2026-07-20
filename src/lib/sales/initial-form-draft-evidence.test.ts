import { describe, expect, it } from "vitest";
import { decodePublicHtmlText, extractPublicProductNames, joinPublicEvidenceSegments, selectRicherHomepageHtml } from "./initial-form-draft-evidence";

describe("public product-name evidence", () => {
  it("decodes zero-padded, hexadecimal, and double-encoded company-name entities", () => {
    expect(decodePublicHtmlText("L&#039;ABC du Parfum")).toBe("L'ABC du Parfum")
    expect(decodePublicHtmlText("L&#x027;ABC du Parfum")).toBe("L'ABC du Parfum")
    expect(decodePublicHtmlText("L&amp;#039;ABC du Parfum")).toBe("L'ABC du Parfum")
  })

  it("keeps only complete public evidence segments inside the storage bound", () => {
    expect(joinPublicEvidenceSegments([
      "Concrete product description",
      "A detailed capability that does not fit in the remaining space",
      "Short workflow",
    ], 45)).toBe("Concrete product description | Short workflow")
  })

  it("extracts only named products and applications from strong public metadata", () => {
    const html = `
      <meta name="application-name" content="Screenshot to Code">
      <script type="application/ld+json">
        {
          "@context": "https://schema.org",
          "@graph": [
            {"@type":"Organization","name":"Example Holdings"},
            {"@type":"SoftwareApplication","name":"PixelPilot"},
            {"@type":"Product","name":"Design Export API"}
          ]
        }
      </script>
    `;

    expect(extractPublicProductNames(html)).toEqual([
      "Screenshot to Code",
      "PixelPilot",
      "Design Export API",
    ]);
  });

  it("does not promote generic labels or malformed structured data into product facts", () => {
    const html = `
      <meta name="application-name" content="Platform">
      <script type="application/ld+json">{"@type":"Product","name":</script>
      <script type="application/ld+json">{"@type":"Organization","name":"Acme"}</script>
    `;

    expect(extractPublicProductNames(html)).toEqual([]);
  });

  it("uses browser-rendered evidence when a client shell hides the actual product page", () => {
    const direct = `<html><head><title>Screenshot to Code</title></head><body><div id="root"></div><script src="app.js"></script></body></html>`
    const rendered = `<html><body><h1>Build User Interfaces 10x Faster</h1><h2>Video to Code</h2><p>${"AI-powered screenshot, video, and text-to-code workflow. ".repeat(14)}</p></body></html>`

    expect(selectRicherHomepageHtml(direct, rendered)).toMatchObject({
      html: rendered,
      evidenceMode: "browser_rendered",
    })
  })

  it("keeps direct HTML when rendered output adds no material evidence", () => {
    const direct = `<html><body><h1>Acme Analytics</h1><p>${"Public inventory analytics workflow. ".repeat(12)}</p></body></html>`
    const rendered = `<html><body><h1>Acme Analytics</h1><p>Public inventory analytics workflow.</p></body></html>`

    expect(selectRicherHomepageHtml(direct, rendered).evidenceMode).toBe("direct_html")
  })
});
