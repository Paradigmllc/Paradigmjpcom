import { z } from "zod";
import { callDeepSeek, type DeepSeekResponse } from "@/lib/deepseek";
import type { BusinessModel, JapanEntryProjection } from "./japan-entry-projection";
import { criticMessages, generationMessages } from "./japan-entry-personalized-message-prompts";
import type { JapanEntryMessagePurpose } from "./japan-entry-personalized-message-prompts";
import type { JapanEntryInitialInterestOptions } from "./japan-entry-message-options";
import type { ManualMessageAngle } from "./manual-japan-entry-angle";
import type { ManualOutreachPlaybook, ManualPositioningConcept } from "./manual-japan-entry-playbook";
import { withManualFormCopyReadyEnvelope } from "./manual-japan-entry-copy-envelope";
import { buildPersonalizedMessageRepairInput } from "./japan-entry-personalized-message-repair";
import { buildJapanEntryPersonalizationFacts } from "./japan-entry-personalized-message-facts";
import {
  manualMessageSimilarity, stripRejectedManualMessageSentences,
  reviewManualMessageDistinctness,
  type ManualMessageSimilarityReview,
  type PriorManualMessage,
} from "./manual-japan-entry-message-similarity";
import { finalizeManualMessageProduction } from "./manual-japan-entry-uniqueness-finalizer";
import {
  getJapanEntryMessageMode,
  reviewPersonalizedJapanEntryMessage,
  type JapanEntryMessageReview,
} from "./japan-entry-personalized-message-review";
import {
  buildManualCtaContracts,
  resolveManualCtaAnchors,
} from "./manual-japan-entry-cta-contract";
import {
  addDeepSeekUsage,
  callDeepSeekStructured,
  type DeepSeekStructuredCaller,
} from "./japan-entry-personalized-message-structured";
import {
  canSafelyFinishManualModelCopy, canUseManualDeterministicRecovery,
  recoverManualInitialInterestCandidate,
  selectBestManualCandidateInspection,
} from "./manual-japan-entry-candidate-recovery";
import {
  isInitialInterestProductEvidenceSafe,
  selectGroundedProductEvidence,
  selectSupplementalProductEvidence,
} from "./japan-entry-personalized-message-contract";
import {
  publicManualMessageCandidate,
  publicManualMessageStrategy,
  type ManualGeneratedMessageCandidate,
  type ManualMessageStrategy,
} from "./japan-entry-personalized-message-public"
import { reviewManualMessagePersonalization, type ManualPersonalizationReview } from "./manual-japan-entry-copy-quality"
import { buildManualCopyPlan, buildManualQuestionDecisionAnchor } from "./manual-japan-entry-copy-plan"
import {
  bespokeRewriteSchema,
  personalizedCandidateSchema as candidateSchema,
  personalizedCriticSchema as criticSchema,
  personalizedGenerationSchema as generationSchema,
  personalizedRepairSchema as repairSchema,
  personalizedStrategySchema as strategySchema,
} from "./japan-entry-personalized-message-schemas"
import { bespokeRewriteMessages } from "./japan-entry-personalized-message-bespoke-rewrite"
import { finalizeManualBespokeCta } from "./manual-japan-entry-bespoke-cta"
import {
  buildManualEditorialReview,
  EDITORIAL_DIMENSION_FLOOR,
} from "./japan-entry-personalized-message-editorial-review"
export { buildJapanEntryPersonalizationFacts } from "./japan-entry-personalized-message-facts";
export type { JapanEntryPersonalizationFact } from "./japan-entry-personalized-message-facts";
export { reviewPersonalizedJapanEntryMessage } from "./japan-entry-personalized-message-review";
export type { JapanEntryMessageReview } from "./japan-entry-personalized-message-review";
export type { ManualGeneratedMessageCandidate, ManualMessageStrategy } from "./japan-entry-personalized-message-public";
const INITIAL_SAFETY_REPAIR_LIMIT = 2;
const BESPOKE_REWRITE_LIMIT = 3;
const EDITORIAL_REPAIR_LIMIT = 5;
const DETERMINISTIC_RECOVERY_PASS = 2;
const RECOVERY_REWRITE_ISSUE = "A deterministic safety recovery was used. Rewrite the complete body in fresh, natural, company-specific language; preserve every exact evidence and CTA contract, and do not reuse any recovery sentence.";
export interface PersonalizedJapanEntryMessageResult {
  ok: boolean;
  message?: string;
  review?: JapanEntryMessageReview;
  usage?: DeepSeekResponse["usage"];
  error?: string;
  strategy?: ManualMessageStrategy;
  candidates?: ManualGeneratedMessageCandidate[];
  selectedIndex?: number;
  evidencePack?: ManualMessageEvidence[];
  similarity?: ManualMessageSimilarityReview;
}
export interface ManualMessageEvidence {
  id: string;
  statement: string;
  source: string;
  confidence: number;
  classification: "observed" | "modeled" | "hypothesis";
}
interface GenerateInput {
  companyName: string;
  industry: string | null;
  productContext: string | null;
  productNames?: string[];
  targetCountry: string | null;
  businessModel: BusinessModel;
  projection?: JapanEntryProjection;
  audit: unknown;
  competitorAnalysis?: unknown;
  purpose?: JapanEntryMessagePurpose;
  initialInterestOptions?: JapanEntryInitialInterestOptions;
  messageAngle?: ManualMessageAngle;
  outreachPlaybook?: ManualOutreachPlaybook;
  positioningConcept?: ManualPositioningConcept | null;
  observedFacts?: string[];
  sourceUrl?: string | null;
  priorMessages?: PriorManualMessage[];
}
type LlmCaller = DeepSeekStructuredCaller;
function hasDifferentiationMetadata(candidate: z.infer<typeof candidateSchema>): boolean {
  return ![candidate.opening_style, candidate.diagnostic_focus, candidate.cta_type, candidate.architecture, candidate.solution_focus].includes("legacy_unspecified")
    && candidate.personalization_anchors.length >= 2;
}
export async function generatePersonalizedJapanEntryMessage(
  input: GenerateInput,
  caller: LlmCaller = callDeepSeek,
): Promise<PersonalizedJapanEntryMessageResult> {
  const productContext = input.productContext?.trim() ?? "";
  if (productContext.length < 12) {
    return { ok: false, error: "A grounded public product description is required for personalized copy" };
  }
  const facts = buildJapanEntryPersonalizationFacts(input.audit, input.businessModel, input.projection, {
    competitorAnalysis: input.competitorAnalysis,
    positioningConcept: input.positioningConcept,
    companyFacts: input.observedFacts,
    companySourceUrl: input.sourceUrl,
  });
  if (facts.length === 0) {
    return { ok: false, error: "No high-signal Japan-specific public fact is available for personalized copy" };
  }
  const purpose = input.purpose ?? "commercial_offer";
  const mode = purpose === "initial_interest" && input.initialInterestOptions?.includeEstimate !== true
    ? "audit"
    : getJapanEntryMessageMode(facts);
  const copyPlan = buildManualCopyPlan({
    companyName: input.companyName,
    countryCode: input.targetCountry,
    businessModel: input.businessModel,
    playbook: input.outreachPlaybook ?? "general_online_smb",
    angle: input.messageAngle ?? "problem",
    hasModeledOpportunity: facts.some((fact) => fact.id === "modeled-annual-opportunity-range"),
  });
  let totalAttempts = 0;
  let totalUsage: DeepSeekResponse["usage"];
  const ctaAnchors = resolveManualCtaAnchors({ companyName: input.companyName, productNames: input.productNames, facts });
  const questionDecisionAnchor = buildManualQuestionDecisionAnchor(
    input.outreachPlaybook ?? "general_online_smb",
    ctaAnchors.customerPathAnchor,
  );
  const requiredInitialProductEvidence = purpose === "initial_interest"
    ? selectGroundedProductEvidence({ companyName: input.companyName, productContext, productNames: input.productNames })
    : null;
  const supplementalInitialProductEvidence = purpose === "initial_interest"
    ? selectSupplementalProductEvidence({ companyName: input.companyName, productContext, productNames: input.productNames })
    : null;
  if (
    purpose === "initial_interest"
    && (!requiredInitialProductEvidence || !isInitialInterestProductEvidenceSafe(requiredInitialProductEvidence))
  ) {
    return { ok: false, error: "No safe grounded public product evidence is available for initial form copy" };
  }
  const ctaContracts = purpose === "initial_interest"
    ? buildManualCtaContracts({
        companyName: input.companyName,
        ...ctaAnchors,
        priorMessages: input.priorMessages ?? [],
      })
    : [];
  const deterministicInspection = (candidate: z.infer<typeof candidateSchema>) => {
    const safety = reviewPersonalizedJapanEntryMessage({
      message: candidate.message,
      companyName: input.companyName,
      productContext,
      productNames: input.productNames,
      productEvidence: candidate.product_evidence,
      productEvidenceRendering: candidate.product_evidence_rendering,
      factIds: candidate.fact_ids,
      facts,
      purpose,
      initialInterestOptions: input.initialInterestOptions,
      messageAngle: input.messageAngle,
      candidateAngle: candidate.angle,
    });
    const similarity = purpose === "initial_interest"
      ? reviewManualMessageDistinctness({ message: candidate.message, companyName: input.companyName, priorMessages: input.priorMessages ?? [], allowedRepeatedSentences: facts.filter((fact) => candidate.fact_ids.includes(fact.id)).map((fact) => fact.statement) })
      : { passed: true, maxSimilarity: 0, matchedMessageId: null, matchedCompany: null, reasons: [] };
    const selectedFacts = facts.filter((fact) => candidate.fact_ids.includes(fact.id));
    const personalization: ManualPersonalizationReview = purpose === "initial_interest"
      ? reviewManualMessagePersonalization({
          message: candidate.message,
          companyName: input.companyName,
          productNames: input.productNames,
          productEvidenceRendering: candidate.product_evidence_rendering,
          selectedFacts,
          architecture: candidate.architecture,
          personalizationAnchors: candidate.personalization_anchors,
          solutionFocus: candidate.solution_focus,
          questionDecisionAnchor,
          maxPriorSimilarity: similarity.maxCoreSimilarity ?? similarity.maxSimilarity,
          includeEstimate: input.initialInterestOptions?.includeEstimate === true,
        })
      : {
          passed: true,
          score: 100,
          issues: [],
          dimensions: { companySpecificity: 25, narrativeOriginality: 25, commercialRelevance: 25, languageIntegrity: 25 },
          coverage: { companyObservation: true, japanSignal: true, decisionBarrier: true, opportunity: true, solution: true, routingCta: true },
          architecture: "invalid" as const,
          reusableTemplateRisk: false,
        };
    return { safety, similarity, personalization };
  };
  const inspectCandidate = (rawCandidate: z.infer<typeof candidateSchema>, candidateIndex = 0, allowRecovery = false) => {
    const plannedCandidate = purpose === "initial_interest"
      ? {
          ...rawCandidate,
          architecture: copyPlan.architecture,
          personalization_anchors: rawCandidate.personalization_anchors[0] === "legacy"
            ? [rawCandidate.product_evidence_rendering, ctaAnchors.customerPathAnchor]
            : rawCandidate.personalization_anchors,
          solution_focus: rawCandidate.solution_focus === "legacy_unspecified"
            ? copyPlan.solutionFocus
            : rawCandidate.solution_focus,
        }
      : rawCandidate;
    const evidenceLocked = purpose === "initial_interest"
      && requiredInitialProductEvidence
      && isInitialInterestProductEvidenceSafe(requiredInitialProductEvidence)
      ? {
          ...plannedCandidate,
          product_evidence: requiredInitialProductEvidence,
        }
      : plannedCandidate;
    const enveloped = purpose === "initial_interest" ? withManualFormCopyReadyEnvelope(evidenceLocked, input.companyName) : evidenceLocked;
    const initial = deterministicInspection(enveloped);
    // Deterministic recovery is only a repair seed. A model-authored rewrite must
    // subsequently pass safety, personalization, and uniqueness before release.
    const recoveryAllowed = canUseManualDeterministicRecovery({ allowRecovery, similarityPassed: initial.similarity.passed });
    if (purpose !== "initial_interest" || ctaContracts.length === 0 || (initial.safety.passed && initial.similarity.passed && initial.personalization.passed) || !recoveryAllowed) return { candidate: enveloped, ...initial, usedRecovery: false };
    const recoverAndInspect = (variationIndex: number) => {
      const candidate = recoverManualInitialInterestCandidate({
          candidate: enveloped,
          companyName: input.companyName,
          productNames: input.productNames,
          facts,
          supplementalProductEvidence: supplementalInitialProductEvidence,
          customerPathAnchor: ctaAnchors.customerPathAnchor,
          contract: ctaContracts[(candidateIndex + variationIndex) % ctaContracts.length] ?? ctaContracts[0]!,
          issues: initial.safety.issues,
          similarityPassed: initial.similarity.passed,
          variationIndex,
        });
      return { candidate, ...deterministicInspection(candidate), usedRecovery: true };
    };
    return selectBestManualCandidateInspection(recoverAndInspect);
  };
  const generated = await callDeepSeekStructured({
    stage: "generation",
    messages: generationMessages(input, facts, mode),
    schema: purpose === "initial_interest" ? generationSchema.extend({ strategy: strategySchema }) : generationSchema,
    caller,
  });
  totalAttempts += generated.attempts;
  totalUsage = addDeepSeekUsage(totalUsage, generated.usage);
  if (!generated.ok) {
    return { ok: false, usage: totalUsage, error: `DeepSeek V4 Pro candidate generation failed: ${generated.error}` };
  }
  if (purpose === "initial_interest" && !generated.data.strategy) {
    return { ok: false, usage: totalUsage, error: "DeepSeek V4 Pro did not return the required company-specific message strategy" };
  }
  const reviewedCandidates = generated.data.candidates.map((candidate, index) => inspectCandidate(candidate, index));
  let valid: typeof reviewedCandidates = [];
  for (const item of reviewedCandidates) {
    if (!item.safety.passed || !item.similarity.passed || !item.personalization.passed || item.usedRecovery) continue;
    const duplicatesPriorCandidate = purpose === "initial_interest" && valid.some((prior) =>
      prior.candidate.opening_style === item.candidate.opening_style
      || prior.candidate.diagnostic_focus === item.candidate.diagnostic_focus
      || prior.candidate.cta_type === item.candidate.cta_type
      || manualMessageSimilarity(item.candidate.message, prior.candidate.message, [input.companyName]) >= 0.45);
    if (!duplicatesPriorCandidate) valid.push(item);
  }
  if (valid.length === 0) {
    let repairTarget = [...reviewedCandidates].sort((a, b) => b.safety.score - a.safety.score)[0];
    let deterministicRecoveryUsed = false;
    if (!repairTarget) return { ok: false, usage: totalUsage, error: "DeepSeek V4 Pro returned no candidate to repair" };
    for (let repairPass = 1; repairPass <= INITIAL_SAFETY_REPAIR_LIMIT; repairPass += 1) {
      const repaired = await callDeepSeekStructured({
        stage: "repair",
        messages: generationMessages(input, facts, mode, buildPersonalizedMessageRepairInput({
          candidate: { ...repairTarget.candidate, message: stripRejectedManualMessageSentences(repairTarget.candidate.message, repairTarget.similarity.reasons) },
          issues: repairTarget.usedRecovery ? [RECOVERY_REWRITE_ISSUE] : [...repairTarget.safety.issues, ...repairTarget.similarity.reasons, ...repairTarget.personalization.issues],
          wordCount: repairTarget.safety.wordCount,
          purpose,
          includePrice: input.initialInterestOptions?.includePrice === true, editorialFeedback: `Uniqueness repair variation ${repairPass}: delete every sentence quoted as duplicate prior copy; use a different syntax tied to the required product evidence and do not return any quoted duplicate string.`,
        })),
        schema: repairSchema,
        caller,
        temperature: Math.min(0.75, 0.35 + repairPass * 0.08),
      });
      totalAttempts += repaired.attempts;
      totalUsage = addDeepSeekUsage(totalUsage, repaired.usage);
      if (!repaired.ok) return { ok: false, usage: totalUsage, error: `DeepSeek V4 Pro candidate repair failed: ${repaired.error}` };
      let inspected = inspectCandidate(repaired.data.candidate);
      let passed = inspected.safety.passed && inspected.similarity.passed && inspected.personalization.passed && !inspected.usedRecovery && (purpose !== "initial_interest" || hasDifferentiationMetadata(inspected.candidate));
      if (!passed && !deterministicRecoveryUsed && repairPass === DETERMINISTIC_RECOVERY_PASS) {
        inspected = inspectCandidate(repaired.data.candidate, 0, true);
        deterministicRecoveryUsed = inspected.usedRecovery;
        passed = inspected.safety.passed && inspected.similarity.passed && inspected.personalization.passed && !inspected.usedRecovery && (purpose !== "initial_interest" || hasDifferentiationMetadata(inspected.candidate));
      }
      if (
        !passed
        && repairPass === INITIAL_SAFETY_REPAIR_LIMIT
        && canSafelyFinishManualModelCopy({ issues: inspected.safety.issues, similarityPassed: inspected.similarity.passed })
      ) {
        inspected = inspectCandidate(repaired.data.candidate, 0, true);
        passed = inspected.safety.passed && inspected.similarity.passed && inspected.personalization.passed && !inspected.usedRecovery && (purpose !== "initial_interest" || hasDifferentiationMetadata(inspected.candidate));
      }
      if (!passed && purpose === "initial_interest" && repairPass === INITIAL_SAFETY_REPAIR_LIMIT) {
        inspected = finalizeManualMessageProduction({
          inspection: inspected,
          companyName: input.companyName,
          inspect: inspectCandidate,
          recoverSafety: (candidate) => inspectCandidate(candidate, 0, true),
          canRecoverSafety: (inspection) => canSafelyFinishManualModelCopy({ issues: inspection.safety.issues, similarityPassed: inspection.similarity.passed }),
        });
        passed = inspected.safety.passed && inspected.similarity.passed && inspected.personalization.passed && !inspected.usedRecovery && hasDifferentiationMetadata(inspected.candidate);
      }
      if (passed) {
        valid = [inspected];
        break;
      }
      repairTarget = inspected;
    }
    const priorSentences = (input.priorMessages ?? []).flatMap((prior) => prior.message.split(/(?<=[.!?])\s+/))
    for (let rewritePass = 1; valid.length === 0 && purpose === "initial_interest" && rewritePass <= BESPOKE_REWRITE_LIMIT; rewritePass += 1) {
      const selectedFacts = facts.filter((fact) => repairTarget.candidate.fact_ids.includes(fact.id))
      const rewritten = await callDeepSeekStructured({
        stage: "repair",
        messages: bespokeRewriteMessages({
          companyName: input.companyName,
          productEvidenceRendering: repairTarget.candidate.product_evidence_rendering,
          supplementalProductEvidence: supplementalInitialProductEvidence,
          selectedFacts,
          customerPathAnchor: ctaAnchors.customerPathAnchor,
          questionDecisionAnchor,
          copyPlan,
          includeEstimate: input.initialInterestOptions?.includeEstimate === true,
          includePrice: input.initialInterestOptions?.includePrice === true,
          founderForwardCta: input.initialInterestOptions?.founderForwardCta === true,
          rejectedMessage: repairTarget.candidate.message,
          measuredBodyWordCount: repairTarget.safety.wordCount,
          issues: [...repairTarget.safety.issues, ...repairTarget.personalization.issues, ...repairTarget.similarity.reasons],
          priorSentences,
        }),
        schema: bespokeRewriteSchema,
        caller,
        temperature: Math.min(0.65, 0.42 + rewritePass * 0.06),
      })
      totalAttempts += rewritten.attempts
      totalUsage = addDeepSeekUsage(totalUsage, rewritten.usage)
      if (!rewritten.ok) continue
      const rewrittenCandidate = {
        ...repairTarget.candidate,
        message: rewritten.data.message,
        architecture: copyPlan.architecture,
        personalization_anchors: [repairTarget.candidate.product_evidence_rendering, ctaAnchors.customerPathAnchor],
        solution_focus: copyPlan.solutionFocus,
      }
      let inspected = inspectCandidate(rewrittenCandidate)
      if (!inspected.safety.passed || !inspected.similarity.passed || !inspected.personalization.passed) {
        inspected = inspectCandidate(finalizeManualBespokeCta({
          candidate: rewrittenCandidate,
          companyName: input.companyName,
          customerPathAnchor: ctaAnchors.customerPathAnchor,
          questionDecisionAnchor,
          solutionFocus: copyPlan.solutionFocus,
          founderForwardCta: input.initialInterestOptions?.founderForwardCta === true,
          productEvidenceRendering: repairTarget.candidate.product_evidence_rendering,
        }))
      }
      if (inspected.safety.passed && inspected.similarity.passed && inspected.personalization.passed && !inspected.usedRecovery && hasDifferentiationMetadata(inspected.candidate)) {
        valid = [inspected]
        break
      }
      repairTarget = inspected
    }
    if (valid.length === 0) return {
      ok: false,
      usage: totalUsage,
      error: `The strongest DeepSeek V4 Pro candidate failed the bespoke production gate (${repairTarget.safety.wordCount} body words, ${(repairTarget.similarity.maxSimilarity * 100).toFixed(0)}% prior similarity): ${[...repairTarget.safety.issues, ...repairTarget.personalization.issues, ...repairTarget.similarity.reasons].join("; ")}`,
    }
  }
  const criticize = async (candidates: typeof valid) => {
    const criticized = await callDeepSeekStructured({
      stage: "critic",
      messages: criticMessages(
        input.companyName,
        facts,
        candidates.map((item) => item.candidate),
        mode,
        purpose,
        input.initialInterestOptions,
        input.messageAngle,
        input.productNames,
        true,
      ),
      schema: criticSchema,
      caller,
    });
    totalAttempts += criticized.attempts;
    totalUsage = addDeepSeekUsage(totalUsage, criticized.usage);
    return criticized;
  };
  const criticized = await criticize(valid);
  if (!criticized.ok) {
    return { ok: false, usage: totalUsage, error: `DeepSeek V4 Pro editorial review failed: ${criticized.error}` };
  }
  const selected = valid[criticized.data.selected_index];
  if (!selected) {
    return { ok: false, usage: totalUsage, error: "DeepSeek V4 Pro critic selected an invalid candidate" };
  }
  const strategy = publicManualMessageStrategy(generated.data.strategy, input.productContext);
  const evidencePack = facts.map((fact): ManualMessageEvidence => ({
    id: fact.id,
    statement: fact.statement,
    source: fact.source,
    confidence: fact.confidence,
    classification: fact.id.startsWith("modeled-") ? "modeled" : fact.id.startsWith("company-observed-") || fact.id.startsWith("japan-audit-") ? "observed" : "hypothesis",
  }));
  let finalCandidate = selected;
  let finalReview = buildManualEditorialReview({ selected, criticized: criticized.data, attempts: totalAttempts, similarity: selected.similarity, candidateCount: valid.length });
  let repairIssues = finalReview.issues;
  let deterministicEditorialRecoveryUsed = false;
  for (let repairPass = 1; !finalReview.passed && repairPass <= EDITORIAL_REPAIR_LIMIT; repairPass += 1) {
    const exactCtaAnchor = input.productNames?.map((name) => name.trim()).find(Boolean) ?? input.companyName;
    const editorialFeedback = `Score ${finalReview.score}/100. ${finalReview.rationale}. Material risks: ${finalReview.riskFlags.join(", ") || "none"}. Rewrite substantially: make paragraph 1 a concrete product observation using the required and supplemental product evidence; connect only the verified Japan audit gap to a decision question without claiming buyer behaviour, product-market fit, demand, impact, or causation; mention the exact company or product anchor '${exactCtaAnchor}' no more than twice in the body and exactly once in the final CTA paragraph; let the final question use a natural pronoun instead of repeating the anchor; keep only one concise evidence-boundary statement; and make the final paragraph contain the exact audited customer-path anchor supplied in required_cta_contract while saying what Japan customer-path decision the analysis informs. Add no facts, URLs, sources, unsupported modals, or unchanged sentences. Raise every dimension to at least ${EDITORIAL_DIMENSION_FLOOR}.`;
    const repaired = await callDeepSeekStructured({
      stage: "repair",
      messages: generationMessages(input, facts, mode, buildPersonalizedMessageRepairInput({
        candidate: finalCandidate.candidate,
        issues: repairIssues,
        wordCount: finalCandidate.safety.wordCount,
        purpose,
        includePrice: input.initialInterestOptions?.includePrice === true,
        editorialFeedback,
      })),
      schema: repairSchema,
      caller,
    });
    totalAttempts += repaired.attempts;
    totalUsage = addDeepSeekUsage(totalUsage, repaired.usage);
    if (!repaired.ok) return { ok: false, review: finalReview, usage: totalUsage, error: `DeepSeek V4 Pro candidate repair failed: ${repaired.error}` };
    let inspected = inspectCandidate(repaired.data.candidate);
    if (
      (!inspected.safety.passed || !inspected.similarity.passed || !inspected.personalization.passed)
      && !deterministicEditorialRecoveryUsed
      && repairPass === DETERMINISTIC_RECOVERY_PASS
    ) {
      inspected = inspectCandidate(repaired.data.candidate, 0, true);
      deterministicEditorialRecoveryUsed = inspected.usedRecovery;
    }
    if (
      (!inspected.safety.passed || !inspected.similarity.passed || !inspected.personalization.passed)
      && repairPass === EDITORIAL_REPAIR_LIMIT
      && canSafelyFinishManualModelCopy({ issues: inspected.safety.issues, similarityPassed: inspected.similarity.passed })
    ) {
      inspected = inspectCandidate(repaired.data.candidate, 0, true);
    }
    if (!inspected.safety.passed || !inspected.similarity.passed || !inspected.personalization.passed || inspected.usedRecovery || (purpose === "initial_interest" && !hasDifferentiationMetadata(inspected.candidate))) {
      repairIssues = [...inspected.safety.issues, ...inspected.personalization.issues, ...inspected.similarity.reasons, ...(inspected.usedRecovery ? [RECOVERY_REWRITE_ISSUE] : [])];
      if (repairPass === EDITORIAL_REPAIR_LIMIT) return { ok: false, review: finalReview, usage: totalUsage, error: `DeepSeek V4 Pro targeted repair failed the deterministic safety or uniqueness gate: ${repairIssues.join("; ")}` };
      finalCandidate = inspected;
      continue;
    }
    const repairedCritic = await criticize([inspected]);
    if (!repairedCritic.ok) return { ok: false, review: finalReview, usage: totalUsage, error: `DeepSeek V4 Pro repaired-draft review failed: ${repairedCritic.error}` };
    finalCandidate = inspected;
    finalReview = buildManualEditorialReview({ selected: inspected, criticized: repairedCritic.data, attempts: totalAttempts, similarity: inspected.similarity, candidateCount: 1 });
    repairIssues = finalReview.issues;
  }
  if (!finalReview.passed) return { ok: false, review: finalReview, usage: totalUsage, error: finalReview.issues[0] };
  return {
    ok: true,
    message: finalCandidate.candidate.message.trim(),
    review: finalReview,
    usage: totalUsage,
    strategy,
    candidates: finalCandidate === selected ? valid.map((item) => publicManualMessageCandidate(item.candidate)) : [publicManualMessageCandidate(finalCandidate.candidate)],
    selectedIndex: finalCandidate === selected ? criticized.data.selected_index : 0,
    evidencePack,
    similarity: finalCandidate.similarity,
  };
}
