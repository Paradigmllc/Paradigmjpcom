# Editorial quality and variation system

## Three scores, three different claims

- Editorial quality verifies evidence, originality, narrative structure, and policy safety.
- Entertainment-plan quality verifies shot density, visual-mode variation, host restraint, retention beats, attribution, and synthetic-media contracts.
- Rendered-master quality verifies codec, frame, motion, loudness, black-frame, silence, and deterministic delivery requirements.

A rendered-master score must never be presented as a proxy for viewer appeal or professional creative direction. The 90-second entertainment pilot must pass its separate human direction review before an expensive long-form render is eligible to proceed.

## Purpose

Automation may reduce mechanical production cost, but it must not collapse twelve channels into one repeated AI template. Every long-form episode therefore receives a deterministic editorial blueprint and a fail-closed quality report before narration, visual generation, or rendering is approved.

The gate threshold is 92/100. A blocking rule always wins over the numeric score.

## Channel editorial DNA

`config/editorial-dna.json` defines twelve independent editorial products. Each profile locks:

- editorial promise and investigative perspective;
- four hook families and three narrative arc families;
- six visual worlds and four evidence modes;
- motion, transition, and audio signatures;
- channel-specific visual and narrative cliches that are forbidden.

Japanese and English channels are not mirrors. They may cover related records, but their thesis, arc, evidence presentation, visual world, and takeaway must be independently authored.

## Blueprint contract

`scripts/generate-editorial-blueprint.mjs` converts an episode editorial manifest into a 10-20 minute plan with:

- 12-20 timed scenes;
- a source-linked claim and readable locator on factual scenes;
- 8-12 authored visual elements per scene;
- an explicit rhythm, visual world, evidence mode, choreography verb, and transition;
- a unique originality anchor for every scene;
- a custom thesis, counterpoint, key question, and transferable takeaway;
- no generated timestamp inside the deterministic blueprint hash.

HyperFrames composition rules materially shape the contract: dense hero frames, multiple depth layers, readable attribution, varied entrance choreography, planned breathing beats, and explicit transitions are required before HTML generation starts.

## Quality categories

| Category | Weight | Blocking examples |
| --- | ---: | --- |
| Source integrity | 25 | factual scene without claim or locator; declared claim omitted; fewer than two sources |
| Originality | 25 | duplicate scene anchors; repeated beat; peer structural similarity at or above 58%; superficial thesis |
| Visual direction | 20 | fewer than eight elements; fewer than six visual worlds; low transition/evidence variety; channel cliche |
| Narrative | 15 | outside 10-20 minutes; fewer than 12 or more than 20 scenes |
| Policy safety | 15 | synthetic expert persona; real-person cloning; inconsistent disclosure; graphic or exploitative treatment |

## Portfolio similarity audit

`npm run portfolio:variation-audit` creates planning-only structures for the first two episodes in all twelve lanes. It compares all 276 pairs using ordered scene, beat, visual-world, evidence-mode, transition, hook, arc, and channel-signature tokens.

The planning audit never marks candidate topics as researched or production-ready. Source ingestion and claim review remain mandatory.

## YouTube policy boundary

The system implements the current official policy direction rather than assuming that AI assistance itself is prohibited:

- YouTube's channel monetization policy rejects generic, repetitive, or mass-produced output while allowing a recurring format when each video has a distinct storyline, focus, or concept.
- Realistic or meaningful synthetic depictions require disclosure. A disclosure does not by itself reduce monetization eligibility, but repeated failure to disclose can lead to penalties.
- Non-graphic, contextualized documentary or dramatized coverage may be advertiser-friendly; graphic imagery and distress as spectacle remain disabled in this system.
- AI-generated presenters are not used for finance, legal, health, security, or other sensitive explanations.

Official references:

- [YouTube channel monetization policies](https://support.google.com/youtube/answer/1311392)
- [Disclosing altered or synthetic content](https://support.google.com/youtube/answer/14328491)
- [Advertiser-friendly content guidelines](https://support.google.com/youtube/answer/6162278)
- [Recent advertiser-friendly guideline updates](https://support.google.com/youtube/answer/9725604)

## Commands

```powershell
npm run blueprint:pilot-ja
npm run blueprint:pilot-en
npm run portfolio:variation-audit
npm run ops:preflight
```

Studio's `長尺構成を品質監査` control queues the same pipeline. A passing job writes the blueprint and full report under `renders/editorial/<episode-id>/`, stores the summary in SQLite, and stops at `originality_policy_and_structure_review` for human approval.

## Deliberate limits

- A score proves contract compliance, not that an episode will retain viewers.
- Research quality depends on the source adapter and human claim review that precede the blueprint.
- A non-photoreal plan must be reclassified and disclosure re-evaluated if a later ComfyUI workflow introduces realistic people, events, or locations.
- Human approval remains mandatory before public upload.
