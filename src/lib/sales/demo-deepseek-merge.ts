import type { DemoMultiPageData } from "./demo-site-types"
import type { DeepSeekEnhancedOutput } from "./demo-deepseek-types"

/**
 * Merge DeepSeek AI-enhanced output into the rules-based DemoMultiPageData.
 * AI copy takes priority for text content; rules-based structure is preserved.
 * This is a lightweight version of the merge in demo-personalized-builder.ts.
 */
export function mergeDeepSeekOutput(
  base: DemoMultiPageData,
  ai: DeepSeekEnhancedOutput,
  effectiveLocale: string,
): DemoMultiPageData {
  const home = { ...base.pages.home };
  const about = { ...base.pages.about };
  const services = { ...base.pages.services };
  const contact = { ...base.pages.contact };

  // Home: hero title/subtitle
  if (ai.home.hero_title?.trim()) {
    home.hero = { ...home.hero, title: ai.home.hero_title };
  }
  if (ai.home.hero_subtitle?.trim()) {
    home.hero = { ...home.hero, subtitle: ai.home.hero_subtitle };
  }

  // Home: features (AI replaces rules-based if at least 2 AI features exist)
  if (ai.home.features && ai.home.features.length >= 2) {
    home.features = ai.home.features.map((f, i) => ({
      title: f.title || `Feature ${i + 1}`,
      description: f.description || "",
      icon: f.icon || "sparkles",
      metricLabel: f.metric_label || "",
      metricValue: f.metric_value || "",
      metricBench: "",
      severity: "info" as const,
    }));
  }

  // Home: testimonials (AI augments existing)
  if (ai.home.testimonials && ai.home.testimonials.length > 0) {
    const aiTestimonials = ai.home.testimonials.map((t, i) => ({
      id: `ai-testimonial-${i}`,
      quote: t.quote || "",
      author: t.author || "",
      role: "",
      avatarInitials: (t.author || "A").charAt(0).toUpperCase(),
    }));
    home.testimonials = [...(home.testimonials ?? []), ...aiTestimonials];
  }

  // Home: FAQ (AI replaces rules-based if at least 2 exist)
  if (ai.home.faq && ai.home.faq.length >= 2) {
    home.faq = ai.home.faq.map((f, i) => ({
      id: `ai-faq-${i}`,
      question: f.q || "",
      answer: f.a || "",
    }));
  }

  // About: story, mission, values
  if (ai.about.story?.trim()) about.story = ai.about.story;
  if (ai.about.mission?.trim()) about.mission = ai.about.mission;
  if (ai.about.values && ai.about.values.length >= 2) {
    about.values = ai.about.values.map((v) => ({
      title: v.title || "",
      description: v.description || "",
      icon: v.icon || "star",
    }));
  }

  // Services: intro, services list, process
  if (ai.services.intro?.trim()) services.subtitle = ai.services.intro;
  if (ai.services.services && ai.services.services.length >= 1) {
    services.services = ai.services.services.map((s) => ({
      title: s.title || "",
      description: s.description || "",
      icon: s.icon || "sparkles",
      features: s.features?.filter(Boolean) ?? [],
      priceNote: effectiveLocale === "ja" ? "お見積り無料" : "Free estimate",
    }));
  }
  if (ai.services.process && ai.services.process.length >= 2) {
    services.process = ai.services.process.map((p) => ({
      step: p.step || 1,
      title: p.title || "",
      description: p.description || "",
    }));
  }

  // Contact: intro, form note
  if (ai.contact.intro?.trim()) contact.subtitle = ai.contact.intro;
  if (ai.contact.form_note?.trim()) contact.formNote = ai.contact.form_note;

  return {
    ...base,
    meta: {
      ...base.meta,
      engine: "deepseek",
      generatedAt: ai.generatedAt,
    },
    pages: { home, about, services, contact },
  };
}
