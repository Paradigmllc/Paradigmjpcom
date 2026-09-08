# ひと息の朝 — actual first-cut evidence, 2026-09-08

## Deliverable and existing dashboard

Finished review master: `/Users/apple/Desktop/Paradigm-video-QA-20260908/morning-breath/renders/morning-breath-18s-master.mp4`.

SHA256: `23b3f4fa846b9a68417602f34a15633ca1df3b1cb11935985ad0dbbce134870d`.

The existing create-only `register_sandbox_review.py` registered `morning-breath-internal-qa` in production. Status is `draft_review_required`, human_approved=false. The authenticated project list, artifact list and served MP4 all return200; served bytes have the same SHA256. Existing dashboard entry point: `https://paradigmjp.com/video-factory-console`. New entry is not browser-verified because the connected Chrome surface became unavailable. Registration does not constitute publishing or approval.

Editable composition, source clips, narration, BRIEF/REVIEW, policy/asset licenses, publishing-notes, checks and screenshots remain under the local project folder. Mirror: `/opt/paradigm-qa/keyframe-pilot-20260908/morning-breath`. Preview: `http://localhost:3081/#project/morning-breath`. No claim that full HyperFrames editing is publicly hosted.

## What was actually generated

- Qwen-Image-2512 fictional adult reference, then three source-conditioned Wan2.2 I2V-A14B clips. Same character/look, restrained window-light lifestyle scene; no real-person clone.
- Each native clip1280x720,16fps,81frames,5.0625s. Total motion15.1875s; intentional closing typography2.8125s. No frozen-tail padding.
- Final18.005s container,432decoded frames at24fps editorial export. This is conversion, not native24fps generation or optical-flow improvement.
- Three original Japanese AivisSpeech narration lines and sentence-authored captions. Synthetic disclosure and voice attribution included; no lipsync claim or unverified music license.
- HyperFrames0.8.31 CPU render66.256s. Two-pass audio mastering preserved video stream and first-cut file. Final -16.02LUFS/-1.57dBTP.

## Actual QA versus acceptance

All243 native frames decoded and were unique within their clips; configured black/freeze checks found no events. Assistant inspected the three complete frame sheets and larger temporal samples, then the encoded master's every-second sheet, sequential cut boundaries, full-size caption and closing frame. HyperFrames lint/runtime/layout/motion/contrast checks passed with zero errors/warnings. Full encoded master decoded successfully.

Face, hair, clothing and cup are plausible in sampled images. Captions are readable, with slight overlap at the lower hand region. Native last-frame/next-first global SSIM0.983330 and0.984237 is pixel continuity only, not an identity or quality score.

Known direction deviations: first camera retreats instead of pushing in; final continuation turns toward camera and smiles instead of returning gaze to cup; cup is held above table rather than resting. Camera-facing ending was retained as an editorial choice, not counted as prompt adherence.

Continuous human viewing/listening, motion-cadence acceptance, exact rerun reproducibility, lipsync, long-form narrative, all-genre acceptance and commercial-SaaS blind comparison are not established. No numeric creative score or approval was fabricated. Source/QA manifests explicitly preserve these distinctions.

## Reproduction and cost evidence

Reference SHA256 `ec0dc961bfbd7a507d9018eb777fb4399b2cb6c64c3cf94b0ad15668131cc704`.
Motion workflow SHA256 `847f159a4a85205131d8f4c285027ecd04c129a69d696b9a2466a04f5333076b`.

Native clips:

1. `5156f8106f6477fd053ea7061aafe8c351623318375154740d67793baa9497b8`
2. `ac38ea505a8eb69eaa6de97ffb1bef78442e869d1978dd6838d51ee9c248ac83`
3. `bdae140d0a1244bf40dd033ab00b8aaf6d0209c09312a351726e7f8e53546d66`

Wan20steps,CFG3.5,shift5,Euler/simple, high0–10/low10–20,81frames16fps. Native runtime pinned to ComfyUI700821e1364eaab0e8f21c538a2131719fec57bf and verified four Wan model artifacts. Full external pilot receipts preserve seeds, prompts, runtime/model hashes; no production credentials copied into git.

Vast instances50210637 and50214852 both stopped/deleted and independently read back absent. Observed lifecycles2395s and3164s; quote-times-lifecycle compute estimatesUSD0.32032 andUSD0.47069, combinedUSD0.79101. Excludes storage/network/hosting/agent usage; not final billing. Ad-hoc pilot is not bound to the control-plane run ledger; a displayedUSD0.00 there does not describe this experiment.

## Production repairs completed

- PR743: exact decoded final-frame extraction replaces a seek that returned success without any frame at16fps. Real media and16/24/30fps regressions verified. Console shows connection health only from actual reachability.
- PR744: remove duplicate direct Coolify deployment/cancel behavior from GitHub workflows. All-workflow guard catches known direct-deploy/cancel patterns; tested against the old unsafe workflow and wired into release-doctor/CI. Not a general shell sandbox.
- Formal release at mergeSHA `c3cfb9c0`, deployment `q6fjesymdbv5cll4bshesiru`, finished with exit0 including DB133/133 checks, secure route cutover, public fingerprints and post-doctor/Saleshealth ok:true.
- Older iCloud-dataless worktree/tools preserved. Active verified worktree `/Users/apple/dev/video-studio-release-guard`; use it instead of repeating stalled Desktop reads.

Next production work should use this exact review asset, improve identified creative weaknesses, and extend validated recipes into additional genres and chapter-based narratives. Do not restart paid generation merely because a turn ends or infer all-genre launch readiness from this sample.
