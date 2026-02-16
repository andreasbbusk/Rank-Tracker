import {
  DashboardMetrics,
  DashboardResponse,
  RangeStats,
} from "../types/index";

/**
 * Calculates dashboard metrics from API response data
 * @param dashboardData - Response data from the dashboard API
 * @returns Calculated metrics or null if data is invalid
 */
export const calculateMetrics = (
  dashboardData: DashboardResponse | any,
): DashboardMetrics | null => {
  try {
    if (
      !dashboardData?.records ||
      !Array.isArray(dashboardData.records) ||
      dashboardData.records.length < 2
    ) {
      // Return default metrics if we don't have comparison data
      if (dashboardData?.records?.[0]) {
        const currentPeriod = dashboardData.records[0];
        const currentCTR =
          currentPeriod.overall_stats.impressions > 0
            ? (currentPeriod.overall_stats.clicks /
                currentPeriod.overall_stats.impressions) *
              100
            : 0;

        return {
          avgPosition: currentPeriod.overall_stats.position || 0,
          avgPositionChange: 0,
          totalKeywords: currentPeriod.total_keywords || 0,
          keywordsChange: 0,
          avgCTR: currentCTR,
          ctrChange: 0,
          totalClicks: currentPeriod.overall_stats.clicks || 0,
          clicksChange: 0,
          totalImpressions: currentPeriod.overall_stats.impressions || 0,
          impressionsChange: 0,
          topPositionKeywords:
            currentPeriod.range_stats.find((r: RangeStats) => r.range === "0-3")
              ?.keyword_counts || 0,
          midPositionKeywords:
            currentPeriod.range_stats.find(
              (r: RangeStats) => r.range === "3-10",
            )?.keyword_counts || 0,
          lowPositionKeywords:
            currentPeriod.range_stats.find(
              (r: RangeStats) => r.range === "10-20",
            )?.keyword_counts || 0,
        };
      }
      return null;
    }

    const currentPeriod = dashboardData.records[0];
    const previousPeriod = dashboardData.records[1];

    if (!currentPeriod?.overall_stats || !previousPeriod?.overall_stats) {
      return null;
    }

    // Calculate position changes
    const currentPosition = currentPeriod.overall_stats.position || 0;
    const previousPosition = previousPeriod.overall_stats.position || 0;
    const positionChange =
      previousPosition > 0
        ? ((previousPosition - currentPosition) / previousPosition) * 100
        : 0;

    // Calculate CTR
    const currentClicks = currentPeriod.overall_stats.clicks || 0;
    const currentImpressions = currentPeriod.overall_stats.impressions || 0;
    const previousClicks = previousPeriod.overall_stats.clicks || 0;
    const previousImpressions = previousPeriod.overall_stats.impressions || 0;

    const currentCTR =
      currentImpressions > 0 ? (currentClicks / currentImpressions) * 100 : 0;
    const previousCTR =
      previousImpressions > 0
        ? (previousClicks / previousImpressions) * 100
        : 0;
    const ctrChange =
      previousCTR > 0 ? ((currentCTR - previousCTR) / previousCTR) * 100 : 0;

    // Calculate clicks change
    const clicksChange =
      previousClicks > 0
        ? ((currentClicks - previousClicks) / previousClicks) * 100
        : 0;

    // Calculate impressions change
    const impressionsChange =
      previousImpressions > 0
        ? ((currentImpressions - previousImpressions) / previousImpressions) *
          100
        : 0;

    // Calculate keyword change
    const currentKeywords = currentPeriod.total_keywords || 0;
    const previousKeywords = previousPeriod.total_keywords || 0;
    const keywordsChange =
      previousKeywords > 0
        ? ((currentKeywords - previousKeywords) / previousKeywords) * 100
        : 0;

    // Get position ranges from current period
    const topPositions =
      currentPeriod.range_stats.find((r: RangeStats) => r.range === "0-3")
        ?.keyword_counts || 0;
    const midPositions =
      currentPeriod.range_stats.find((r: RangeStats) => r.range === "3-10")
        ?.keyword_counts || 0;
    const lowPositions =
      currentPeriod.range_stats.find((r: RangeStats) => r.range === "10-20")
        ?.keyword_counts || 0;

    return {
      avgPosition: currentPosition,
      avgPositionChange: positionChange,
      totalKeywords: currentKeywords,
      keywordsChange: keywordsChange,
      avgCTR: currentCTR,
      ctrChange,
      totalClicks: currentClicks,
      clicksChange,
      totalImpressions: currentImpressions,
      impressionsChange,
      topPositionKeywords: topPositions,
      midPositionKeywords: midPositions,
      lowPositionKeywords: lowPositions,
    };
  } catch (error) {
    console.error("Error calculating dashboard metrics:", error);
    return null;
  }
};
