import { describe, expect, it } from "vitest"
import { PET_MOVIE_TEMPLATES, resolvePetMovieTemplate, templateForMood } from "./templates"

describe("Pet Life Movie production templates", () => {
  it("uses a distinct rhythm, transition and accent for every template", () => {
    const templates = Object.values(PET_MOVIE_TEMPLATES)
    expect(new Set(templates.map((item) => item.rhythm)).size).toBe(templates.length)
    expect(new Set(templates.map((item) => item.transition)).size).toBe(templates.length)
    expect(new Set(templates.map((item) => item.accent)).size).toBe(templates.length)
  })

  it("maps moods deterministically and fails safely to the warm template", () => {
    expect(templateForMood("playful")).toBe("playful-scrapbook")
    expect(templateForMood("cinematic")).toBe("cinematic-tribute")
    expect(templateForMood("gentle")).toBe("warm-keepsake")
    expect(resolvePetMovieTemplate("unknown").id).toBe("warm-keepsake")
  })
})
