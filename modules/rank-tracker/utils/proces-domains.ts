import { getGSCKeywordsBySiteUrls } from "../db/services/gsc.service";
import { DomainView, DomainWithAnalytics, RangeStats } from "../types/index";

export async function processDomains(
  domains: DomainView[] | null,
  isIntegrated: boolean,
): Promise<DomainWithAnalytics[]> {
  if (!domains) return [];
  const primaryDomains = domains.filter((domain) => domain.dateRange === "date_range_0");
  const domainsByIdentity = new Map<string, DomainView[]>();

  for (const record of domains) {
    const key = `${record.url}::${record.display_name}`;
    const existing = domainsByIdentity.get(key) || [];
    existing.push(record);
    domainsByIdentity.set(key, existing);
  }

  const formattedUrls = primaryDomains.map((domain) =>
    domain.url.startsWith("http")
      ? domain.url
      : `sc-domain:${domain.url.replace(/^www\./, "")}`,
  );

  const gscDataByUrl = isIntegrated
    ? await getGSCKeywordsBySiteUrls(formattedUrls)
    : new Map<string, { success: true; records: unknown[] }>();

  return primaryDomains.map((domain) => {
    const key = `${domain.url}::${domain.display_name}`;
    const viewRecords = domainsByIdentity.get(key) || [];
    const formattedUrl = domain.url.startsWith("http")
      ? domain.url
      : `sc-domain:${domain.url.replace(/^www\./, "")}`;

    const analyticsData = {
      avg_position: 0,
      clicks: 0,
      impressions: 0,
      top_3_keywords: 0,
      keywords_count: 0,
      date_range_0: undefined as DomainView | undefined,
      date_range_1: undefined as DomainView | undefined,
      gsc_url: formattedUrl,
    };

    for (const record of viewRecords) {
      if (record.dateRange === "date_range_0") {
        analyticsData.date_range_0 = record;
        analyticsData.avg_position = record.overall_stats.position ?? 0;
        analyticsData.clicks = record.overall_stats.clicks;
        analyticsData.impressions = record.overall_stats.impressions;
        analyticsData.keywords_count = record.total_keywords;
        analyticsData.top_3_keywords =
          record.range_stats.find((stat: RangeStats) => stat.range === "0-3")
            ?.keyword_counts || 0;
      } else if (record.dateRange === "date_range_1") {
        analyticsData.date_range_1 = record;
      }
    }

    return {
      ...domain,
      ...analyticsData,
      gscData: gscDataByUrl.get(formattedUrl) || null,
    };
  });
}
