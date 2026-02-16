"use server";

import {
  CreateReportPayload,
  KeywordReport,
  ReportMetrics,
  ReportContentBlock,
  DomainWithAnalytics,
} from "../types";
import {
  deleteReportById,
  getReportById as getPersistedReportById,
  listReportsByDomainId,
  persistReport,
} from "../db/services/report.service";
import { getDomainKeywordTitles } from "../db/services/keyword.service";
import { getKeywordInsights } from "../db/services/gsc.service";

// GSC Data Types
type KeywordReportGSC = {
  keyword: string;
  avg_month_search: number;
  competition: number;
  competition_index: number;
  three_month_change: number | string;
  yoy_change: number | string;
  low_top_of_page_bid: number;
  high_top_of_page_bid: number;
  monthly_search_volumes: MonthlySearchVolume[];
  query?: string;
  clicks?: number;
  impressions?: number;
  ctr?: number;
  position?: number;
};

type MonthlySearchVolume = {
  avg_searches: number;
  month: string;
};

type KeywordInsights = {
  success: boolean;
  keyword_reports?: KeywordReportGSC[];
  errors?: string[];
  original_name?: string;
};

// Add function to get keywords for a domain
export async function getDomainKeywords(domainId: string): Promise<string[]> {
  try {
    const keywords = await getDomainKeywordTitles(domainId);

    return keywords
      .filter((title) => title && title.trim().length > 0)
      .map((title) => title.trim());
  } catch (error) {
    console.error("Error fetching keywords for domain:", domainId, error);
    return [];
  }
}

// GSC Report fetch function for rank tracker reports (mocked for portfolio demo)
export async function fetchGSCDataForReport({
  domain,
  keywords,
  dateRange,
  language = 1009,
  location = 2208,
  engine = "google",
}: {
  domain: string;
  keywords?: string[];
  dateRange: { from: string; to: string };
  language?: number;
  location?: number;
  engine?: "google" | "partners";
}): Promise<KeywordInsights | null> {
  try {
    void dateRange;
    void language;
    void location;
    void engine;

    return await getKeywordInsights({
      domain,
      keywords,
    });
  } catch (error) {
    console.error("Failed to fetch GSC data for domain:", domain, error);
    return null;
  }
}

const calculatePercentageChange = (
  current: number,
  previous: number,
): number => {
  if (previous === 0) return current === 0 ? 0 : 100;
  return ((current - previous) / previous) * 100;
};

// Helper function to calculate absolute change
const calculateAbsoluteChange = (current: number, previous: number): number => {
  return current - previous;
};

async function saveReport(report: KeywordReport): Promise<void> {
  await persistReport(report);
}

export const createKeywordReport = async (
  payload: CreateReportPayload,
  domain: DomainWithAnalytics,
): Promise<KeywordReport> => {
  // Debug logging
  console.log("Creating report with domain data:", {
    domainId: domain.id,
    displayName: domain.display_name,
    hasDateRange0: !!domain.date_range_0,
    hasDateRange1: !!domain.date_range_1,
    keywordsCount: domain.keywords_count,
    avgPosition: domain.avg_position,
    clicks: domain.clicks,
    impressions: domain.impressions,
    domainData: domain,
  });

  // Calculate date ranges - current period and previous period for comparison
  const currentDate = new Date();
  const periodLength = payload.dateRange
    ? Math.abs(
        payload.dateRange.to.getTime() - payload.dateRange.from.getTime(),
      )
    : 30 * 24 * 60 * 60 * 1000; // Default 30 days

  const currentPeriodEnd = payload.dateRange?.to || currentDate;
  const currentPeriodStart =
    payload.dateRange?.from || new Date(currentDate.getTime() - periodLength);

  // Previous period has same length, ending just before current period starts
  const previousPeriodEnd = new Date(
    currentPeriodStart.getTime() - 24 * 60 * 60 * 1000,
  ); // 1 day before current period starts
  const previousPeriodStart = new Date(
    previousPeriodEnd.getTime() - periodLength,
  );

  // Get current period data (from domain analytics or domain.date_range_0)
  const currentPeriodData = domain.date_range_0 || {
    total_keywords: domain.keywords_count || 0,
    overall_stats: {
      position: domain.avg_position || 0,
      clicks: domain.clicks || 0,
      impressions: domain.impressions || 0,
    },
  };

  // Get previous period data (from domain.date_range_1 or simulate realistic previous data)
  const hasPreviousData = !!domain.date_range_1;
  const previousPeriodData = domain.date_range_1 || {
    total_keywords: Math.max(
      0,
      (domain.keywords_count || 0) - Math.floor(Math.random() * 3),
    ),
    overall_stats: {
      position: (domain.avg_position || 0) + (Math.random() * 0.5 - 0.25), // Slight variation
      clicks: Math.max(
        0,
        (domain.clicks || 0) - Math.floor(Math.random() * 100),
      ),
      impressions: Math.max(
        0,
        (domain.impressions || 0) - Math.floor(Math.random() * 500),
      ),
    },
  };

  console.log("Data analysis:", {
    hasPreviousData,
    currentPeriodData,
    previousPeriodData,
    hasDate0: !!domain.date_range_0,
    hasDate1: !!domain.date_range_1,
  });

  // Current period metrics
  const currentKeywords = currentPeriodData.total_keywords;
  const currentPosition = currentPeriodData.overall_stats.position;
  const currentClicks = currentPeriodData.overall_stats.clicks;
  const currentImpressions = currentPeriodData.overall_stats.impressions;
  const currentCTR =
    currentImpressions > 0 ? currentClicks / currentImpressions : 0;

  // Previous period metrics
  const previousKeywords = previousPeriodData.total_keywords;
  const previousPosition = previousPeriodData.overall_stats.position;
  const previousClicks = previousPeriodData.overall_stats.clicks;
  const previousImpressions = previousPeriodData.overall_stats.impressions;
  const previousCTR =
    previousImpressions > 0 ? previousClicks / previousImpressions : 0;

  // Calculate changes
  const keywordsChange = calculateAbsoluteChange(
    currentKeywords,
    previousKeywords,
  );
  const positionChange = calculateAbsoluteChange(
    previousPosition,
    currentPosition,
  ); // Positive means improvement (lower position)
  const clicksChange = calculateAbsoluteChange(currentClicks, previousClicks);
  const impressionsChange = calculateAbsoluteChange(
    currentImpressions,
    previousImpressions,
  );
  const ctrChange = calculatePercentageChange(currentCTR, previousCTR);

  // Calculate estimated value change (using a simple multiplier for demonstration)
  const estimatedValuePerClick = 12; // DKK per click
  const currentValue = currentClicks * estimatedValuePerClick;
  const previousValue = previousClicks * estimatedValuePerClick;
  const valueChange = calculateAbsoluteChange(currentValue, previousValue);

  // Generate sample graph data for dashboard graphs
  const generateSampleGraphData = (
    startDate: Date,
    endDate: Date,
    baseClicks: number,
    basePosition: number,
  ) => {
    const days = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
    );
    const graphData = [];

    for (let i = 0; i <= days; i++) {
      const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      const variation = 0.8 + Math.random() * 0.4; // Random variation between 0.8 and 1.2

      graphData.push({
        created_at: date.toISOString(),
        position: Math.max(1, basePosition + (Math.random() - 0.5) * 2),
        clicks: Math.floor(baseClicks * variation),
        impressions: Math.floor(baseClicks * variation * 10), // Rough CTR estimation
      });
    }

    return graphData;
  };

  const currentGraphData = generateSampleGraphData(
    currentPeriodStart,
    currentPeriodEnd,
    currentClicks / 30,
    currentPosition,
  );
  const previousGraphData = generateSampleGraphData(
    previousPeriodStart,
    previousPeriodEnd,
    previousClicks / 30,
    previousPosition,
  );

  // Generate enhanced metrics with comparison data
  const metrics: ReportMetrics & {
    previousPeriod?: {
      totalKeywords: number;
      avgPosition: number;
      totalClicks: number;
      totalImpressions: number;
      avgCTR: number;
      estimatedValue: number;
    };
    changes?: {
      keywordsChange: number;
      positionChange: number;
      clicksChange: number;
      impressionsChange: number;
      ctrChange: number;
      valueChange: number;
    };
  } = {
    // Current period
    totalKeywords: currentKeywords,
    avgPosition: currentPosition,
    totalClicks: currentClicks,
    totalImpressions: currentImpressions,
    avgCTR: currentCTR,
    topRankingKeywords:
      domain.top_3_keywords || Math.floor(currentKeywords * 0.3),
    improvementOpportunities: Math.floor(currentKeywords * 0.25),
    dateRange: {
      from: currentPeriodStart.toISOString(),
      to: currentPeriodEnd.toISOString(),
    },
    // Previous period data (only if we have real comparison data)
    ...(hasPreviousData && {
      previousPeriod: {
        totalKeywords: previousKeywords,
        avgPosition: previousPosition,
        totalClicks: previousClicks,
        totalImpressions: previousImpressions,
        avgCTR: previousCTR,
        estimatedValue: previousValue,
      },
      // Changes between periods
      changes: {
        keywordsChange,
        positionChange,
        clicksChange,
        impressionsChange,
        ctrChange,
        valueChange,
      },
    }),
  };

  // Create content blocks with comparison data
  const contentBlocks: ReportContentBlock[] = [
    {
      id: "intro-text",
      type: "text",
      content: {
        text: `Denne rapport giver en dybdegående analyse af søgeords-performance for ${domain.display_name} fra ${currentPeriodStart.toLocaleDateString("da-DK")} til ${currentPeriodEnd.toLocaleDateString("da-DK")}. Resultaterne er sammenlignet med den foregående periode for at belyse tendenser og udvikling.`,
      },
      position: 0,
      editable: true,
    },
    {
      id: "dashboard-scorecards",
      type: "scorecards",
      content: {
        totalKeywords: currentKeywords,
        avgPosition: currentPosition,
        avgPositionChange: positionChange,
        keywordsChange,
        avgCTR: currentCTR * 100, // Convert to percentage
        ctrChange,
        totalClicks: currentClicks,
        clicksChange,
        totalImpressions: currentImpressions,
        impressionsChange,
        topPositionKeywords: Math.floor(currentKeywords * 0.15),
        midPositionKeywords: Math.floor(currentKeywords * 0.25),
        lowPositionKeywords: Math.floor(currentKeywords * 0.3),
      },
      position: 1,
      editable: false,
    },
    {
      id: "dashboard-graph",
      type: "dashboard-graph",
      content: {
        title: "Performance udvikling",
        graphData: currentGraphData,
        compareGraphData: previousGraphData,
      },
      position: 3,
      editable: false,
    },
    {
      id: "key-metrics",
      type: "metrics",
      content: {
        ...metrics,
        ...(hasPreviousData && {
          previousDateRange: {
            from: previousPeriodStart.toISOString(),
            to: previousPeriodEnd.toISOString(),
          },
        }),
        estimatedValue: currentValue,
      },
      position: 2,
      editable: false,
    },
    {
      id: "highlights",
      type: "highlight",
      content: {
        ...metrics,
        ...(hasPreviousData && {
          previousDateRange: {
            from: previousPeriodStart.toISOString(),
            to: previousPeriodEnd.toISOString(),
          },
        }),
        estimatedValue: currentValue,
        domain: domain.url || domain.display_name,
        domainId: domain.id?.toString(),
      },
      position: 4,
      editable: true,
    },
    {
      id: "top-keywords",
      type: "top-keywords",
      content: {
        ...metrics,
        ...(hasPreviousData && {
          previousDateRange: {
            from: previousPeriodStart.toISOString(),
            to: previousPeriodEnd.toISOString(),
          },
        }),
        estimatedValue: currentValue,
        domain: domain.url || domain.display_name,
        domainId: domain.id?.toString(),
      },
      position: 5,
      editable: false,
    },
    {
      id: "conclusion",
      type: "conclusion",
      content: {
        text: "# Enden af rapporten\n\nDette konkluderer SEO rapporten. Husk at Google trafik svinger meget, hvis du kigger på det kortsigtet.",
      },
      position: 6,
      editable: true,
    },
  ];

  const report: KeywordReport = {
    id: crypto.randomUUID(),
    name: payload.name,
    domain,
    type: payload.type,
    status: "ready",
    metrics: metrics as ReportMetrics,
    contentBlocks,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    generatedBy: "current-user",
  };

  await saveReport(report);
  return report;
};

export const updateKeywordReport = async (
  report: KeywordReport,
): Promise<KeywordReport> => {
  const updatedReport = { ...report, updatedAt: new Date().toISOString() };
  await saveReport(updatedReport);
  return updatedReport;
};

// Get report by ID
export const getReportById = async (
  reportId: string,
): Promise<KeywordReport | null> => {
  try {
    return await getPersistedReportById(reportId);
  } catch (error) {
    console.error("Error fetching report:", error);
    return null;
  }
};

// Delete report by ID
export const deleteKeywordReport = async (
  reportId: string,
): Promise<boolean> => {
  try {
    return await deleteReportById(reportId);
  } catch (error) {
    console.error("Error deleting report:", error);
    return false;
  }
};

// Get all reports for a domain
export const getReportsByDomainId = async (
  domainId: string,
): Promise<KeywordReport[]> => {
  try {
    return await listReportsByDomainId(domainId);
  } catch (error) {
    console.error("Error fetching reports for domain:", error);
    return [];
  }
};

// Duplicate a report with a new UUID
export const duplicateKeywordReport = async (
  originalReport: KeywordReport,
  newName?: string,
): Promise<KeywordReport> => {
  const duplicatedReport: KeywordReport = {
    ...originalReport,
    id: crypto.randomUUID(),
    name: newName || `${originalReport.name} (Kopi)`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: "ready",
  };

  await saveReport(duplicatedReport);
  return duplicatedReport;
};

// Export report data (for potential API storage)
export const exportReportData = async (report: KeywordReport) => {
  return {
    id: report.id,
    name: report.name,
    domainId: report.domain.id,
    type: report.type,
    status: report.status,
    metrics: report.metrics,
    contentBlocks: report.contentBlocks,
    layout: report.layout,
    createdAt: report.createdAt,
    updatedAt: report.updatedAt,
    generatedBy: report.generatedBy,
  };
};
