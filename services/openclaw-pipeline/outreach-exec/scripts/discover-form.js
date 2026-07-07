#!/usr/bin/env node
/**
 * outreach-exec/discover-form.js — Discover contact forms on target websites.
 *
 * Usage:
 *   node discover-form.js --domain example.com
 *   node discover-form.js --url https://example.com/contact
 */

const twenty = require('../lib/twenty-client');

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {};
  for (let i = 0; i < args.length; i++) {
    const val = args[i + 1];
    switch (args[i]) {
      case '--domain': opts.domain = val; i++; break;
      case '--url': opts.url = val; i++; break;
    }
  }
  return opts;
}

const FORM_PATTERNS = [
  '/contact', '/contact-us', '/contactus', '/contacts',
  '/inquiry', '/inquiries', '/お問い合わせ', '/問い合わせ',
  '/form', '/forms', '/support', '/help',
  '/about/contact', '/company/contact',
];

const CMS_FORM_SIGNATURES = {
  wpforms: { selector: '.wpforms-form', name: 'WPForms', safe: true },
  contact_form_7: { selector: '.wpcf7-form', name: 'Contact Form 7', safe: true },
  gravity_forms: { selector: '.gform_wrapper', name: 'Gravity Forms', safe: true },
  forminator: { selector: '.forminator-custom-form', name: 'Forminator', safe: true },
  ninja_forms: { selector: '.nf-form-layout', name: 'Ninja Forms', safe: true },
  elementor_form: { selector: '.elementor-form', name: 'Elementor Form', safe: true },
};

const SKIP_SIGNATURES = {
  recaptcha_v3: { selector: '.grecaptcha-badge, [data-sitekey]', reason: 'reCAPTCHA detected' },
  login_required: { selector: '.login-form, #loginform, .wp-login', reason: 'Login required' },
  file_required: { selector: 'input[type="file"][required]', reason: 'File attachment required' },
};

async function discoverForm({ domain, url }) {
  const targetUrl = url || `https://${domain}`;
  console.log(`Discovering form: ${targetUrl}`);

  try {
    const robotsRes = await fetch(`https://${domain}/robots.txt`, {
      signal: AbortSignal.timeout(5000),
    });
    if (robotsRes.ok) {
      const robotsTxt = await robotsRes.text();
      if (robotsTxt.includes('Disallow: /')) {
        const disallowed = robotsTxt.match(/Disallow:\s*(\/[^\s]*)/g) || [];
        if (disallowed.length > 5) {
          console.warn('robots.txt has many restrictions — may be bot-hostile');
        }
      }
    }
  } catch {
    console.log('No robots.txt or unreachable — proceeding');
  }

  const candidates = [];
  for (const pattern of FORM_PATTERNS) {
    candidates.push(`${url || `https://${domain}`}${pattern}`);
    candidates.push(`https://${domain}${pattern}`);
  }

  const uniqueCandidates = [...new Set(candidates)];
  console.log(`Checking ${uniqueCandidates.length} form URL candidates...`);

  const results = {
    domain,
    forms: [],
    status: 'unknown',
    recommendedUrl: null,
  };

  for (const candidate of uniqueCandidates) {
    try {
      const res = await fetch(candidate, {
        signal: AbortSignal.timeout(8000),
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ParadigmBot/1.0)' },
      });
      if (!res.ok) continue;

      const html = await res.text();
      const hasForm = /<form\b/i.test(html);
      const inputCount = (html.match(/<input\b/gi) || []).length;
      const textareaCount = (html.match(/<textarea\b/gi) || []).length;

      let formType = hasForm ? 'custom' : null;
      let cmsName = null;
      let safe = false;

      for (const [key, sig] of Object.entries(CMS_FORM_SIGNATURES)) {
        if (html.includes(sig.selector.replace(/^\./, ' class="') || sig.selector)) {
          formType = 'cms';
          cmsName = sig.name;
          safe = sig.safe;
          break;
        }
      }

      const skipReasons = [];
      for (const [key, sig] of Object.entries(SKIP_SIGNATURES)) {
        if (html.includes(sig.selector.replace(/^\./, ' class="') || sig.selector)) {
          skipReasons.push(sig.reason);
        }
      }

      if (formType || hasForm) {
        results.forms.push({
          url: candidate,
          type: formType || 'unknown',
          cmsName,
          safe: safe || (skipReasons.length === 0),
          inputCount,
          textareaCount,
          skipReasons,
        });
        console.log(`  Found: ${candidate} (${cmsName || formType || 'form'}) [${inputCount} inputs, ${textareaCount} textareas]`);
      }
    } catch (err) {
      console.log(`  Skip: ${candidate} — ${err.message}`);
    }
  }

  if (results.forms.length > 0) {
    const safeForm = results.forms.find(f => f.safe);
    results.recommendedUrl = safeForm?.url || results.forms[0].url;
    results.status = 'found';
  } else {
    results.status = 'no_form_found';
  }

  return results;
}

async function main() {
  const opts = parseArgs();
  if (!opts.domain && !opts.url) {
    console.error('--domain or --url is required');
    process.exit(1);
  }

  const result = await discoverForm(opts);
  console.log('\n=== Form Discovery Result ===');
  console.log(JSON.stringify(result, null, 2));
}

module.exports = { discoverForm };

if (require.main === module) {
  main().catch(err => {
    console.error('Discovery failed:', err.message);
    process.exit(1);
  });
}
