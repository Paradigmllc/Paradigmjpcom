import type { DemoMultiPageData } from "./demo-site-types"
import type { DeepSeekEnhancedOutput } from "./demo-deepseek-types"
import { groundDemoText } from "./demo-copy-grounding"

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
  const isJa = effectiveLocale === "ja";
  const verifiedFacts = (base.meta.verifiedFacts ?? []).join("\n");
  const factSummary = (base.meta.verifiedFacts ?? [])
    .filter((fact) => fact.trim() && !/^https?:\/\//u.test(fact))
    .slice(0, 4)
    .join(isJa ? "、" : ", ");
  const groundedFallback = factSummary
    ? (isJa ? `確認済みの公開情報では、${factSummary}をご案内しています。` : `Verified public information includes ${factSummary}.`)
    : (isJa ? "詳細は正式公開前に事業者確認を行います。" : "Details require operator confirmation before publication.");

  // Home: hero title/subtitle
  if (ai.home.hero_title?.trim()) {
    home.hero = { ...home.hero, title: groundDemoText(ai.home.hero_title, verifiedFacts, base.companyName) };
  }
  if (ai.home.hero_subtitle?.trim()) {
    home.hero = { ...home.hero, subtitle: groundDemoText(ai.home.hero_subtitle, verifiedFacts, groundedFallback) };
  }

  // Home: features (AI replaces rules-based if at least 2 AI features exist)
  if (ai.home.features && ai.home.features.length >= 2) {
    home.features = ai.home.features.map((f, i) => ({
      title: groundDemoText(f.title, verifiedFacts, isJa ? `確認済みのご案内 ${i + 1}` : `Verified information ${i + 1}`),
      description: groundDemoText(f.description, verifiedFacts, groundedFallback),
      icon: f.icon || "sparkles",
      metricLabel: "",
      metricValue: "",
      metricBench: "",
      severity: "info" as const,
    }));
  }

  // Testimonials and customer logos are never accepted from generative output.
  // They require independently verified evidence and explicit usage rights.
  home.testimonials = undefined;
  home.trustedBy = undefined;
  home.totalLoss = "";
  if (home.metricsSummary) {
    home.metricsSummary = {
      ...home.metricsSummary,
      monthlyLoss: null,
      recoveryAmount: null,
    };
  }

  // FAQ and contact operations are not safe generative fields. Even a strong
  // prompt can turn an official social URL into an invented DM/reservation
  // policy. Keep these fields deterministic and evidence-bound.
  home.faq = buildEvidenceBoundFaq(base, effectiveLocale);

  // About: story, mission, values
  if (ai.about.story?.trim()) about.story = groundDemoText(ai.about.story, verifiedFacts, groundedFallback);
  if (ai.about.mission?.trim()) about.mission = groundDemoText(ai.about.mission, verifiedFacts, groundedFallback);
  if (ai.about.values && ai.about.values.length >= 2) {
    about.values = ai.about.values.map((v, i) => ({
      title: groundDemoText(v.title, verifiedFacts, isJa ? `大切にすること ${i + 1}` : `What matters ${i + 1}`),
      description: groundDemoText(v.description, verifiedFacts, groundedFallback),
      icon: v.icon || "star",
    }));
  }

  // Services: intro, services list, process
  if (ai.services.intro?.trim()) services.subtitle = groundDemoText(ai.services.intro, verifiedFacts, groundedFallback);
  if (ai.services.services && ai.services.services.length >= 1) {
    services.services = ai.services.services.map((s, i) => ({
      title: groundDemoText(s.title, verifiedFacts, isJa ? `ご案内 ${i + 1}` : `Offering ${i + 1}`),
      description: groundDemoText(s.description, verifiedFacts, groundedFallback),
      icon: s.icon || "sparkles",
      features: s.features?.filter(Boolean).map((feature) => groundDemoText(feature, verifiedFacts, groundedFallback)) ?? [],
      priceNote: effectiveLocale === "ja" ? "料金は要確認" : "Pricing to be confirmed",
    }));
  }
  if (ai.services.process && ai.services.process.length >= 2) {
    services.process = ai.services.process.map((p) => ({
      step: p.step || 1,
      title: groundDemoText(p.title, verifiedFacts, isJa ? "ご利用案内" : "Visitor information"),
      description: groundDemoText(p.description, verifiedFacts, groundedFallback),
    }));
  }

  // Contact copy remains rules-based. The private-review form never sends and
  // no response time or booking policy is inferred from an SNS profile.

  const premium = base.premium ? {
    ...base.premium,
    intro: {
      ...base.premium.intro,
      title: home.hero.title,
      body: about.story,
    },
  } : undefined;
  const faqPage = base.pages.faq && home.faq ? {
    ...base.pages.faq,
    sections: home.faq.map((item) => ({ id: item.id, heading: item.question, body: item.answer })),
  } : base.pages.faq;

  return {
    ...base,
    premium,
    meta: {
      ...base.meta,
      engine: "deepseek",
      generatedAt: ai.generatedAt,
      llmModel: ai.model,
      llmUsage: ai.usage,
    },
    pages: { ...base.pages, home, about, services, contact, faq: faqPage },
  };
}

function buildEvidenceBoundFaq(base: DemoMultiPageData, locale: string) {
  const isJa = locale === "ja";
  const instagram = base.premium?.social.find((item) => item.network === "instagram");
  const address = base.pages.contact.address?.trim();
  const facts = (base.meta.verifiedFacts ?? [])
    .filter((fact) => fact.trim() && !/^https?:\/\//u.test(fact) && fact !== address && fact !== base.companyName)
    .slice(0, 3);

  return [
    ...(facts.length > 0 ? [{
      id: "verified-offering",
      question: isJa ? "どのような商品・サービスがありますか？" : "What products or services are available?",
      answer: isJa
        ? `確認済みの公開情報では、${facts.join("、")}をご案内しています。詳細は正式公開前に事業者確認を行います。`
        : `Verified public information currently lists ${facts.join(", ")}. Details require operator confirmation before publication.`,
    }] : []),
    ...(address ? [{
      id: "verified-address",
      question: isJa ? "所在地はどこですか？" : "Where are you located?",
      answer: isJa ? `所在地は${address}です。地図はアクセス欄から確認できます。` : `The verified address is ${address}. See the access map for directions.`,
    }] : []),
    ...(instagram ? [{
      id: "verified-hours",
      question: isJa ? "最新の営業情報はどこで確認できますか？" : "Where can I find current operating information?",
      answer: isJa ? "最新の営業情報は公式Instagramをご確認ください。" : "Please check the official Instagram profile for current operating information.",
    }] : []),
    {
      id: "operator-confirmation",
      question: isJa ? "予約やお問い合わせ方法を教えてください。" : "How can I make a reservation or inquiry?",
      answer: isJa
        ? "予約可否と正式なお問い合わせ方法は、公開前に事業者確認が必要です。このデモのフォームからは送信されません。"
        : "Reservation availability and the official inquiry method require operator confirmation. This demo form does not submit data.",
    },
  ].slice(0, 4);
}
