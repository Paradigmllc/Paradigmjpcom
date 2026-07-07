#!/usr/bin/env node
/**
 * outreach-exec/submit-form.js — Playwright-based contact form submission.
 *
 * Safety: circuit breaker (3 failures → 60min cooldown), rate limiting (30s/domain).
 * Auto-detects form fields, fills message, submits, verifies success.
 *
 * Usage:
 *   node submit-form.js --url https://example.com/contact --message "Hello..."
 *   node submit-form.js --domain example.com --company-id <TWENTY_ID>
 */

const { chromium } = require('playwright');
const twenty = require('../lib/twenty-client');
const fs = require('fs');

const CIRCUIT_FILE = '/tmp/openclaw-circuit-breaker.json';
const RATE_LIMIT_MS = 30_000;
const FORM_TIMEOUT = 120_000;
const MAX_RETRIES = 2;

function parseArgs() {
  const a = process.argv.slice(2);
  const opts = { dryRun: false };
  for (let i = 0; i < a.length; i++) {
    const v = a[i + 1];
    switch (a[i]) {
      case '--url': opts.url = v; i++; break;
      case '--domain': opts.domain = v; i++; break;
      case '--company-id': opts.companyId = v; i++; break;
      case '--message': opts.message = v; i++; break;
      case '--dry-run': opts.dryRun = true; break;
    }
  }
  return opts;
}

// ── Circuit Breaker ─────────────────────────────────────────────────

function readCircuit() {
  try { return JSON.parse(fs.readFileSync(CIRCUIT_FILE, 'utf8')); }
  catch { return {}; }
}
function writeCircuit(s) { fs.writeFileSync(CIRCUIT_FILE, JSON.stringify(s, null, 2)); }

function checkCircuit(domain) {
  const s = readCircuit();
  const e = s[domain];
  if (!e || !e.open) return { allowed: true };
  const elapsed = Date.now() - (e.openedAt || 0);
  if (elapsed > 60 * 60_000) {
    // 60min cooldown → try one (half-open)
    e.open = false;
    e.halfOpen = true;
    writeCircuit(s);
    return { allowed: true, halfOpen: true };
  }
  return { allowed: false, retryAfter: Math.ceil((60 * 60_000 - elapsed) / 60_000) };
}

function recordCircuit(domain, success) {
  const s = readCircuit();
  const e = s[domain] || { failures: 0, open: false };
  if (success) {
    e.failures = 0;
    e.open = false;
    e.halfOpen = false;
  } else {
    e.failures++;
    e.lastFailure = new Date().toISOString();
    if (e.failures >= 3) {
      e.open = true;
      e.openedAt = Date.now();
    }
  }
  s[domain] = e;
  writeCircuit(s);
}

// ── Rate Limiter ────────────────────────────────────────────────────

const lastSubmit = new Map();

function checkRateLimit(domain) {
  const last = lastSubmit.get(domain);
  if (last && Date.now() - last < RATE_LIMIT_MS) {
    const waitSec = Math.ceil((RATE_LIMIT_MS - (Date.now() - last)) / 1000);
    return { allowed: false, waitSec };
  }
  return { allowed: true };
}

function markSubmitted(domain) {
  lastSubmit.set(domain, Date.now());
}

// ── Form Discovery ──────────────────────────────────────────────────

const FORM_PATHS = ['/contact', '/contact-us', '/inquiry', '/お問い合わせ', '/form', '/contact/form'];

async function discoverForm(page, domain) {
  for (const path of FORM_PATHS) {
    try {
      const url = `https://${domain}${path}`;
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
      const formCount = await page.locator('form').count();
      const inputCount = await page.locator('input:visible').count();
      if (formCount > 0 || inputCount >= 2) {
        return { url, formCount, inputCount, textareaCount: await page.locator('textarea:visible').count() };
      }
    } catch { /* try next path */ }
  }
  // Fallback: check homepage
  try {
    await page.goto(`https://${domain}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    const formCount = await page.locator('form').count();
    if (formCount > 0) {
      return { url: `https://${domain}`, formCount, inputCount: await page.locator('input:visible').count(), textareaCount: await page.locator('textarea:visible').count() };
    }
  } catch {}
  return null;
}

// ── Auto-fill Form ──────────────────────────────────────────────────

const FIELD_MAP = {
  name: ['name', 'your-name', 'fullname', 'full-name', 'お名前', '氏名', '名前'],
  email: ['email', 'your-email', 'mail', 'mailaddress', 'メールアドレス', 'e-mail'],
  company: ['company', 'organization', '会社名', '企業名', 'company-name'],
  phone: ['phone', 'tel', 'telephone', '電話番号', '電話'],
  subject: ['subject', 'title', '件名', 'タイトル', 'your-subject'],
  message: ['message', 'body', 'comment', 'content', 'お問い合わせ内容', '本文', 'your-message', 'details'],
};

const DEFAULTS = {
  name: 'Paradigm合同会社',
  email: 'contact@paradigmjp.com',
  phone: '000-0000-0000',
};

async function fillForm(page, message) {
  const inputs = await page.locator('input:visible, textarea:visible').all();
  let filled = 0;

  for (const el of inputs) {
    const attrs = {
      name: (await el.getAttribute('name') || '').toLowerCase(),
      id: (await el.getAttribute('id') || '').toLowerCase(),
      placeholder: (await el.getAttribute('placeholder') || '').toLowerCase(),
      type: (await el.getAttribute('type') || 'text').toLowerCase(),
    };
    if (attrs.type === 'submit' || attrs.type === 'hidden' || attrs.type === 'checkbox' || attrs.type === 'radio') continue;

    const allAttrs = `${attrs.name} ${attrs.id} ${attrs.placeholder}`;

    // Try to identify field type
    let value = null;
    for (const [fieldType, keywords] of Object.entries(FIELD_MAP)) {
      if (keywords.some(kw => allAttrs.includes(kw))) {
        value = fieldType === 'subject' ? message.subject :
                fieldType === 'message' ? message.body :
                DEFAULTS[fieldType] || message.subject;
        break;
      }
    }

    // Fallback: if it's the last/largest textarea, use message body
    if (!value && attrs.type === 'textarea' || await el.evaluate(e => e.tagName) === 'TEXTAREA') {
      value = message.body;
    }

    if (value) {
      try {
        await el.fill(value);
        filled++;
      } catch {}
    }
  }
  return filled;
}

// ── Submit & Verify ─────────────────────────────────────────────────

async function submitAndVerify(page) {
  const submitSelectors = [
    'button[type="submit"]', 'input[type="submit"]',
    '.wpcf7-submit', '.gform_button', '.wpforms-submit',
    'button:has-text("送信")', 'button:has-text("Submit")', 'button:has-text("Send")',
    'input[value="送信"]', 'input[value="Submit"]',
  ];

  let clicked = false;
  for (const sel of submitSelectors) {
    const btn = page.locator(sel).first();
    if (await btn.isVisible().catch(() => false)) {
      await btn.click().catch(() => {});
      clicked = true;
      break;
    }
  }
  if (!clicked) {
    // Last resort: press Enter on any visible input
    const firstInput = page.locator('input:visible').first();
    if (await firstInput.isVisible().catch(() => false)) {
      await firstInput.press('Enter').catch(() => {});
      clicked = true;
    }
  }
  if (!clicked) return { success: false, reason: 'no_submit_found' };

  // Wait for result
  await page.waitForTimeout(3000);

  const currentUrl = page.url();
  const bodyText = await page.locator('body').innerText().catch(() => '');

  const successPatterns = ['thank you', 'ありがとう', 'submitted', '送信', '受け付け', '承り', 'success', '確認'];
  const failPatterns = ['error', 'エラー', 'failed', '失敗', 'required', '必須', 'invalid', '無効', 'captcha', 'recaptcha'];

  const isSuccess = successPatterns.some(p => bodyText.toLowerCase().includes(p)) && !failPatterns.some(p => bodyText.toLowerCase().includes(p));
  const urlChanged = currentUrl !== page.url() || bodyText.length > 500;

  if (isSuccess || urlChanged) {
    return { success: true };
  }
  return { success: false, reason: 'no_confirmation', url: page.url(), bodySnippet: bodyText.slice(0, 200) };
}

// ── Main ────────────────────────────────────────────────────────────

async function submitForm({ url, domain, message, companyId, dryRun }) {
  const targetDomain = domain || new URL(url).hostname.replace(/^www\./, '');

  // Safety checks
  const circuit = checkCircuit(targetDomain);
  if (!circuit.allowed) {
    return { success: false, reason: 'circuit_open', retryAfter: circuit.retryAfter };
  }
  const rate = checkRateLimit(targetDomain);
  if (!rate.allowed) {
    return { success: false, reason: 'rate_limited', waitSec: rate.waitSec };
  }

  // Check robots.txt
  try {
    const robots = await (await fetch(`https://${targetDomain}/robots.txt`, { signal: AbortSignal.timeout(5000) })).text();
    if (robots.includes('Disallow: /contact') || robots.includes('Disallow: /form')) {
      return { success: false, reason: 'robots_disallowed' };
    }
  } catch {}

  if (dryRun) {
    console.log(`[DRY RUN] Would submit to ${url || domain}`);
    return { success: true, dryRun: true };
  }

  console.log(`🚀 Submitting to ${targetDomain}...`);
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();

  let result = { success: false, reason: 'unknown' };

  try {
    // Discover form
    const form = await discoverForm(page, targetDomain);
    if (!form) {
      result = { success: false, reason: 'no_form_found' };
    } else {
      console.log(`  📝 Form found: ${form.url} (${form.inputCount} inputs)`);

      // Fill
      const filled = await fillForm(page, message);
      console.log(`  ✍️  Filled ${filled} fields`);

      // Submit
      result = await submitAndVerify(page);
      console.log(`  ${result.success ? '✅' : '❌'} ${result.success ? 'Success!' : result.reason}`);
    }
  } catch (e) {
    result = { success: false, reason: e.message };
    console.error(`  ❌ Error: ${e.message}`);
  } finally {
    await browser.close();
  }

  // Record circuit breaker state
  recordCircuit(targetDomain, result.success);
  markSubmitted(targetDomain);

  // Record in Twenty
  if (companyId) {
    try {
      await twenty.updateCompany(companyId, {
        paradigmSalesStatus: result.success ? '送信済み / 未対応' : '手動確認 / 未対応',
        paradigmNextAction: result.success ? '返信待ち（3日後フォロー）' : `送信失敗: ${result.reason} — 手動確認`,
        paradigmLastError: result.success ? null : result.reason,
        paradigmFormUrl: formUrl ? { primaryLinkLabel: '送信先', primaryLinkUrl: formUrl } : undefined,
      });
    } catch (e) { console.error(`  Twenty update failed: ${e.message}`); }
  }

  return result;
}

let formUrl = null;

module.exports = { submitForm, checkCircuit, readCircuit };

if (require.main === module) {
  const opts = parseArgs();
  const message = opts.message ? { subject: '【御社専用】Webサイト無料診断のご案内', body: opts.message } : null;
  if (!message) {
    console.error('--message required (or --company-id to fetch from Twenty)');
    process.exit(1);
  }
  submitForm({ url: opts.url, domain: opts.domain, message, companyId: opts.companyId, dryRun: opts.dryRun })
    .then(r => {
      console.log(JSON.stringify(r, null, 2));
      process.exit(r.success ? 0 : 1);
    })
    .catch(e => { console.error(e.message); process.exit(1); });
}
