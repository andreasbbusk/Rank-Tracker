"use client";

import { useEffect, useState } from "react";
import { cn } from "@/modules/core/lib/utils";
import { GeneralGraph } from "../../graphs/tracker-graph";
import { FormattedData, GraphStats } from "../../graphs/types";
import { Loader2 } from "lucide-react";

interface DashboardGraphProps {
  data: GraphStats[];
  compareData?: GraphStats[];
  className?: string;
  isLoading?: boolean;
  initialMetric?: "clicks" | "impressions" | "position" | "ctr";
}

export default function DashboardGraph({
  data,
  compareData,
  className,
  isLoading = false,
  initialMetric = "clicks",
}: DashboardGraphProps) {
  const [graphData, setGraphData] = useState<FormattedData[]>([]);
  const [isProcessingData, setIsProcessingData] = useState(true);

  useEffect(() => {
    setIsProcessingData(true);

    if (!data || !Array.isArray(data) || data.length === 0) {
      setIsProcessingData(false);
      return;
    }

    try {
      // Format main data
      const formattedData = data.map((record) => ({
        date: record.created_at,
        position: record.position || 0,
        clicks: record.clicks || 0,
        impressions: record.impressions || 0,
        ctr:
          record.impressions > 0
            ? (record.clicks / record.impressions) * 100
            : 0,
        isComparison: false, // Explicitly mark as main data
      }));

      // Keep comparison data separate
      let finalData = [...formattedData];

      // Only add comparison data if it exists
      if (compareData && compareData.length > 0) {
        const formattedCompareData = compareData.map((record) => ({
          date: record.created_at,
          position: record.position || 0,
          clicks: record.clicks || 0,
          impressions: record.impressions || 0,
          ctr:
            record.impressions > 0
              ? (record.clicks / record.impressions) * 100
              : 0,
          isComparison: true,
        }));

        finalData = [...formattedData, ...formattedCompareData];
      }

      setGraphData(finalData);
    } catch (error) {
      console.error("Error formatting graph data:", error);
    } finally {
      setIsProcessingData(false);
    }
  }, [data, compareData]);

  if (isLoading || isProcessingData) {
    return (
      <div
        className={cn(
          "flex h-[300px] items-center justify-center rounded-xl border bg-white",
          className,
        )}
      >
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!data || data.length === 0) {
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
      initialMetric={initialMetric}
      className={className}
      showDetailedTooltip={false}
      showMetricSelector={false}
      showTooltip={false}
    />
  );
}
