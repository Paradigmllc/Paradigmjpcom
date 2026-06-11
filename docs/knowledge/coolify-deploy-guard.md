# Coolify Deploy Guard

## Purpose

`paradigm-hp` deploys must not get stuck for hours because a queued deployment is stale, Docker cache fills the host, or the Next.js standalone container is unreachable from Coolify healthchecks.

## Permanent Guards

- `Dockerfile` sets `HOSTNAME=0.0.0.0`, `PORT=3000`, installs `curl`, and includes a localhost `HEALTHCHECK`.
- `scripts/coolify-deploy-guard.mjs` verifies the Dockerfile guard, cancels stale queued/in-progress `paradigm-hp` deployments, and prints compact host state.
- `scripts/deploy.mjs` and `scripts/sales-os-no-login-deploy.mjs` both run the guard before triggering Coolify.
- `scripts/install-coolify-host-guard.mjs` installs `/usr/local/sbin/paradigm-coolify-host-guard.sh` plus `/etc/cron.d/paradigm-coolify-host-guard` on the production host.

## Host Cron Behavior

The host guard runs every 15 minutes. It:

- prunes Docker build cache/images/containers only when `/` is at or above `PARADIGM_DISK_PRUNE_AT` (default 70%)
- removes Coolify helper containers only after their deployment is no longer queued or in progress
- never prunes Docker volumes
- writes logs to `/var/log/paradigm-coolify-host-guard.log`

## Commands

```bash
npm run deploy:guard
npm run deploy:prod
npm run host:install-coolify-guard
```

Use `--skip-deploy-guard` only when debugging the guard itself.
