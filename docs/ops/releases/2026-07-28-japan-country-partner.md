# Japan Country Partner production release — 2026-07-28

## Result

The English public site was repositioned from a one-off Japan Entry Package to an ongoing **Japan Country Partner** relationship.

Production copy verified on `https://paradigmjp.com/en`:

- `Your Japan Country Partner`
- `Japan Market Setup`
- `Apply for a Japan Partnership — $13K`
- `Limited founding-partner capacity`

The retired hero `Launch in Japan without hiring a local team` is no longer exposed.

## Commercial boundaries retained

- Fixed setup fee: **USD 13,000**
- Recorded Start Date and 14-business-day delivery guarantee
- Existing selected-launch-partner six-month managed-operation terms
- Existing month-seven continuation terms
- The proposed 20% revenue-share percentage was **not** published because its contractual revenue definition remains undecided

## Code and release evidence

- Implementation PR: **#565**
- Country Partner merge commit: `41c3e88f97d02e0bfd9357884ae3cc5a45c736b7`
- Relevant Vitest checks: **34 passed**
- TypeScript: passed
- Production build: passed
- Quality Guard: **0 errors / 84 existing warnings**
- Coolify deployment observed as finished: `bm4w5btityiz1814a8bh8xf7`

The first deployment built successfully but the fixed Traefik file-provider route still pointed to the retired container IP, temporarily returning HTTP 502. After the old Docker IP was released, controlled deployment cycling restored the fixed public route without changing the Country Partner implementation.

## Final production read-back

Final verification run: **GitHub Actions 30311462742**

- Homepage CMS seed: HTTP 200
- `/en`: HTTP 200
- All four Country Partner fingerprints: PASS
- Retired hero: absent
- `/api/ready`: HTTP 200
- Authenticated `/api/sales/health`: HTTP 200, `ok: true`, `status: degraded`

`degraded` is not a release failure: the endpoint returned `ok: true`; its status also reflects optional integrations or services that are not configured.

## Cleanup

The temporary release, route-recovery, observer, and Task proof workflows were one-shot recovery tools. They were removed from `main` after production verification and are not part of the normal deployment path.

The previous long-form `Task.md` history remains recoverable from Git history, including commit `861a4600bb2a576d710fc94e10f6bae3ad0afb21` and its ancestors.
