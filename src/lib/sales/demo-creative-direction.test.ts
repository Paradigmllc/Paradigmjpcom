import { describe, expect, it } from "vitest"
import { buildDemoCreativeDirection, readCreativeDirection, visualGrammar } from "./demo-creative-direction"
import { DEMO_TEMPLATES } from "./demo-templates/registry"

describe("demo creative direction", () => {
  it("keeps a DeepSeek direction bounded to executable renderer choices", () => {
    const template = DEMO_TEMPLATES[0]
    const direction = buildDemoCreativeDirection(template, {
      companyName: "地域工務店",
      industry: "construction",
    }, 0, {
      template_id: template.id,
      concept: "素材と施工精度を余白と罫線で伝える設計誌",
      typography_style: "technical-sans",
      hero_composition: "precision-split",
      service_layout: "precision-grid",
      works_layout: "case-grid",
      palette_mood: "earth",
      density: "compact",
      motion: "restrained",
      signature_motif: "framed-media",
    })

    expect(direction.source).toBe("deepseek")
    expect(direction.concept).toContain("施工精度")
    expect(visualGrammar(direction)).toEqual(expect.objectContaining({
      typographyStyle: "technical-sans",
      heroComposition: "precision-split",
      worksLayout: "case-grid",
    }))
  })

  it("produces three distinct deterministic grammars when AI is unavailable", () => {
    const grammars = DEMO_TEMPLATES.slice(0, 3).map((template, index) => visualGrammar(
      buildDemoCreativeDirection(template, { companyName: "サンプル", industry: "retail" }, index),
    ))

    expect(new Set(grammars.map((grammar) => JSON.stringify(grammar))).size).toBe(3)
  })

  it("reads only complete persisted creative directions", () => {
    const complete = buildDemoCreativeDirection(
      DEMO_TEMPLATES[0],
      { companyName: "サンプル", industry: "retail" },
      0,
    )

    expect(readCreativeDirection({ creativeDirection: complete })).toEqual(complete)
    expect(readCreativeDirection({ creativeDirection: { ...complete, motion: "unknown" } })).toBeNull()
  })
})
