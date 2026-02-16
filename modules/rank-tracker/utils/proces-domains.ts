import { getGSCKeywords } from "../actions/ranker-keyword.actions";
import { DomainView, DomainWithAnalytics, RangeStats } from "../types/index";

export async function processDomains(
  domains: DomainView[] | null,
  isIntegrated: boolean,
): Promise<DomainWithAnalytics[]> {
  if (!domains) return [];
  return await Promise.all(
    domains
      ?.filter((d) => d.dateRange === "date_range_0")
      .map(async (domain) => {
        // Format URL for GSC
        let formattedUrl = domain.url;
        if (!formattedUrl.startsWith("http")) {
          formattedUrl = `sc-domain:${formattedUrl.replace(/^www\./, "")}`;
        }

        // Find matching domain view records by both URL and display name
        const viewRecords = domains?.filter(
          (record: DomainView) =>
            record.url === domain.url &&
            record.display_name === domain.display_name,
        );

        let analyticsData = {
          avg_position: 0,
          clicks: 0,
          impressions: 0,
          top_3_keywords: 0,
          keywords_count: 0,
          date_range_0: undefined as DomainView | undefined,
          date_range_1: undefined as DomainView | undefined,
          gsc_url: formattedUrl,
        };

        // Add domain view data if available
        if (viewRecords && viewRecords.length > 0) {
          viewRecords.forEach((record: DomainView) => {
            if (record.dateRange === "date_range_0") {
              analyticsData.date_range_0 = record;
              analyticsData.avg_position = record.overall_stats.position ?? 0;
              analyticsData.clicks = record.overall_stats.clicks;
              analyticsData.impressions = record.overall_stats.impressions;
              analyticsData.keywords_count = record.total_keywords;
              analyticsData.top_3_keywords =
                record.range_stats.find(
                  (stat: RangeStats) => stat.range === "0-3",
                )?.keyword_counts || 0;
            } else if (record.dateRange === "date_range_1") {
              analyticsData.date_range_1 = record;
            }
          });
        }

        // Fetch GSC data for this domain if integrated
        let gscData = null;
        if (isIntegrated) {
          try {
            gscData = await getGSCKeywords(formattedUrl);
          } catch (error) {
            console.error(
              `Error fetching GSC data for ${formattedUrl}:`,
              error,
            );
          }
        }

        return {
          ...domain,
          ...analyticsData,
          gscData,
        };
      }),
  );
}
