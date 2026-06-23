import type { ReportLocale } from "./types";
import type {
  DeepSeekAboutEnhancement,
  DeepSeekContactEnhancement,
  DeepSeekEnhancedOutput,
  DeepSeekHomeEnhancement,
  DeepSeekServicesEnhancement,
} from "./demo-deepseek-types";

const DEEPSEEK_BASE_URL = "https://api.deepseek.com/v1";
const DEEPSEEK_MODEL = "deepseek-chat";
const DEEPSEEK_TIMEOUT_MS = 60_000;
const MAX_RETRIES = 1;

/* ───── DeepSeek API call ───── */

export async function callDeepSeek(
  apiKey: string,
  messages: Array<{ role: "system" | "user"; content: string }>,
  attempt: number,
): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEEPSEEK_TIMEOUT_MS);

  try {
    const response = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
        messages,
        temperature: 0.7,
        max_tokens: 4096,
        response_format: { type: "json_object" },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      console.error(
        `[deepseek-enhancer] API error ${response.status} (attempt ${attempt + 1}): ${body.slice(0, 500)}`,
      );
      if (attempt < MAX_RETRIES) {
        return callDeepSeek(apiKey, messages, attempt + 1);
      }
      return null;
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      console.error(
        "[deepseek-enhancer] API returned empty content (attempt " +
          (attempt + 1) +
          ")",
      );
      if (attempt < MAX_RETRIES) {
        return callDeepSeek(apiKey, messages, attempt + 1);
      }
      return null;
    }

    return content;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (err instanceof DOMException && err.name === "AbortError") {
      console.error(
        `[deepseek-enhancer] DeepSeek API timed out after ${DEEPSEEK_TIMEOUT_MS / 1000}s (attempt ${attempt + 1})`,
      );
    } else {
      console.error(
        `[deepseek-enhancer] DeepSeek API call failed (attempt ${attempt + 1}): ${message}`,
      );
    }

    if (attempt < MAX_RETRIES) {
      return callDeepSeek(apiKey, messages, attempt + 1);
    }
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/* ───── Output parsing ───── */

/**
 * Parse DeepSeek JSON output into DeepSeekEnhancedOutput shape.
 * Validates structure and sanitizes corrupted text.
 */
export function parseDeepSeekOutput(
  raw: string,
  locale: ReportLocale,
): {
  home?: DeepSeekHomeEnhancement;
  about?: DeepSeekAboutEnhancement;
  services?: DeepSeekServicesEnhancement;
  contact?: DeepSeekContactEnhancement;
} | null {
  try {
    // DeepSeek sometimes wraps JSON in markdown code blocks
    let jsonStr = raw.trim();
    const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1].trim();
    }

    const parsed = JSON.parse(jsonStr) as Record<string, unknown>;

    // Validate we got at least a home page (minimum viable output)
    if (!parsed.home || typeof parsed.home !== "object") {
      console.error(
        "[deepseek-enhancer] Parsed output missing 'home' key — invalid structure",
      );
      return null;
    }

    return {
      home: sanitizeHomePage(parsed.home as Record<string, unknown>),
      about: sanitizeAboutPage((parsed.about as Record<string, unknown>) ?? {}),
      services: sanitizeServicesPage(
        (parsed.services as Record<string, unknown>) ?? {},
      ),
      contact: sanitizeContactPage(
        (parsed.contact as Record<string, unknown>) ?? {},
      ),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(
      "[deepseek-enhancer] Failed to parse DeepSeek output: " + message,
    );
    console.error(
      "[deepseek-enhancer] Raw output (first 500 chars): " +
        raw.slice(0, 500),
    );
    return null;
  }
}

/* ───── Sanitizers ───── */

const CORRUPT_CHARS = /[�邵郢鬮隴陞陷驍縺繝譁蜑荳譛谿險螟豕邨髻蠕蝠逕莠陦蛻諡蜷繧]/;
const ENTITY_PATTERN = /&#x[0-9a-fA-F]+;|&#\d+;/g;

function cleanStr(s: unknown, fallback: string, max: number): string {
  if (typeof s !== "string") return fallback;
  let v = s.replace(/\s+/g, " ").trim();
  // Remove HTML entities
  v = v.replace(ENTITY_PATTERN, "");
  if (!v || CORRUPT_CHARS.test(v)) return fallback;
  return v.length > max ? v.slice(0, max - 1) + "…" : v;
}

function sanitizeHomePage(
  raw: Record<string, unknown>,
): DeepSeekHomeEnhancement {
  const features = Array.isArray(raw.features)
    ? raw.features.slice(0, 6).map((f: unknown) => {
        const item = f as Record<string, unknown> | undefined;
        return {
          title: cleanStr(item?.title, "", 80),
          description: cleanStr(item?.description, "", 160),
          icon: cleanStr(item?.icon, "sparkles", 30),
          metric_label: cleanStr(item?.metric_label, "", 40),
          metric_value: cleanStr(item?.metric_value, "", 30),
        };
      })
    : [];

  const testimonials = Array.isArray(raw.testimonials)
    ? raw.testimonials.slice(0, 4).map((t: unknown) => {
        const item = t as Record<string, unknown> | undefined;
        return {
          quote: cleanStr(item?.quote, "", 200),
          author: cleanStr(item?.author, "", 100),
        };
      })
    : [];

  const faq = Array.isArray(raw.faq)
    ? raw.faq.slice(0, 8).map((f: unknown) => {
        const item = f as Record<string, unknown> | undefined;
        return {
          q: cleanStr(item?.q, "", 120),
          a: cleanStr(item?.a, "", 300),
        };
      })
    : [];

  return {
    hero_title: cleanStr(raw.hero_title, "", 120),
    hero_subtitle: cleanStr(raw.hero_subtitle, "", 200),
    features,
    testimonials,
    faq,
  };
}

function sanitizeAboutPage(
  raw: Record<string, unknown>,
): DeepSeekAboutEnhancement {
  const values = Array.isArray(raw.values)
    ? raw.values.slice(0, 6).map((v: unknown) => {
        const item = v as Record<string, unknown> | undefined;
        return {
          title: cleanStr(item?.title, "", 80),
          description: cleanStr(item?.description, "", 200),
          icon: cleanStr(item?.icon, "star", 30),
        };
      })
    : [];

  return {
    story: cleanStr(raw.story, "", 800),
    mission: cleanStr(raw.mission, "", 200),
    values,
  };
}

function sanitizeServicesPage(
  raw: Record<string, unknown>,
): DeepSeekServicesEnhancement {
  const services = Array.isArray(raw.services)
    ? raw.services.slice(0, 6).map((s: unknown) => {
        const item = s as Record<string, unknown> | undefined;
        const features = Array.isArray(item?.features)
          ? item.features.slice(0, 8).map((f: unknown) => cleanStr(f, "", 80))
          : [];
        return {
          title: cleanStr(item?.title, "", 80),
          description: cleanStr(item?.description, "", 300),
          icon: cleanStr(item?.icon, "sparkles", 30),
          features: features.filter(Boolean),
        };
      })
    : [];

  const process = Array.isArray(raw.process)
    ? raw.process.slice(0, 6).map((p: unknown) => {
        const item = p as Record<string, unknown> | undefined;
        return {
          step:
            typeof item?.step === "number"
              ? item.step
              : Number(item?.step) || 1,
          title: cleanStr(item?.title, "", 80),
          description: cleanStr(item?.description, "", 200),
        };
      })
    : [];

  return {
    intro: cleanStr(raw.intro, "", 300),
    services,
    process,
  };
}

function sanitizeContactPage(
  raw: Record<string, unknown>,
): DeepSeekContactEnhancement {
  return {
    intro: cleanStr(raw.intro, "", 250),
    booking_cta: cleanStr(raw.booking_cta, "", 80),
    form_note: cleanStr(raw.form_note, "", 200),
  };
}
