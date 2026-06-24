import { normalizeSalesCountryCode } from "./country-code"

export interface GlobalSmbMarketConfig {
  countryCode: string
  reportLocale: string
  currency: "USD" | "GBP" | "AUD" | "CAD" | "EUR" | "JPY"
  symbol: string
  oneTimePrice: number
  maintenancePrice: number
  defaultIndustryFocus: string[]
  preferredSources: string[]
}

export const GLOBAL_SMB_MARKETS = {
  US: {
    countryCode: "US",
    reportLocale: "en",
    currency: "USD",
    symbol: "$",
    oneTimePrice: 1499,
    maintenancePrice: 49,
    defaultIndustryFocus: ["dental", "roofing", "med_spa", "fitness", "restaurant"],
    preferredSources: ["dns_freshness", "local_smb_directory", "directory_presets"],
  },
  GB: {
    countryCode: "GB",
    reportLocale: "en",
    currency: "GBP",
    symbol: "£",
    oneTimePrice: 1199,
    maintenancePrice: 39,
    defaultIndustryFocus: ["plumbing", "pub", "clinic", "trades", "restaurant"],
    preferredSources: ["dns_freshness", "local_smb_directory", "directory_presets"],
  },
  AU: {
    countryCode: "AU",
    reportLocale: "en",
    currency: "AUD",
    symbol: "A$",
    oneTimePrice: 1999,
    maintenancePrice: 69,
    defaultIndustryFocus: ["trades", "clinic", "fitness", "restaurant", "tourism"],
    preferredSources: ["dns_freshness", "local_smb_directory", "directory_presets"],
  },
  CA: {
    countryCode: "CA",
    reportLocale: "en",
    currency: "CAD",
    symbol: "C$",
    oneTimePrice: 1699,
    maintenancePrice: 59,
    defaultIndustryFocus: ["clinic", "trades", "restaurant", "fitness", "professional_services"],
    preferredSources: ["dns_freshness", "local_smb_directory", "directory_presets"],
  },
  DE: {
    countryCode: "DE",
    reportLocale: "de",
    currency: "EUR",
    symbol: "€",
    oneTimePrice: 1399,
    maintenancePrice: 49,
    defaultIndustryFocus: ["handwerk", "clinic", "restaurant", "manufacturing", "professional_services"],
    preferredSources: ["dns_freshness", "local_smb_directory", "directory_presets"],
  },
  JP: {
    countryCode: "JP",
    reportLocale: "ja",
    currency: "JPY",
    symbol: "¥",
    oneTimePrice: 298000,
    maintenancePrice: 9800,
    defaultIndustryFocus: ["dental", "beauty", "clinic", "construction", "restaurant"],
    preferredSources: ["local_smb_directory", "dns_freshness", "houjin_bangou"],
  },
} as const satisfies Record<string, GlobalSmbMarketConfig>

export type GlobalSmbMarketCode = keyof typeof GLOBAL_SMB_MARKETS

export function getGlobalSmbMarketConfig(countryCode: string): GlobalSmbMarketConfig {
  const key = normalizeSalesCountryCode(countryCode)
  return GLOBAL_SMB_MARKETS[key as GlobalSmbMarketCode] ?? GLOBAL_SMB_MARKETS.US
}
