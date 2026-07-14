export interface DeepSeekFeature {
  title: string;
  description: string;
  icon: string;
  metric_label: string;
  metric_value: string;
}

export interface DeepSeekTestimonial {
  quote: string;
  author: string;
}

export interface DeepSeekFAQ {
  q: string;
  a: string;
}

export interface DeepSeekValue {
  title: string;
  description: string;
  icon: string;
}

export interface DeepSeekServiceItem {
  title: string;
  description: string;
  icon: string;
  features: string[];
}

export interface DeepSeekProcessStep {
  step: number;
  title: string;
  description: string;
}

export interface DeepSeekNarrativeModule {
  eyebrow: string;
  title: string;
  body: string;
  points: string[];
}

export interface DeepSeekWorksSection {
  title: string;
  body: string;
  note: string;
}

export interface DeepSeekHomeEnhancement {
  hero_title: string;
  hero_subtitle: string;
  features: DeepSeekFeature[];
  testimonials: DeepSeekTestimonial[];
  faq: DeepSeekFAQ[];
  narrative_modules: DeepSeekNarrativeModule[];
}

export interface DeepSeekAboutEnhancement {
  story: string;
  mission: string;
  values: DeepSeekValue[];
  chapters: DeepSeekNarrativeModule[];
}

export interface DeepSeekServicesEnhancement {
  intro: string;
  services: DeepSeekServiceItem[];
  process: DeepSeekProcessStep[];
  guidance: DeepSeekNarrativeModule[];
}

export interface DeepSeekWorksEnhancement {
  intro: string;
  sections: DeepSeekWorksSection[];
}

export interface DeepSeekContactEnhancement {
  intro: string;
  booking_cta: string;
  form_note: string;
}

export interface DeepSeekArtDirection {
  template_id: string;
  concept: string;
  typography_style: "editorial-serif" | "humanist-sans" | "modern-grotesk" | "technical-sans";
  hero_composition: "cinematic" | "editorial-split" | "precision-split" | "mosaic";
  service_layout: "editorial-list" | "salon-catalogue" | "precision-grid";
  works_layout: "journal" | "salon-lookbook" | "case-grid";
  palette_mood: "warm-neutral" | "cool-professional" | "earth" | "monochrome" | "soft-contrast";
  density: "airy" | "balanced" | "compact";
  motion: "restrained" | "editorial" | "expressive";
  signature_motif: "hairline" | "numbered-index" | "framed-media" | "offset-grid" | "kinetic-rail";
}

/**
 * Structured output from DeepSeek enhancement.
 * All fields are optional — the merger applies AI content only where available.
 */
export interface DeepSeekEnhancedOutput {
  engine: "deepseek";
  generatedAt: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    cacheHitTokens: number;
    cacheMissTokens: number;
    cacheHitRatio: number;
  };
  home: Partial<DeepSeekHomeEnhancement>;
  about: Partial<DeepSeekAboutEnhancement>;
  services: Partial<DeepSeekServicesEnhancement>;
  works: Partial<DeepSeekWorksEnhancement>;
  contact: Partial<DeepSeekContactEnhancement>;
  artDirections: DeepSeekArtDirection[];
}
