import { describe, expect, it } from "vitest"
import { inspectContactFormHtml } from "./contact-form-inspection"

describe("inspectContactFormHtml", () => {
  it("requires email, message, and submit controls on a contact page", () => {
    const result = inspectContactFormHtml(`
      <html><head><title>Contact Example</title></head><body>
        <h1>Contact our team</h1>
        <form action="/contact" method="post">
          <label for="name">Name</label><input id="name" name="name">
          <label for="email">Email</label><input id="email" type="email" name="email">
          <label for="message">Message</label><textarea id="message" name="message"></textarea>
          <button type="submit">Send</button>
        </form>
      </body></html>
    `, "https://example.com/contact", "https://example.com")

    expect(result).toMatchObject({ status: "form", reason: "verified_contact_fields", sameOrigin: true })
    expect(result.fields).toEqual(expect.arrayContaining(["name", "email", "message", "submit"]))
  })

  it("rejects newsletter forms even when they contain an email and submit button", () => {
    const result = inspectContactFormHtml(`
      <html><head><title>Products</title></head><body>
        <form class="newsletter subscribe"><input type="email" name="email"><button type="submit">Subscribe</button></form>
      </body></html>
    `, "https://example.com/collections/platform-bed-frames", "https://example.com")

    expect(result.status).toBe("missing")
    expect(result.reason).toBe("non_contact_form")
  })

  it("rejects a contact-looking form that posts to an unrelated host", () => {
    const result = inspectContactFormHtml(`
      <html><head><title>Contact</title></head><body>
        <form action="https://apps.shopify.com/form-builder-contact-form">
          <input type="email" name="email"><textarea name="message"></textarea><button type="submit">Send</button>
        </form>
      </body></html>
    `, "https://example.com/contact", "https://example.com")

    expect(result.status).toBe("page")
    expect(result.reason).toBe("untrusted_action")
  })

  it("treats a blank client-rendered contact route as a soft 404", () => {
    const result = inspectContactFormHtml(
      "<html><head><title>Screenshot to Code</title></head><body><div id=\"root\"></div><script>render()</script></body></html>",
      "https://screenshottocode.com/contact",
      "https://screenshottocode.com",
    )

    expect(result).toMatchObject({ status: "missing", reason: "empty_or_soft_404", formCount: 0 })
  })

  it("treats an explicit not-found contact route as missing", () => {
    const result = inspectContactFormHtml(
      "<html><head><title>Page not found</title></head><body><h1>404</h1><p>This page does not exist.</p></body></html>",
      "https://example.com/contact",
      "https://example.com",
    )

    expect(result).toMatchObject({ status: "missing", reason: "empty_or_soft_404", formCount: 0 })
  })
})
