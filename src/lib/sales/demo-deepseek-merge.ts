import type { DemoMultiPageData } from "./demo-site-types"
import type { DeepSeekEnhancedOutput } from "./demo-deepseek-types"
import { groundDemoText } from "./demo-copy-grounding"
import { expandGroundedBody } from "./demo-content-depth"

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
  const works = base.pages.works ? { ...base.pages.works } : undefined;
  const isJa = effectiveLocale === "ja";
  const verifiedFacts = (base.meta.verifiedFacts ?? []).join("\n");
  const factSummary = (base.meta.verifiedFacts ?? [])
    .filter((fact) => fact.trim() && !/^https?:\/\//u.test(fact))
    .slice(0, 4)
    .join(isJa ? "、" : ", ");
  const usableFacts = (base.meta.verifiedFacts ?? [])
    .filter((fact) => fact.trim() && !/^https?:\/\//u.test(fact))
  const groundedFallback = factSummary
    ? (isJa ? `確認済みの公開情報では、${factSummary}をご案内しています。` : `Verified public information includes ${factSummary}.`)
    : (isJa ? "詳細は正式公開前に事業者確認を行います。" : "Details require operator confirmation before publication.");
  const groundedDetail = (scope: string, index: number) => {
    const fact = usableFacts.length > 0 ? usableFacts[index % usableFacts.length] : ""
    if (isJa) {
      return fact
        ? `${fact}。${base.companyName}の${scope}として現在確認できる情報です。変わる可能性がある詳細は、正式公開前に事業者確認を行います。`
        : `${base.companyName}の${scope}は、正式公開前に事業者確認を行い、現在の案内だけを掲載します。`
    }
    return fact
      ? `${fact}. This is currently verified information for ${scope} at ${base.companyName}. Details that may change require operator confirmation before publication.`
      : `${scope} at ${base.companyName} requires operator confirmation before publication so only current information is presented.`
  }
  const groundedServices = (ai.services.services ?? []).map((service, index) => ({
    title: groundDemoText(service.title, verifiedFacts, isJa ? `ご案内 ${index + 1}` : `Offering ${index + 1}`),
    description: groundDemoText(service.description, verifiedFacts, groundedDetail(isJa ? `提供内容 ${index + 1}` : `offering ${index + 1}`, index)),
  }))
  type NarrativeInput = { eyebrow: string; title: string; body: string; points: string[] }
  const groundModules = (
    modules: NarrativeInput[],
    label: string,
    context: "home" | "about" | "services",
  ) => modules.map((module, index) => ({
    eyebrow: groundDemoText(module.eyebrow, verifiedFacts, `${label} ${String(index + 1).padStart(2, "0")}`),
    title: groundDemoText(module.title, verifiedFacts, isJa ? `${label}のご案内 ${index + 1}` : `${label} guide ${index + 1}`),
    body: expandGroundedBody({
      body: groundDemoText(module.body, verifiedFacts, `${groundedFallback} ${isJa ? `項目${index + 1}` : `Section ${index + 1}`}`),
      companyName: base.companyName,
      facts: base.meta.verifiedFacts ?? [],
      services: groundedServices,
      index,
      locale: isJa ? "ja" : "en",
      context,
      targetLength: context === "about" ? (isJa ? 220 : 650) : (isJa ? 180 : 520),
    }),
    points: module.points.map((point, pointIndex) => groundDemoText(
      point,
      verifiedFacts,
      isJa ? `確認事項 ${index + 1}-${pointIndex + 1}` : `Verified item ${index + 1}-${pointIndex + 1}`,
    )),
  }));
  const completeModules = (
    generated: NarrativeInput[] | undefined,
    fallback: NarrativeInput[] | undefined,
    label: string,
    context: "home" | "about" | "services",
  ) => {
    const seen = new Set<string>()
    const combined = [...(generated ?? []), ...(fallback ?? [])].filter((module) => {
      const key = `${module.title.trim()}\n${module.body.trim()}`
      if (!module.body.trim() || seen.has(key)) return false
      seen.add(key)
      return true
    }).slice(0, 4)
    return groundModules(combined, label, context)
  }

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
      description: groundDemoText(f.description, verifiedFacts, groundedDetail(isJa ? `特徴 ${i + 1}` : `feature ${i + 1}`, i)),
      icon: f.icon || "sparkles",
      metricLabel: "",
      metricValue: "",
      metricBench: "",
      severity: "info" as const,
    }));
  }
  home.narrativeModules = completeModules(
    ai.home.narrative_modules,
    home.narrativeModules,
    isJa ? "特徴" : "Highlights",
    "home",
  );

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
      description: groundDemoText(v.description, verifiedFacts, groundedDetail(isJa ? `大切にすること ${i + 1}` : `principle ${i + 1}`, i + 1)),
      icon: v.icon || "star",
    }));
  }
  about.chapters = completeModules(
    ai.about.chapters,
    about.chapters,
    isJa ? "事業紹介" : "Our story",
    "about",
  );

  // Services: intro, services list, process
  if (ai.services.intro?.trim()) services.subtitle = groundDemoText(ai.services.intro, verifiedFacts, groundedFallback);
  if (ai.services.services && ai.services.services.length >= 1) {
    services.services = ai.services.services.map((s, i) => ({
      title: groundDemoText(s.title, verifiedFacts, isJa ? `ご案内 ${i + 1}` : `Offering ${i + 1}`),
      description: groundDemoText(s.description, verifiedFacts, groundedDetail(isJa ? `提供内容 ${i + 1}` : `offering ${i + 1}`, i)),
      icon: s.icon || "sparkles",
      features: s.features?.filter(Boolean).map((feature, featureIndex) => groundDemoText(
        feature,
        verifiedFacts,
        groundedDetail(isJa ? `確認事項 ${i + 1}-${featureIndex + 1}` : `service detail ${i + 1}-${featureIndex + 1}`, i + featureIndex + 1),
      )) ?? [],
      priceNote: undefined,
    }));
  }
  if (ai.services.process && ai.services.process.length >= 2) {
    services.process = ai.services.process.map((p, index) => ({
      step: p.step || 1,
      title: groundDemoText(p.title, verifiedFacts, isJa ? "ご利用案内" : "Visitor information"),
      description: groundDemoText(p.description, verifiedFacts, groundedDetail(isJa ? `ご利用の流れ ${index + 1}` : `visitor step ${index + 1}`, index + 2)),
    }));
  }
  services.guidance = completeModules(
    ai.services.guidance,
    services.guidance,
    isJa ? "サービス案内" : "Service guide",
    "services",
  );
  if (works && ai.works.intro?.trim()) {
    works.subtitle = groundDemoText(ai.works.intro, verifiedFacts, works.subtitle);
    const seenWorks = new Set<string>()
    const completeWorks = [
      ...(ai.works.sections ?? []).map((section) => ({ title: section.title, body: section.body, note: section.note })),
      ...works.sections.map((section) => ({ title: section.heading, body: section.body, note: section.note ?? "" })),
    ].filter((section) => {
      const key = `${section.title.trim()}\n${section.body.trim()}`
      if (!section.body.trim() || seenWorks.has(key)) return false
      seenWorks.add(key)
      return true
    }).slice(0, 6)
    works.sections = completeWorks.map((section, index) => ({
      id: `story-${index + 1}`,
      heading: groundDemoText(section.title, verifiedFacts, isJa ? `スタイル ${index + 1}` : `Story ${index + 1}`),
      body: expandGroundedBody({
        body: groundDemoText(section.body, verifiedFacts, `${groundedFallback} ${isJa ? `場面${index + 1}` : `Scene ${index + 1}`}`),
        companyName: base.companyName,
        facts: base.meta.verifiedFacts ?? [],
        services: groundedServices,
        index,
        locale: isJa ? "ja" : "en",
        context: "works",
        targetLength: isJa ? 180 : 520,
      }),
      note: groundDemoText(section.note, verifiedFacts, ""),
    }));
  }

  // Contact copy remains rules-based. The private-review form never sends and
  // no response time or booking policy is inferred from an SNS profile.

  const premium = base.premium ? {
    ...base.premium,
    heroMedia: base.premium.heroMedia.map((item) => ({
      ...item,
      alt: groundDemoText(item.alt, verifiedFacts, `${base.companyName} ${isJa ? "提案用イメージ" : "proposal image"}`),
      caption: groundDemoText(item.caption, verifiedFacts, isJa ? "提案用イメージ" : "Proposal image"),
      eyebrow: groundDemoText(item.eyebrow, verifiedFacts, ""),
      title: groundDemoText(item.title, verifiedFacts, ""),
    })),
    gallery: base.premium.gallery.map((item) => ({
      ...item,
      alt: groundDemoText(item.alt, verifiedFacts, `${base.companyName} ${isJa ? "提案用イメージ" : "proposal image"}`),
      caption: groundDemoText(item.caption, verifiedFacts, isJa ? "提案用イメージ" : "Proposal image"),
      eyebrow: groundDemoText(item.eyebrow, verifiedFacts, ""),
      title: groundDemoText(item.title, verifiedFacts, ""),
    })),
    intro: {
      ...base.premium.intro,
      title: home.hero.title,
      body: about.story,
      note: groundDemoText(base.premium.intro.note, verifiedFacts, isJa ? "詳細は正式公開前に事業者確認を行います。" : "Details require operator confirmation before publication."),
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
    pages: { ...base.pages, home, about, services, contact, works, faq: faqPage },
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
