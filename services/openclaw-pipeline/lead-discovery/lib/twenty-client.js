#!/usr/bin/env node
/**
 * Shared Twenty CRM API client for OpenClaw sales pipeline skills.
 *
 * Usage:
 *   const twenty = require('./twenty-client');
 *   const companies = await twenty.findCompanies({ status: '未診断 / 未対応' });
 */

const BASE_URL = process.env.TWENTY_BASE_URL || 'https://twenty.paradigmjp.com';
const API_KEY = process.env.TWENTY_API_KEY;

if (!API_KEY) {
  console.error('TWENTY_API_KEY is required');
  process.exit(1);
}

async function twentyFetch(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Twenty API ${res.status}: ${body.slice(0, 500)}`);
  }
  return res.json();
}

async function listCompanies({ filter, limit = 200 } = {}) {
  const params = new URLSearchParams({ limit: String(limit), order_by: 'createdAt[DescNullsLast]' });
  if (filter) params.set('filter', filter);
  const result = await twentyFetch(`/rest/companies?${params.toString()}`);
  return result?.data?.companies || [];
}

async function findCompanyByDomain(domain) {
  const clean = domain.toLowerCase().replace(/^www\./, '');
  const filter = `domainName.primaryLinkUrl[ilike]:%25${encodeURIComponent(clean)}%25`;
  const companies = await listCompanies({ filter, limit: 10 });
  return companies.find(c => {
    const url = c.domainName?.primaryLinkUrl || '';
    return url.toLowerCase().includes(clean);
  }) || null;
}

async function createCompany({ name, domain, country, industry, source, reportLocale }) {
  const body = {
    name: name || domain,
    domainName: {
      primaryLinkLabel: domain,
      primaryLinkUrl: `https://${domain}`,
    },
  };
  if (country) body.paradigmCountryName = countrySelectValue(country);
  if (industry && industry !== 'all') {
    const mapped = industryToLabel(industry);
    if (mapped) body.paradigmIndustryName = mapped;
  }
  // Skip sourceName — Twenty has restricted enum values
  body.paradigmSalesStatus = '未診断 / 未対応';

  const result = await twentyFetch('/rest/companies', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return result?.data?.createCompany || result?.data;
}

async function updateCompany(companyId, fields) {
  const result = await twentyFetch(`/rest/companies/${companyId}`, {
    method: 'PATCH',
    body: JSON.stringify(fields),
  });
  return result?.data?.updateCompany || result?.data;
}

async function updateCompanyStatus(companyId, salesStatus, extraFields = {}) {
  return updateCompany(companyId, {
    paradigmSalesStatus: salesStatus,
    ...extraFields,
  });
}

const COUNTRY_LABELS = {
  JP: '日本', US: '米国', GB: '英国', AU: 'オーストラリア',
  CA: 'カナダ', DE: 'ドイツ', FR: 'フランス', KR: '韓国',
  CN: '中国', TW: '台湾', SG: 'シンガポール', IN: 'インド',
  VN: 'ベトナム', ZA: '南アフリカ', ID: 'インドネシア',
  ES: 'スペイン', PT: 'ポルトガル', RU: 'ロシア', AE: 'UAE',
};
const COUNTRY_ALIASES = { UK: 'GB' };

function countrySelectValue(code) {
  const normalized = COUNTRY_ALIASES[code?.toUpperCase()] || code?.toUpperCase();
  return COUNTRY_LABELS[normalized] || normalized || code;
}

const INDUSTRY_TO_LABEL = {
  restaurant: '飲食店', clinic: '歯科医院', dental: '歯科医院',
  construction: '建設・工務店', retail: '小売・店舗', salon: '美容サロン',
  accounting: '会計事務所', cleaning: '清掃・メンテナンス', consulting: 'コンサルティング',
  law_firm: 'コンサルティング', it: 'コンサルティング', logistics: '清掃・メンテナンス',
};

function industryToLabel(industry) {
  return INDUSTRY_TO_LABEL[industry] || undefined;
}

const SALES_STATUSES = {
  UNDIAGNOSED: '未診断 / 未対応',
  DIAGNOSING: 'カルテ生成中 / 未対応',
  OUTREACH_READY: '送信待ち / 未対応',
  SENT: '送信済み / 未対応',
  MANUAL_REVIEW: '手動確認 / 未対応',
  MEETING: '商談化 / 初回商談',
  PROPOSAL: '提案中 / 提案',
  WON: '成約 / 契約',
  LOST: '失注 / 失注',
};

async function listLeadsByStatus(status) {
  const filter = `paradigmSalesStatus[eq]:${encodeURIComponent(status)}`;
  return listCompanies({ filter });
}

module.exports = {
  twentyFetch,
  listCompanies,
  findCompanyByDomain,
  createCompany,
  updateCompany,
  updateCompanyStatus,
  countrySelectValue,
  SALES_STATUSES,
  listLeadsByStatus,
  BASE_URL,
};
