import { describe, expect, it } from "vitest"
import { qualityForCode } from "./site-reproduction"

const page = { id: "home", path: "/", url: "https://example.com/", title: "Example" }

describe("site reproduction quality gate", () => {
  it("blocks placeholder and incomplete output", () => {
    const result = qualityForCode("<html><body>Lorem ipsum</body></html>", page)
    expect(result.passed).toBe(false)
    expect(result.blockers).toContain("hasSemanticSections")
    expect(result.blockers).toContain("noPlaceholderCopy")
  })

  it("accepts a complete responsive page with motion and accessibility", () => {
    const code = `<!doctype html><html><body><header><nav aria-label="主 navigation"><a href="/">Home</a></nav></header><main><section><h1>Example</h1><img src="data:image/png;base64,AA==" alt="Example" /></section></main><footer></footer><style>@media (max-width: 768px){main{padding:1rem}} .card{transition:transform .3s;transform:translateY(0)}</style></body></html>`
    const result = qualityForCode(code, page)
    expect(result.passed).toBe(true)
    expect(result.blockers).toEqual([])
  })
})
