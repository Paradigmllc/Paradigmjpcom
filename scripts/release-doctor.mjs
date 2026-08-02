#!/usr/bin/env node
/**
 * Release Doctor: the single release gate for Paradigmjpcom.
 *
 * It keeps build/deploy failures from becoming repeated agent loops by:
 * - failing before deploy when the worktree or host is not release-ready
 * - statically blocking destructive deploy timeout behavior
 * - validating production URLs that represent actual Revenue OS value, not just
 *   a queued deployment webhook
 */

import fs from "node:fs"
import { spawnSync } from "node:child_process"
import { lookup } from "node:dns/promises"
import { isIP } from "node:net"
import path from "node:path"
import { readCoolifyApplicationEnvs } from "./lib/coolify-env.mjs"
import { sshArgs } from "./lib/ssh-options.mjs"

const args = new Set(process.argv.slice(2))
const PRE_DEPLOY = args.has("--pre-deploy") || (!args.has("--post-deploy") && !args.has("--local-only"))
const POST_DEPLOY = args.has("--post-deploy")
const LOCAL_ONLY = args.has("--local-only")
const ALLOW_DIRTY = args.has("--allow-dirty")
const SKIP_REMOTE = args.has("--skip-remote") || process.env.RELEASE_DOCTOR_SKIP_REMOTE === "1"

const BASE_URL = (process.env.RELEASE_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://paradigmjp.com").replace(/\/+$/, "")
const TWENTY_URL = (process.env.RELEASE_TWENTY_URL || "https://twenty.paradigmjp.com").replace(/\/+$/, "")
const REPORT_PATH = process.env.RELEASE_REPORT_SMOKE_PATH || "/en/report/ccbc-xynd21"
const DEPLOY_HOST = process.env.PARADIGM_DEPLOY_HOST || "paradigm-droplet"
const APP_UUID = process.env.PARADIGM_APP_UUID || "n8i2sjiqvr2d8hrzppop2m2i"

const failures = []
let protectedAppHostsSnapshot = null

function section(title) {
  console.log(`\n[release-doctor] ${title}`)
}

function fail(message) {
  failures.push(message)
  console.error(`FAIL: ${message}`)
}

function pass(message) {
  console.log(`OK: ${message}`)
}

function warn(message) {
  console.warn(`WARN: ${message}`)
}

function run(command, commandArgs, options = {}) {
  const result = spawnSync(command, commandArgs, {
    cwd: process.cwd(),
    env: process.env,
    encoding: "utf8",
    ...options,
  })
  const output = `${result.stdout || ""}${result.stderr || ""}`.trim()
  return { status: result.status ?? 1, output }
}

function runOrFail(label, command, commandArgs, options = {}) {
  const result = run(command, commandArgs, options)
  if (result.output) console.log(result.output)
  if (result.status !== 0) {
    fail(`${label} failed`)
    return false
  }
  pass(label)
  return true
}

function checkGitHygiene() {
  section("Git hygiene")
  const result = run("git", ["status", "--short"])
  if (result.status !== 0) {
    fail("git status failed")
    return
  }
  const lines = result.output.split(/\r?\n/).filter(Boolean)
  const untracked = lines.filter((line) => line.startsWith("?? "))
  if (untracked.length > 0) {
    fail(`untracked files present (${untracked.length}); deploy would risk module-not-found`)
    console.log(untracked.slice(0, 20).join("\n"))
  }
  if (lines.length > 0 && !ALLOW_DIRTY) {
    fail(`worktree has ${lines.length} change(s); commit or pass --allow-dirty for local diagnosis only`)
    console.log(lines.slice(0, 30).join("\n"))
  }
  if (lines.length === 0) pass("worktree clean")
  if (lines.length > 0 && ALLOW_DIRTY && untracked.length === 0) pass("dirty tracked worktree allowed for local diagnosis")
}

function checkStaticReleaseRules() {
  section("Static release rules")
  const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"))
  const scripts = packageJson.scripts || {}
  if (scripts["release:prod"]?.includes("release-doctor")) {
    pass("release:prod is guarded by release-doctor")
  } else {
    fail("package.json must expose release:prod through release-doctor")
  }

  const englishMessages = JSON.parse(fs.readFileSync("messages/en.json", "utf8"))
  const legalRows = Array.isArray(englishMessages.legalPage?.rows)
    ? englishMessages.legalPage.rows
    : []
  const legalPlaceholders = legalRows
    .flat()
    .filter((value) => typeof value === "string" && /disclosed without delay|on request/i.test(value))
  if (legalPlaceholders.length > 0) {
    pass("English legal identity is runtime-configured; remote environment validation is required")
  } else {
    pass("English legal identity fields are populated")
  }

  const githubDeployWorkflow = fs.readFileSync(
    ".github/workflows/coolify-deploy.yml",
    "utf8",
  )
  if (
    githubDeployWorkflow.includes("Block deploys that bypass the production release gate") &&
    !githubDeployWorkflow.includes("/api/v1/deploy") &&
    !githubDeployWorkflow.includes("sales-os-no-login-deploy")
  ) {
    pass("GitHub Actions cannot bypass release:prod")
  } else {
    fail("GitHub Actions must not expose a direct Coolify deployment path")
  }

  const legacyDeployEntrypoint = fs.readFileSync("scripts/deploy.mjs", "utf8")
  if (
    legacyDeployEntrypoint.includes("Direct deployment is disabled") &&
    !legacyDeployEntrypoint.includes("/api/v1/deploy") &&
    !legacyDeployEntrypoint.includes("createCoolifyClient")
  ) {
    pass("legacy deploy entrypoint cannot bypass release:prod")
  } else {
    fail("scripts/deploy.mjs must not expose a direct Coolify deployment path")
  }

  const noLoginDeploy = fs.readFileSync("scripts/sales-os-no-login-deploy.mjs", "utf8")
  if (/cancelDeploy\(uuid,\s*"poll timeout"\)/.test(noLoginDeploy)) {
    fail("sales-os-no-login-deploy still cancels deployments on monitor timeout")
  } else if (noLoginDeploy.includes("CANCEL_ON_TIMEOUT")) {
    pass("timeout cancellation is opt-in only")
  } else {
    fail("sales-os-no-login-deploy timeout behavior is not explicit")
  }
  const originLockHelperPath = "scripts/lib/refresh-traefik-origin-lock.py"
  const originLockHelper = fs.existsSync(originLockHelperPath)
    ? fs.readFileSync(originLockHelperPath, "utf8")
    : ""
  const prepareCall = noLoginDeploy.lastIndexOf("prepareManualTraefikOriginLock()")
  const deployCall = noLoginDeploy.indexOf("const uuid = await triggerDeploy()")
  const applyCall = noLoginDeploy.lastIndexOf("refreshManualTraefikRoute()")
  if (
    prepareCall >= 0 &&
    deployCall > prepareCall &&
    applyCall > deployCall &&
    noLoginDeploy.includes("python3 - --prepare") &&
    noLoginDeploy.includes("python3 - --apply")
  ) {
    pass("deploy validates and caches Cloudflare CIDRs before replacing the app container")
  } else {
    fail("deploy must prepare Cloudflare CIDRs before deploy and atomically apply them afterward")
  }
  const applyHelperBody = originLockHelper.match(
    /def apply_cached_origin_lock\([\s\S]*?(?:\r?\n){2,}def main\(/,
  )?.[0] ?? ""
  if (
    noLoginDeploy.includes("refresh-traefik-origin-lock.py") &&
    originLockHelper.includes("https://api.cloudflare.com/client/v4/ips") &&
    originLockHelper.includes("CACHE_MAX_AGE_SECONDS") &&
    originLockHelper.includes("prepare_cloudflare_cache") &&
    originLockHelper.includes("load_cached_ranges") &&
    originLockHelper.includes("--prepare") &&
    originLockHelper.includes("--apply") &&
    originLockHelper.includes("paradigm-cloudflare-only") &&
    originLockHelper.includes("ipAllowList") &&
    originLockHelper.includes("paradigmhp-origin-alias-https") &&
    applyHelperBody.includes("load_cached_ranges") &&
    applyHelperBody.includes("atomic_write(") &&
    !applyHelperBody.includes("fetch_cloudflare_ranges(")
  ) {
    pass("post-deploy route refresh uses only a validated cache and one atomic route write")
  } else {
    fail("post-deploy route refresh must not depend on a live Cloudflare API request")
  }
  if (noLoginDeploy.includes("isInternalDataApiUrl") && noLoginDeploy.includes("applySqlMigrationThroughPostgres")) {
    pass("deploy avoids local calls to Docker-internal Supabase REST URLs")
  } else {
    fail("deploy must avoid local calls to Docker-internal Supabase REST URLs")
  }
  const japanEntryProductBlock = noLoginDeploy.match(
    /code:\s*"global_jaas"[\s\S]*?(?=\r?\n  },\r?\n  \{)/,
  )?.[0] ?? ""
  const japanEntryCurrency = japanEntryProductBlock.match(/default_currency:\s*"([A-Z]{3})"/)?.[1]
  const japanEntryAmount = japanEntryProductBlock.match(/default_amount_yen:\s*(\d+)/)?.[1]
  if (japanEntryCurrency === "USD" && japanEntryAmount === "15000") {
    pass("Japan Entry sales product matches the public $15,000 USD offer")
  } else {
    fail("global_jaas must use USD 15000 in the production sales product seed")
  }
  if (
    noLoginDeploy.includes("https://paradigmjp.com/en") &&
    noLoginDeploy.includes("https://paradigmjp.com/en/services") &&
    noLoginDeploy.includes("https://paradigmjp.com/en/contact") &&
    noLoginDeploy.includes("Confirm your fit and launch timing") &&
    noLoginDeploy.includes("Five modules, one accountable launch.") &&
    noLoginDeploy.includes("seedMarketingHomepages") &&
    noLoginDeploy.includes('scope: "homepage"') &&
    noLoginDeploy.includes("seedEnglishJapanEntryBlog") &&
    noLoginDeploy.includes("/api/admin/seed-japan-entry-blog") &&
    noLoginDeploy.includes("What Should a Japan Entry Package Actually Deliver?") &&
    noLoginDeploy.includes("The Source Pack That Keeps a Japan Launch Moving") &&
    noLoginDeploy.includes("Wise") &&
    noLoginDeploy.includes("14 business days")
  ) {
    pass("deploy publishes both locale Japan Entry homepages and the maintained English editorial set")
  } else {
    fail("deploy must publish the English homepage/blog and smoke the dedicated application")
  }

  const contactMigrationPath = "supabase/migrations/migration_068_contact_submission_atomicity.sql"
  const contactMigration = fs.existsSync(contactMigrationPath)
    ? fs.readFileSync(contactMigrationPath, "utf8")
    : ""
  const contactIntegrityMarkers = [
    "sales_contact_submissions",
    "sales_create_contact_submission",
    "sales_complete_contact_notification",
    "notification_claim_token",
    "notification_claim_token = p_claim_token",
    "REVOKE ALL ON FUNCTION public.sales_create_contact_submission",
    "sales_atomic_meta_merge(uuid,jsonb) FROM PUBLIC, anon, authenticated",
    "sales_atomic_meta_history_prepend(uuid,text,text,text) FROM PUBLIC, anon, authenticated",
    "sales_atomic_screenshot_append(uuid,text,jsonb) FROM PUBLIC, anon, authenticated",
  ]
  if (
    contactMigration &&
    contactIntegrityMarkers.every((marker) => contactMigration.includes(marker)) &&
    noLoginDeploy.includes("migration_068_contact_submission_atomicity.sql") &&
    noLoginDeploy.includes("applyContactSubmissionAtomicityMigration")
  ) {
    pass("contact ingress has atomic lead/outbox persistence, lease CAS, and RPC ACL hardening")
  } else {
    fail("contact migration/release wiring must enforce atomicity, lease CAS, and service-role-only RPCs")
  }

  const postsConstraintsPath = "supabase/migrations/migration_069_payload_posts_constraints.sql"
  const postsConstraintsMigration = fs.existsSync(postsConstraintsPath)
    ? fs.readFileSync(postsConstraintsPath, "utf8")
    : ""
  if (
    postsConstraintsMigration.includes("payload_posts_id_uidx") &&
    postsConstraintsMigration.includes("posts_locales_locale_parent_uidx") &&
    noLoginDeploy.includes("migration_069_payload_posts_constraints.sql") &&
    noLoginDeploy.includes("applyPayloadPostsConstraintsMigration")
  ) {
    pass("Payload posts writes have id/slug/locale unique arbiters")
  } else {
    fail("Payload posts migration/release wiring must preserve ON CONFLICT writes")
  }

  const scoreMigrationPath = "supabase/migrations/migration_072_public_japan_entry_checks.sql"
  const scoreMigration = fs.existsSync(scoreMigrationPath)
    ? fs.readFileSync(scoreMigrationPath, "utf8")
    : ""
  if (
    scoreMigration.includes("public_japan_entry_checks") &&
    scoreMigration.includes("ENABLE ROW LEVEL SECURITY") &&
    scoreMigration.includes("TO service_role") &&
    noLoginDeploy.includes("migration_072_public_japan_entry_checks.sql") &&
    noLoginDeploy.includes("applyPublicJapanEntryChecksMigration")
  ) {
    pass("Japan Entry score utility persistence has RLS and release migration wiring")
  } else {
    fail("Japan Entry score utility persistence must have RLS and release migration wiring")
  }

  const operatorCasesMigrationPath = "supabase/migrations/20260801224308_sales_japan_operator_cases.sql"
  const operatorCasesMigration = fs.existsSync(operatorCasesMigrationPath)
    ? fs.readFileSync(operatorCasesMigrationPath, "utf8")
    : ""
  const operatorHardeningMigrationPath = "supabase/migrations/20260801235327_sales_japan_operator_case_hardening.sql"
  const operatorHardeningMigration = fs.existsSync(operatorHardeningMigrationPath)
    ? fs.readFileSync(operatorHardeningMigrationPath, "utf8")
    : ""
  const operatorOperationsPaths = [
    "supabase/migrations/20260802015455_japan_operator_operations_os.sql",
    "supabase/migrations/20260802015712_japan_operator_commercial_os.sql",
    "supabase/migrations/20260802015715_japan_operator_delivery_os.sql",
  ]
  const operatorOperations = operatorOperationsPaths.map((file) => fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "").join("\n")
  const operatorCaseMarkers = [
    "sales_japan_operator_cases",
    "sales_japan_operator_events",
    "sales_apply_japan_operator_action",
    "sales_create_japan_operator_case",
    "ENABLE ROW LEVEL SECURITY",
    "FORCE ROW LEVEL SECURITY",
    "FROM PUBLIC, anon, authenticated",
    "TO service_role",
    "external_messages_sent",
  ]
  const operatorHardeningMarkers = [
    "REVOKE ALL ON TABLE public.sales_japan_operator_cases FROM service_role",
    "REVOKE ALL ON TABLE public.sales_japan_operator_events FROM service_role",
    "GRANT SELECT, INSERT ON TABLE public.sales_japan_operator_events TO service_role",
    "DONGJIN BEDDING Co., Ltd. / Little Archive",
    "external_messages_sent', 0",
  ]
  const operatorOperationsMarkers = [
    "sales_contact_suppressions", "sales_japan_operator_evidence", "sales_japan_operator_outbound_authorizations",
    "sales_apply_japan_operator_action_v2", "sales_check_outbound_authorization", "sales_japan_operator_source_links",
    "sales_japan_operator_contract_links", "sales_japan_operator_invoices", "sales_japan_operator_skus",
    "sales_japan_operator_deliverables", "sales_japan_operator_finance_periods", "sales_japan_operator_operational_records",
    "sales_japan_operator_incidents", "sales_japan_operator_kpi_periods", "sales_japan_operator_offboarding",
    "sales_japan_operator_outbox", "FORCE ROW LEVEL SECURITY",
  ]
  if (
    operatorCaseMarkers.every((marker) => operatorCasesMigration.includes(marker)) &&
    operatorHardeningMarkers.every((marker) => operatorHardeningMigration.includes(marker)) &&
    operatorOperationsMarkers.every((marker) => operatorOperations.includes(marker)) &&
    noLoginDeploy.includes("20260801224308_sales_japan_operator_cases.sql") &&
    noLoginDeploy.includes("applyJapanOperatorCasesMigration") &&
    noLoginDeploy.includes("20260801235327_sales_japan_operator_case_hardening.sql") &&
    noLoginDeploy.includes("applyJapanOperatorCaseHardeningMigration") &&
    operatorOperationsPaths.every((file) => noLoginDeploy.includes(file.split("/").pop())) &&
    noLoginDeploy.includes("applyJapanOperatorOperationsOsMigrations")
  ) {
    pass("Japan market operator OS has atomic audit, outbound suppression, evidence, commercial and delivery wiring")
  } else {
    fail("Japan market operator OS requires complete P0-P2 migration and release wiring")
  }

  const petMovieMigrationPath = "supabase/migrations/20260801213954_pet_life_movie_mvp.sql"
  const petMovieMigration = fs.existsSync(petMovieMigrationPath)
    ? fs.readFileSync(petMovieMigrationPath, "utf8")
    : ""
  const petMovieMarketMigrationPath = "supabase/migrations/20260802020742_pet_life_movie_market_ready.sql"
  const petMovieMarketMigration = fs.existsSync(petMovieMarketMigrationPath)
    ? fs.readFileSync(petMovieMarketMigrationPath, "utf8")
    : ""
  const petMovieGrowthMigrationPath = "supabase/migrations/20260802201649_pet_life_movie_global_growth.sql"
  const petMovieGrowthMigration = fs.existsSync(petMovieGrowthMigrationPath)
    ? fs.readFileSync(petMovieGrowthMigrationPath, "utf8")
    : ""
  const petMovieRunMigrations = fs.readFileSync("scripts/run-migrations.sh", "utf8")
  const petMovieDbVerifier = fs.readFileSync("scripts/verify-db-tables.mjs", "utf8")
  const petMovieMarkers = [
    "pet_movie_projects",
    "pet_movie_contributors",
    "pet_movie_assets",
    "pet_movie_jobs",
    "pet_movie_events",
    "enable row level security",
    "force row level security",
    "from public, anon, authenticated",
    "to service_role",
  ]
  if (
    petMovieMarkers.every((marker) => petMovieMigration.includes(marker)) &&
    noLoginDeploy.includes("20260801213954_pet_life_movie_mvp.sql") &&
    noLoginDeploy.includes("applyPetLifeMovieMigration") &&
    noLoginDeploy.includes("20260802020742_pet_life_movie_market_ready.sql") &&
    noLoginDeploy.includes("applyPetLifeMovieMarketReadyMigration") &&
    noLoginDeploy.includes("20260802201649_pet_life_movie_global_growth.sql") &&
    noLoginDeploy.includes("applyPetLifeMovieGlobalGrowthMigration") &&
    petMovieRunMigrations.includes("20260801213954_pet_life_movie_mvp.sql") &&
    petMovieRunMigrations.includes("20260802020742_pet_life_movie_market_ready.sql") &&
    petMovieRunMigrations.includes("20260802201649_pet_life_movie_global_growth.sql") &&
    petMovieMarketMigration.includes("pet_movie_deliverables") &&
    petMovieMarketMigration.includes("force row level security") &&
    petMovieMarketMigration.includes("to service_role") &&
    ["pet_movie_marketing_campaigns", "pet_movie_marketing_runs", "pet_movie_marketing_posts", "pet_movie_marketing_events"].every((marker) => (
      petMovieGrowthMigration.includes(marker) && petMovieDbVerifier.includes(marker)
    )) &&
    petMovieGrowthMigration.includes("force row level security") &&
    petMovieGrowthMigration.includes("to service_role") &&
    petMovieMarkers.slice(0, 5).every((marker) => petMovieDbVerifier.includes(marker))
  ) {
    pass("Pet Life Movie persistence has RLS, service-role isolation, migration execution, and DB verification wiring")
  } else {
    fail("Pet Life Movie persistence requires RLS, service-role isolation, migration execution, and DB verification wiring")
  }

  const sericiaLaunchMigrationPath = "supabase/migrations/20260802214457_sericia_launch_control.sql"
  const sericiaLaunchMigration = fs.existsSync(sericiaLaunchMigrationPath)
    ? fs.readFileSync(sericiaLaunchMigrationPath, "utf8").toLowerCase()
    : ""
  const sericiaLaunchWorkflow = fs.existsSync(".github/workflows/sericia-launch-audit.yml")
    ? fs.readFileSync(".github/workflows/sericia-launch-audit.yml", "utf8")
    : ""
  const sericiaReleaseMarkers = [
    "shopify_launch_audit_runs",
    "enable row level security",
    "force row level security",
    "from public, anon, authenticated",
    "from service_role",
    "to service_role",
  ]
  if (
    sericiaReleaseMarkers.every((marker) => sericiaLaunchMigration.includes(marker))
    && noLoginDeploy.includes("20260802214457_sericia_launch_control.sql")
    && noLoginDeploy.includes("applyShopifyLaunchControlMigration")
    && petMovieRunMigrations.includes("20260802214457_sericia_launch_control.sql")
    && petMovieDbVerifier.includes("shopify_launch_audit_runs")
    && sericiaLaunchWorkflow.includes("/api/shopify-ops/launch/audit")
  ) {
    pass("SERICIA launch control has FORCE RLS, release wiring, DB verification, and scheduled audit")
  } else {
    fail("SERICIA launch control requires complete persistence and release wiring")
  }

  const contentCommerceMigrationPath = "supabase/migrations/20260801231006_content_commerce.sql"
  const contentCommerceMigration = fs.existsSync(contentCommerceMigrationPath)
    ? fs.readFileSync(contentCommerceMigrationPath, "utf8")
    : ""
  const contentCommerceSecurityMarkers = [
    "content_products",
    "content_access_events",
    "ENABLE ROW LEVEL SECURITY",
    "REVOKE ALL ON public.content_products FROM PUBLIC, anon, authenticated",
    "REVOKE ALL ON public.content_access_events FROM PUBLIC, anon, authenticated",
    "TO service_role",
  ]
  if (
    contentCommerceSecurityMarkers.every((marker) => contentCommerceMigration.includes(marker)) &&
    noLoginDeploy.includes("20260801231006_content_commerce.sql") &&
    noLoginDeploy.includes("applyContentCommerceMigration")
  ) {
    pass("Content API products and x402 access events have RLS and release migration wiring")
  } else {
    fail("Content commerce requires service-role-only RLS and release migration wiring")
  }

  const foreignInvestorPseoMigrationPath = "supabase/migrations/20260802043347_foreign_investor_pseo.sql"
  const foreignInvestorPseoMigration = fs.existsSync(foreignInvestorPseoMigrationPath)
    ? fs.readFileSync(foreignInvestorPseoMigrationPath, "utf8")
    : ""
  const foreignInvestorPseoMarkers = [
    "investor_brief",
    "jsonb_to_recordset",
    "buying-property-in-japan-as-a-foreigner",
    "japan-data-center-investment",
    "japan-foreign-direct-investment-screening",
    "Paradigm API Terms",
  ]
  const greaterTokyoMigrationPaths = [
    "supabase/migrations/20260802123000_investor_metro_payload_builder.sql",
    "supabase/migrations/20260802123100_tokyo_metro_investor_briefs.sql",
    "supabase/migrations/20260802123200_greater_tokyo_ring_investor_briefs.sql",
    "supabase/migrations/20260802123300_investor_metro_payload_builder_cleanup.sql",
  ]
  const greaterTokyoMigrations = greaterTokyoMigrationPaths.map((migrationPath) => (
    fs.existsSync(migrationPath) ? fs.readFileSync(migrationPath, "utf8") : ""
  )).join("\n")
  const legacyInvestorExpansionPath = "supabase/migrations/20260802202105_expand_legacy_investor_briefs.sql"
  const legacyInvestorExpansion = fs.existsSync(legacyInvestorExpansionPath)
    ? fs.readFileSync(legacyInvestorExpansionPath, "utf8")
    : ""
  const investorComparisonPath = "src/lib/investor-briefs/comparisons.ts"
  const investorComparisonSource = fs.existsSync(investorComparisonPath)
    ? fs.readFileSync(investorComparisonPath, "utf8")
    : ""
  const investorScalePath = "src/lib/investor-briefs/pseo-scale.ts"
  const investorScaleSource = fs.existsSync(investorScalePath)
    ? fs.readFileSync(investorScalePath, "utf8")
    : ""
  const investorPagePath = "src/app/[locale]/japan-opportunities/invest/[slug]/page.tsx"
  const investorPageSource = fs.existsSync(investorPagePath)
    ? fs.readFileSync(investorPagePath, "utf8")
    : ""
  const investorOgImagePath = "src/app/[locale]/japan-opportunities/invest/[slug]/opengraph-image.tsx"
  const investorOgImageSource = fs.existsSync(investorOgImagePath)
    ? fs.readFileSync(investorOgImagePath, "utf8")
    : ""
  if (
    foreignInvestorPseoMarkers.every((marker) => foreignInvestorPseoMigration.includes(marker))
    && noLoginDeploy.includes("20260802043347_foreign_investor_pseo.sql")
    && noLoginDeploy.includes("applyForeignInvestorPseoMigration")
    && greaterTokyoMigrationPaths.every((migrationPath) => noLoginDeploy.includes(path.basename(migrationPath)))
    && noLoginDeploy.includes("applyGreaterTokyoInvestorMigrations")
    && noLoginDeploy.includes(path.basename(legacyInvestorExpansionPath))
    && noLoginDeploy.includes("applyInvestorContentQualityMigration")
    && noLoginDeploy.includes("verifyForeignInvestorPseoCatalog")
    && noLoginDeploy.includes("investor-briefs/factory")
    && investorComparisonSource.includes("CURATED_INVESTOR_COMPARISONS")
    && investorComparisonSource.includes("yokohama-real-estate-investment")
    && investorScaleSource.includes("indexableOnlyAfterQualityGate")
    && investorScaleSource.includes("GREATER_TOKYO_SUBMARKETS")
    && greaterTokyoMigrations.includes("greater-tokyo-real-estate-market")
    && greaterTokyoMigrations.includes("kashiwa-nagareyama-narita-real-estate-investment")
    && greaterTokyoMigrations.includes("DROP FUNCTION IF EXISTS public.build_investor_metro_payload")
    && legacyInvestorExpansion.includes("$legacy_expansions$")
    && legacyInvestorExpansion.includes("tokyo-multifamily-investment-due-diligence")
    && legacyInvestorExpansion.includes("https://minpakuportal.city.kyoto.lg.jp/list/list1")
    && investorPageSource.includes("investorBriefReadableWordCount")
    && investorPageSource.includes("text/markdown")
    && investorPageSource.includes("includedInDataCatalog")
    && investorPageSource.includes("/opengraph-image")
    && !investorPageSource.includes('url: "/og-image.png"')
    && investorOgImageSource.includes('from "next/og"')
    && investorOgImageSource.includes("paletteFor(slug)")
  ) {
    pass("Foreign investor pSEO has 28 sourced long-form briefs, durable source links, dataset distributions, per-page social images, quality-gated scale, and production verification wiring")
  } else {
    fail("Foreign investor pSEO requires sourced long-form data, durable sources, dataset/social metadata, quality-gated scale, and production verification wiring")
  }

  const engineProfilesMigrationPath = "supabase/migrations/20260801091559_video_factory_engine_profiles.sql"
  const engineProfilesMigration = fs.existsSync(engineProfilesMigrationPath)
    ? fs.readFileSync(engineProfilesMigrationPath, "utf8")
    : ""
  const engineProfileSecurityMarkers = [
    "video_factory_engine_profiles",
    "video_factory_engine_events",
    "ENABLE ROW LEVEL SECURITY",
    "FORCE ROW LEVEL SECURITY",
    "revoke all on table public.video_factory_engine_profiles from anon, authenticated",
    "revoke all on table public.video_factory_engine_events from anon, authenticated",
    "to service_role",
  ]
  const ossExecutionMigrationPath = "supabase/migrations/20260801114845_video_factory_oss_execution_targets.sql"
  const ossExecutionMigration = fs.existsSync(ossExecutionMigrationPath)
    ? fs.readFileSync(ossExecutionMigrationPath, "utf8")
    : ""
  const ossExecutionMarkers = [
    "execution_target",
    "resolved_adapter",
    "drop policy if exists paradigm_service_role_all",
    "revoke all on table public.video_factory_engine_profiles from anon, authenticated",
    "to service_role",
  ]
  const removedBroadVideoFactoryPolicies = (
    ossExecutionMigration.match(/drop policy if exists paradigm_service_role_all/gi) ?? []
  ).length >= 2
  if (
    engineProfilesMigration &&
    engineProfileSecurityMarkers.every((marker) => engineProfilesMigration.toLowerCase().includes(marker.toLowerCase())) &&
    noLoginDeploy.includes("20260801091559_video_factory_engine_profiles.sql") &&
    noLoginDeploy.includes("applyVideoFactoryEngineProfilesMigration") &&
    ossExecutionMigration &&
    ossExecutionMarkers.every((marker) => ossExecutionMigration.toLowerCase().includes(marker.toLowerCase())) &&
    removedBroadVideoFactoryPolicies &&
    noLoginDeploy.includes("20260801114845_video_factory_oss_execution_targets.sql") &&
    noLoginDeploy.includes("applyVideoFactoryOssExecutionTargetsMigration")
  ) {
    pass("Video Factory engine catalog/events have RLS and release migration wiring")
  } else {
    fail("Video Factory engine catalog/events require RLS and release migration wiring")
  }

  const studioMigrationPath = "supabase/migrations/20260802093000_video_factory_commercial_studio.sql"
  const studioMigration = fs.existsSync(studioMigrationPath)
    ? fs.readFileSync(studioMigrationPath, "utf8")
    : ""
  const studioHardeningMigrationPath = "supabase/migrations/20260802113000_video_factory_studio_least_privilege.sql"
  const studioHardeningMigration = fs.existsSync(studioHardeningMigrationPath)
    ? fs.readFileSync(studioHardeningMigrationPath, "utf8")
    : ""
  const studioReadinessMigrationPath = "supabase/migrations/20260802203000_video_factory_studio_scale_readiness.sql"
  const studioReadinessMigration = fs.existsSync(studioReadinessMigrationPath)
    ? fs.readFileSync(studioReadinessMigrationPath, "utf8")
    : ""
  const studioSecurityMarkers = [
    "video_factory_brand_kits",
    "video_factory_creative_templates",
    "video_factory_studio_projects",
    "video_factory_shot_revisions",
    "video_factory_quality_metrics",
    "enable row level security",
    "force row level security",
    "revoke all on table public.video_factory_brand_kits from anon, authenticated",
    "to service_role",
  ]
  if (
    studioMigration
    && studioSecurityMarkers.every((marker) => studioMigration.toLowerCase().includes(marker))
    && studioHardeningMigration.toLowerCase().includes("revoke all on table public.video_factory_creative_templates from service_role")
    && studioHardeningMigration.toLowerCase().includes("grant select on table public.video_factory_creative_templates to service_role")
    && studioHardeningMigration.toLowerCase().includes("grant select, insert on table public.video_factory_shot_revisions to service_role")
    && noLoginDeploy.includes("20260802093000_video_factory_commercial_studio.sql")
    && noLoginDeploy.includes("applyVideoFactoryCommercialStudioMigration")
    && noLoginDeploy.includes("20260802113000_video_factory_studio_least_privilege.sql")
    && noLoginDeploy.includes("applyVideoFactoryStudioLeastPrivilegeMigration")
    && studioReadinessMigration.toLowerCase().includes("video_factory_studio_readiness_snapshots")
    && studioReadinessMigration.toLowerCase().includes("force row level security")
    && studioReadinessMigration.toLowerCase().includes("from public, anon, authenticated, service_role")
    && studioReadinessMigration.toLowerCase().includes("grant select, insert")
    && noLoginDeploy.includes("20260802203000_video_factory_studio_scale_readiness.sql")
    && noLoginDeploy.includes("applyVideoFactoryStudioScaleReadinessMigration")
  ) {
    pass("Video Factory commercial Studio and readiness evidence have server-only RLS and release wiring")
  } else {
    fail("Video Factory commercial Studio and readiness evidence require RLS and release migration wiring")
  }

  const videoGrowthMigrationPath = "supabase/migrations/20260802132000_video_growth_direct_acquisition.sql"
  const videoGrowthMigration = fs.existsSync(videoGrowthMigrationPath)
    ? fs.readFileSync(videoGrowthMigrationPath, "utf8")
    : ""
  const videoGrowthMarkers = [
    "video_growth_campaigns",
    "video_growth_variants",
    "video_growth_events",
    "force row level security",
    "from public, anon, authenticated, service_role",
    "video_growth_create_campaign",
    "video_growth_transition_campaign",
    "video_growth_update_variant",
    "human approval is required before scheduling",
    "external_messages_sent",
  ]
  if (
    videoGrowthMigration
    && videoGrowthMarkers.every((marker) => videoGrowthMigration.toLowerCase().includes(marker))
    && noLoginDeploy.includes("20260802132000_video_growth_direct_acquisition.sql")
    && noLoginDeploy.includes("applyVideoGrowthDirectAcquisitionMigration")
  ) {
    pass("Video subscription direct acquisition has approval gates, RLS and release wiring")
  } else {
    fail("Video subscription direct acquisition requires approval gates, RLS and release wiring")
  }

  const videoGrowthCommercialPaths = [
    "supabase/migrations/20260802190000_video_growth_commercial_schema.sql",
    "supabase/migrations/20260802190100_video_growth_commercial_intake.sql",
    "supabase/migrations/20260802190200_video_growth_commercial_quality.sql",
    "supabase/migrations/20260802190300_video_growth_commercial_guards.sql",
  ]
  const videoGrowthCommercial = videoGrowthCommercialPaths
    .map((migrationPath) => fs.existsSync(migrationPath) ? fs.readFileSync(migrationPath, "utf8") : "")
    .join("\n")
    .toLowerCase()
  const videoGrowthRunMigrations = fs.readFileSync("scripts/run-migrations.sh", "utf8")
  const videoGrowthApi = fs.readFileSync("src/app/api/sales/video-growth/route.ts", "utf8")
  const videoGrowthExport = fs.readFileSync("src/lib/video-growth/export.ts", "utf8")
  const videoGrowthCommercialMarkers = [
    "video_growth_work_orders", "video_growth_readiness_checks", "video_growth_approvals",
    "video_growth_revision_requests", "video_growth_daily_metrics", "content_revision",
    "force row level security", "from public, anon, authenticated, service_role",
    "video_growth_create_commercial_campaign", "video_growth_manage_approval",
    "video_growth_manage_revision", "video_growth_record_daily_metrics", "video_growth_update_billing_status",
    "internal quality and client release approval are required before publication",
    "requester and approver must be different", "external_messages_sent",
    "revoke all on function public.video_growth_create_campaign", "from service_role",
  ]
  const videoGrowthCommercialFunctions = [
    "applyVideoGrowthCommercialSchemaMigration", "applyVideoGrowthCommercialIntakeMigration",
    "applyVideoGrowthCommercialQualityMigration", "applyVideoGrowthCommercialGuardsMigration",
  ]
  if (
    videoGrowthCommercialPaths.every((migrationPath) => fs.existsSync(migrationPath))
    && videoGrowthCommercialMarkers.every((marker) => videoGrowthCommercial.includes(marker))
    && videoGrowthCommercialPaths.every((migrationPath) => noLoginDeploy.includes(migrationPath.split("/").at(-1)))
    && videoGrowthCommercialPaths.every((migrationPath) => videoGrowthRunMigrations.includes(migrationPath.split("/").at(-1)))
    && videoGrowthCommercialFunctions.every((functionName) => noLoginDeploy.includes(functionName))
    && videoGrowthApi.includes("authorizeSalesApiRequest")
    && videoGrowthApi.includes("READ_ROLES")
    && !videoGrowthApi.includes("isSalesApiAuthorized")
    && videoGrowthExport.includes("videoGrowthDashboardToCsv")
    && videoGrowthExport.includes("if (/^[=+\\-@]/.test(text))")
  ) {
    pass("Video subscription commercial operations have intake, SLA, dual approval, revision, metrics, RLS and release wiring")
  } else {
    fail("Video subscription commercial operations require complete workflow guards and release wiring")
  }

  const projectionMigrationPath = "supabase/migrations/20260712221723_sales_japan_entry_projections.sql"
  const projectionMigration = fs.existsSync(projectionMigrationPath)
    ? fs.readFileSync(projectionMigrationPath, "utf8")
    : ""
  if (
    projectionMigration.includes("sales_japan_entry_projections") &&
    projectionMigration.includes("ENABLE ROW LEVEL SECURITY") &&
    projectionMigration.includes("TO service_role") &&
    noLoginDeploy.includes("20260712221723_sales_japan_entry_projections.sql") &&
    noLoginDeploy.includes("applyJapanEntryProjectionsMigration")
  ) {
    pass("Japan Entry projections have RLS and release migration wiring")
  } else {
    fail("Japan Entry projections must have RLS and release migration wiring")
  }

  const initialDraftMigrationPath = "supabase/migrations/20260714234500_initial_form_draft_factory.sql"
  const initialDraftMigration = fs.existsSync(initialDraftMigrationPath)
    ? fs.readFileSync(initialDraftMigrationPath, "utf8")
    : ""
  if (
    initialDraftMigration.includes("sales_initial_form_drafts")
    && initialDraftMigration.includes("ENABLE ROW LEVEL SECURITY")
    && initialDraftMigration.includes("sales_initial_form_drafts_never_sent_check")
    && initialDraftMigration.includes("CHECK (sent = false)")
    && noLoginDeploy.includes("20260714234500_initial_form_draft_factory.sql")
    && noLoginDeploy.includes("applyInitialFormDraftFactoryMigration")
  ) {
    pass("Initial form drafts have RLS, a never-sent DB constraint, and release wiring")
  } else {
    fail("Initial form drafts require RLS, a never-sent DB constraint, and release wiring")
  }

  const leadSourcesMigrationPath = "supabase/migrations/20260715082148_high_quality_lead_sources.sql"
  const leadSourcesMigration = fs.existsSync(leadSourcesMigrationPath)
    ? fs.readFileSync(leadSourcesMigrationPath, "utf8")
    : ""
  if (
    leadSourcesMigration.includes("sales_lead_source_configs")
    && leadSourcesMigration.includes("sales_lead_source_records")
    && leadSourcesMigration.includes("ENABLE ROW LEVEL SECURITY")
    && leadSourcesMigration.includes("TO service_role")
    && leadSourcesMigration.includes("require_source_evidence")
    && noLoginDeploy.includes("20260715082148_high_quality_lead_sources.sql")
    && noLoginDeploy.includes("applyHighQualityLeadSourcesMigration")
  ) {
    pass("Evidence-first lead sources have RLS, fail-closed run gates, and release wiring")
  } else {
    fail("Evidence-first lead sources require RLS, fail-closed run gates, and release wiring")
  }

  const operatorApprovalMigrationPath = "supabase/migrations/20260715093000_lead_factory_operator_approval.sql"
  const operatorApprovalMigration = fs.existsSync(operatorApprovalMigrationPath)
    ? fs.readFileSync(operatorApprovalMigrationPath, "utf8")
    : ""
  const factoryRoute = fs.existsSync("src/app/api/sales/lead-candidates/factory/route.ts")
    ? fs.readFileSync("src/app/api/sales/lead-candidates/factory/route.ts", "utf8")
    : ""
  const verificationService = fs.existsSync("src/lib/sales/lead-candidate-verification.ts")
    ? fs.readFileSync("src/lib/sales/lead-candidate-verification.ts", "utf8")
    : ""
  const reviewService = fs.existsSync("src/lib/sales/lead-candidate-review.ts")
    ? fs.readFileSync("src/lib/sales/lead-candidate-review.ts", "utf8")
    : ""
  const candidateRunner = fs.existsSync("src/lib/sales/lead-candidate-runner.ts")
    ? fs.readFileSync("src/lib/sales/lead-candidate-runner.ts", "utf8")
    : ""
  const reviewRoute = fs.existsSync("src/app/api/sales/lead-candidates/runs/[runId]/review/route.ts")
    ? fs.readFileSync("src/app/api/sales/lead-candidates/runs/[runId]/review/route.ts", "utf8")
    : ""
  const sourcePreviewRoute = fs.existsSync("src/app/api/sales/lead-sources/[sourceId]/preview/route.ts")
    ? fs.readFileSync("src/app/api/sales/lead-sources/[sourceId]/preview/route.ts", "utf8")
    : ""
  const leadSourceSelectionService = fs.existsSync("src/lib/sales/lead-source-selection.ts")
    ? fs.readFileSync("src/lib/sales/lead-source-selection.ts", "utf8")
    : ""
  const deepSeekGateway = fs.existsSync("src/lib/deepseek.ts")
    ? fs.readFileSync("src/lib/deepseek.ts", "utf8")
    : ""
  const personalizedMessage = fs.existsSync("src/lib/sales/japan-entry-personalized-message.ts")
    ? fs.readFileSync("src/lib/sales/japan-entry-personalized-message.ts", "utf8")
    : ""
  const personalizedMessageStructured = fs.existsSync("src/lib/sales/japan-entry-personalized-message-structured.ts")
    ? fs.readFileSync("src/lib/sales/japan-entry-personalized-message-structured.ts", "utf8")
    : ""
  if (
    operatorApprovalMigration.includes("sales_lead_operator_events")
    && operatorApprovalMigration.includes("ENABLE ROW LEVEL SECURITY")
    && operatorApprovalMigration.includes("GRANT SELECT, INSERT")
    && operatorApprovalMigration.includes("approval_status")
    && operatorApprovalMigration.includes("sales_lead_source_configs_active_approval_check")
    && operatorApprovalMigration.includes("sales_lead_candidate_runs_manual_promotion_only_check")
    && operatorApprovalMigration.includes("awaiting_review")
    && operatorApprovalMigration.includes("review_status")
    && operatorApprovalMigration.includes("sales_lead_candidate_run_items_review_state_check")
    && operatorApprovalMigration.includes("sales_claim_lead_source_records")
    && operatorApprovalMigration.includes("FOR UPDATE OF source_record SKIP LOCKED")
    && operatorApprovalMigration.includes("GRANT EXECUTE ON FUNCTION public.sales_claim_lead_source_records")
    && noLoginDeploy.includes("20260715093000_lead_factory_operator_approval.sql")
    && noLoginDeploy.includes("applyLeadFactoryOperatorApprovalMigration")
    && factoryRoute.includes("promote: false")
    && factoryRoute.includes("syncTwenty: false")
    && factoryRoute.includes("START VERIFIED BATCH")
    && !verificationService.includes("promoteFormQualifiedCandidate")
    && verificationService.includes('eligibleByScore ? "awaiting_review"')
    && reviewService.includes("prepareFormQualifiedCandidatesBatch")
    && reviewService.includes("syncListLeadsToTwentyBatch")
    && reviewService.includes("MAX_REVIEW_ITEMS = 60")
    && candidateRunner.includes("MAX_CONCURRENT_FALLBACK_RUNS = 2")
    && candidateRunner.includes("pendingFallbackRuns")
    && reviewRoute.includes("approve_pilot")
    && sourcePreviewRoute.includes("previewLeadSourceConfig")
    && leadSourceSelectionService.includes('"sales_claim_lead_source_records"')
    && !deepSeekGateway.includes("process.env.LITELLM_API_KEY")
    && !deepSeekGateway.includes("process.env.OPENROUTER_API_KEY")
    && personalizedMessageStructured.includes('modelPolicy: "strict"')
    && personalizedMessageStructured.includes('const MODEL = "deepseek-v4-pro"')
  ) {
    pass("lead factory enforces source preview, pilot review, manual Twenty promotion, operator audit and direct DeepSeek V4 Pro generation")
  } else {
    fail("lead factory must remain fail-closed until explicit operator review and Twenty approval")
  }

  const aiLeadReview = fs.existsSync("src/lib/sales/lead-candidate-ai-smb-review.ts")
    ? fs.readFileSync("src/lib/sales/lead-candidate-ai-smb-review.ts", "utf8")
    : ""
  const productFitRetryMigrationPath = "supabase/migrations/20260716000000_lead_source_balance_retry.sql"
  const productFitRetryMigration = fs.existsSync(productFitRetryMigrationPath)
    ? fs.readFileSync(productFitRetryMigrationPath, "utf8")
    : ""
  const productEvidenceRetryCall = "await applyLeadSourceProductEvidenceRetryMigration(envs)"
  const preDeployProductEvidenceRetryIndex = noLoginDeploy.indexOf(productEvidenceRetryCall)
  const postDeployProductEvidenceRetryIndex = noLoginDeploy.lastIndexOf(productEvidenceRetryCall)
  const deployCompletionIndex = noLoginDeploy.indexOf("await waitDeploy(uuid)")
  const integrationRefreshIndex = noLoginDeploy.lastIndexOf("await refreshIntegrationStatus(envs)")
  if (
    aiLeadReview.includes('"offer_fit"')
    && aiLeadReview.includes("japan_entry_offer_fit_missing")
    && aiLeadReview.includes("deepseek_v4_pro_product_fit")
    && aiLeadReview.includes('["smb_evidence_missing", "japan_entry_offer_fit_missing"]')
    && aiLeadReview.includes("offerFit: gate.offerFit.passed ? gate.offerFit")
    && aiLeadReview.includes("MIN_SMB_CONFIDENCE = 0.96")
    && aiLeadReview.includes("MIN_OFFICIAL_PRODUCT_CONFIDENCE = 0.90")
    && productFitRetryMigration.includes("source_config.trust_tier >= 3")
    && productFitRetryMigration.includes("source_record.is_sme = true")
    && productFitRetryMigration.includes("ARRAY['japan_entry_offer_fit_missing']::text[]")
    && productFitRetryMigration.includes("ARRAY['ai_evidence_review_failed']::text[]")
    && productFitRetryMigration.includes("jsonb_array_length(prior_item.quality_gate->'aiReview'->'evidenceQuotes') >= 2")
    && productFitRetryMigration.includes("jsonb_array_length(prior_item.quality_gate->'aiReview'->'riskFlags') = 0")
    && productFitRetryMigration.includes("prior_item.quality_gate->'aiReview'->>'error' LIKE '%Insufficient Balance%'")
    && productFitRetryMigration.includes("prior_item.quality_gate->'aiReview'->'riskFlags' = '[\"review_failed\"]'::jsonb")
    && productFitRetryMigration.includes("prior_item.quality_gate->'aiReview'->'evidenceQuotes' = '[]'::jsonb")
    && noLoginDeploy.includes("20260716000000_lead_source_balance_retry.sql")
    && noLoginDeploy.includes("applyLeadSourceProductEvidenceRetryMigration")
    && preDeployProductEvidenceRetryIndex
      > noLoginDeploy.indexOf("await applySalesOptionalColumnRepairMigration(envs)")
    && postDeployProductEvidenceRetryIndex > deployCompletionIndex
    && postDeployProductEvidenceRetryIndex > integrationRefreshIndex
    && preDeployProductEvidenceRetryIndex !== postDeployProductEvidenceRetryIndex
    && !noLoginDeploy.includes("SKIP_DB_UPSERT")
  ) {
    pass("official SMB product-fit retries require grounded composite evidence and are release-wired before and after deploy")
  } else {
    fail("official SMB product-fit retries must stay Tier 3, SME-only, grounded, risk-free, and release-wired before and after deploy")
  }

  const listLeadSyncMigrationPath = "supabase/migrations/20260715193000_sales_sync_logs_list_lead.sql"
  const listLeadSyncMigration = fs.existsSync(listLeadSyncMigrationPath)
    ? fs.readFileSync(listLeadSyncMigrationPath, "utf8")
    : ""
  const legacyExternalSyncMigrationPath = "supabase/migration_035_sales_external_studio_sync.sql"
  const legacyExternalSyncMigration = fs.existsSync(legacyExternalSyncMigrationPath)
    ? fs.readFileSync(legacyExternalSyncMigrationPath, "utf8")
    : ""
  if (
    listLeadSyncMigration.includes("sales_sync_logs_action_check")
    && listLeadSyncMigration.includes("'list_lead_sync'")
    && listLeadSyncMigration.includes("'portal_candidate_twenty_sync'")
    && listLeadSyncMigration.includes("'demo_candidate_sync'")
    && legacyExternalSyncMigration.includes("if not exists (")
    && legacyExternalSyncMigration.includes("'portal_candidate_twenty_sync'")
    && legacyExternalSyncMigration.includes("'demo_candidate_sync'")
    && noLoginDeploy.includes('"ON_ERROR_STOP=1"')
    && noLoginDeploy.includes("const sqlWithSchemaReload")
    && noLoginDeploy.includes("NOTIFY pgrst, 'reload schema'")
    && noLoginDeploy.includes("input: sqlWithSchemaReload")
    && !noLoginDeploy.includes("/already exists|duplicate/i.test")
    && noLoginDeploy.includes("20260715193000_sales_sync_logs_list_lead.sql")
    && noLoginDeploy.includes("applySalesSyncLogsListLeadMigration")
  ) {
    pass("sales sync-log constraints are monotonic and DB SSH migrations fail closed")
  } else {
    fail("sales sync-log constraints must retain every current action and DB SSH migrations must fail closed")
  }

  const salesProductsBootstrapPath = "supabase/migrations/migration_052_sales_products_bootstrap.sql"
  const salesProductsBootstrap = fs.existsSync(salesProductsBootstrapPath)
    ? fs.readFileSync(salesProductsBootstrapPath, "utf8")
    : ""
  if (
    salesProductsBootstrap.includes("uniq_sales_products_code")
    && salesProductsBootstrap.includes("ON public.sales_products (code)")
    && salesProductsBootstrap.includes("ranked_recommendations")
    && salesProductsBootstrap.includes("PARTITION BY company_id, product_id")
    && salesProductsBootstrap.includes("twenty_opportunity_id IS NOT NULL")
    && salesProductsBootstrap.includes("uniq_sales_company_product_recommendation")
  ) {
    pass("product recommendation bootstrap repairs duplicates before enforcing uniqueness")
  } else {
    fail("product recommendation bootstrap must deterministically repair duplicates before its unique index")
  }

  const dxAiTemplateVariantPath = "supabase/migration_043_sales_dx_ai_template_variant.sql"
  const dxAiTemplateVariant = fs.existsSync(dxAiTemplateVariantPath)
    ? fs.readFileSync(dxAiTemplateVariantPath, "utf8")
    : ""
  if (
    dxAiTemplateVariant.includes("ALTER TABLE public.sales_templates")
    && dxAiTemplateVariant.includes("ADD COLUMN IF NOT EXISTS template_variant")
    && dxAiTemplateVariant.includes("sales_templates_template_variant_check")
    && dxAiTemplateVariant.includes("'dx_ai_package'")
  ) {
    pass("DX/AI template migration repairs the legacy template variant column before constraining it")
  } else {
    fail("DX/AI template migration must repair the legacy template variant column before adding its constraint")
  }

  const formQualifiedLeadFactoryPath = "supabase/migrations/20260714143000_form_qualified_lead_factory.sql"
  const formQualifiedLeadFactory = fs.existsSync(formQualifiedLeadFactoryPath)
    ? fs.readFileSync(formQualifiedLeadFactoryPath, "utf8")
    : ""
  if (
    formQualifiedLeadFactory.includes("IF NOT EXISTS (")
    && formQualifiedLeadFactory.includes("sales_lead_candidate_run_items_status_check")
    && formQualifiedLeadFactory.includes("'awaiting_review'")
    && formQualifiedLeadFactory.includes("'review_required'")
    && formQualifiedLeadFactory.includes("'rejected'")
  ) {
    pass("form-qualified lead migration preserves current quality and operator-review states")
  } else {
    fail("form-qualified lead migration must not regress current quality and operator-review states")
  }

  const highQualityLeadSourcesPath = "supabase/migrations/20260715082148_high_quality_lead_sources.sql"
  const highQualityLeadSources = fs.existsSync(highQualityLeadSourcesPath)
    ? fs.readFileSync(highQualityLeadSourcesPath, "utf8")
    : ""
  if (
    highQualityLeadSources.includes("IF NOT EXISTS (")
    && highQualityLeadSources.includes("sales_lead_candidate_run_items_status_check")
    && highQualityLeadSources.includes("'awaiting_review'")
    && highQualityLeadSources.includes("'review_required'")
    && highQualityLeadSources.includes("'rejected'")
  ) {
    pass("high-quality source migration preserves the operator-review state contract")
  } else {
    fail("high-quality source migration must not regress the operator-review state contract")
  }

  const japanEntryProjectionsPath = "supabase/migrations/20260712221723_sales_japan_entry_projections.sql"
  const japanEntryProjections = fs.existsSync(japanEntryProjectionsPath)
    ? fs.readFileSync(japanEntryProjectionsPath, "utf8")
    : ""
  if (
    japanEntryProjections.includes("CREATE TABLE IF NOT EXISTS public.sales_japan_entry_projections")
    && japanEntryProjections.includes("CREATE INDEX IF NOT EXISTS sales_japan_entry_projections_company_created_idx")
    && japanEntryProjections.includes("ENABLE ROW LEVEL SECURITY")
  ) {
    pass("Japan Entry projections migration is safely replayable")
  } else {
    fail("Japan Entry projections migration must be safely replayable with RLS intact")
  }

  const demoQualityGatePath = "supabase/migrations/20260712233619_demo_quality_gate.sql"
  const demoQualityGate = fs.existsSync(demoQualityGatePath)
    ? fs.readFileSync(demoQualityGatePath, "utf8")
    : ""
  if (
    demoQualityGate.includes("if not exists (")
    && demoQualityGate.includes("theme_demo_pages_publication_status_check")
    && demoQualityGate.includes("'private_review'")
    && demoQualityGate.includes("theme_demo_pages_quality_publish_check")
  ) {
    pass("demo quality migration preserves private-review publication states")
  } else {
    fail("demo quality migration must not regress private-review publication states")
  }

  const postOutreachToolsPath = "supabase/migration_034_sales_post_outreach_tools.sql"
  const triggerDevToolSlugPath = "supabase/migration_040_sales_trigger_dev_tool_slug.sql"
  const postOutreachTools = fs.existsSync(postOutreachToolsPath)
    ? fs.readFileSync(postOutreachToolsPath, "utf8")
    : ""
  const triggerDevToolSlug = fs.existsSync(triggerDevToolSlugPath)
    ? fs.readFileSync(triggerDevToolSlugPath, "utf8")
    : ""
  if (
    postOutreachTools.includes("if not exists (")
    && postOutreachTools.includes("'openclaw'")
    && triggerDevToolSlug.includes("if not exists (")
    && triggerDevToolSlug.includes("'openclaw'")
    && postOutreachTools.includes("sales_tool_connections_slug_check")
    && triggerDevToolSlug.includes("sales_tool_connections_slug_check")
  ) {
    pass("historical tool migrations preserve the current OpenClaw slug contract")
  } else {
    fail("historical tool migrations must not remove the current OpenClaw slug contract")
  }

  const listLeadBatchMigrationPath = "supabase/migrations/20260715234500_sales_list_lead_batch_sync.sql"
  const listLeadBatchMigration = fs.existsSync(listLeadBatchMigrationPath)
    ? fs.readFileSync(listLeadBatchMigrationPath, "utf8")
    : ""
  const listLeadBatchSync = fs.existsSync("src/lib/sales/twenty-sync-list-lead-batch.ts")
    ? fs.readFileSync("src/lib/sales/twenty-sync-list-lead-batch.ts", "utf8")
    : ""
  if (
    listLeadBatchMigration.includes("sales_reconcile_list_lead_twenty_batch")
    && listLeadBatchMigration.includes("sales_finalize_lead_candidate_promotions")
    && listLeadBatchMigration.includes("jsonb_array_length(p_rows) not between 1 and 60")
    && listLeadBatchMigration.includes("revoke all on function")
    && listLeadBatchSync.includes('"/rest/batch/companies?upsert=true&depth=0"')
    && listLeadBatchSync.includes("listLeadTwentyReadbackIssues")
    && noLoginDeploy.includes("20260715234500_sales_list_lead_batch_sync.sql")
    && noLoginDeploy.includes("applySalesListLeadBatchSyncMigration")
  ) {
    pass("list-only Twenty sync uses bounded batch upsert, direct read-back and DB finalization")
  } else {
    fail("list-only Twenty batch sync must stay bounded, read-back verified and release-wired")
  }

  const leadSourcePreflightMigrationPath = "supabase/migrations/20260715113000_lead_source_website_preflight.sql"
  const leadSourcePreflightMigration = fs.existsSync(leadSourcePreflightMigrationPath)
    ? fs.readFileSync(leadSourcePreflightMigrationPath, "utf8")
    : ""
  const leadSourcePreflightService = fs.existsSync("src/lib/sales/lead-source-preflight.ts")
    ? fs.readFileSync("src/lib/sales/lead-source-preflight.ts", "utf8")
    : ""
  const leadSourcePreflightRoute = fs.existsSync("src/app/api/sales/lead-sources/[sourceId]/preflight/route.ts")
    ? fs.readFileSync("src/app/api/sales/lead-sources/[sourceId]/preflight/route.ts", "utf8")
    : ""
  const leadSourcePartialPilotMigrationPath = "supabase/migrations/20260715151000_lead_source_partial_pilot_claim.sql"
  const leadSourcePartialPilotMigration = fs.existsSync(leadSourcePartialPilotMigrationPath)
    ? fs.readFileSync(leadSourcePartialPilotMigrationPath, "utf8")
    : ""
  if (
    leadSourcePreflightMigration.includes("sales_claim_lead_source_preflight_records")
    && leadSourcePreflightMigration.includes("sales_complete_lead_source_preflight")
    && leadSourcePreflightMigration.includes("preflight_status = 'eligible'")
    && leadSourcePreflightMigration.includes("preflight_checked_at >= now() - interval '7 days'")
    && leadSourcePreflightMigration.includes("FOR UPDATE OF source_record SKIP LOCKED")
    && leadSourcePreflightMigration.includes("TO service_role")
    && noLoginDeploy.includes("20260715113000_lead_source_website_preflight.sql")
    && noLoginDeploy.includes("applyLeadSourceWebsitePreflightMigration")
    && noLoginDeploy.includes("20260715151000_lead_source_partial_pilot_claim.sql")
    && noLoginDeploy.includes("applyLeadSourcePartialPilotClaimMigration")
    && leadSourcePartialPilotMigration.includes("sales_claim_lead_source_pilot_records")
    && leadSourcePartialPilotMigration.includes("preflight_status = 'eligible'")
    && leadSourcePartialPilotMigration.includes("preflight_checked_at >= now() - interval '7 days'")
    && !leadSourcePartialPilotMigration.includes("last_preflight->>'completed'")
    && leadSourceSelectionService.includes("allowPartialSource")
    && leadSourceSelectionService.includes("sales_claim_lead_source_pilot_records")
    && leadSourcePreflightService.includes("PREFLIGHT_CHUNK_SIZE = 50")
    && leadSourcePreflightService.includes("PREFLIGHT_CONCURRENCY = 10")
    && leadSourcePreflightService.includes("dns_private_or_reserved")
    && leadSourcePreflightRoute.includes("recordLeadOperatorEvent")
    && leadSourcePreflightRoute.includes("notifyBothChannels")
  ) {
    pass("lead source website preflight is bounded, auditable, release-wired and fail-closed")
  } else {
    fail("lead source website preflight requires bounded execution, audit, fresh eligibility and release wiring")
  }

  const leadSourcePacksMigrationPath = "supabase/migrations/20260715140000_lead_source_country_packs.sql"
  const leadSourcePacksMigration = fs.existsSync(leadSourcePacksMigrationPath)
    ? fs.readFileSync(leadSourcePacksMigrationPath, "utf8")
    : ""
  const leadSourcePacksService = fs.existsSync("src/lib/sales/lead-source-packs.ts")
    ? fs.readFileSync("src/lib/sales/lead-source-packs.ts", "utf8")
    : ""
  const leadSourcePacksRoute = fs.existsSync("src/app/api/sales/lead-source-packs/route.ts")
    ? fs.readFileSync("src/app/api/sales/lead-source-packs/route.ts", "utf8")
    : ""
  const leadInventoryRunner = fs.existsSync("src/lib/sales/lead-inventory-runs.ts")
    ? fs.readFileSync("src/lib/sales/lead-inventory-runs.ts", "utf8")
    : ""
  const leadSourceZipAdapter = fs.existsSync("src/lib/sales/lead-source-zip-csv.ts")
    ? fs.readFileSync("src/lib/sales/lead-source-zip-csv.ts", "utf8")
    : ""
  const startupSgAdapter = fs.existsSync("src/lib/sales/lead-source-startupsg.ts")
    ? fs.readFileSync("src/lib/sales/lead-source-startupsg.ts", "utf8")
    : ""
  if (
    leadSourcePacksMigration.includes("source_pack_query_sha256")
    && leadSourcePacksMigration.includes("idx_sales_lead_source_configs_pack_version")
    && leadSourcePacksMigration.includes("sales_lead_inventory_runs_no_delivery_check")
    && leadSourcePacksMigration.includes("source_format IN ('json', 'jsonl', 'csv', 'html', 'zip_csv')")
    && noLoginDeploy.includes("20260715140000_lead_source_country_packs.sql")
    && noLoginDeploy.includes("applyLeadSourceCountryPacksMigration")
    && leadSourcePacksService.includes("PACK_LIMIT = 250")
    && leadSourcePacksService.includes("European Commission CORDIS")
    && leadSourcePacksService.includes("Startup SG / Enterprise Singapore")
    && leadSourcePacksService.includes("FILTER NOT EXISTS { ?company wdt:P576 ?dissolved }")
    && leadSourceZipAdapter.includes("MAX_ENTRY_ROWS = 500_000")
    && startupSgAdapter.includes('STARTUP_SG_HOST = "www.startupsg.gov.sg"')
    && startupSgAdapter.includes("MAX_RESPONSE_BYTES")
    && startupSgAdapter.includes("employeeCount > employeeMax")
    && !startupSgAdapter.includes("emailAddresses:")
    && !startupSgAdapter.includes("contactNumber:")
    && leadInventoryRunner.includes("Twenty同期・文面生成・レポート生成・外部送信は0件")
    && leadSourcePacksRoute.includes("terms_checked: false")
    && leadSourcePacksRoute.includes("approval_status: \"draft\"")
    && leadSourcePacksRoute.includes("collectionStarted: false")
  ) {
    pass("country source packs and resumable verified inventory are bounded, attributed and no-delivery")
  } else {
    fail("country source packs require provenance, bounded ZIP ingestion, no-delivery inventory and draft-only registration")
  }

  const portalTwentyOptionsMigrationPath = "supabase/migrations/20260715150000_portal_twenty_source_options.sql"
  const portalTwentyOptionsMigration = fs.existsSync(portalTwentyOptionsMigrationPath)
    ? fs.readFileSync(portalTwentyOptionsMigrationPath, "utf8")
    : ""
  const twentySelectOptionsScriptPath = "scripts/twenty-sales-select-options.sql"
  const twentySelectOptionsScript = fs.existsSync(twentySelectOptionsScriptPath)
    ? fs.readFileSync(twentySelectOptionsScriptPath, "utf8")
    : ""
  const twentyMetadataDbApplyPath = "src/lib/sales/twenty-crm-metadata-db-apply.ts"
  const twentyMetadataDbApply = fs.existsSync(twentyMetadataDbApplyPath)
    ? fs.readFileSync(twentyMetadataDbApplyPath, "utf8")
    : ""
  if (
    portalTwentyOptionsMigration.includes("('source', 'houzz'")
    && portalTwentyOptionsMigration.includes("('source', 'ekiten'")
    && portalTwentyOptionsMigration.includes("('source', 'jmty'")
    && noLoginDeploy.includes("20260715150000_portal_twenty_source_options.sql")
    && noLoginDeploy.includes("applyPortalTwentySourceOptionsMigration")
    && twentySelectOptionsScript.includes("('paradigmSourceName', 'エキテン', 'ekiten'")
    && noLoginDeploy.includes("applyTwentySelectOptionsScript")
    && twentyMetadataDbApply.includes("operand in ('IS', 'CONTAINS')")
    && twentyMetadataDbApply.includes("values (gen_random_uuid(), $1, 'CONTAINS'")
    && !twentyMetadataDbApply.includes("values (gen_random_uuid(), $1, 'IS'")
  ) {
    pass("portal Twenty source options, type-compatible text filters and CRM field metadata are present and release-wired")
  } else {
    fail("portal Twenty source options require Houzz, Ekiten, Jmty values, type-compatible text filters, CRM field metadata and release wiring")
  }

  const manualWorkMigrationPath = "supabase/migrations/20260715031327_manual_japan_entry_work.sql"
  const manualWorkMigration = fs.existsSync(manualWorkMigrationPath)
    ? fs.readFileSync(manualWorkMigrationPath, "utf8")
    : ""
  const manualExperimentMigrationPath = "supabase/migrations/20260716090000_manual_form_copy_experiment.sql"
  const manualExperimentMigration = fs.existsSync(manualExperimentMigrationPath)
    ? fs.readFileSync(manualExperimentMigrationPath, "utf8")
    : ""
  const manualAnglesMigrationPath = "supabase/migrations/20260716180000_manual_form_copy_angles.sql"
  const manualAnglesMigration = fs.existsSync(manualAnglesMigrationPath)
    ? fs.readFileSync(manualAnglesMigrationPath, "utf8")
    : ""
  const manualSourceLedgerMigrationPath = "supabase/migrations/20260716181500_manual_japan_entry_source_ledger.sql"
  const manualSourceLedgerMigration = fs.existsSync(manualSourceLedgerMigrationPath)
    ? fs.readFileSync(manualSourceLedgerMigrationPath, "utf8")
    : ""
  const manualReportV2MigrationPath = "supabase/migrations/20260719032800_manual_japan_entry_report_v2.sql"
  const manualReportV2Migration = fs.existsSync(manualReportV2MigrationPath)
    ? fs.readFileSync(manualReportV2MigrationPath, "utf8")
    : ""
  const manualFormDiagnosticsMigrationPath = "supabase/migrations/20260719211533_manual_work_verified_form_and_copy_diagnostics.sql"
  const manualFormDiagnosticsMigration = fs.existsSync(manualFormDiagnosticsMigrationPath)
    ? fs.readFileSync(manualFormDiagnosticsMigrationPath, "utf8")
    : ""
  const manualBatchMigrationPath = "supabase/migrations/20260720233215_manual_work_durable_batches.sql"
  const manualBatchMigration = fs.existsSync(manualBatchMigrationPath)
    ? fs.readFileSync(manualBatchMigrationPath, "utf8")
    : ""
  const manualBatchRealtimeMigrationPath = "supabase/migrations/20260721123500_manual_work_batch_realtime.sql"
  const manualBatchRealtimeMigration = fs.existsSync(manualBatchRealtimeMigrationPath)
    ? fs.readFileSync(manualBatchRealtimeMigrationPath, "utf8")
    : ""
  const manualBatchQueueMigrationPath = "supabase/migrations/20260721164000_manual_work_multi_batch_queue.sql"
  const manualBatchQueueMigration = fs.existsSync(manualBatchQueueMigrationPath)
    ? fs.readFileSync(manualBatchQueueMigrationPath, "utf8")
    : ""
  const manualOwnershipMigrationPath = "supabase/migrations/20260721193000_manual_work_report_ownership_and_scale.sql"
  const manualOwnershipMigration = fs.existsSync(manualOwnershipMigrationPath)
    ? fs.readFileSync(manualOwnershipMigrationPath, "utf8")
    : ""
  const manualTerminalFailuresMigrationPath = "supabase/migrations/20260722044000_manual_work_terminal_source_failures.sql"
  const manualTerminalFailuresMigration = fs.existsSync(manualTerminalFailuresMigrationPath)
    ? fs.readFileSync(manualTerminalFailuresMigrationPath, "utf8")
    : ""
  const manualDurableRetryMigrationPath = "supabase/migrations/20260722123000_manual_work_durable_retry_queue.sql"
  const manualDurableRetryMigration = fs.existsSync(manualDurableRetryMigrationPath)
    ? fs.readFileSync(manualDurableRetryMigrationPath, "utf8")
    : ""
  const dbVerifier = fs.existsSync("scripts/verify-db-tables.mjs")
    ? fs.readFileSync("scripts/verify-db-tables.mjs", "utf8")
    : ""
  const manualWorkService = fs.existsSync("src/lib/sales/manual-japan-entry-service.ts")
    ? fs.readFileSync("src/lib/sales/manual-japan-entry-service.ts", "utf8")
    : ""
  const manualWorkProfile = fs.existsSync("src/lib/sales/manual-japan-entry-profile.ts")
    ? fs.readFileSync("src/lib/sales/manual-japan-entry-profile.ts", "utf8")
    : ""
  const manualWorkFitPolicy = fs.existsSync("src/lib/sales/manual-japan-entry-fit-policy.ts")
    ? fs.readFileSync("src/lib/sales/manual-japan-entry-fit-policy.ts", "utf8")
    : ""
  const manualWorkAutoRecovery = fs.existsSync("src/lib/sales/manual-work-auto-recovery.ts")
    ? fs.readFileSync("src/lib/sales/manual-work-auto-recovery.ts", "utf8")
    : ""
  const manualWorkRecoveryPolicy = fs.existsSync("src/lib/sales/manual-work-recovery-policy.ts")
    ? fs.readFileSync("src/lib/sales/manual-work-recovery-policy.ts", "utf8")
    : ""
  const manualWorkTwenty = fs.existsSync("src/lib/sales/manual-japan-entry-twenty.ts")
    ? fs.readFileSync("src/lib/sales/manual-japan-entry-twenty.ts", "utf8")
    : ""
  const manualWorkCopySmoke = fs.existsSync("scripts/smoke-japan-entry-form-copy.mts")
    ? fs.readFileSync("scripts/smoke-japan-entry-form-copy.mts", "utf8")
    : ""
  const manualWorkHistoryItem = fs.existsSync("src/components/work/ManualWorkHistoryItem.tsx")
    ? fs.readFileSync("src/components/work/ManualWorkHistoryItem.tsx", "utf8")
    : ""
  const manualMessageIntelligence = fs.existsSync("src/components/work/ManualMessageIntelligence.tsx")
    ? fs.readFileSync("src/components/work/ManualMessageIntelligence.tsx", "utf8")
    : ""
  const manualWorkOperatorNotice = fs.existsSync("src/lib/sales/manual-work-operator-notice.ts")
    ? fs.readFileSync("src/lib/sales/manual-work-operator-notice.ts", "utf8")
    : ""
  const manualWorkConsole = fs.existsSync("src/components/work/ManualJapanEntryWorkConsole.tsx")
    ? fs.readFileSync("src/components/work/ManualJapanEntryWorkConsole.tsx", "utf8")
    : ""
  const contactFormInspection = fs.existsSync("src/lib/sales/sources/contact-form-inspection.ts")
    ? fs.readFileSync("src/lib/sales/sources/contact-form-inspection.ts", "utf8")
    : ""
  const manualWorkPage = fs.existsSync("src/app/work/page.tsx")
    ? fs.readFileSync("src/app/work/page.tsx", "utf8")
    : ""
  const manualWorkDeepSeekGateway = fs.existsSync("src/lib/deepseek.ts")
    ? fs.readFileSync("src/lib/deepseek.ts", "utf8")
    : ""
  const manualWorkHelpers = fs.existsSync("src/lib/sales/manual-japan-entry-workflow-helpers.ts")
    ? fs.readFileSync("src/lib/sales/manual-japan-entry-workflow-helpers.ts", "utf8")
    : ""
  const manualWorkReport = fs.existsSync("src/lib/sales/manual-japan-entry-report.ts")
    ? fs.readFileSync("src/lib/sales/manual-japan-entry-report.ts", "utf8")
    : ""
  const manualWorkReportTypes = fs.existsSync("src/lib/sales/manual-japan-entry-report-types.ts")
    ? fs.readFileSync("src/lib/sales/manual-japan-entry-report-types.ts", "utf8")
    : ""
  const manualWorkReportResolver = fs.existsSync("src/lib/sales/manual-japan-entry-report-resolver.ts")
    ? fs.readFileSync("src/lib/sales/manual-japan-entry-report-resolver.ts", "utf8")
    : ""
  const manualWorkReportPage = fs.existsSync("src/app/[locale]/work-report/[token]/page.tsx")
    ? fs.readFileSync("src/app/[locale]/work-report/[token]/page.tsx", "utf8")
    : ""
  const manualWorkReportRenderer = fs.existsSync("src/components/work-report/ManualJapanEntryReport.tsx")
    ? fs.readFileSync("src/components/work-report/ManualJapanEntryReport.tsx", "utf8")
    : ""
  const manualWorkReportVisuals = fs.existsSync("src/components/work-report/ManualReportVisuals.tsx")
    ? fs.readFileSync("src/components/work-report/ManualReportVisuals.tsx", "utf8")
    : ""
  const manualWorkStrategyChapter = fs.existsSync("src/components/work-report/ManualStrategyChapter.tsx")
    ? fs.readFileSync("src/components/work-report/ManualStrategyChapter.tsx", "utf8")
    : ""
  const manualWorkBatchSchedule = fs.existsSync("src/lib/sales/manual-japan-entry-batch-schedule.ts")
    ? fs.readFileSync("src/lib/sales/manual-japan-entry-batch-schedule.ts", "utf8")
    : ""
  const manualWorkBatchDrain = fs.existsSync("src/lib/sales/manual-japan-entry-batch-drain.ts")
    ? fs.readFileSync("src/lib/sales/manual-japan-entry-batch-drain.ts", "utf8")
    : ""
  const manualWorkBatchPreflight = fs.existsSync("src/lib/sales/manual-japan-entry-batch-preflight.ts")
    ? fs.readFileSync("src/lib/sales/manual-japan-entry-batch-preflight.ts", "utf8")
    : ""
  const manualWorkBatchEvents = fs.existsSync("src/app/api/work/batches/[batchId]/events/route.ts")
    ? fs.readFileSync("src/app/api/work/batches/[batchId]/events/route.ts", "utf8")
    : ""
  const manualWorkBatchRoute = fs.existsSync("src/app/api/work/batches/route.ts")
    ? fs.readFileSync("src/app/api/work/batches/route.ts", "utf8")
    : ""
  const manualWorkBatchStore = fs.existsSync("src/lib/sales/manual-japan-entry-batch-store.ts")
    ? fs.readFileSync("src/lib/sales/manual-japan-entry-batch-store.ts", "utf8")
    : ""
  const instrumentation = fs.existsSync("src/instrumentation.ts")
    ? fs.readFileSync("src/instrumentation.ts", "utf8")
    : ""
  const manualWorkStore = fs.existsSync("src/lib/sales/manual-japan-entry-store.ts")
    ? fs.readFileSync("src/lib/sales/manual-japan-entry-store.ts", "utf8")
    : ""
  const manualMessageReview = fs.existsSync("src/lib/sales/japan-entry-personalized-message-review.ts")
    ? fs.readFileSync("src/lib/sales/japan-entry-personalized-message-review.ts", "utf8")
    : ""
  const conditionalSiteChrome = fs.existsSync("src/components/aesop/ConditionalSiteChrome.tsx")
    ? fs.readFileSync("src/components/aesop/ConditionalSiteChrome.tsx", "utf8")
    : ""
  const standaloneRoutes = fs.existsSync("src/components/aesop/standalone-routes.ts")
    ? fs.readFileSync("src/components/aesop/standalone-routes.ts", "utf8")
    : ""
  const manualMarketLens = fs.existsSync("src/lib/sales/manual-japan-entry-market-lens.ts")
    ? fs.readFileSync("src/lib/sales/manual-japan-entry-market-lens.ts", "utf8")
    : ""
  const externalFormVerification = fs.existsSync("src/lib/sales/sources/external-form-verification.ts")
    ? fs.readFileSync("src/lib/sales/sources/external-form-verification.ts", "utf8")
    : ""
  const formDiscovery = fs.existsSync("src/lib/sales/sources/form-discovery.ts")
    ? fs.readFileSync("src/lib/sales/sources/form-discovery.ts", "utf8")
    : ""
  const manualCopyEnvelope = fs.existsSync("src/lib/sales/manual-japan-entry-copy-envelope.ts")
    ? fs.readFileSync("src/lib/sales/manual-japan-entry-copy-envelope.ts", "utf8")
    : ""
  if (
    manualWorkMigration.includes("CREATE TABLE IF NOT EXISTS public.manual_japan_entry_work")
    && manualWorkMigration.includes("sent boolean NOT NULL DEFAULT false CHECK (sent = false)")
    && manualWorkMigration.includes("ENABLE ROW LEVEL SECURITY")
    && manualWorkMigration.includes("TO service_role")
    && noLoginDeploy.includes("20260715031327_manual_japan_entry_work.sql")
    && noLoginDeploy.includes("applyManualJapanEntryWorkMigration")
    && manualExperimentMigration.includes("message_variant_requested")
    && manualExperimentMigration.includes("manually_sent_at")
    && manualExperimentMigration.includes("founder_forwarded_at")
    && manualExperimentMigration.includes("meeting_converted_at")
    && manualExperimentMigration.includes("Never set by an automated delivery path")
    && noLoginDeploy.includes("20260716090000_manual_form_copy_experiment.sql")
    && noLoginDeploy.includes("applyManualFormCopyExperimentMigration")
    && manualAnglesMigration.includes("message_angle_requested")
    && manualAnglesMigration.includes("outreach_playbook")
    && manualAnglesMigration.includes("Unsupported competitor, opportunity, or mockup requests fall back to problem")
    && noLoginDeploy.includes("20260716180000_manual_form_copy_angles.sql")
    && noLoginDeploy.includes("applyManualFormCopyAnglesMigration")
    && manualSourceLedgerMigration.includes("manual_japan_entry_source_catalog")
    && manualSourceLedgerMigration.includes("manual_japan_entry_work_sources")
    && manualSourceLedgerMigration.includes("qualification_ledger")
    && manualSourceLedgerMigration.includes("master_lead_ledger")
    && manualSourceLedgerMigration.includes("no collector, scheduler, or send path")
    && noLoginDeploy.includes("20260716181500_manual_japan_entry_source_ledger.sql")
    && noLoginDeploy.includes("applyManualJapanEntrySourceLedgerMigration")
    && manualReportV2Migration.includes("manual_japan_entry_v2")
    && manualReportV2Migration.includes("must never downgrade a newer report")
    && manualReportV2Migration.includes("manual_japan_entry_customer_v3")
    && manualReportV2Migration.includes("manual_japan_entry_strategy_v4")
    && manualReportV2Migration.includes("legacyTemplateUsed")
    && manualReportV2Migration.includes("automaticSendAllowed")
    && noLoginDeploy.includes("20260719032800_manual_japan_entry_report_v2.sql")
    && noLoginDeploy.includes("applyManualJapanEntryReportV2Migration")
    && noLoginDeploy.includes("reconcileManualWorkV4Artifacts")
    && noLoginDeploy.includes("/api/work/artifacts/reconcile")
    && noLoginDeploy.includes("result?.currentReports === result?.checked")
    && noLoginDeploy.includes("result?.legacyReports === 0")
    && manualFormDiagnosticsMigration.includes("form_discovery #>> '{inspection,status}' = 'form'")
    && manualFormDiagnosticsMigration.includes("generation_status")
    && manualFormDiagnosticsMigration.includes("generation_error")
    && manualFormDiagnosticsMigration.includes("updated_at < now() - interval '15 minutes'")
    && manualFormDiagnosticsMigration.includes("Interrupted analysis was recovered as retryable")
    && noLoginDeploy.includes("20260719211533_manual_work_verified_form_and_copy_diagnostics.sql")
    && noLoginDeploy.includes("applyManualWorkVerifiedFormAndCopyDiagnosticsMigration")
    && manualBatchMigration.includes("total_count BETWEEN 1 AND 500")
    && manualBatchMigration.includes("FOR UPDATE SKIP LOCKED")
    && manualBatchMigration.includes("sent boolean NOT NULL DEFAULT false CHECK (sent = false)")
    && noLoginDeploy.includes("20260720233215_manual_work_durable_batches.sql")
    && noLoginDeploy.includes("applyManualWorkDurableBatchesMigration")
    && manualBatchRealtimeMigration.includes("manual_japan_entry_batches")
    && manualBatchRealtimeMigration.includes("manual_japan_entry_batch_items")
    && manualBatchRealtimeMigration.includes("supabase_realtime")
    && noLoginDeploy.includes("20260721123500_manual_work_batch_realtime.sql")
    && noLoginDeploy.includes("applyManualWorkBatchRealtimeMigration")
    && manualBatchQueueMigration.includes("uq_manual_japan_entry_single_running_batch")
    && manualBatchQueueMigration.includes("manual_japan_entry_promote_next_batch")
    && manualBatchQueueMigration.includes("manual_japan_entry_claim_batch_drain")
    && manualBatchQueueMigration.includes("manual_japan_entry_release_batch_drain")
    && manualBatchQueueMigration.includes("v_open_batches >= 20")
    && noLoginDeploy.includes("20260721164000_manual_work_multi_batch_queue.sql")
    && noLoginDeploy.includes("applyManualWorkMultiBatchQueueMigration")
    && manualOwnershipMigration.includes("legacy_report_slug")
    && manualOwnershipMigration.includes("queued_count integer NOT NULL DEFAULT 0")
    && manualOwnershipMigration.includes("idx_manual_japan_entry_work_twenty_company_id")
    && noLoginDeploy.includes("20260721193000_manual_work_report_ownership_and_scale.sql")
    && noLoginDeploy.includes("applyManualWorkReportOwnershipAndScaleMigration")
    && manualTerminalFailuresMigration.includes("status = 'rejected'")
    && manualTerminalFailuresMigration.includes("stage = 'complete'")
    && manualTerminalFailuresMigration.includes("sent = false")
    && noLoginDeploy.includes("20260722044000_manual_work_terminal_source_failures.sql")
    && noLoginDeploy.includes("applyManualWorkTerminalSourceFailuresMigration")
    && manualDurableRetryMigration.includes("manual_japan_entry_create_retry_batch")
    && manualDurableRetryMigration.includes("retry_requested")
    && manualDurableRetryMigration.includes("expected_work_id")
    && manualDurableRetryMigration.includes("recorded outreach outcomes cannot be regenerated")
    && noLoginDeploy.includes("20260722123000_manual_work_durable_retry_queue.sql")
    && noLoginDeploy.includes("applyManualWorkDurableRetryQueueMigration")
    && dbVerifier.includes('"manual_japan_entry_work"')
    && dbVerifier.includes('"manual_japan_entry_source_catalog"')
    && dbVerifier.includes('"manual_japan_entry_work_sources"')
    && dbVerifier.includes('"manual_japan_entry_batches"')
    && dbVerifier.includes('"manual_japan_entry_batch_items"')
    && twentySelectOptionsScript.includes("'manual_work'")
    && manualWorkService.includes('purpose: "initial_interest"')
    && !manualWorkService.includes('purpose: "commercial_offer"')
    && manualWorkService.includes('phase: "public evidence collection"')
    && manualWorkService.includes('phase: "company classification"')
    && manualWorkService.includes('phase: "initial message generation"')
    && manualWorkService.includes('phase: "Twenty persistence and read-back"')
    && manualWorkService.includes('twenty_sync_status === "failed"')
    && manualWorkService.includes("generation_status")
    && manualWorkService.includes("generation_error")
    && manualWorkService.includes("ownedCompanyId: work.twenty_company_id")
    && manualWorkService.includes("retryRequested")
    && manualWorkService.includes("expectedWorkId")
    && manualWorkProfile.includes("normalizeManualCompanyProfile")
    && manualWorkProfile.includes("summarizeAnalysisUsage")
    && manualWorkProfile.includes("after one repair")
    && manualWorkProfile.includes("JAPAN_ENTRY_FIT_CONTRACT_VERSION")
    && manualWorkFitPolicy.includes('"opportunity-first-v1"')
    && manualWorkFitPolicy.includes("DIGITAL_DELIVERY_PATTERN")
    && manualWorkFitPolicy.includes("Missing Japanese localization or current Japan presence is a market-entry readiness gap")
    && manualWorkAutoRecovery.includes("maxAttempts > 3")
    && manualWorkRecoveryPolicy.includes('item.status === "failed"')
    && manualWorkRecoveryPolicy.includes('item.twenty_sync_status === "failed"')
    && manualWorkTwenty.includes("ManualTwentySyncError")
    && manualWorkTwenty.includes("Twenty保存確認")
    && manualWorkTwenty.includes("twentyNumberMatches")
    && manualWorkTwenty.includes("twentyLinkMatches")
    && manualWorkCopySmoke.includes('purpose: "initial_interest"')
    && manualWorkCopySmoke.includes("noUrlOrDomain")
    && manualWorkCopySmoke.includes("noCommercialTerms")
    && manualWorkCopySmoke.includes("copyReadySignature")
    && manualWorkCopySmoke.includes("approvedSenderEmailOnce")
    && manualCopyEnvelope.includes('name: "Tomohiro H"')
    && manualCopyEnvelope.includes('company: "Paradigm LLC"')
    && manualCopyEnvelope.includes('email: "contact@paradigmjp.com"')
    && manualWorkHistoryItem.includes("isManualWorkRecoveryAvailable")
    && manualWorkHistoryItem.includes("fastPriority(item)")
    && manualWorkHistoryItem.includes("ChatGPTブリーフを準備")
    && manualWorkHistoryItem.includes("自動送信: なし")
    && manualMessageIntelligence.includes("送信文はまだ作成していません")
    && manualMessageIntelligence.includes("fastQualification")
    && manualMessageIntelligence.includes("文章生成APIは呼び出していません")
    && manualMessageIntelligence.includes("ChatGPT Pro手動バッチから取込・機械検証済み")
    && !manualMessageIntelligence.includes("generation_error")
    && manualWorkOperatorNotice.includes("fastQualification(item)")
    && manualWorkOperatorNotice.includes("文章生成モデルも定型文も使っておらず、送信文はまだありません")
    && manualWorkOperatorNotice.includes("解析結果は/workの履歴に保持され、外部送信は行っていません")
    && manualWorkConsole.includes("retryWorkId: item.id")
    && !manualWorkConsole.includes("buildManualWorkRequest")
    && manualWorkBatchRoute.includes("createManualWorkRetryBatch")
    && manualWorkBatchRoute.includes("retryWorkId")
    && manualWorkBatchStore.includes('rpc("manual_japan_entry_create_retry_batch"')
    && manualWorkPage.includes('redirect("/admin/login?redirect=%2Fwork")')
    && manualWorkDeepSeekGateway.includes("DeepSeek APIの残高不足で解析を停止しました")
    && manualWorkHelpers.includes("productContext: input.evidence.productContext")
    && manualWorkHelpers.includes("isVerifiedManualFormResult")
    && manualWorkHelpers.includes('result.inspection?.status === "form"')
    && manualWorkReport.includes("buildJapanEntryPersonalizationFacts")
    && manualWorkReport.includes("MANUAL_JAPAN_ENTRY_REPORT_SCHEMA")
    && !manualWorkReport.includes("matchContentTemplate")
    && !manualWorkReport.includes("DiagnosticReportData")
    && manualWorkReportTypes.includes('"manual_japan_entry_strategy_v4"')
    && manualWorkReportTypes.includes("strategyChapters")
    && manualWorkReportTypes.includes('"customer_japan_entry_opportunity_report"')
    && manualWorkReportTypes.includes("legacyTemplateUsed: false")
    && manualWorkReportTypes.includes("automaticSendAllowed: false")
    && manualWorkReportResolver.includes("resolveManualJapanEntryReportData")
    && manualWorkReportResolver.includes("isManualJapanEntryReportData")
    && manualWorkReportPage.includes("ManualJapanEntryReport")
    && manualWorkReportPage.includes("resolveManualJapanEntryReportData")
    && !manualWorkReportPage.includes("ensureSafeDiagnosticReport")
    && !manualWorkReportPage.includes('components/diagnostic/DiagnosticReport')
    && manualWorkReportRenderer.includes("Japan Entry Strategy Report")
    && manualWorkReportRenderer.includes("Ten decision chapters")
    && manualWorkReportRenderer.includes("Executive perspective")
    && manualWorkReportRenderer.includes("ManualReportVisuals")
    && !manualWorkReportRenderer.includes("Private evidence brief")
    && !manualWorkReportRenderer.includes("Never sent automatically")
    && manualWorkReportVisuals.includes("Readiness scorecard")
    && manualWorkReportVisuals.includes("Evidence architecture")
    && manualWorkReportVisuals.includes("Decision matrix")
    && manualWorkReportVisuals.includes("<figure")
    && manualWorkReportVisuals.includes("<table")
    && manualWorkStrategyChapter.includes("Chapter evidence composition")
    && manualWorkStrategyChapter.includes("traceability map")
    && manualWorkBatchSchedule.includes("after(async ()")
    && manualWorkBatchSchedule.includes("dispatchManualWorkBatchDrain")
    && manualWorkBatchSchedule.includes("DISPATCH_RETRY_DELAYS_MS")
    && manualWorkBatchSchedule.includes("resumeManualWorkBatchQueue")
    && instrumentation.includes("resumeManualWorkBatchQueue")
    && manualWorkBatchDrain.includes("http://127.0.0.1:")
    && manualWorkBatchDrain.includes("x-webhook-secret")
    && manualWorkBatchPreflight.includes("preflightManualWorkBatch")
    && manualWorkBatchPreflight.includes("maxTokens: 4")
    && manualWorkBatchEvents.includes('type: "item"')
    && manualWorkBatchEvents.includes('type: "batch"')
    && manualWorkStore.includes("listManualJapanEntryWorkPage")
    && manualWorkStore.includes("getManualWorkDashboardSummary")
    && manualMessageReview.includes("Repeated or near-duplicate sentences are prohibited")
    && conditionalSiteChrome.includes("isStandaloneRoute")
    && standaloneRoutes.includes("work-report")
    && manualMarketLens.includes('pricingPolicy: "no_automatic_country_adjustment"')
    && manualMarketLens.includes("groundManualCommercialSignals")
    && manualMarketLens.includes("sourcePhrase.length < 3")
    && externalFormVerification.includes('inspection.status === "form"')
    && contactFormInspection.includes("empty_or_soft_404")
    && contactFormInspection.includes("spa_fallback_duplicate")
    && formDiscovery.includes("documentFingerprint")
    && formDiscovery.includes('outcome: outcome ?? (verification === "form" ? "verified_form"')
  ) {
    pass("manual Japan Entry workbench has one-shot recovery, opportunity-first fit, a visual customer-facing V4 strategy report, server-drained durable 500-URL queue, paginated history, login return routing, grounded unique copy, Twenty analysis sync, SPA-safe verified forms, RLS and zero-send release wiring")
  } else {
    fail("manual Japan Entry workbench requires a visual customer-facing V4 strategy report, server-drained durable 500-URL queue, paginated history, login return routing, grounded unique copy, Twenty analysis sync, SPA-safe verified forms, migration, DB verification and Twenty metadata")
  }

  const evidenceFactoryPath = "src/lib/sales/lead-candidate-acquisition.ts"
  const evidenceFactory = fs.existsSync(evidenceFactoryPath)
    ? fs.readFileSync(evidenceFactoryPath, "utf8")
    : ""
  if (
    evidenceFactory.includes("fetchLeadSourceCandidateRecords")
    && evidenceFactory.includes("source_record")
    && !evidenceFactory.includes("fetchBulkDomainCorpus")
    && !evidenceFactory.includes("fetchTrancoTopDomains")
    && !fs.existsSync("src/lib/sales/sources/tranco-top-domains.ts")
    && !fs.existsSync("src/app/api/sales/browser-search/route.ts")
    && !fs.existsSync("src/app/api/sales/lead-candidates/common-crawl/route.ts")
    && !fs.existsSync("src/lib/sales/searxng-source.ts")
  ) {
    pass("lead factory requires evidence-bearing company sources and excludes popularity/search corpora")
  } else {
    fail("lead factory must require evidence-bearing company sources and exclude Tranco/SearXNG/browser search")
  }

  const demoQualityMigrationPath = "supabase/migrations/20260712233619_demo_quality_gate.sql"
  const demoQualityMigration = fs.existsSync(demoQualityMigrationPath)
    ? fs.readFileSync(demoQualityMigrationPath, "utf8")
    : ""
  if (
    demoQualityMigration.includes("quality_score") &&
    demoQualityMigration.includes("theme_demo_pages_quality_publish_check") &&
    demoQualityMigration.toLowerCase().includes("enable row level security") &&
    demoQualityMigration.toLowerCase().includes("to service_role") &&
    noLoginDeploy.includes("20260712233619_demo_quality_gate.sql") &&
    noLoginDeploy.includes("applyDemoQualityGateMigration")
  ) {
    pass("SMB demo quality gate has RLS, publish constraint, and release wiring")
  } else {
    fail("SMB demo quality gate must have RLS, publish constraint, and release wiring")
  }

  const demoPrivateAssetMigrationPath = "supabase/migrations/20260713143000_demo_private_asset_review.sql"
  const demoPrivateAssetMigration = fs.existsSync(demoPrivateAssetMigrationPath)
    ? fs.readFileSync(demoPrivateAssetMigrationPath, "utf8")
    : ""
  if (
    demoPrivateAssetMigration.includes("access_mode") &&
    demoPrivateAssetMigration.includes("preview_token_hash") &&
    demoPrivateAssetMigration.includes("asset_review") &&
    demoPrivateAssetMigration.includes("private_review") &&
    noLoginDeploy.includes("20260713143000_demo_private_asset_review.sql") &&
    noLoginDeploy.includes("applyDemoPrivateAssetReviewMigration")
  ) {
    pass("SMB demo private access and asset review have release migration wiring")
  } else {
    fail("SMB demo private access and asset review require release migration wiring")
  }

  const demoTemporaryUnlistedMigrationPath = "supabase/migrations/20260714164000_demo_temporary_unlisted_access.sql"
  const demoTemporaryUnlistedMigration = fs.existsSync(demoTemporaryUnlistedMigrationPath)
    ? fs.readFileSync(demoTemporaryUnlistedMigrationPath, "utf8")
    : ""
  if (
    demoTemporaryUnlistedMigration.includes("temporary_unlisted") &&
    demoTemporaryUnlistedMigration.includes("preview_expires_at") &&
    demoTemporaryUnlistedMigration.includes("is_published = false") &&
    noLoginDeploy.includes("20260714164000_demo_temporary_unlisted_access.sql") &&
    noLoginDeploy.includes("applyDemoTemporaryUnlistedAccessMigration")
  ) {
    pass("SMB demo clean temporary URLs have an expiry-enforced release migration")
  } else {
    fail("SMB demo clean temporary URLs require an expiry-enforced release migration")
  }

  const demoBatchMigrationPath = "supabase/migrations/20260713160000_demo_sustainable_batch.sql"
  const demoBatchMigration = fs.existsSync(demoBatchMigrationPath)
    ? fs.readFileSync(demoBatchMigrationPath, "utf8")
    : ""
  if (
    demoBatchMigration.includes("demo_generate") &&
    demoBatchMigration.includes("idx_sales_enrichment_jobs_demo_queue") &&
    noLoginDeploy.includes("20260713160000_demo_sustainable_batch.sql") &&
    noLoginDeploy.includes("applyDemoSustainableBatchMigration")
  ) {
    pass("SMB demo reviewed-manifest batch queue has release migration wiring")
  } else {
    fail("SMB demo reviewed-manifest batch queue requires release migration wiring")
  }

  const demoFactoryMigrationPath = "supabase/migrations/20260713220000_demo_clean_urls_and_factory.sql"
  const demoFactoryMigration = fs.existsSync(demoFactoryMigrationPath)
    ? fs.readFileSync(demoFactoryMigrationPath, "utf8")
    : ""
  if (
    demoFactoryMigration.includes("claim_demo_generation_drain") &&
    demoFactoryMigration.includes("generation_key") &&
    demoFactoryMigration.includes("demo_generate") &&
    noLoginDeploy.includes("20260713220000_demo_clean_urls_and_factory.sql") &&
    noLoginDeploy.includes("applyDemoCleanUrlFactoryMigration")
  ) {
    pass("SMB demo clean URLs have an idempotent single-drain factory")
  } else {
    fail("SMB demo clean URLs require idempotent single-drain release wiring")
  }

  const reportFactoryMigrationPath = "supabase/migrations/20260713203000_japan_entry_report_factory.sql"
  const reportFactoryMigration = fs.existsSync(reportFactoryMigrationPath)
    ? fs.readFileSync(reportFactoryMigrationPath, "utf8")
    : ""
  if (
    reportFactoryMigration.includes("japan_entry_report") &&
    reportFactoryMigration.includes("idempotency_key") &&
    reportFactoryMigration.includes("claim_japan_entry_report_drain") &&
    reportFactoryMigration.includes("sales_report_factory_state") &&
    reportFactoryMigration.includes("supabase_realtime") &&
    noLoginDeploy.includes("20260713203000_japan_entry_report_factory.sql") &&
    noLoginDeploy.includes("applyJapanEntryReportFactoryMigration")
  ) {
    pass("Japan Entry report factory has queue, idempotency, single-drain lease, Realtime, and release wiring")
  } else {
    fail("Japan Entry report factory requires queue, idempotency, Realtime, and release wiring")
  }

  const demoTriggerMigrationPath = "supabase/migrations/20260713120000_sales_pipeline_db_trigger_provider.sql"
  const demoTriggerMigration = fs.existsSync(demoTriggerMigrationPath)
    ? fs.readFileSync(demoTriggerMigrationPath, "utf8")
    : ""
  if (
    demoTriggerMigration.includes("sales_pipeline_runs_provider_check") &&
    demoTriggerMigration.includes("db_trigger") &&
    noLoginDeploy.includes("20260713120000_sales_pipeline_db_trigger_provider.sql") &&
    noLoginDeploy.includes("applySalesPipelineDbTriggerProviderMigration")
  ) {
    pass("SMB demo company trigger provider has release migration wiring")
  } else {
    fail("SMB demo company trigger provider must have release migration wiring")
  }

  const demoTriggerGuardMigrationPath = "supabase/migrations/20260713190000_demo_company_trigger_guard.sql"
  const demoTriggerGuardMigration = fs.existsSync(demoTriggerGuardMigrationPath)
    ? fs.readFileSync(demoTriggerGuardMigrationPath, "utf8")
    : ""
  if (
    demoTriggerGuardMigration.includes("skip_enrichment") &&
    demoTriggerGuardMigration.includes("reviewed_demo_manifest") &&
    demoTriggerGuardMigration.includes("event_driven") &&
    noLoginDeploy.includes("20260713190000_demo_company_trigger_guard.sql") &&
    noLoginDeploy.includes("applyDemoCompanyTriggerGuardMigration")
  ) {
    pass("SMB demo-only companies bypass the legacy sales pipeline trigger")
  } else {
    fail("SMB demo-only companies require a release-wired sales pipeline trigger guard")
  }

  const visualProofComponentPath = "src/components/japan-entry/JapanEntryVisualProof.tsx"
  const visualProofComponent = fs.existsSync(visualProofComponentPath)
    ? fs.readFileSync(visualProofComponentPath, "utf8")
    : ""
  const visualProofAssets = [
    "public/japan-entry/package-scope.svg",
    "public/japan-entry/signal-check.svg",
    "public/japan-entry/application-handover.svg",
  ]
  if (
    visualProofAssets.every((asset) => fs.existsSync(asset)) &&
    visualProofComponent.includes("next/image") &&
    visualProofComponent.includes("/tools/japan-entry-score") &&
    visualProofComponent.includes("VISUALS")
  ) {
    pass("public Japan Entry visual proof assets and Signal Check CTA are tracked")
  } else {
    fail("public Japan Entry visual proof assets/component/utility CTA are incomplete")
  }

  const buildWrapper = fs.readFileSync("scripts/build-next.mjs", "utf8")
  if (buildWrapper.includes("PAYLOAD_DISABLE_DATABASE_DURING_BUILD") && buildWrapper.includes("runWithHeartbeat")) {
    pass("Next build wrapper disables build-time DB dependency and emits heartbeat")
  } else {
    fail("Next build wrapper must keep builds DB-independent with heartbeat output")
  }
}

function checkTraefikRouteDrift() {
  if (LOCAL_ONLY || SKIP_REMOTE) return
  section("Traefik route drift")
  const script = `
set -euo pipefail
route_file='/data/coolify/proxy/dynamic/paradigmjp.yml'
if [ ! -f "$route_file" ]; then
  echo "FAIL route-file-missing"
  exit 2
fi
container="$(docker ps --filter "name=${APP_UUID.replace(/"/g, '\\"')}" --format '{{.Names}}' | head -n1)"
if [ -z "$container" ]; then
  echo "FAIL app-container-missing"
  exit 3
fi
ip="$(docker inspect "$container" --format '{{with index .NetworkSettings.Networks "coolify"}}{{.IPAddress}}{{end}}')"
python3 - "$route_file" "$container" "$ip" <<'PY'
import ipaddress
import json
import re
import subprocess
import sys
import urllib.request

import yaml

path, container, expected_ip = sys.argv[1:4]
config = yaml.safe_load(open(path, encoding="utf-8"))
http = config.get("http", {})
routers = http.get("routers", {})
middleware = http.get("middlewares", {}).get("paradigm-cloudflare-only", {})
ranges = middleware.get("ipAllowList", {}).get("sourceRange", [])
with urllib.request.urlopen("https://api.cloudflare.com/client/v4/ips", timeout=15) as response:
    cloudflare = json.load(response)
if cloudflare.get("success") is not True:
    raise RuntimeError("Cloudflare IP source failed")
official = set(cloudflare["result"]["ipv4_cidrs"] + cloudflare["result"]["ipv6_cidrs"])
if set(ranges) != official or len(ranges) != len(official):
    raise RuntimeError("Cloudflare middleware ranges are stale or incomplete")
for value in ranges:
    ipaddress.ip_network(value, strict=True)

servers = http.get("services", {}).get("paradigmhp-svc", {}).get("loadBalancer", {}).get("servers", [])
if len(servers) != 1:
    raise RuntimeError("Paradigm upstream is missing")
route_match = re.fullmatch(r"http://([^/:]+):3000", str(servers[0].get("url", "")))
if not route_match or route_match.group(1) not in {expected_ip, container}:
    raise RuntimeError("Paradigm upstream drift detected")

protected = [
    "paradigmhp-http",
    "paradigmhp-https",
    "keystatic-http",
    "keystatic-https",
]
if ${POST_DEPLOY ? "True" : "False"}:
    protected.extend(["paradigmhp-demo-http", "paradigmhp-demo-https"])
for name, router in routers.items():
    if router.get("service") == "paradigmhp-svc":
        protected.append(name)
for name in set(protected):
    router = routers.get(name)
    if not isinstance(router, dict) or (router.get("middlewares") or [None])[0] != "paradigm-cloudflare-only":
        raise RuntimeError("An app router is missing the Cloudflare middleware")

def rule_hosts(rule):
    hosts = set()
    for call in re.findall(r"Host\\(([^)]*)\\)", str(rule)):
        hosts.update(value.lower() for value in re.findall(r'\\x60([A-Za-z0-9._-]+)\\x60', call))
    return hosts

if rule_hosts(routers["paradigmhp-https"].get("rule")) != {"paradigmjp.com", "www.paradigmjp.com"}:
    raise RuntimeError("Main app host rule is not exact")
if rule_hosts(routers["keystatic-https"].get("rule")) != {"keystatic.paradigmjp.com"}:
    raise RuntimeError("Keystatic host rule is not isolated")
if ${POST_DEPLOY ? "True" : "False"}:
    if rule_hosts(routers["paradigmhp-demo-https"].get("rule")) != {"demo.paradigmjp.com"}:
        raise RuntimeError("Demo host rule is not isolated")
    if any(router.get("service") == "astrodemo-svc" for router in routers.values()):
        raise RuntimeError("Legacy Astro demo route is still active")

labels = json.loads(subprocess.check_output(
    ["docker", "inspect", container, "--format", "{{json .Config.Labels}}"],
    text=True,
)) or {}
docker_hosts = set()
for key, value in labels.items():
    if re.fullmatch(r"traefik\\.http\\.routers\\.[^.]+\\.rule", str(key)):
        docker_hosts.update(rule_hosts(value))
aliases = docker_hosts - {"paradigmjp.com", "www.paradigmjp.com", "keystatic.paradigmjp.com"}
configured_aliases = set()
for name in ("paradigmhp-origin-alias-http", "paradigmhp-origin-alias-https"):
    if name in routers:
        configured_aliases.update(rule_hosts(routers[name].get("rule")))
if not aliases.issubset(configured_aliases):
    raise RuntimeError("A Docker app alias bypasses the Cloudflare middleware")

all_hosts = {"paradigmjp.com", "www.paradigmjp.com", "keystatic.paradigmjp.com"} | docker_hosts
if ${POST_DEPLOY ? "True" : "False"}:
    all_hosts.add("demo.paradigmjp.com")
print("HOSTS_JSON " + json.dumps(sorted(all_hosts)))
print(f"OK origin-lock-current aliases={len(aliases)} ranges={len(ranges)}")
PY
`
  const result = spawnSync("ssh", [...sshArgs(DEPLOY_HOST, { acceptNew: true }), "bash -s"], {
    input: script,
    cwd: process.cwd(),
    env: process.env,
    encoding: "utf8",
    timeout: 30_000,
    maxBuffer: 1024 * 1024,
  })
  const output = `${result.stdout || ""}${result.stderr || ""}`.trim()
  if (output) console.log(output)
  if (result.status !== 0 || result.error) {
    fail(`Traefik paradigmhp-svc route drift detected; run npm run release:prod, which refreshes it automatically`)
    return
  }
  const hostsLine = output.split(/\r?\n/).find((line) => line.startsWith("HOSTS_JSON "))
  if (hostsLine) {
    try {
      const parsed = JSON.parse(hostsLine.slice("HOSTS_JSON ".length))
      if (Array.isArray(parsed) && parsed.length >= 3 && parsed.every((value) => typeof value === "string")) {
        protectedAppHostsSnapshot = [...new Set(parsed)]
      }
    } catch (error) {
      warn(`protected app host snapshot parse failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
  pass("manual Traefik route points at the latest app container")
}

async function resolveOriginAddress() {
  const config = run("ssh", ["-G", DEPLOY_HOST])
  if (config.status !== 0) throw new Error("SSH origin configuration is unavailable")
  const hostname = config.output
    .split(/\r?\n/)
    .map((line) => line.trim().split(/\s+/, 2))
    .find(([name]) => name === "hostname")?.[1]
  if (!hostname) throw new Error("SSH origin hostname is unavailable")
  if (isIP(hostname)) return hostname
  const resolved = await lookup(hostname)
  if (!resolved?.address || !isIP(resolved.address)) throw new Error("SSH origin hostname did not resolve")
  return resolved.address
}

function discoverProtectedAppHosts() {
  if (protectedAppHostsSnapshot) return protectedAppHostsSnapshot
  const script = `
set -euo pipefail
container="$(docker ps --filter "name=${APP_UUID.replace(/"/g, '\\"')}" --format '{{.Names}}' | head -n1)"
if [ -z "$container" ]; then
  exit 2
fi
python3 - "$container" <<'PY'
import json
import re
import subprocess
import sys

container = sys.argv[1]
labels = json.loads(subprocess.check_output(
    ["docker", "inspect", container, "--format", "{{json .Config.Labels}}"],
    text=True,
)) or {}
hosts = {"paradigmjp.com", "www.paradigmjp.com", "keystatic.paradigmjp.com"}
if ${POST_DEPLOY ? "True" : "False"}:
    hosts.add("demo.paradigmjp.com")
for key, value in labels.items():
    if not re.fullmatch(r"traefik\\.http\\.routers\\.[^.]+\\.rule", str(key)):
        continue
    for call in re.findall(r"Host\\(([^)]*)\\)", str(value)):
        hosts.update(item.lower() for item in re.findall(r'\\x60([A-Za-z0-9._-]+)\\x60', call))
print(json.dumps(sorted(hosts)))
PY
`
  const result = spawnSync("ssh", [...sshArgs(DEPLOY_HOST, { acceptNew: true }), "bash -s"], {
    input: script,
    cwd: process.cwd(),
    env: process.env,
    encoding: "utf8",
    timeout: 30_000,
    maxBuffer: 1024 * 1024,
  })
  if (result.status !== 0 || result.error) throw new Error("Unable to enumerate protected app aliases")
  const parsed = JSON.parse(String(result.stdout || "").trim())
  if (!Array.isArray(parsed) || parsed.length < 3 || parsed.some((value) => typeof value !== "string")) {
    throw new Error("Protected app alias inventory is invalid")
  }
  return [...new Set(parsed)]
}

function probeDirectOrigin(originAddress, hostname, scheme, { forgedCloudflareHeader = false } = {}) {
  const port = scheme === "https" ? 443 : 80
  const curlAddress = originAddress.includes(":") ? `[${originAddress}]` : originAddress
  const commandArgs = [
    "--noproxy",
    "*",
    "--silent",
    "--show-error",
    "--insecure",
    "--output",
    "/dev/null",
    "--write-out",
    "%{http_code}",
    "--connect-timeout",
    "5",
    "--max-time",
    "12",
    "--resolve",
    `${hostname}:${port}:${curlAddress}`,
  ]
  if (forgedCloudflareHeader) commandArgs.push("--header", "CF-Connecting-IP: 203.0.113.10")
  commandArgs.push(`${scheme}://${hostname}/api/ready`)
  const result = spawnSync("curl", commandArgs, {
    cwd: process.cwd(),
    env: process.env,
    encoding: "utf8",
    timeout: 15_000,
  })
  if (result.error?.code === "ENOENT") throw new Error("curl is unavailable")
  const statusCode = String(result.stdout || "").trim()
  const redirectsToTls = scheme === "http" && /^3\d\d$/.test(statusCode)
  return {
    blocked: result.status !== 0 || statusCode === "403" || redirectsToTls,
    unavailable: result.status !== 0 || /^[45]\d\d$/.test(statusCode),
  }
}

async function checkOriginAccessGate() {
  if (LOCAL_ONLY || SKIP_REMOTE) return
  section("Cloudflare origin access")
  try {
    const publicResponse = await fetch("https://www.paradigmjp.com/api/ready", {
      redirect: "manual",
      signal: AbortSignal.timeout(15_000),
      headers: { "Cache-Control": "no-cache" },
    })
    if (publicResponse.status !== 200 || !publicResponse.headers.get("cf-ray")) {
      fail("Cloudflare public readiness path must return HTTP 200 through a Cloudflare edge")
      return
    }
    pass("Cloudflare public readiness path returns HTTP 200")

    const originAddress = await resolveOriginAddress()
    const protectedHosts = discoverProtectedAppHosts()
    const directHttp = probeDirectOrigin(originAddress, "paradigmjp.com", "http")
    if (!directHttp.blocked) {
      fail("direct origin HTTP remains reachable")
      return
    }
    pass("direct origin HTTP serves no application content")

    for (let index = 0; index < protectedHosts.length; index += 1) {
      const hostname = protectedHosts[index]
      const directHttps = probeDirectOrigin(originAddress, hostname, "https")
      const forgedHttps = probeDirectOrigin(originAddress, hostname, "https", {
        forgedCloudflareHeader: true,
      })
      if (!directHttps.blocked || !forgedHttps.blocked) {
        fail(`protected app alias ${index + 1} remains reachable at the origin`)
        return
      }
    }
    pass(`direct origin HTTPS and forged Cloudflare headers are blocked for ${protectedHosts.length} app host rules`)

    const unknownHost = probeDirectOrigin(originAddress, "origin-lock.invalid", "https", {
      forgedCloudflareHeader: true,
    })
    if (!unknownHost.unavailable) {
      fail("an unknown Host header reaches a live origin route")
      return
    }
    pass("unknown Host headers do not reach the application")
  } catch (error) {
    fail(`Cloudflare origin gate failed: ${error instanceof Error ? error.message : String(error)}`)
  }
}

function checkRemoteInfraDrift() {
  if (LOCAL_ONLY || SKIP_REMOTE) return
  section("Revenue OS infra drift")
  const script = `
set -euo pipefail
fail=0

wal_level="$(docker exec supabase-db-1 psql -U postgres -d postgres -Atc "select setting from pg_settings where name='wal_level'" 2>/dev/null || true)"
if [ "$wal_level" = "logical" ]; then
  echo "OK supabase wal_level=logical"
else
  echo "FAIL supabase wal_level=\${wal_level:-unknown}"
  fail=1
fi

if docker ps --format '{{.Names}}' | grep -qx 'supabase-realtime'; then
  realtime_status="$(docker inspect supabase-realtime --format '{{.State.Status}} {{if .State.Health}}{{.State.Health.Status}}{{else}}no-health{{end}}' 2>/dev/null || true)"
  case "$realtime_status" in
    running\\ healthy|running\\ no-health) echo "OK supabase-realtime $realtime_status" ;;
    *) echo "FAIL supabase-realtime $realtime_status"; fail=1 ;;
  esac
else
  echo "FAIL supabase-realtime container missing"
  fail=1
fi

if systemctl list-timers --all --no-legend 2>/dev/null | grep -Eq 'paradigm-runtime-guard|paradigm-outreach'; then
  echo "FAIL resident Paradigm runtime/systemd timer detected"
  fail=1
else
  echo "OK no resident Paradigm runtime timer detected"
fi

for forbidden_container in paradigm-outreach-worker services-steel-browser-1${POST_DEPLOY ? " astro-demo paradigm-demos" : ""}; do
  if docker ps --format '{{.Names}}' | grep -qx "$forbidden_container"; then
    echo "FAIL forbidden resident container is running: $forbidden_container"
    fail=1
  else
    echo "OK forbidden resident container stopped: $forbidden_container"
  fi
done

twenty_worker_status="$(docker inspect opt-twenty-worker-1 --format '{{.State.Status}}' 2>/dev/null || true)"
twenty_worker_restarts="$(docker inspect opt-twenty-worker-1 --format '{{.RestartCount}}' 2>/dev/null || echo 9999)"
if [ "$twenty_worker_status" = "running" ] && [ "$twenty_worker_restarts" -le 3 ]; then
  echo "OK twenty-worker running restarts=$twenty_worker_restarts"
else
  echo "FAIL twenty-worker status=\${twenty_worker_status:-missing} restarts=$twenty_worker_restarts"
  fail=1
fi

if docker exec supabase-db-1 psql -U postgres -d postgres -Atc "select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='sales_pipeline_runs' limit 1" | grep -qx 1; then
  echo "OK sales_pipeline_runs published to supabase_realtime"
else
  echo "FAIL sales_pipeline_runs not published to supabase_realtime"
  fail=1
fi

if [ "${POST_DEPLOY ? "1" : "0"}" = "1" ]; then
  contact_db_guard="$(docker exec supabase-db-1 psql -U postgres -d postgres -Atc "
select case when
  to_regclass('public.sales_contact_submissions') is not null
  and to_regprocedure('public.sales_create_contact_submission(text,text,jsonb,jsonb)') is not null
  and to_regprocedure('public.sales_complete_contact_notification(text,uuid,text,text)') is not null
  and has_function_privilege('service_role', to_regprocedure('public.sales_create_contact_submission(text,text,jsonb,jsonb)'), 'EXECUTE')
  and not has_function_privilege('anon', to_regprocedure('public.sales_create_contact_submission(text,text,jsonb,jsonb)'), 'EXECUTE')
  and not has_function_privilege('authenticated', to_regprocedure('public.sales_create_contact_submission(text,text,jsonb,jsonb)'), 'EXECUTE')
  and not has_function_privilege('anon', to_regprocedure('public.sales_atomic_meta_merge(uuid,jsonb)'), 'EXECUTE')
  and not has_function_privilege('anon', to_regprocedure('public.sales_atomic_meta_history_prepend(uuid,text,text,text)'), 'EXECUTE')
  and not has_function_privilege('anon', to_regprocedure('public.sales_atomic_screenshot_append(uuid,text,jsonb)'), 'EXECUTE')
then 1 else 0 end;
" 2>/dev/null || true)"
  if [ "$contact_db_guard" = "1" ]; then
    echo "OK contact ingress table/RPC ACL/CAS guard"
  else
    echo "FAIL contact ingress table/RPC ACL/CAS guard"
    fail=1
  fi

  manual_copy_experiment_guard="$(docker exec supabase-db-1 psql -U postgres -d postgres -Atc "
select case when
  to_regclass('public.manual_japan_entry_work') is not null
  and (
    select count(*) from information_schema.columns
    where table_schema = 'public'
      and table_name = 'manual_japan_entry_work'
      and column_name in (
        'message_variant_requested', 'message_variant', 'message_variant_fallback_reason',
        'manually_sent_at', 'reply_received_at', 'founder_forwarded_at', 'meeting_converted_at',
        'message_angle_requested', 'message_angle', 'message_angle_fallback_reason', 'outreach_playbook',
        'qualification_ledger', 'master_lead_ledger'
      )
  ) = 13
  and to_regclass('public.manual_japan_entry_source_catalog') is not null
  and to_regclass('public.manual_japan_entry_work_sources') is not null
  and to_regclass('public.manual_japan_entry_batches') is not null
  and to_regclass('public.manual_japan_entry_batch_items') is not null
  and (select relrowsecurity from pg_class where oid = 'public.manual_japan_entry_source_catalog'::regclass)
  and (select relrowsecurity from pg_class where oid = 'public.manual_japan_entry_work_sources'::regclass)
  and (select relrowsecurity from pg_class where oid = 'public.manual_japan_entry_batches'::regclass)
  and (select relrowsecurity from pg_class where oid = 'public.manual_japan_entry_batch_items'::regclass)
  and to_regprocedure('public.manual_japan_entry_create_batch(jsonb,text,text,text,text,date)') is not null
  and to_regprocedure('public.manual_japan_entry_claim_batch_items(uuid,integer)') is not null
  and to_regprocedure('public.manual_japan_entry_refresh_batch(uuid)') is not null
  and to_regprocedure('public.manual_japan_entry_promote_next_batch()') is not null
  and to_regprocedure('public.manual_japan_entry_claim_batch_drain(uuid)') is not null
  and to_regprocedure('public.manual_japan_entry_release_batch_drain(uuid,uuid)') is not null
  and exists (
    select 1 from pg_indexes
    where schemaname = 'public'
      and indexname = 'uq_manual_japan_entry_single_running_batch'
      and indexdef like '%WHERE (status = ''running''::text)%'
  )
  and exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='manual_japan_entry_batches')
  and exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='manual_japan_entry_batch_items')
  and has_function_privilege('service_role', to_regprocedure('public.manual_japan_entry_create_batch(jsonb,text,text,text,text,date)'), 'EXECUTE')
  and not has_function_privilege('anon', to_regprocedure('public.manual_japan_entry_create_batch(jsonb,text,text,text,text,date)'), 'EXECUTE')
  and not exists (select 1 from public.manual_japan_entry_batches where sent is distinct from false)
  and (select count(*) from public.manual_japan_entry_source_catalog where active) >= 39
  and exists (
    select 1 from pg_constraint
    where conrelid = 'public.manual_japan_entry_work'::regclass
      and conname = 'manual_japan_entry_work_outcome_requires_manual_send'
  )
  and (select relrowsecurity from pg_class where oid = 'public.manual_japan_entry_work'::regclass)
  and not exists (select 1 from public.manual_japan_entry_work where sent is distinct from false)
  and not exists (
    select 1
    from public.manual_japan_entry_work
    where report_url is not null
      and (
        report_data ->> 'schemaVersion' is null
        or report_data ->> 'schemaVersion' not in ('manual_japan_entry_v2', 'manual_japan_entry_customer_v3', 'manual_japan_entry_strategy_v4')
        or (
          report_data ->> 'schemaVersion' = 'manual_japan_entry_v2'
          and report_data ->> 'reportKind' is distinct from 'manual_japan_entry_evidence_brief'
        )
        or (
          report_data ->> 'schemaVersion' = 'manual_japan_entry_customer_v3'
          and report_data ->> 'reportKind' is distinct from 'customer_japan_entry_opportunity_report'
        )
        or (
          report_data ->> 'schemaVersion' = 'manual_japan_entry_strategy_v4'
          and report_data ->> 'reportKind' is distinct from 'customer_japan_entry_opportunity_report'
        )
        or report_data #>> '{provenance,legacyTemplateUsed}' is distinct from 'false'
        or report_data #>> '{provenance,automaticSendAllowed}' is distinct from 'false'
        or report_data ? 'content_template'
      )
  )
  ${POST_DEPLOY ? `and not exists (
    select 1
    from public.manual_japan_entry_work
    where report_url is not null
      and report_data ->> 'schemaVersion' is distinct from 'manual_japan_entry_strategy_v4'
  )
  and not exists (
    select 1
    from public.manual_japan_entry_work
    where form_url is not null
      and not (
        form_discovery ->> 'verification' = 'form'
        and form_discovery #>> '{inspection,status}' = 'form'
        and case
          when form_discovery ->> 'confidence' ~ '^\\d+(\\.\\d+)?$'
            then (form_discovery ->> 'confidence')::numeric >= 90
          else false
        end
        and jsonb_typeof(form_discovery #> '{inspection,fields}') = 'array'
        and (form_discovery #> '{inspection,fields}') ?& array['email', 'message', 'submit']
      )
  )
  and not exists (
    select 1
    from public.manual_japan_entry_work
    where report_data #>> '{contactRoute,url}' is not null
      and report_data #>> '{contactRoute,url}' is distinct from form_url
  )
  and not exists (
    select 1
    from public.manual_japan_entry_work
    where master_lead_ledger ->> 'contact_form_url' is not null
      and master_lead_ledger ->> 'contact_form_url' is distinct from form_url
  )
  and not exists (
    select 1
    from public.manual_japan_entry_work
    where status in ('needs_review', 'failed')
      and initial_message is null
      and nullif(message_review ->> 'generation_error', '') is null
  )
  and not exists (
    select 1
    from public.manual_japan_entry_work
    where status = 'failed'
      and stage = 'failed'
      and twenty_sync_status = 'skipped'
      and report_url is null
      and initial_message is null
      and sent = false
      and (
        lower(error_message) = 'fetch failed'
        or lower(error_message) like '%timed out%'
        or lower(error_message) like '%aborted due to timeout%'
        or lower(error_message) like 'homepage returned http%'
        or lower(error_message) like '%no public pages were available%'
        or lower(error_message) like '%homepage evidence could not be reused%'
        or lower(error_message) like '%did not provide enough grounded product context%'
      )
  )` : ""}
then 1 else 0 end;
" 2>/dev/null || true)"
  if [ "$manual_copy_experiment_guard" = "1" ]; then
    echo "OK manual copy experiment/report V4/durable batch/outcome constraint/RLS/zero-send guard"
  else
    echo "FAIL manual copy experiment/report V4/durable batch/outcome constraint/RLS/zero-send guard"
    fail=1
  fi

  security_db_guard="$(docker exec supabase-db-1 psql -U postgres -d postgres -Atc "
select case when
  not exists (
    select 1 from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity
  )
  and not exists (
    select 1 from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r'
      and has_table_privilege('anon', c.oid, 'SELECT')
  )
  and exists (
    select 1 from pg_constraint where conrelid = 'public.sales_integration_status'::regclass and contype in ('p','u')
  )
  and exists (
    select 1 from pg_constraint where conrelid = 'public.sales_tool_connections'::regclass and contype in ('p','u')
  )
then 1 else 0 end;
" 2>/dev/null || true)"
  if [ "$security_db_guard" = "1" ]; then
    echo "OK public schema RLS/anon ACL and integration slug constraints"
  else
    echo "FAIL public schema RLS/anon ACL or integration slug constraints"
    fail=1
  fi

  lead_claim_guard="$(docker exec supabase-db-1 psql -U postgres -d postgres -Atc "
select case when
  position('ai_evidence_review_failed' in pg_get_functiondef('public.sales_claim_lead_source_records(text,uuid[],integer)'::regprocedure)) > 0
  and position('evidenceQuotes' in pg_get_functiondef('public.sales_claim_lead_source_records(text,uuid[],integer)'::regprocedure)) > 0
  and position('riskFlags' in pg_get_functiondef('public.sales_claim_lead_source_records(text,uuid[],integer)'::regprocedure)) > 0
  and position('Insufficient Balance' in pg_get_functiondef('public.sales_claim_lead_source_records(text,uuid[],integer)'::regprocedure)) > 0
then 1 else 0 end;
" 2>/dev/null || true)"
  if [ "$lead_claim_guard" = "1" ]; then
    echo "OK official-SMB grounded product-evidence claim contract"
  else
    echo "FAIL official-SMB grounded product-evidence claim contract"
    fail=1
  fi
else
  echo "OK contact ingress guard deferred to post-deploy after migration apply"
fi

exit "$fail"
`
  const result = spawnSync("ssh", [...sshArgs(DEPLOY_HOST, { acceptNew: true }), "bash -s"], {
    input: script,
    cwd: process.cwd(),
    env: process.env,
    encoding: "utf8",
    timeout: 30_000,
    maxBuffer: 1024 * 1024,
  })
  const output = `${result.stdout || ""}${result.stderr || ""}`.trim()
  if (output) console.log(output)
  if (result.status !== 0 || result.error) {
    fail("Revenue OS infra drift detected")
    return
  }
  pass("Revenue OS infra drift checks passed")
}

function checkSyntax() {
  section("Script syntax")
  const targets = [
    "scripts/release-doctor.mjs",
    "scripts/deploy.mjs",
    "scripts/sales-os-no-login-deploy.mjs",
    "scripts/coolify-deploy-guard.mjs",
    "scripts/build-next.mjs",
  ]
  for (const target of targets) {
    runOrFail(`node --check ${target}`, process.execPath, ["--check", target])
  }
}

function checkPreDeployRemote() {
  if (LOCAL_ONLY || SKIP_REMOTE) {
    section("Remote preflight")
    warn("remote preflight skipped")
    return
  }
  section("Remote preflight")
  runOrFail("host disk preflight", process.execPath, ["scripts/host-disk-preflight.mjs"])
  runOrFail("Coolify deploy guard", process.execPath, ["scripts/coolify-deploy-guard.mjs", "--pre-deploy"])
  checkTraefikRouteDrift()
  checkRemoteInfraDrift()
}

function isBadReportBody(text) {
  return /Server Components render|digest property|レポートの読み込みに失敗しました|Application error|"\$RX"\(|"digest":"\d+"|\$RX\("B:/i.test(text)
}

async function fetchCheck(label, url, options = {}) {
  const timeoutMs = options.timeoutMs ?? 20_000
  const requestedAttempts = Number(options.attempts ?? 1)
  const attempts = Number.isFinite(requestedAttempts)
    ? Math.max(1, Math.min(Math.floor(requestedAttempts), 3))
    : 1
  const retryStatuses = new Set(options.retryStatuses ?? [])
  for (let attempt = 1; attempt <= attempts; attempt++) {
    let res
    try {
      res = await fetch(url, {
        redirect: options.redirect ?? "follow",
        signal: AbortSignal.timeout(timeoutMs),
        headers: options.headers,
      })
    } catch (error) {
      if (attempt < attempts) {
        warn(`${label} fetch attempt ${attempt}/${attempts} failed; retrying after the transient edge path settles`)
        await new Promise((resolve) => setTimeout(resolve, 750 * attempt))
        continue
      }
      fail(`${label} fetch failed: ${error instanceof Error ? error.message : String(error)}`)
      return
    }
    const text = await res.text().catch(() => "")
    if (retryStatuses.has(res.status) && attempt < attempts) {
      warn(`${label} returned transient HTTP ${res.status} on attempt ${attempt}/${attempts}; retrying`)
      await new Promise((resolve) => setTimeout(resolve, 750 * attempt))
      continue
    }
    if (res.status < 200 || res.status >= 400) {
      fail(`${label} returned HTTP ${res.status}`)
      return
    }
    if (options.rejectReportError && isBadReportBody(text)) {
      fail(`${label} rendered an application/report error`)
      return
    }
    const expectedMarkers = options.mustContain
      ? Array.isArray(options.mustContain)
        ? options.mustContain
        : [options.mustContain]
      : []
    const missingMarkers = expectedMarkers.filter((marker) => !text.includes(marker))
    if (missingMarkers.length > 0) {
      fail(`${label} did not contain expected marker(s): ${missingMarkers.join(", ")}`)
      return
    }
    const forbiddenMarkers = options.mustNotContain
      ? Array.isArray(options.mustNotContain)
        ? options.mustNotContain
        : [options.mustNotContain]
      : []
    const presentForbiddenMarkers = forbiddenMarkers.filter((marker) => text.includes(marker))
    if (presentForbiddenMarkers.length > 0) {
      fail(`${label} contained forbidden marker(s): ${presentForbiddenMarkers.join(", ")}`)
      return
    }
    pass(`${label} HTTP ${res.status}`)
    return
  }
}

async function fetchUnauthorizedCheck(label, url) {
  try {
    const res = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(12_000),
    })
    await res.text().catch(() => "")
    if (res.status !== 401) {
      fail(`${label} must reject unauthenticated requests (HTTP ${res.status})`)
      return
    }
    pass(`${label} rejects unauthenticated requests`)
  } catch (error) {
    fail(`${label} fetch failed: ${error instanceof Error ? error.message : String(error)}`)
  }
}

async function resolveSalesHealthSecret() {
  const local =
    process.env.TRIGGER_WEBHOOK_SECRET ||
    process.env.SALES_API_SECRET ||
    process.env.INTERNAL_API_SECRET
  if (local) return local

  try {
    const envs = await readCoolifyApplicationEnvs(APP_UUID)
    return envs.TRIGGER_WEBHOOK_SECRET || envs.SALES_API_SECRET || envs.INTERNAL_API_SECRET || null
  } catch (error) {
    warn(`Sales health secret lookup from Coolify env failed: ${error instanceof Error ? error.message : String(error)}`)
    return null
  }
}

async function checkSalesHealth() {
  const secret = await resolveSalesHealthSecret()
  if (!secret) {
    fail("Sales health secret is unavailable; release cannot prove Revenue OS health")
    return
  }

  let res
  try {
    res = await fetch(`${BASE_URL}/api/sales/health`, {
      signal: AbortSignal.timeout(30_000),
      headers: { "X-Webhook-Secret": secret },
    })
  } catch (error) {
    fail(`Sales health fetch failed: ${error instanceof Error ? error.message : String(error)}`)
    return
  }

  const text = await res.text().catch(() => "")
  if (res.status < 200 || res.status >= 400) {
    fail(`Sales health returned HTTP ${res.status}`)
    return
  }

  let body = null
  try {
    body = text ? JSON.parse(text) : null
  } catch {
    fail("Sales health did not return JSON")
    return
  }

  if (!body || body.ok !== true) {
    const checks = Array.isArray(body?.checks)
      ? body.checks
          .filter((check) => check?.status === "error")
          .map((check) => `${check.name}: ${check.detail}`)
          .slice(0, 5)
      : []
    fail(`Sales health JSON is not ok${checks.length > 0 ? ` (${checks.join("; ")})` : ""}`)
    return
  }

  pass(`Sales health HTTP ${res.status} JSON ok`)
}

function latestManualWorkReportPath() {
  const command = "docker exec supabase-db-1 psql -U postgres -d postgres -Atc \"select '/en/work-report/' || report_token::text from public.manual_japan_entry_work where report_url is not null order by updated_at desc limit 1\""
  const result = run("ssh", [...sshArgs(DEPLOY_HOST, { acceptNew: true }), command])
  const reportPath = result.output.trim()
  return result.status === 0 && /^\/en\/work-report\/[0-9a-f-]{36}$/i.test(reportPath) ? reportPath : null
}

async function checkPostDeployUrls() {
  if (SKIP_REMOTE) {
    section("Post-deploy smoke")
    warn("remote smoke skipped")
    return
  }

  section("Post-deploy smoke")
  await fetchCheck("readiness", `${BASE_URL}/api/ready`, { timeoutMs: 12_000 })
  await fetchCheck("Japanese public site", `${BASE_URL}/ja`, { timeoutMs: 20_000 })
  await fetchCheck("Japanese public blog", `${BASE_URL}/ja/blog`, { timeoutMs: 20_000 })
  await fetchCheck("English Japan Entry homepage", `${BASE_URL}/en`, {
    timeoutMs: 20_000,
    mustContain: [
      "Your Japan Country Partner",
      "$15,000",
      "Apply for a Japan Partnership",
      "Visual proof",
      "japan-entry-score",
      "Wise",
      "14 business days",
    ],
  })
  await fetchCheck(
    "Japan Entry application",
    `${BASE_URL}/en/contact`,
    {
      timeoutMs: 20_000,
      mustContain: [
        "Japan Entry package.",
        "Confirm your fit and launch timing",
        "$15,000 fixed setup",
        "Preferred payment method",
        "fully refundable",
      ],
    },
  )
  const maintainedPages = [
    ["About", "/en/about"],
    ["Services", "/en/services"],
    ["Pricing", "/en/pricing"],
    ["FAQ", "/en/faq"],
    ["Works", "/en/works"],
    ["Blog", "/en/blog"],
    ["Privacy", "/en/privacy"],
    ["Legal", "/en/legal"],
    ["Terms", "/en/terms"],
    ["Refund policy", "/en/refund"],
    ["Japan Entry Signal Check", "/en/tools/japan-entry-score"],
  ]
  for (const [label, path] of maintainedPages) {
    const options = { timeoutMs: 20_000 }
    if (path === "/en/pricing") {
      options.mustContain = ["Wise", "delivery guarantee"]
    }
    if (path === "/en/faq") {
      options.mustContain = ["Which payment methods can we use?", "full setup fee is refunded"]
    }
    if (path === "/en/legal") {
      options.mustContain = ["Wise", "100% of the USD 15,000 setup fee is refunded"]
    }
    if (path === "/en/terms") {
      options.mustContain = ["Terms of Service", "$15,000", "Japan", "14 business days"]
    }
    if (path === "/en/refund") {
      options.mustContain = ["Refund", "100% of the USD 15,000 setup fee is refunded", "Start Date"]
    }
    if (path === "/en/tools/japan-entry-score") {
      options.mustContain = [
        "Japan Entry Signal Check",
        "public-signal utility",
        "private traffic and revenue are never inferred",
      ]
    }
    await fetchCheck(`English ${label}`, `${BASE_URL}${path}`, options)
  }
  await fetchCheck("Twenty CRM redirect", `${BASE_URL}/ja/admin/sales`, {
    timeoutMs: 20_000,
    attempts: 3,
    retryStatuses: [502, 503, 504, 522],
  })
  await fetchCheck("diagnostic report value URL", `${BASE_URL}${REPORT_PATH}`, {
    timeoutMs: 25_000,
    rejectReportError: true,
  })
  const manualReportPath = latestManualWorkReportPath()
  if (manualReportPath) {
    await fetchCheck("manual Japan Entry customer V4 strategy report", `${BASE_URL}${manualReportPath}`, {
      timeoutMs: 25_000,
      rejectReportError: true,
      mustContain: ["Japan Entry Strategy Report", "Ten decision chapters", "Paradigm LLC", "manual_japan_entry_strategy_v4"],
      mustNotContain: ["Private evidence brief", "Manual Japan Entry Workbench", "Operator next actions", "Never sent automatically", "Human-reviewed first touch"],
    })
  } else {
    warn("manual Japan Entry report smoke skipped because no stored report exists")
  }
  await fetchCheck("Twenty", TWENTY_URL, { timeoutMs: 20_000 })
  await fetchUnauthorizedCheck("Infrastructure dashboard", `${BASE_URL}/api/infra`)
  await fetchUnauthorizedCheck("Infrastructure status", `${BASE_URL}/api/infra/status`)

  await checkSalesHealth()
}

async function checkPublicFunnelEnvironment() {
  if (LOCAL_ONLY || SKIP_REMOTE) return
  section("Public funnel environment")
  try {
    const envs = await readCoolifyApplicationEnvs(APP_UUID)
    const hasMinimumSecret = (name) =>
      typeof envs[name] === "string" && envs[name].trim().length >= 16
    if (hasMinimumSecret("ADMIN_SCRIPT_SECRET")) {
      pass("English CMS publish secret is configured")
    } else {
      fail("ADMIN_SCRIPT_SECRET must be configured for the English CMS publish gate")
    }
    if (
      typeof envs.CONTACT_FORM_CHALLENGE_SECRET === "string" &&
      envs.CONTACT_FORM_CHALLENGE_SECRET.trim().length >= 32
    ) {
      pass("dedicated contact form challenge secret is configured")
    } else {
      fail("CONTACT_FORM_CHALLENGE_SECRET must contain at least 32 characters")
    }
    if (String(envs.TRUSTED_PROXY_MODE || "").trim().toLowerCase() === "cloudflare") {
      pass("public API client IPs trust Cloudflare only")
    } else {
      fail("TRUSTED_PROXY_MODE=cloudflare is required for public API rate limits")
    }
    if (/^(1|true|yes)$/i.test(String(envs.CLOUDFLARE_ORIGIN_LOCKED || "").trim())) {
      pass("Cloudflare-only origin access is attested")
    } else {
      fail("CLOUDFLARE_ORIGIN_LOCKED=1 must attest that direct origin access is blocked")
    }
    const hasTurnstile =
      hasMinimumSecret("TURNSTILE_SECRET_KEY") &&
      typeof envs.NEXT_PUBLIC_TURNSTILE_SITE_KEY === "string" &&
      envs.NEXT_PUBLIC_TURNSTILE_SITE_KEY.trim().length > 0
    if (!hasTurnstile) {
      fail("TURNSTILE_SECRET_KEY and NEXT_PUBLIC_TURNSTILE_SITE_KEY are required in production")
    } else {
      pass("Turnstile production keys are configured")
    }
    const slackBotReady = hasMinimumSecret("SLACK_BOT_TOKEN") && typeof envs.SLACK_CHANNEL_ID === "string" && envs.SLACK_CHANNEL_ID.trim().length > 0
    const slackWebhookReady = typeof envs.SLACK_WEBHOOK_URL === "string" && envs.SLACK_WEBHOOK_URL.trim().length >= 16
    if (slackBotReady || slackWebhookReady) {
      pass("Slack operator notification credentials are configured")
    } else {
      fail("SLACK_BOT_TOKEN + SLACK_CHANNEL_ID or SLACK_WEBHOOK_URL are required for operator notifications")
    }
    const evidenceMode = typeof envs.OUTREACH_EVIDENCE_MODE === "string"
      ? envs.OUTREACH_EVIDENCE_MODE.trim().toLowerCase()
      : "public-signals"
    if (evidenceMode === "public-signals") {
      pass("free public-signals evidence mode is configured; traffic/revenue numeric claims remain disabled")
    } else if (evidenceMode === "paid-traffic") {
      const hasVerifiedTrafficProvider =
        (typeof envs.DATAFORSEO_LOGIN === "string" && envs.DATAFORSEO_LOGIN.trim().length > 0 &&
          hasMinimumSecret("DATAFORSEO_PASSWORD")) ||
        hasMinimumSecret("SIMILARWEB_API_KEY")
      if (hasVerifiedTrafficProvider) {
        pass("verified outreach traffic provider is configured for paid-traffic evidence mode")
      } else {
        fail("DATAFORSEO_LOGIN/PASSWORD or SIMILARWEB_API_KEY is required when OUTREACH_EVIDENCE_MODE=paid-traffic")
      }
    } else {
      fail("OUTREACH_EVIDENCE_MODE must be public-signals or paid-traffic")
    }
    pass("lead collection uses approved evidence-bearing company sources; no search proxy credential is required")
    if (hasMinimumSecret("TWENTY_API_KEY")) {
      pass("Twenty CRM sync credential is configured")
    } else {
      fail("TWENTY_API_KEY is required for candidate-to-CRM synchronization")
    }
    if (hasMinimumSecret("DEEPSEEK_API_KEY")) {
      pass("form-message generation has a direct DeepSeek API credential")
    } else {
      fail("DEEPSEEK_API_KEY is required for direct DeepSeek V4 Pro form-message generation")
    }
    const demoModel = String(envs.DEMO_LLM_MODEL || "").trim()
    const demoDeepSeekReady = hasMinimumSecret("DEEPSEEK_API_KEY")
    if (demoModel === "deepseek-v4-pro" && demoDeepSeekReady) {
      pass("SMB demo generation is pinned to the direct DeepSeek V4 Pro API")
    } else {
      fail("DEMO_LLM_MODEL=deepseek-v4-pro and DEEPSEEK_API_KEY are required")
    }
    const backupEncrypted = /^(1|true|yes)$/i.test(String(envs.OSS_SUPABASE_BACKUP_ENCRYPTION_REQUIRED || "true").trim())
    const backupSshReady = typeof envs.OSS_SUPABASE_BACKUP_SSH_TARGET === "string" && envs.OSS_SUPABASE_BACKUP_SSH_TARGET.trim().length > 0
    const backupR2Ready =
      typeof envs.CLOUDFLARE_R2_BUCKET === "string" && envs.CLOUDFLARE_R2_BUCKET.trim().length > 0 &&
      hasMinimumSecret("CLOUDFLARE_R2_ACCOUNT_ID") &&
      hasMinimumSecret("CLOUDFLARE_R2_ACCESS_KEY_ID") &&
      hasMinimumSecret("CLOUDFLARE_R2_SECRET_ACCESS_KEY")
    if (backupEncrypted && hasMinimumSecret("OSS_SUPABASE_BACKUP_GPG_PASSPHRASE") && (backupSshReady || backupR2Ready)) {
      pass(backupR2Ready ? "Encrypted off-host Supabase backups are configured through Cloudflare R2" : "Encrypted off-host Supabase backups are configured through SSH")
    } else {
      fail("Encrypted off-host Supabase backup credentials are required (SSH target or complete Cloudflare R2 transport)")
    }
    const legalEnvNames = [
      "PARADIGM_LEGAL_REPRESENTATIVE_NAME",
      "PARADIGM_LEGAL_POSTAL_CODE",
      "PARADIGM_LEGAL_ADDRESS",
      "PARADIGM_LEGAL_PHONE",
    ]
    if (legalEnvNames.every((name) => typeof envs[name] === "string" && envs[name].trim().length > 0)) {
      pass("Legal identity environment values are configured")
    } else {
      fail("Legal identity environment values are required before production release")
    }
  } catch (error) {
    fail(`public funnel env lookup failed: ${error instanceof Error ? error.message : String(error)}`)
  }
}

async function main() {
  checkStaticReleaseRules()
  checkSyntax()
  if (PRE_DEPLOY) {
    checkGitHygiene()
    checkPreDeployRemote()
    await checkOriginAccessGate()
    await checkPublicFunnelEnvironment()
  }
  if (POST_DEPLOY) {
    checkTraefikRouteDrift()
    await checkOriginAccessGate()
    checkRemoteInfraDrift()
    await checkPublicFunnelEnvironment()
    await checkPostDeployUrls()
  }

  if (failures.length > 0) {
    console.error(`\n[release-doctor] blocked release with ${failures.length} failure(s)`)
    process.exit(1)
  }
  console.log("\n[release-doctor] release gate passed")
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
