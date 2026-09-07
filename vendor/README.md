# Payload security maintenance artifact

`paradigmllc-payload-security-3.85.0.tgz` is a **local Paradigm security fork**,
not an upstream Payload release. It is not published to npm.

- Upstream: official `payload@3.85.0`, MIT license retained inside archive.
- Source archive SHA-512: `Cb3jX/WRkHhT5oZCx1BikR6fe32Xbld4Esxr0i+dXtHZMjBVgMjaf/oaK81jLRBstbJbUw7Ia/jMrRw82+FlwA==`.
- Output SHA-512: `+YqhbzqTuB2cK3LvkhlY45glyB7gL6msX3yFzPa7QfdQAjMO5mKZ/OHGge7mpvme5Q6EyzHXDOjaGG2zy1lGdg==`.
- Revision: `paradigmSecurityRevision=1`; upstream API version retained at 3.85.0
  for exact peer compatibility with the existing Payload packages.
- Patch: `patches/payload/3.85.0-unlock.patch`.
- Rebuild: `node scripts/prepare-payload-security-fork.mjs`.
  Fetches the pinned official archive, verifies its hash, checks/applies the patch,
  adjusts attribution metadata and packs without running upstream lifecycle scripts.
  Two independent builds produced the same output hash.

## Actual behavior change

[GHSA-jg8r-5jh2-v2xj](https://github.com/advisories/GHSA-jg8r-5jh2-v2xj):
`unlockOperation` now denies access when the collection does not explicitly define
an unlock policy. Normal read/login access is untouched. Explicit collection access
and trusted local `overrideAccess` behavior remain upstream semantics. The project's
Users collection additionally grants unlock only to administrators. The old source
map for the modified function is omitted rather than shipping inaccurate mappings.

The parser is separately replaced with the reviewed MIT community fork
[`image-size-next@2.1.1`](https://github.com/lcf2212dev/image-size-next/compare/v2.0.2...v2.1.1).
Its exact published artifact is pinned in the root override and lockfile.
No additional runtime dependencies are introduced by the parser fork.

## Verification and maintenance obligation

The upstream code reproduced unauthorized unlock. The patched package rejects it
before a DB read/write. Explicit admin unlock still succeeds. Original parser code
reproduced ICNS/HEIF hangs and JXL heap exhaustion in bounded local child processes;
the replacement completes the same inputs. Tests also exercise CJS/ESM, buffer/file,
six valid formats and Payload's actual upload dimension adapter.

`npm audit` does not understand the relationship between a fork name and future
upstream advisories. **Zero reported findings is not a promise of zero vulnerabilities.**
Every dependency update must review advisories for both `payload` and `image-size`
under their upstream names, compare new source/artifacts, run the regression tests,
and update the explicit provenance. Do not simply rename or bump this artifact to
silence a finding. Do not replace it with upstream until all three addressed advisory
paths are demonstrably fixed there. CI checks runtime behavior and pinned hashes.

Rollback must be a reviewed commit with the prior lockfile and archive; reverting to
the original vulnerable dependencies is **not** a safe production rollback. No DB
schema or stored user/media records are changed by this repair.
