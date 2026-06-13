/**
 * Enterprise-grade tech stack filter.
 * Detects enterprise-only technologies and flags companies as non-SMB.
 * Gate 1 of the SMB purification pipeline.
 */

const ENTERPRISE_TECH = new Set([
  "Salesforce",
  "Salesforce Commerce Cloud",
  "Salesforce Marketing Cloud",
  "Salesforce Service Cloud",
  "Adobe Experience Manager",
  "Adobe Experience Cloud",
  "Adobe Analytics",
  "Oracle Commerce",
  "Oracle E-Business Suite",
  "Oracle Cloud",
  "SAP",
  "SAP Commerce Cloud",
  "SAP Hybris",
  "SAP NetWeaver",
  "Workday",
  "ServiceNow",
  "Pega",
  "Pega Platform",
  "Marketo",
  "Marketo Engage",
  "Eloqua",
  "Oracle Eloqua",
  "Sitecore",
  "Sitecore Experience Platform",
  "Acquia",
  "Episerver",
  "Optimizely",
  "Kentico",
  "Adobe Target",
  "Tealium",
  "Ensighten",
  "Dynatrace",
  "AppDynamics",
  "New Relic",
  "Datadog",
  "Splunk",
  "Tableau",
  "Power BI",
  "Qlik",
  "MicroStrategy",
  "Coveo",
  "Algolia",
  "Elasticsearch",
  "Redis Enterprise",
  "Akamai",
  "Imperva",
  "F5",
  "Citrix",
  "VMware",
  "Workday HCM",
  "SuccessFactors",
  "Cornerstone OnDemand",
  "Ultimate Software",
  "Ceridian",
  "Concur",
  "Coupa",
  "Ariba",
  "JDA",
  "Manhattan Associates",
  "Blue Yonder",
  "Infor",
  "IFS",
  "Epicor",
  "QAD",
  "Plex Systems",
  "Demandware",
  "ATG",
  "WebSphere",
  "TIBCO",
  "MuleSoft",
  "Dell Boomi",
  "Informatica",
  "Talend",
  "Denodo",
  "DocuSign CLM",
  "Icertis",
  "SirionLabs",
  "Cognizant",
  "Infosys",
  "Wipro",
  "HCL",
  "Tata Consultancy",
  "Tech Mahindra",
])

export function isEnterpriseTechStack(technologies: string[]): { isEnterprise: boolean; matched: string[] } {
  const matched = technologies.filter(t => ENTERPRISE_TECH.has(t))
  return {
    isEnterprise: matched.length > 0,
    matched,
  }
}

export function filterEnterpriseCompanies<T extends { meta?: Record<string, unknown> | null }>(
  companies: T[],
): { smb: T[]; enterprise: T[] } {
  const smb: T[] = []
  const enterprise: T[] = []
  for (const company of companies) {
    const tech = (company.meta?.tech as { stack?: Array<{ name: string }> })?.stack
    if (tech && isEnterpriseTechStack(tech.map(t => typeof t === "string" ? t : t.name)).isEnterprise) {
      enterprise.push(company)
    } else {
      smb.push(company)
    }
  }
  return { smb, enterprise }
}
