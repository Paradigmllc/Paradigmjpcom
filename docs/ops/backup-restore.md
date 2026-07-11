# Backup and restore runbook

## Scope

The nightly OSS Supabase archive contains a custom-format PostgreSQL dump, a
plain SQL stream, global roles, table counts, and SHA-256 manifests. Production
must set `OSS_SUPABASE_BACKUP_ENCRYPTION_REQUIRED=true`, provide the passphrase
through a root-only systemd environment file, and configure
`OSS_SUPABASE_BACKUP_SSH_TARGET` for an off-host copy.

## Restore drill

1. Select an archive and verify its adjacent `.sha256` file with
   `sha256sum -c <archive>.sha256`.
2. If the archive ends in `.gpg`, decrypt it on an isolated host with the
   root-only passphrase and never write the passphrase to shell history.
3. Inspect the dump with `pg_restore --list <archive>` before restoring.
4. Restore into a disposable PostgreSQL database, then run
   `node scripts/verify-db-tables.mjs` against that database.
5. Record restore duration, row-count comparison, and any missing migration in
   the incident log. Do not overwrite production during a drill.

## Recovery target

- RPO: one nightly backup (24 hours maximum before off-host delivery).
- RTO: document the measured restore time after the first successful drill.
- Retention: 14 days locally and at the configured off-host target unless the
  approved retention policy says otherwise.

