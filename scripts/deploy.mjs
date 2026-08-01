#!/usr/bin/env node

/**
 * Deprecated compatibility entrypoint.
 *
 * Paradigmjpcom production releases must run the complete gate so database
 * migrations, CMS publication, Cloudflare origin locking, and post-deploy
 * verification cannot be skipped accidentally.
 */

console.error(
  "Direct deployment is disabled. Run `npm run release:prod` from the approved release environment.",
)
process.exit(1)
