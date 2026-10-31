# Medusa catalog change delivery — 2026-10-31

## Scope

Medusa's official [catalog and inventory events](https://docs.medusajs.com/resources/events-reference) drive minimal signed invalidation notices. This updates the operations view of the Medusa database; it does not connect third-party suppliers or a warehouse, infer available inventory, publish a draft, place an order or enable payments.

Sender: `medusa-backend/config/operations-events.ts` and `src/subscribers/operations-changed.ts` in Sericiacom. Existing Redis event bus delivers product/inventory-item/inventory-level created/updated/deleted events. Global queue options allow five attempts with exponential5-second backoff and retain failed jobs. Existing order email handling remains disabled; its idempotency key is retained.

Receiver: `/api/medusa-ops/events`, fixed4KiB request bound, HMAC-SHA256 over delivery timestamp and raw body,5-minute freshness, allowlisted fields/topics. Stable identity hashes topic/entity/occurrence time. Notifications invalidate displayed current data, so delayed/out-of-order events never apply stale stock quantities. Same-millisecond identical notices coalesce; this is not a complete source transaction audit.

Private ledger: `sericia_medusa_events`, RLS forced, no anon/authenticated table grants; service-only insert/update/read. No customer or credential data. Identified CMS admins/editors can open `/api/medusa-ops/stream`. Server subscribes before reading initial history, then refreshes history on database changes. Only the recent30 notices are displayed; the full ledger remains stored. SSE reauthorizes every4minutes; disconnect retries are bounded to3 with backoff, then explicitly require reconnect. There is no periodic data polling.

Existing `notifyBothChannels` reports each newly accepted notice. A notification failure is persisted and visible; accepted duplicate delivery does not send duplicate notifications. Notification replay is not automatic. Sender failure after all five attempts remains in Redis and server logs for operator recovery; absence of new events is not proof that the sender is healthy.

## Runtime configuration and recovery

`SERICIA_MEDUSA_EVENT_SECRET`: same random32+character key on sender and receiver, production runtime-only, excluded from builds/previews. Sender destination `SERICIA_OPERATIONS_EVENTS_URL=https://paradigmjp.com/api/medusa-ops/events`. No credential values in git. Receiver enabled first; activate sender only after receiver deploy passes.

On delivery failure, repair the receiver/network/secret, inspect retained failed jobs in the existing `events-queue`, and retry only reviewed subscriber failures. Do not resend purchases, dispatches or order emails as a blanket recovery action. Do not flush Redis or clear the queue. Stream failure is visible in the GUI and has a reconnect control; manual catalog retrieval still works independently.

Before a backend change: verified CI image artifact/digest, current DB dump, retained prior image, then migrate and start server/worker; verify localhost health, exact subscriber source fingerprint and six real products remain drafts. Public Shopify stays unchanged.

## Validation

Local backend15tests; operations18tests; both TypeScript checks; touched-file lint; desktop/mobile isolated browser test including change-triggered refetch. SQL migration applied twice inside a transaction, duplicate insert/RLS/grants asserted, then rolled back. Formal read-only preflight passed at root87%/20GiB free.

CI/deployment/live event evidence: pending final append.

## Live findings and pending completion

PR765/9146c145 receiver is deployed and postdoctor passed. The shared release wrapper ends with pre-existing Manual Work V4 HTTP207; it is not a fully green wrapper. Prior CI146tests, production build and responsive checks passed; one unrelated project's audit gate still reports18moderate minimatch advisories. No audit gate was weakened.

The direct Realtime service needs /socket and tenant Host realtime-dev.localhost, not the gateway /realtime/v1 path. Its signing key differs from PostgREST. Runtime-only SERICIA_MEDUSA_REALTIME_KEY uses the existing tenant, expires2027-10-31 and must rotate before that date. Existing ws is declared directly because native Realtime transport ignores headers. A real SDK subscription was verified before deployment.

Shared Docker DNS resolved generic postgres inconsistently after recreation. Backend DATABASE_URL/REDIS_URL now use sericia-medusa-preview-postgres-1 and sericia-medusa-preview-redis-1. Original private environment backups are retained; no password/database reset. Configure these unique names on future redeployments.

Live draft change exposed an upstream priority boundary: Medusa2.22.1 assigns internal priority2097152 while BullMQ5.81.5 accepts at most2097151. Explicit jobOptions.priority100 avoids this; the test executes the actual event builder for internal and ordinary events. Failed grouped events were not claimed as delivered. Original draft title restored. Retry only reviewed catalog events, never blanket replay purchases/shipments/emails.

Final deployment fingerprints and live GUI roundtrip pending.

## Realtime runtime dependency repair

Live subscriptions exposed missing wal2json in the shared plain PostgreSQL16-alpine image. The application does not receive actual Postgres changes until that decoding plugin is installed. docker/supabase-wal2json.Dockerfile pins the exact deployed PostgreSQL16.14 digest and upstream wal2json2.7 commit. scripts/verify-supabase-wal2json.py creates an isolated network-disabled tmpfs database, compares the PostgreSQL binary to the current server and verifies a real INSERT is decoded; its temporary container is always removed. No production data enters the fixture.

Deployment procedure: retain the current Compose file; copy the verified plugin library into the running same-version DB, verify a temporary logical slot can load it, and pin the derived image in Compose for future recreations. This avoids restarting the shared DB just to load an output plugin. Verify installed-library SHA against the isolated image. Do not overwrite an existing different library or change volumes/passwords. Roll back the Compose image and remove only this added plugin after disconnecting consumers if repair is rejected. Rebuild and re-run the isolated check before any future PostgreSQL image upgrade.

The live Realtime subscription table also lacked its primary/unique/entity indexes and tr_check_filters trigger. The new additive repair matches the deployed v2.102.3 upstream subscription and selected-columns migrations. It neither truncates subscriptions nor changes permissions. A rollback transaction applied the repair twice, verified ON CONFLICT deduplication and verified the existing validator rejects an unknown selected column. Register the repair after the event ledger in the existing formal migration path.
