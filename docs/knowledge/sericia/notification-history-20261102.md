# SERICIA notification history and admin access — 2026-11-02

## Changes

Medusa notifications previously sent the literal `sales` as the Slack message.
The sender now includes the change topic and entity identifier. No customer data
is included; duplicate signed deliveries still do not notify again.

The operations view now offers all changes or notification failures, with explicit
loading, empty and error states. Failed notices are filtered in the database
before the30-row limit and ordered by received time. An additive partial index
supports this query. Failed notices do not disappear merely because30new successful
changes arrived. Each view still shows at most30matching rows; this is not full
historical pagination or a replay queue.

The existing authenticated SSE accepts only `notifications=all|failed`, rejects
unknown/repeated parameters, retains periodic authentication renewal and cleanup,
and refreshes the catalog even when a change does not alter the filtered history.

A live pre-release investigation found that the authenticated CMS dashboard was
accessible while the operations page rejected access. Runtime logs showed public
`blog-cms.payload.find` timeouts and no actual admin-auth failure. Public content
cooldown previously short-circuited credential validation. Authentication now has
its own3second backoff after actual auth failures. Every allowed request still
validates the Payload credentials; unauthenticated users and viewer-only identities
remain rejected by Medusa APIs. Public-content backoff behavior is unchanged.

## Verification

- Local34authentication/Medusa tests, TypeScript and touched-file lint passed.
- Desktop/mobile browser fixture passed, including old failed notice rendering,
  empty/filter states, unchanged filtered-history catalog refresh and no overflow.
- SQL partial index applied twice in a rolled-back transaction; index predicate
  and forcedRLS asserted. No fixture events or messages inserted into production.
- CI41386452197 passed162tests, TypeScript, browser checks and production build.
  Japan operator41386452268, Work API-free41386452374, Video Factory41386452344
  and routing validation41386452159 passed. Pet Life41386452142 still fails the
  pre-existing18moderate dependency advisories; no audit gate was weakened.
- PR768 merged as61380cda81897133920a2983ad0cab9d187558d4.

## Boundaries

No Slack test message, order, stock mutation, dispatch, social post, provider
contract, credential expansion or public-storefront cutover. Notification replay
is intentionally absent because a failed/unknown response does not prove Slack
did not receive it. Delivery receipts/per-channel recovery and terminal Medusa
sender-failure recovery remain outstanding. Supplier/warehouse/social connections
and payment/purchase-to-dispatch validation remain open. Public sericia.com stays
Shopify; private Medusa/storefront images remain7a5cc041.

## Live release result

Formal release deployed61380cda as `fh76ilnwzl9n91ryjwh95cls` (finished).
Container `n8i2sjiqvr2d8hrzppop2m2i-041350552495` is healthy on that exact image;
existing healthy-upstream/origin-lock cutover completed. A temporary502 during
cutover recovered. Shared wrapper still exits at the existing unrelated Manual
Work V4 HTTP207. Standalone post-deploy doctor passed; do not call the full wrapper
green or repeatedly redeploy for that unrelated error.

At13:22 JST the existing logged-in CMS session could open the operations screen,
Medusa6draft products and realtime connection. Switching to notification failures
kept the connection active and showed no recorded failures. DB independently
confirms10events/0notification errors and the partial index. No synthetic failure
was committed to production. Correct Slack message content was verified with a
mock, not a real Slack test send.

Screenshots are local under Codex release-evidence/migration/20261102.
`live-notification-filter.png` is the actual production desktop result.
The browser viewport override requested390px but measured433px; that live width
had no horizontal page overflow and its screenshot was visually inspected. The
separate isolated mobile fixture was measured at390px and passed. Override reset.
`before-cms-session.png` records the authenticated CMS dashboard, not an image of
the access-denied screen; the earlier denied state was observed in accessibility
output. The cooldown regression is also covered by the unit tests.

Unused build cache9.284GB reclaimed after deployment. All DB backups and prior
runtime image retained. Final root88%/19GiBfree, volume68%/6.1GiBfree. Public
sericia.comHTTP200; no public storefront migration or additional paid service.
