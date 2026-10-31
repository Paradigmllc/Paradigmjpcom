# SERICIA operations release and capacity — 2026-10-31

## Capacity recovery

Root was91% used /14GiB free at the start of this continuation. Docker reclaimable build cache was0; deleting active data or rollback images was not necessary.

Moved all4 encrypted nightly Supabase archives plus4 checksum files (6,048,770,620 bytes) from root storage to the already-approved20GB volume. The existing path `/opt/backups/oss-supabase-nightly` is now a persistent bind mount of `/mnt/sericia-medusa-data/backups/oss-supabase-nightly`. Retention, file names, permissions and the backup producer's path remain compatible. No backup generation was discarded and no additional infrastructure charge was introduced.

The backup service was inactive; its existing timer was paused during relocation and restored afterwards. Every archive matched its supplied SHA256; all8 files were copied, fsynced and rehashed against unchanged originals. After mounting, all8 files were read back again and only identical old root copies were removed. The copy manifest and original fstab are protected under `/mnt/sericia-medusa-data/maintenance/20261031/`.

`/etc/fstab` defines the bind mount with a dependency on the approved volume. The backup service has `RequiresMountsFor` plus a mountpoint precondition, preventing fallback writes to root if the mount is unavailable. The generated mount is active and depends on the volume. fstab verification reports0 errors;3 pre-existing swap-related warnings remain. A reboot and a full backup restore were not performed. This is byte-preserving storage relocation, not a new disaster-recovery validation.

Read-only release preflight passed at87% /20GiB free. Dedicated volume had11GiB free after relocation. R2 backup settings and cloud retention were not changed.

## Private Medusa connection

PR763 merged as `aa23a36c45d8d7ffb97b29179645f9d35adb364a`. Prior CI41046890555 passed138 tests, typecheck, responsive browser verification and production build.

Medusa's server is attached to the existing Coolify bridge as `sericia-medusa-private`, persisted in `/opt/sericia-medusa-preview/compose.override.yaml`. Existing localhost-only host bindings remain in effect. The current operations container reached `/health` withHTTP200 over this private network.

A dedicated Medusa secret API key is stored in Coolify's runtime environment. Both `SERICIA_MEDUSA_ADMIN_URL` and `SERICIA_MEDUSA_SECRET_API_KEY` are runtime-only for production, excluded from build-time and blank/disabled for previews. No secret is in tracked files. Key-ID-only recovery evidence is kept outside git. The standard Medusa key is an admin credential; the new application reader is restricted to fixed GET paths and identified Payload admins/editors.

## Release verification

Standard `PARADIGM_DISK_READ_ONLY=1 npm run release:prod` started after the formal preflight passed. DB verification found133/133 tables. Deployment `hancofxautekjb8du4o64fsj` finished. Healthy container `n8i2sjiqvr2d8hrzppop2m2i-035954256791` runs the exact `aa23a36c45d8d7ffb97b29179645f9d35adb364a` image. Standalone post-deploy doctor passed. The shared release wrapper still exits nonzero after the unrelated Manual Work V4 reconciliation returns207; this is not a fully green release wrapper and was not hidden or bypassed.

Normal CMS login succeeded with the previously authorized existing account. Following CMS → Tiny Shops運営OS → Medusa確認 shows6 draft products; inventory shows13 items, all without locations and explicitly quantity-unconfirmed. Desktop and390px mobile screenshots are saved outside git at `/tmp/sericia-medusa-live/`. Direct automation navigation initially received401; normal in-site navigation succeeded without weakening authentication. Authenticated unknown query parameters correctly return400. Public unauthenticated access remains rejected.

After building, root temporarily reached95%/8.6GiB free. Removed only unused build cache in two passes (5.225GB +4.06GB). The unused prior3d06ff29 image was exported to `/mnt/sericia-medusa-data/rollback/paradigm-3d06ff29.tar.gz` (1,064,003,723bytes), all OCI blob digests verified, and `docker load` successfully restored the identical image ID before its unused local tag was removed. Docker's containerd image ID is a manifest digest rather than its config digest: the initial config-only assertion stopped before removal; the full blob and importer verification resolved that distinction. No running container referenced it. Restore with `docker load --input` after verifying the adjacent checksum. Other images, volumes and the retained120e48df archive were preserved.

Final measured capacity: root87%/20GiB free; approved volume47%/9.9GiB free. No new paid capacity was purchased. The backup timer is active. Re-check before each future release: shared-host growth can consume this headroom.

The customer storefront remains Shopify. This release exposes a truthful Medusa read-only operations view; automatic authorized supplier quantities, contracted warehouse receiving/shipping, SNS credentials and payment/order completion remain separate unresolved work.
