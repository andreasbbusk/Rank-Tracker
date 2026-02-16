"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { ReportMetrics } from "../../types";
import {
  fetchGSCDataForReport,
  getDomainKeywords,
} from "../../actions/report.actions";

// GSC Data Types (from actions)
type KeywordReport = {
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
  keyword_reports?: KeywordReport[];
  errors?: string[];
  original_name?: string;
};

interface TopKeywordsBlockProps {
  content: ReportMetrics & {
    domain?: string; // Domain for GSC report
    domainId?: string; // Domain ID for fetching keywords
  };
  renderActionButtons: () => React.ReactNode;
}

const TopKeywordsBlock = ({
  content: metrics,
  renderActionButtons,
}: TopKeywordsBlockProps) => {
  const [gscData, setGscData] = useState<KeywordInsights | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function fetchTopKeywords() {
      if (!metrics.domain || !metrics.dateRange) return;

      setIsLoading(true);
      try {
        // Fetch keywords for the domain if domainId is available
        let keywords: string[] = [];
        if (metrics.domainId) {
          console.log("Fetching keywords for domain ID:", metrics.domainId);
          keywords = await getDomainKeywords(metrics.domainId);
          console.log("Fetched keywords:", {
            count: keywords.length,
            keywords: keywords.slice(0, 10),
          });
        }

        const gscReport = await fetchGSCDataForReport({
          domain: metrics.domain,
          keywords: keywords.length > 0 ? keywords : undefined,
          dateRange: metrics.dateRange,
          language: 1009, // Danish
          location: 2208, // Denmark
          engine: "google",
        });

        console.log("Top Keywords GSC Report Response:", {
          success: gscReport?.success,
          hasKeywordReports: !!gscReport?.keyword_reports,
          keywordReportsLength: gscReport?.keyword_reports?.length || 0,
          errors: gscReport?.errors,
        });

        setGscData(gscReport);
      } catch (error) {
        console.error("Failed to fetch top keywords data:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchTopKeywords();
  }, [metrics.domain, metrics.dateRange, metrics.domainId]);

  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat("da-DK").format(num);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("da-DK", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Get top 5 performing keywords based on search volume and position
  const getTopKeywords = () => {
    if (!gscData?.keyword_reports || gscData.keyword_reports.length === 0) {
      return [];
    }

    // Sort keywords by a performance score:
    // Higher search volume is better, lower position is better
    // Score = search_volume / (position^2) to heavily favor good positions
    return gscData.keyword_reports
      .filter((keyword) => keyword.avg_month_search > 0) // Only include keywords with search volume
      .map((keyword) => ({
        ...keyword,
        performanceScore:
          keyword.avg_month_search /
          Math.pow(Math.max(keyword.position || 50, 1), 1.5),
      }))
      .sort((a, b) => b.performanceScore - a.performanceScore)
      .slice(0, 5); // Get top 5
  };

  const topKeywords = getTopKeywords();

  return (
    <>
      {renderActionButtons()}

      <div className="py-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">
              Top 5 performerende søgeord
            </h3>
            <p className="text-sm text-gray-600">
              Bedst performerende søgeord baseret på søgevolumen og position
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isLoading && (
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Loader2 className="h-3 w-3 animate-spin" />
                Analyserer...
              </div>
            )}
            <div className="text-xs text-gray-500">
              {formatDate(metrics.dateRange.from)} -{" "}
              {formatDate(metrics.dateRange.to)}
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="py-12 text-center">
            <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-gray-400" />
            <p className="text-sm text-gray-500">Henter top keywords...</p>
          </div>
        ) : topKeywords.length > 0 ? (
          <div className="space-y-4">
            {topKeywords.map((keyword, index) => (
              <div
                key={keyword.keyword}
                className="flex items-center gap-4 rounded-lg border border-gray-100 bg-gray-50 p-4 transition-colors hover:bg-gray-100"
              >
                {/* Rank Indicator */}
                <div className="flex-shrink-0">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white">
                    {index + 1}
                  </div>
                </div>

                {/* Keyword Info */}
                <div className="min-w-0 flex-1">
                  <h4 className="truncate text-sm font-semibold text-gray-900">
                    {keyword.keyword}
                  </h4>
                  <div className="mt-1 flex items-center gap-4 text-xs text-gray-500">
                    <span>
                      {formatNumber(keyword.avg_month_search)} søgninger/md
                    </span>
                    {keyword.position && (
                      <span>Position {keyword.position.toFixed(1)}</span>
                    )}
                    {keyword.clicks && (
                      <span>{formatNumber(keyword.clicks)} klik</span>
                    )}
                  </div>
                </div>

                {/* Performance Indicator */}
                <div className="text-right">
                  <div className="text-xs text-gray-500">
                    {keyword.avg_month_search >= 1000 ? "Populært" : "Niche"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-gray-500">
            <p className="text-sm font-medium">
              Ingen keyword data tilgængelig
            </p>
            <p className="mt-1 text-xs text-gray-400">
              {gscData?.errors?.length
                ? `Fejl: ${gscData.errors.join(", ")}`
                : "Der blev ikke fundet keyword performance data for den valgte periode."}
            </p>
          </div>
        )}
      </div>
    </>
  );
};

export default TopKeywordsBlock;
