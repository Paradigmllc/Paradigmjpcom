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

export interface DeepSeekHomeEnhancement {
  hero_title: string;
  hero_subtitle: string;
  features: DeepSeekFeature[];
  testimonials: DeepSeekTestimonial[];
  faq: DeepSeekFAQ[];
}

export interface DeepSeekAboutEnhancement {
  story: string;
  mission: string;
  values: DeepSeekValue[];
}

export interface DeepSeekServicesEnhancement {
  intro: string;
  services: DeepSeekServiceItem[];
  process: DeepSeekProcessStep[];
}

export interface DeepSeekContactEnhancement {
  intro: string;
  booking_cta: string;
  form_note: string;
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
  };
  home: Partial<DeepSeekHomeEnhancement>;
  about: Partial<DeepSeekAboutEnhancement>;
  services: Partial<DeepSeekServicesEnhancement>;
  contact: Partial<DeepSeekContactEnhancement>;
}
