import { describe, expect, it } from "vitest"
import {
  applyDemoAdminOverrides,
  sanitizeDemoAdminFields,
  sanitizeReportAdminFields,
} from "./artifact-admin-overrides"
import type { DemoMultiPageData } from "./demo-site-types"

function demoData(): DemoMultiPageData {
  return {
    slug: "sample-demo",
    companyId: "company-1",
    companyName: "Sample Co",
    locale: "ja",
    industry: "consulting",
    meta: {
      title: "Original title",
      description: "Original description",
      ogImage: "",
      industry: "consulting",
      locale: "ja",
      companyName: "Sample Co",
      accentColor: "#2563eb",
      accentColorDark: "#1e40af",
      calBookingUrl: "https://cal.com/paradigm-jp/15min",
      generatedAt: "2026-06-25T00:00:00.000Z",
      engine: "test",
      artifact_admin: {
        demo_overrides: {
          metaTitle: "Edited title",
          homeTitle: "Edited hero",
          aboutStory: "Edited story",
          contactEmail: "hello@example.com",
        },
      },
    } as DemoMultiPageData["meta"],
    pages: {
      home: {
        hero: {
          title: "Original hero",
          subtitle: "Original subtitle",
          tagline: "Demo",
          companyName: "Sample Co",
          industryLabel: "Consulting",
          locationLabel: "Tokyo",
          primaryCta: { text: "Book", href: "/contact" },
          secondaryCta: { text: "More", href: "#features" },
          accentColor: "#2563eb",
          accentColorDark: "#1e40af",
        },
        features: [],
        stats: [],
        beforeAfter: [],
        totalLoss: "",
        cta: {
          title: "Original CTA",
          subtitle: "Original CTA subtitle",
          buttonText: "Book",
          buttonHref: "/contact",
          accentColor: "#2563eb",
          accentColorDark: "#1e40af",
        },
      },
      about: {
        title: "About",
        subtitle: "About subtitle",
        companyName: "Sample Co",
        industryLabel: "Consulting",
        locationLabel: "Tokyo",
        story: "Original story",
        mission: "Mission",
        values: [],
        teamNote: "",
        accentColor: "#2563eb",
      },
      services: {
        title: "Services",
        subtitle: "Services subtitle",
        services: [],
        process: [],
        accentColor: "#2563eb",
      },
      contact: {
        title: "Contact",
        subtitle: "Contact subtitle",
        companyName: "Sample Co",
        email: "old@example.com",
        address: "Tokyo",
        calBookingUrl: "https://cal.com/paradigm-jp/15min",
        accentColor: "#2563eb",
      },
    },
  }
}

describe("artifact admin overrides", () => {
  it("sanitizes report fields with empty strings as reset values", () => {
    const fields = sanitizeReportAdminFields({
      hook: "  New hook  ",
      pain: "",
      fear: null,
      loss: "Loss body",
      cta: 123,
    })

    expect(fields).toEqual({
      hook: "New hook",
      pain: null,
      fear: null,
      loss: "Loss body",
      cta: undefined,
    })
  })

  it("applies demo overrides without changing unrelated generated content", () => {
    const edited = applyDemoAdminOverrides(demoData())

    expect(edited.meta.title).toBe("Edited title")
    expect(edited.pages.home.hero.title).toBe("Edited hero")
    expect(edited.pages.home.hero.subtitle).toBe("Original subtitle")
    expect(edited.pages.about.story).toBe("Edited story")
    expect(edited.pages.contact.email).toBe("hello@example.com")
  })

  it("sanitizes demo fields and ignores unsupported values", () => {
    const fields = sanitizeDemoAdminFields({
      metaTitle: "  Demo title  ",
      homeSubtitle: "",
      contactEmail: ["invalid"],
    })

    expect(fields.metaTitle).toBe("Demo title")
    expect(fields.homeSubtitle).toBeNull()
    expect(fields.contactEmail).toBeUndefined()
  })
})
