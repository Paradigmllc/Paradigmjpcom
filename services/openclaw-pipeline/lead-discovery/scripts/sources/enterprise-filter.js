#!/usr/bin/env node
/**
 * Enterprise tech stack filter — detects enterprise-only technologies.
 */

const ENTERPRISE_TECH = new Set([
  'Salesforce', 'Salesforce Commerce Cloud', 'Salesforce Marketing Cloud',
  'Adobe Experience Manager', 'Adobe Experience Cloud', 'Adobe Analytics',
  'Oracle Commerce', 'Oracle E-Business Suite', 'Oracle Cloud',
  'SAP', 'SAP Commerce Cloud', 'SAP Hybris', 'SAP NetWeaver',
  'Workday', 'ServiceNow',
  'Pega', 'Pega Platform',
  'Marketo', 'Marketo Engage', 'Eloqua', 'Oracle Eloqua',
  'Sitecore', 'Sitecore Experience Platform',
  'Acquia', 'Episerver', 'Optimizely', 'Kentico',
  'Adobe Target', 'Tealium', 'Ensighten',
  'Dynatrace', 'AppDynamics', 'New Relic', 'Datadog', 'Splunk',
  'Tableau', 'Power BI', 'Qlik', 'MicroStrategy',
  'Coveo', 'Algolia', 'Elasticsearch', 'Redis Enterprise',
  'Akamai', 'Imperva', 'F5', 'Citrix', 'VMware',
  'Workday HCM', 'SuccessFactors', 'Cornerstone OnDemand',
  'Concur', 'Coupa', 'Ariba',
  'JDA', 'Manhattan Associates', 'Blue Yonder',
  'Infor', 'IFS', 'Epicor', 'QAD', 'Plex Systems',
  'Demandware', 'ATG', 'WebSphere', 'TIBCO', 'MuleSoft',
  'Dell Boomi', 'Informatica', 'Talend', 'Denodo',
  'DocuSign CLM', 'Icertis', 'SirionLabs',
  'Cognizant', 'Infosys', 'Wipro', 'HCL', 'Tata Consultancy', 'Tech Mahindra',
]);

// Known major platforms/big tech domains — always exclude
const MAJOR_PLATFORMS = new Set([
  'google.com', 'googleapis.com', 'gstatic.com', 'google-analytics.com', 'googletagmanager.com',
  'youtube.com', 'youtu.be', 'ytimg.com',
  'facebook.com', 'fb.com', 'facebook.net', 'fbcdn.net', 'instagram.com',
  'twitter.com', 'x.com', 'twimg.com',
  'linkedin.com', 'licdn.com',
  'amazon.com', 'amazonaws.com', 'aws.amazon.com',
  'microsoft.com', 'microsoftonline.com', 'live.com', 'office.com', 'office.net',
  'apple.com', 'icloud.com', 'apple-dns.net',
  'cloudflare.com', 'cloudflare.net', 'cloudflareinsights.com',
  'github.com', 'github.io', 'githubassets.com',
  'stackoverflow.com', 'stackexchange.com',
  'wikipedia.org', 'wikimedia.org',
  'reddit.com', 'redditstatic.com', 'redd.it',
  'wordpress.com', 'wordpress.org',
  'shopify.com', 'myshopify.com', 'shopifycdn.com',
  'stripe.com', 'stripe.network',
  'paypal.com', 'paypalobjects.com',
  'netflix.com', 'nflxvideo.net',
  'spotify.com', 'scdn.co',
  'adobe.com', 'adobe.io', 'typekit.net',
  'salesforce.com', 'force.com', 'salesforceliveagent.com',
  'oracle.com', 'oraclecloud.com',
  'ibm.com',
  'sap.com',
  'cisco.com',
  'intel.com',
  'hp.com',
  'dell.com',
  'samsung.com',
  'akamai.net', 'akamaiedge.net', 'akamaihd.net',
  'fastly.net', 'fastlylb.net',
]);

function isEnterpriseTechStack(technologies) {
  const matched = technologies.filter(t => ENTERPRISE_TECH.has(t));
  return { isEnterprise: matched.length > 0, matched };
}

function isMajorPlatform(domain) {
  return MAJOR_PLATFORMS.has(domain.toLowerCase());
}

module.exports = { isEnterpriseTechStack, isMajorPlatform, ENTERPRISE_TECH, MAJOR_PLATFORMS };
