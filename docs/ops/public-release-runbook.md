# Public release and operations runbook

This is the operator checklist for `paradigmjp.com`. It covers the public Japan
Entry site, the application path, the Signal Check utility, CMS seed, origin
protection, notifications, and recovery. The repository is complete only when
the checks below are reproducible; a Coolify webhook returning `200` alone is
not a successful release.

## Release contract

The production offer and public promise are fixed:

- `USD 12,000` one-time setup.
- Standard monthly service is included for the first six months; month seven is
  `USD 995/month` unless the signed agreement says otherwise.
- The public audience is fast-decision SMBs in North America, the UK, Europe,
  and Australia. Employee count and industry are not eligibility gates.
- The free utility uses public signals and self-reported answers. It must never
  claim private monthly visits, country traffic share, or revenue when those
  values are not publicly observable.

Any copy or CMS edit that changes these points requires a new review before
release. Do not add anonymous case-study numbers, guaranteed outcomes, or
unverified market-size claims.

## Required production settings

The following values belong in the Coolify production environment, never in git
or `Task.md`:

| Area | Required names | Acceptance condition |
| --- | --- | --- |
| Legal disclosure | `PARADIGM_LEGAL_REPRESENTATIVE_NAME`, `PARADIGM_LEGAL_POSTAL_CODE`, `PARADIGM_LEGAL_ADDRESS`, `PARADIGM_LEGAL_PHONE` | Values are confirmed by the legal owner and match the `/en/legal` and `/ja/legal` disclosure. |
| Operator alerts | `SLACK_WEBHOOK_URL`, or `SLACK_BOT_TOKEN` + `SLACK_CHANNEL_ID` | A test contact produces both a DB bell/outbox record and a Slack message. |
| Backup | `OSS_SUPABASE_BACKUP_GPG_PASSPHRASE`, `OSS_SUPABASE_BACKUP_SSH_TARGET` | The passphrase is root-only; the SSH account is restricted to the backup directory; an encrypted archive and checksum reach the off-host target. |
| Public form security | `TURNSTILE_SECRET_KEY`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `CONTACT_FORM_CHALLENGE_SECRET`, `TRUSTED_PROXY_MODE=cloudflare`, `CLOUDFLARE_ORIGIN_LOCKED=1` | `release-doctor` passes the public-funnel environment section. |
| Content and CRM | `ADMIN_SCRIPT_SECRET`, `TWENTY_API_KEY`, and a Dify form-message credential | The English blog seed and Twenty handoff can be run without a fallback model or silent failure. |

Set values with the Coolify UI/API, then verify names (not secret values) with
the release gate. Never bypass a failed gate by setting `--skip-remote` or by
calling a Coolify deploy endpoint directly.

## Standard release sequence

Run from a clean checkout on the approved release machine:

```bash
git status --short
npm ci
npm exec -- tsc --noEmit --pretty false
npm run lint
npm test -- --run
npm run build
npm run quality:guard
npm run release:doctor -- --pre-deploy
npm run release:prod
```

`release:prod` performs the database migration/verification path, seeds the
English Japan Entry editorial set, deploys through Coolify, refreshes the
Traefik route to the new container, and runs the post-deploy public smoke.
Do not treat a deployment UUID or an HTTP `200` webhook response as completion.

After the command finishes, independently verify the public surface:

```bash
for path in /en /en/about /en/services /en/pricing /en/faq /en/works \
  /en/blog /en/contact /en/tools/japan-entry-score /en/legal /en/privacy /api/ready; do
  code="$(curl -L -sS -o /tmp/paradigmjp-smoke.html -w '%{http_code}' "https://paradigmjp.com${path}")"
  test "$code" = 200 || { echo "FAIL ${path} ${code}"; exit 1; }
done
rg -q 'Visual proof|package-scope|japan-entry-score' /tmp/paradigmjp-smoke.html
```

The post-deploy page checks must show the three product visuals, a working
Signal Check route, the fixed USD price, and the application CTA. Check both
`/en` and `/ja`; check the browser at desktop and a narrow mobile width before
calling the release complete.

## CMS and content acceptance

The CMS seed is idempotent. After a successful release, the deploy script must
report the expected article count with zero errors. If content is edited in
Keystatic/Payload, verify all of the following before publishing:

1. English and Japanese titles, descriptions, and CTA labels are present.
2. Every public article has non-empty body content, a locale, and a canonical
   route; no placeholder or internal diagnostic metadata is exposed.
3. `/en/services`, `/en/pricing`, and `/en/contact` agree on `$12,000`, six
   included months, and `$995/month` from month seven.
4. `/en/legal` renders the confirmed legal identity, not the fallback wording.
5. Images have meaningful alt text and the visual proof cards remain product
   artifacts, not fabricated people or customer results.

## Backup and restore acceptance

Run `scripts/backup-oss-supabase.sh --validate-config` on the host first. The
backup job must then produce:

- an AES-256 GPG archive when encryption is required;
- an adjacent `.sha256` file that verifies with `sha256sum -c`;
- the same archive and checksum on the configured off-host target;
- a 14-day retention window without deleting the newest archive.

For the quarterly restore drill, copy one archive to an isolated disposable
PostgreSQL instance, verify the checksum, inspect it with `pg_restore --list`,
restore it, and run `node scripts/verify-db-tables.mjs` against that instance.
Record the measured restore time and row-count comparison in the incident log.
Never test a restore by overwriting production.

## 502 / origin route recovery

If Cloudflare returns `502` while the app container's `/api/ready` is `200`,
assume Traefik upstream drift first. Do not redeploy repeatedly. Confirm the
current container and network IP on `paradigm-droplet`, then use the tracked
helper so the Cloudflare CIDR allow-list and route are updated atomically:

```bash
ssh paradigm-droplet 'docker ps --filter "name=n8i2sjiqvr2d8hrzppop2m2i" --format "{{.Names}}"'
ssh paradigm-droplet 'docker inspect <container> --format "{{with index .NetworkSettings.Networks \"coolify\"}}{{.IPAddress}}{{end}}"'

# Prepare the cached official Cloudflare ranges.
cat scripts/lib/refresh-traefik-origin-lock.py | ssh paradigm-droplet \
  'python3 - --prepare /data/coolify/proxy/dynamic/paradigmjp.yml /data/coolify/proxy/.paradigmjp-origin-lock-cidrs.json'

# Apply only after the current container is healthy.
cat scripts/lib/refresh-traefik-origin-lock.py | ssh paradigm-droplet \
  'python3 - --apply /data/coolify/proxy/dynamic/paradigmjp.yml /data/coolify/proxy/.paradigmjp-origin-lock-cidrs.json n8i2sjiqvr2d8hrzppop2m2i <container> <coolify-ip>'

curl -fsS https://paradigmjp.com/api/ready
```

The helper creates a `600` backup of the route and validates the protected app,
Keystatic, and alias routers. A direct-origin request and a forged
`CF-Connecting-IP` request must remain blocked. If the app is not healthy,
stop and inspect the container logs instead of changing the route.

## Incident and rollback rules

- A failed release gate is a stop condition, not a reason to weaken validation.
- A failed Slack send must remain visible as a DB outbox/notification error;
  never report a successful operator notification when no credential exists.
- A failed CMS seed, migration, or post-deploy smoke is a failed release even
  when the container is running. Roll back through the approved Coolify release
  mechanism, then re-run the full gate.
- Preserve the failing deployment UUID, release commit, UTC timestamp, doctor
  output, and public HTTP status codes in the incident record.
- Do not remove Twenty or Stagehand as an incident workaround. They are kept as
  the CRM and on-demand worker boundaries; their runtime must remain disabled
  unless the separate outreach operation is explicitly approved.

## Current completion rule

The site is “publicly complete” only when the code checks pass, the production
environment table above is satisfied, `npm run release:prod` passes both doctor
phases, and the public URLs show the current visuals and utility. Until the
external legal, Slack, and encrypted off-host backup values are supplied, the
repository intentionally remains release-blocked; that is safer than claiming
an operationally incomplete site is ready.
