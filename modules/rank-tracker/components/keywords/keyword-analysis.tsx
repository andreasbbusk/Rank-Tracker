"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/modules/core/components/ui/dialog";
import { cn } from "@/modules/core/lib/utils";
import { createKeywordModalView } from "@/modules/rank-tracker/actions/ranker-views.actions";
import type { Keyword } from "@/modules/rank-tracker/types";
import { Globe, Loader2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import AnalysisGraph from "./graphs/analysis-graph";
import AnalysisTable from "./tables/analysis-table";
import { getDateRanges } from "@/modules/analytics/utils/helpers/getDateRanges";

interface KeywordAnalysisProps {
  title: string;
  isOpen: boolean;
  onClose: () => void;
  keyword?: Keyword;
}

interface AnalysisData {
  result: {
    id: number;
    domain: number;
    title: string;
    star_keyword: boolean;
    daily_stats_range_0: Array<{
      created_at: string;
      page: string;
      position: number;
      clicks: number;
      impressions: number;
    }>;
    daily_stats_range_1: Array<{
      created_at: string;
      page: string;
      position: number;
      clicks: number;
      impressions: number;
    }>;
  };
}

const KeywordData = ({
  title,
  keyword,
}: {
  title: string;
  keyword?: Keyword;
}) => {
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const searchParams = useSearchParams();
  const range = searchParams.get("range");
  const rangeCompare = searchParams.get("rangeCompare");

  const { dateRanges } = getDateRanges({
    searchParams: {
      range: range ?? undefined,
      rangeCompare: rangeCompare ?? undefined,
    },
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!keyword?.id) return;

      setIsLoading(true);
      try {
        const response = await createKeywordModalView(keyword.id, dateRanges);

        if (response) {
          setAnalysisData(response);
        }
      } catch (error) {
        console.error("Error fetching keyword data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [keyword?.id, range, rangeCompare]);

  if (!keyword || isLoading) {
    return (
      <div className="flex h-[90vh] items-center justify-center">
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>
    );
  }

  // Check if we have any data in either range
  const hasData =
    analysisData?.result &&
    (analysisData.result.daily_stats_range_0?.length > 0 ||
      analysisData.result.daily_stats_range_1?.length > 0);

  if (!hasData) {
    return (
      <div className="flex h-[90vh] flex-col items-center justify-center gap-4">
        <p>Ingen data tilgængelig</p>
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-6">
      <div className="">
        <AnalysisGraph data={analysisData || { result: {} }} type="position" />
        <div className="mt-6">
          <AnalysisTable
            data={analysisData.result.daily_stats_range_0 || []}
            comparisonData={analysisData.result.daily_stats_range_1}
            type="position"
          />
        </div>
      </div>
    </div>
  );
};

const LoadingState = () => (
  <div className="flex h-[400px] items-center justify-center">
    <p>Indlæser data...</p>
  </div>
);

const KeywordAnalysis = ({
  title,
  isOpen,
  onClose,
  keyword,
}: KeywordAnalysisProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="no-scrollbar mx-4 max-h-[90vh] max-w-9xl overflow-y-auto p-0">
        <DialogHeader className="w-full bg-[#FAFAFA] p-6">
          <div className="flex flex-row items-center gap-4">
            <DialogTitle className="font-medium">{title}</DialogTitle>
            <div className="flex gap-3">
              {keyword?.location && keyword?.tags && (
                <div className="flex flex-wrap items-center gap-3">
                  <div
                    className={cn(
                      "flex flex-row items-center gap-3",
                      keyword.tags.length > 0 &&
                        "border-r border-gray-200 pr-4",
                    )}
                  >
                    <button
                      type="button"
                      className="bg-gradient-to-r inline-flex items-center gap-1.5 rounded-full from-slate-100 to-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm ring-1 ring-black/5 transition-all hover:bg-slate-100 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      aria-label={`Placering: ${
                        keyword.location.country === "DK" ||
                        keyword.location.country === "DNK"
                          ? "Danmark"
                          : keyword.location.country === "SE" ||
                              keyword.location.country === "SWE"
                            ? "Sverige"
                            : keyword.location.country === "NO" ||
                                keyword.location.country === "NOR"
                              ? "Norge"
                              : keyword.location.country === "FI" ||
                                  keyword.location.country === "FIN"
                                ? "Finland"
                                : keyword.location.country
                      }`}
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        // Her kunne tilføjes funktionalitet til filtrering efter land hvis ønsket
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          e.stopPropagation();
                          // Her kunne tilføjes funktionalitet til filtrering efter land hvis ønsket
                        }
                      }}
                    >
                      <Globe className="h-3.5 w-3.5 text-slate-500" />
                      {keyword.location.country === "DK" ||
                      keyword.location.country === "DNK"
                        ? "Danmark"
                        : keyword.location.country === "SE" ||
                            keyword.location.country === "SWE"
                          ? "Sverige"
                          : keyword.location.country === "NO" ||
                              keyword.location.country === "NOR"
                            ? "Norge"
                            : keyword.location.country === "FI" ||
                                keyword.location.country === "FIN"
                              ? "Finland"
                              : keyword.location.country}
                    </button>
                  </div>
                  {keyword.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {keyword.tags.map(
                        (tag: { name: string } | string, index: number) => (
                          <span
                            key={index}
                            className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10"
                          >
                            {typeof tag === "string" ? tag : tag.name}
                          </span>
                        ),
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="scrollbar-none overflow-y-auto p-6">
          <Suspense fallback={<LoadingState />}>
            {isOpen && <KeywordData title={title} keyword={keyword} />}
          </Suspense>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default KeywordAnalysis;
