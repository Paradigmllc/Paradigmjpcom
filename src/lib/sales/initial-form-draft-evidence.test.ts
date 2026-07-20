import { describe, expect, it } from "vitest";
import { extractPublicProductNames } from "./initial-form-draft-evidence";

describe("public product-name evidence", () => {
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
});
