## CURRENT STATUS - 2026-06-16 Admin login fix

### Issue
- `https://paradigmjp.com/admin/login` login failing — user `contact@paradigmjp.com` password did not match.
- Root cause: `ADMIN_EMAIL` was not set in production Coolify env, so PayloadCMS `onInit` auto-seed never ran. Existing user had a stale/unmatched password hash.

### What changed
- `payload.config.ts` `onInit`: extended auto-seed to also sync password and role for existing admin users matching `ADMIN_EMAIL`. On every startup, if `ADMIN_EMAIL` and `ADMIN_PASSWORD` are both set, the user with that email gets password synced to `ADMIN_PASSWORD` and role elevated to `admin`.
- Added `ADMIN_EMAIL=contact@paradigmjp.com` to Coolify production env (via API, not UI).

### How to log in now
- URL: `https://paradigmjp.com/admin/login`
- Email: `contact@paradigmjp.com`
- Password: `ADMIN_PASSWORD` env value (same as legacy `/api/admin` password)

### Local verification
- `npx tsc --noEmit --pretty false --incremental false`: 2 pre-existing errors in `twenty-pull.ts`, 0 new.
- `node scripts/paradigm-quality-guard.mjs`: 1 pre-existing error, 56 warnings, 0 new.

### Active handoff
- Do not restore `SUPABASE_POSTGRES_*`, `MUBENG_*`, `SCRAPOXY_*`, or any Refferq reference.
- `scripts/unlock-payload-users.sh` remains intentionally untracked.
- Admin password is synced every deploy from `ADMIN_PASSWORD` env var. Changing `ADMIN_PASSWORD` in Coolify env and redeploying will update the PayloadCMS user password automatically.
