import type { DemoMultiPageData } from "./demo-site-types"
import type { DeepSeekEnhancedOutput } from "./demo-deepseek-types"
import { groundDemoText } from "./demo-copy-grounding"
import { curateEditorialFacts, expandGroundedBody } from "./demo-content-depth"

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
  const usableFacts = curateEditorialFacts(base.meta.verifiedFacts ?? [])
  const groundedDetail = (scope: string, index: number) => {
    const fact = usableFacts.length > 0 ? usableFacts[index % usableFacts.length] : ""
    if (isJa) {
      return fact
        ? `${fact.replace(/[。．]+$/u, "")}。${base.companyName}の${scope}を、初めての方にも流れが伝わる順序でご紹介します。`
        : `${base.companyName}の${scope}を、利用を検討する方が迷わず読み進められる順序でご紹介します。`
    }
    return fact
      ? `${fact.replace(/[.!]+$/u, "")}. The ${scope} at ${base.companyName} is presented in a sequence that is easy for a first-time visitor to follow.`
      : `The ${scope} at ${base.companyName} is presented in a sequence that helps a first-time visitor continue without guesswork.`
  }
  const groundedFallback = groundedDetail(isJa ? "事業と提供内容" : "business and offer", 0)
  const reservedLongCopy = new Set<string>()
  const reserveUniqueCopy = (value: string, fallback: string): string => {
    const normalized = value.replace(/\s+/gu, " ").trim()
    if (normalized.length < 42 || !reservedLongCopy.has(normalized)) {
      if (normalized.length >= 42) reservedLongCopy.add(normalized)
      return value
    }
    const safeFallback = fallback.trim()
    if (safeFallback.length >= 42) reservedLongCopy.add(safeFallback.replace(/\s+/gu, " "))
    return safeFallback
  }
  const groundUniqueCopy = (value: string, fallback: string): string => reserveUniqueCopy(
    groundDemoText(value, verifiedFacts, fallback),
    fallback,
  )
  const groundedServices = (ai.services.services ?? []).map((service, index) => ({
    title: groundDemoText(service.title, verifiedFacts, isJa ? `ご案内 ${index + 1}` : `Offering ${index + 1}`),
    description: groundUniqueCopy(service.description, groundedDetail(isJa ? `提供内容 ${index + 1}` : `offering ${index + 1}`, index)),
  }))
  type NarrativeInput = { eyebrow: string; title: string; body: string; points: string[] }
  const groundModules = (
    modules: NarrativeInput[],
    label: string,
    context: "home" | "about" | "services",
  ) => modules.map((module, index) => {
    const targetLength = context === "about" ? (isJa ? 220 : 650) : (isJa ? 180 : 520)
    const expansionInput = {
      companyName: base.companyName,
      facts: base.meta.verifiedFacts ?? [],
      services: groundedServices,
      locale: isJa ? "ja" as const : "en" as const,
      context,
      targetLength,
    }
    const body = expandGroundedBody({
      ...expansionInput,
      body: groundDemoText(module.body, verifiedFacts, `${groundedFallback} ${isJa ? `項目${index + 1}` : `Section ${index + 1}`}`),
      index,
    })
    const fallbackBody = expandGroundedBody({
      ...expansionInput,
      body: groundedDetail(isJa ? `${label}本文 ${index + 1}` : `${label} copy ${index + 1}`, index + 4),
      index: index + 4,
    })
    return {
      eyebrow: groundDemoText(module.eyebrow, verifiedFacts, `${label} ${String(index + 1).padStart(2, "0")}`),
      title: groundDemoText(module.title, verifiedFacts, isJa ? `${label}のご案内 ${index + 1}` : `${label} guide ${index + 1}`),
      body: reserveUniqueCopy(body, fallbackBody),
      points: module.points.map((point, pointIndex) => groundDemoText(
        point,
        verifiedFacts,
        isJa ? `確認事項 ${index + 1}-${pointIndex + 1}` : `Verified item ${index + 1}-${pointIndex + 1}`,
      )),
    }
  });
  const completeModules = (
    generated: NarrativeInput[] | undefined,
    fallback: NarrativeInput[] | undefined,
    label: string,
    context: "home" | "about" | "services",
  ) => {
    const seen = new Set<string>()
    const combined = [...(generated ?? []), ...(fallback ?? [])].filter((module) => {
      const key = module.body.replace(/\s+/gu, " ").trim()
      if (!module.body.trim() || seen.has(key)) return false
      seen.add(key)
      return true
    })
    while (combined.length < 3) {
      const index = combined.length
      combined.push({
        eyebrow: `${label} ${String(index + 1).padStart(2, "0")}`,
        title: isJa ? `${label}を知る視点 ${index + 1}` : `${label} perspective ${index + 1}`,
        body: groundedDetail(isJa ? `${label}の背景 ${index + 1}` : `${label} background ${index + 1}`, index + 12),
        points: [],
      })
    }
    return groundModules(combined.slice(0, 3), label, context)
  }

  // Home: hero title/subtitle
  if (ai.home.hero_title?.trim()) {
    home.hero = { ...home.hero, title: groundDemoText(ai.home.hero_title, verifiedFacts, base.companyName) };
  }
  if (ai.home.hero_subtitle?.trim()) {
    home.hero = { ...home.hero, subtitle: groundUniqueCopy(ai.home.hero_subtitle, groundedDetail(isJa ? "トップページ" : "homepage", 0)) };
  }

  // Home: features (AI replaces rules-based if at least 2 AI features exist)
  if (ai.home.features && ai.home.features.length >= 2) {
    home.features = ai.home.features.map((f, i) => ({
      title: groundDemoText(f.title, verifiedFacts, isJa ? `確認済みのご案内 ${i + 1}` : `Verified information ${i + 1}`),
      description: groundUniqueCopy(f.description, groundedDetail(isJa ? `特徴 ${i + 1}` : `feature ${i + 1}`, i)),
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
  if (ai.about.story?.trim()) about.story = groundUniqueCopy(ai.about.story, groundedDetail(isJa ? "事業紹介" : "business story", 1));
  if (ai.about.mission?.trim()) about.mission = groundUniqueCopy(ai.about.mission, groundedDetail(isJa ? "大切にする姿勢" : "business principle", 2));
  if (ai.about.values && ai.about.values.length >= 2) {
    about.values = ai.about.values.map((v, i) => ({
      title: groundDemoText(v.title, verifiedFacts, isJa ? `大切にすること ${i + 1}` : `What matters ${i + 1}`),
      description: groundUniqueCopy(v.description, groundedDetail(isJa ? `大切にすること ${i + 1}` : `principle ${i + 1}`, i + 1)),
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
  if (ai.services.intro?.trim()) services.subtitle = groundUniqueCopy(ai.services.intro, groundedDetail(isJa ? "サービス概要" : "service overview", 3));
  if (ai.services.services && ai.services.services.length >= 1) {
    services.services = ai.services.services.map((s, i) => ({
      title: groundDemoText(s.title, verifiedFacts, isJa ? `ご案内 ${i + 1}` : `Offering ${i + 1}`),
      description: groundUniqueCopy(s.description, groundedDetail(isJa ? `提供内容 ${i + 1}` : `offering ${i + 1}`, i)),
      icon: s.icon || "sparkles",
      features: s.features?.filter(Boolean).map((feature, featureIndex) => groundUniqueCopy(
        feature,
        groundedDetail(isJa ? `確認事項 ${i + 1}-${featureIndex + 1}` : `service detail ${i + 1}-${featureIndex + 1}`, i + featureIndex + 1),
      )) ?? [],
      priceNote: undefined,
    }));
  }
  if (ai.services.process && ai.services.process.length >= 2) {
    services.process = ai.services.process.map((p, index) => ({
      step: p.step || 1,
      title: groundDemoText(p.title, verifiedFacts, isJa ? "ご利用案内" : "Visitor information"),
      description: groundUniqueCopy(p.description, groundedDetail(isJa ? `ご利用の流れ ${index + 1}` : `visitor step ${index + 1}`, index + 2)),
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
      const key = section.body.replace(/\s+/gu, " ").trim()
      if (!section.body.trim() || seenWorks.has(key)) return false
      seenWorks.add(key)
      return true
    })
    while (completeWorks.length < 4) {
      const index = completeWorks.length
      completeWorks.push({
        title: isJa ? `空間と仕事の風景 ${index + 1}` : `Place and work ${index + 1}`,
        body: groundedDetail(isJa ? `スタイル紹介 ${index + 1}` : `work story ${index + 1}`, index + 16),
        note: "",
      })
    }
    completeWorks.splice(6)
    works.sections = completeWorks.map((section, index) => {
      const expansionInput = {
        companyName: base.companyName,
        facts: base.meta.verifiedFacts ?? [],
        services: groundedServices,
        locale: isJa ? "ja" as const : "en" as const,
        context: "works" as const,
        targetLength: isJa ? 180 : 520,
      }
      const body = expandGroundedBody({
        ...expansionInput,
        body: groundDemoText(section.body, verifiedFacts, `${groundedFallback} ${isJa ? `場面${index + 1}` : `Scene ${index + 1}`}`),
        index,
      })
      const fallbackBody = expandGroundedBody({
        ...expansionInput,
        body: groundedDetail(isJa ? `スタイル紹介 ${index + 1}` : `work story ${index + 1}`, index + 8),
        index: index + 8,
      })
      return {
        id: `story-${index + 1}`,
        heading: groundDemoText(section.title, verifiedFacts, isJa ? `スタイル ${index + 1}` : `Story ${index + 1}`),
        body: reserveUniqueCopy(body, fallbackBody),
        note: groundDemoText(section.note, verifiedFacts, ""),
      }
    });
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
  const facts = curateEditorialFacts(base.meta.verifiedFacts ?? [])
    .filter((fact) => fact !== address && fact !== base.companyName)
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
