import { fetchFilteredLargeCsvRows, largeCsvInputFromFieldMapping } from "./lead-source-large-csv"
import {
  commonCrawlDomainSignalInputFromFieldMapping,
  commonCrawlInputFromFieldMapping,
  fetchCommonCrawlDomainSignal,
  fetchCommonCrawlIntersection,
} from "./lead-source-common-crawl"
import { fetchStartupSgDirectoryRows, startupSgInputFromFieldMapping } from "./lead-source-startupsg"

type JsonRecord = Record<string, unknown>

export async function fetchSpecialLeadSourceRows(config: {
  source_url: string
  field_mapping: JsonRecord
}): Promise<{ rows: JsonRecord[]; rawCount: number } | null> {
  const startupSgInput = startupSgInputFromFieldMapping(config.source_url, config.field_mapping)
  if (startupSgInput) return fetchStartupSgDirectoryRows(startupSgInput)

  const largeCsvInput = largeCsvInputFromFieldMapping(config.source_url, config.field_mapping)
  if (largeCsvInput) return fetchFilteredLargeCsvRows(largeCsvInput)

  const domainSignalInput = commonCrawlDomainSignalInputFromFieldMapping(config.source_url, config.field_mapping)
  if (domainSignalInput) return fetchCommonCrawlDomainSignal(domainSignalInput)

  const intersectionInput = commonCrawlInputFromFieldMapping(config.source_url, config.field_mapping)
  return intersectionInput ? fetchCommonCrawlIntersection(intersectionInput) : null
}
