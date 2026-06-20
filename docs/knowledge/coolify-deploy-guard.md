# Coolify Deploy Guard

## Purpose

`paradigm-hp` deploys must not get stuck for hours because a queued deployment is stale, Docker cache fills the host, or the Next.js standalone container is unreachable from Coolify healthchecks.

## Permanent Guards

- `Dockerfile` sets `HOSTNAME=0.0.0.0`, `PORT=3000`, installs `curl`, and includes a localhost `HEALTHCHECK`.
- `scripts/coolify-deploy-guard.mjs` verifies the Dockerfile guard, cancels stale queued/in-progress `paradigm-hp` deployments, and prints compact host state.
- `scripts/deploy.mjs` and `scripts/sales-os-no-login-deploy.mjs` both run the guard before triggering Coolify.
- `scripts/install-coolify-host-guard.mjs` installs `/usr/local/sbin/paradigm-coolify-host-guard.sh` as a one-shot deploy/recovery guard and removes any legacy cron/systemd timer for it.

## Host Guard Behavior

The host guard runs only when a deploy/recovery event invokes it. It:

- prunes Docker build cache/images/containers only when `/` is at or above `PARADIGM_DISK_PRUNE_AT` (default 70%)
- removes Coolify helper containers only after their deployment is no longer queued or in progress
- never prunes Docker volumes
- writes logs to `/var/log/paradigm-coolify-host-guard.log`

Permanent infra rule: do not install cron, Coolify Scheduled Tasks, pg_cron, systemd timers, or always-on polling for site operations. Use webhooks, queue events, systemd.path, launchd WatchPaths, or explicit deploy/recovery commands.

## Commands

```bash
npm run deploy:guard
npm run deploy:prod
npm run host:install-coolify-guard
```

Use `--skip-deploy-guard` only when debugging the guard itself.
