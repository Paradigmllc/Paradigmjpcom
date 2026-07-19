import "server-only"

type PlaywrightModule = typeof import("playwright")

const MAX_EVIDENCE_BYTES = 48_000

export interface SiteDomEvidence {
  mode: "dom-css"
  provider: "playwright"
  bytes: number
  elementCount: number
  imageCount: number
  evidence: string
}

function viewportSize(viewport: "desktop" | "mobile"): { width: number; height: number; isMobile: boolean } {
  return viewport === "mobile"
    ? { width: 390, height: 844, isMobile: true }
    : { width: 1280, height: 800, isMobile: false }
}

export async function captureWebsiteDomEvidence(input: {
  targetUrl: string
  viewport: "desktop" | "mobile"
  maxBytes?: number
}): Promise<{ ok: true; evidence: SiteDomEvidence } | { ok: false; error: string }> {
  const size = viewportSize(input.viewport)
  const maxBytes = Math.min(Math.max(input.maxBytes ?? MAX_EVIDENCE_BYTES, 8_000), MAX_EVIDENCE_BYTES)
  try {
    const runtimeImport = new Function("specifier", "return import(specifier)") as (specifier: string) => Promise<PlaywrightModule>
    const { chromium } = await runtimeImport("playwright")
    const browser = await chromium.launch({ headless: true })
    try {
      const page = await browser.newPage({
        viewport: { width: size.width, height: size.height },
        isMobile: size.isMobile,
        hasTouch: size.isMobile,
      })
      await page.goto(input.targetUrl, { waitUntil: "networkidle", timeout: 30_000 })
      await page.waitForTimeout(400)
      const raw = await page.evaluate(() => {
        const textOf = (value: string | null | undefined): string => (value ?? "").replace(/\s+/gu, " ").trim().slice(0, 180)
        const rectOf = (element: Element): { x: number; y: number; width: number; height: number } => {
          const rect = element.getBoundingClientRect()
          return { x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height) }
        }
        const visible = (element: Element): boolean => {
          const rect = element.getBoundingClientRect()
          const style = window.getComputedStyle(element)
          return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden"
        }
        const elements = Array.from(document.querySelectorAll("body *"))
          .filter(visible)
          .slice(0, 220)
          .map((element) => {
            const style = window.getComputedStyle(element)
            const attributes = ["role", "aria-label", "href", "alt"].reduce<Record<string, string>>((result, name) => {
              const value = element.getAttribute(name)
              if (value) result[name] = value.slice(0, 220)
              return result
            }, {})
            return {
              tag: element.tagName.toLowerCase(),
              id: element.id.slice(0, 80),
              classes: (typeof element.className === "string" ? element.className : "").split(/\s+/u).filter(Boolean).slice(0, 8),
              text: textOf(element.textContent),
              attributes,
              rect: rectOf(element),
              style: {
                display: style.display,
                position: style.position,
                flexDirection: style.flexDirection,
                gridTemplateColumns: style.gridTemplateColumns,
                fontFamily: style.fontFamily,
                fontSize: style.fontSize,
                fontWeight: style.fontWeight,
                lineHeight: style.lineHeight,
                letterSpacing: style.letterSpacing,
                color: style.color,
                backgroundColor: style.backgroundColor,
                borderRadius: style.borderRadius,
                padding: style.padding,
                margin: style.margin,
              },
            }
          })
        const images = Array.from(document.images).slice(0, 80).map((image) => ({
          src: image.currentSrc || image.src,
          alt: image.alt.slice(0, 180),
          width: image.naturalWidth,
          height: image.naturalHeight,
          rect: rectOf(image),
        }))
        const stylesheetHints = Array.from(document.styleSheets).flatMap((sheet) => {
          try {
            return Array.from(sheet.cssRules).slice(0, 80).map((rule) => rule.cssText.slice(0, 500))
          } catch (error) {
            return [sheet.href ? `external stylesheet: ${sheet.href}` : "cross-origin stylesheet unavailable"]
          }
        }).slice(0, 160)
        return {
          title: document.title.slice(0, 180),
          url: location.href,
          viewport: { width: window.innerWidth, height: window.innerHeight },
          bodyClass: document.body.className.slice(0, 240),
          elements,
          images,
          stylesheetHints,
        }
      })
      let serialized = JSON.stringify(raw)
      if (Buffer.byteLength(serialized, "utf8") > maxBytes) {
        serialized = JSON.stringify({ ...raw, elements: raw.elements.slice(0, 100), stylesheetHints: raw.stylesheetHints.slice(0, 60) })
      }
      if (Buffer.byteLength(serialized, "utf8") > maxBytes) {
        serialized = JSON.stringify({ ...raw, elements: raw.elements.slice(0, 40), images: raw.images.slice(0, 24), stylesheetHints: raw.stylesheetHints.slice(0, 20) })
      }
      if (Buffer.byteLength(serialized, "utf8") > maxBytes) throw new Error(`DOM/CSS evidence exceeded the ${maxBytes} byte limit`)
      return {
        ok: true,
        evidence: {
          mode: "dom-css",
          provider: "playwright",
          bytes: Buffer.byteLength(serialized, "utf8"),
          elementCount: raw.elements.length,
          imageCount: raw.images.length,
          evidence: serialized,
        },
      }
    } finally {
      await browser.close()
    }
  } catch (error) {
    console.error("[site-dom-evidence] capture failed:", error)
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  }
}
