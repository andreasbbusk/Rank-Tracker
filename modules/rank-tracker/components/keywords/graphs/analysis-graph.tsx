"use client";

import { useEffect, useState } from "react";
import { cn } from "@/modules/core/lib/utils";
import { GeneralGraph } from "../../graphs/tracker-graph";
import { FormattedData } from "../../graphs/types";

interface DailyStats {
  created_at: string;
  page: string;
  position: number;
  clicks: number;
  impressions: number;
}

interface KeywordData {
  result?: {
    daily_stats_range_0?: DailyStats[];
    daily_stats_range_1?: DailyStats[];
    id?: number;
    domain?: number;
    title?: string;
    star_keyword?: boolean;
  };
}

interface AnalysisGraphProps {
  data: KeywordData;
  type: "position" | "performance";
  className?: string;
}

export default function AnalysisGraph({
  data,
  type,
  className,
}: AnalysisGraphProps) {
  const [graphData, setGraphData] = useState<FormattedData[]>([]);

  useEffect(() => {
    if (!data?.result) return;

    // Format main data (range_0)
    const mainData = (data.result.daily_stats_range_0 || []).map((record) => ({
      date: record.created_at,
      position: record.position || 0,
      clicks: record.clicks || 0,
      impressions: record.impressions || 0,
      ctr:
        record.impressions > 0 ? (record.clicks / record.impressions) * 100 : 0,
      page: record.page,
      isComparison: false,
    }));

    // Sort main data by date
    mainData.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );

    // Format comparison data if it exists
    let comparisonData: FormattedData[] = [];
    if (
      data.result.daily_stats_range_1 &&
      data.result.daily_stats_range_1.length > 0
    ) {
      comparisonData = data.result.daily_stats_range_1.map((record) => ({
        date: record.created_at,
        position: record.position || 0,
        clicks: record.clicks || 0,
        impressions: record.impressions || 0,
        ctr:
          record.impressions > 0
            ? (record.clicks / record.impressions) * 100
            : 0,
        page: record.page,
        isComparison: true,
      }));

      // Sort comparison data by date
      comparisonData.sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      );
    }

    // Combine the data with main data first, then comparison data
    const finalData = [...mainData, ...comparisonData];

    setGraphData(finalData);
  }, [data]);

  // Check if we have any data in either range
  const hasData =
    (data?.result?.daily_stats_range_0?.length ?? 0) > 0 ||
    (data?.result?.daily_stats_range_1?.length ?? 0) > 0;

  if (!hasData) {
    return (
      <div
        className={cn(
          "flex h-[300px] items-center justify-center rounded-xl border bg-white",
          className,
        )}
      >
        <p className="text-sm text-gray-500">Ingen data tilgængelig</p>
      </div>
    );
  }

  return (
    <GeneralGraph
      data={graphData}
      initialMetric={type === "position" ? "position" : "clicks"}
      className={cn("h-[296px]", className)}
      showDetailedTooltip={true}
      title={data.result?.title || "Søgeordsudvikling"}
      tooltipDescription={`Udviklingen for søgeordet "${data.result?.title || ""}" over tid`}
      showMetricSelector={true}
      isKeywordSpecific={true}
    />
  );
}
