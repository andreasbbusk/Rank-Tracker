"use client";

import { useState } from "react";
import { DashboardMetrics, GraphStats } from "../../types/index";
import DashboardScoreCard from "./dashboard-scorecard";
import DashboardGraph from "./graphs/dashboard-graph";
import { Loader2 } from "lucide-react";

export default function DashboardClient({
  domainId,
  metrics,
  graphData,
  compareGraphData,
}: {
  domainId: string;
  metrics: DashboardMetrics | null;
  graphData: GraphStats[];
  compareGraphData: GraphStats[];
}) {
  const [isUpdating, setIsUpdating] = useState(false);

  if (!domainId) {
    return (
      <div className="flex h-[calc(100vh-200px)] items-center justify-center">
        <p className="text-lg text-gray-500">Vælg venligst et domæne</p>
      </div>
    );
  }

  if (isUpdating) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div
              key={index}
              className="flex h-[86px] w-full items-center justify-center rounded-2xl border border-black/10 bg-white shadow-sm"
            >
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            </div>
          ))}
        </div>

        <div className="rounded-xl bg-white py-6">
          <div className="flex h-[296px] items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="flex h-[calc(100vh-200px)] items-center justify-center">
        <p className="text-lg text-gray-500">Ingen data fundet</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <DashboardScoreCard
          title="Antal søgeord"
          value={metrics.totalKeywords}
          change={metrics.keywordsChange}
          format="number"
          tooltip="Det totale antal søgeord du tracker"
        />
        <DashboardScoreCard
          title="Top 1-3"
          value={metrics.topPositionKeywords}
          format="number"
          tooltip="Antal søgeord der rangerer mellem position 1-3"
        />
        <DashboardScoreCard
          title="Top 3-10"
          value={metrics.midPositionKeywords}
          format="number"
          tooltip="Antal søgeord der rangerer mellem position 4-10"
        />
        <DashboardScoreCard
          title="Top 10-20"
          value={metrics.lowPositionKeywords}
          format="number"
          tooltip="Antal søgeord der rangerer mellem position 11-20"
        />
        <DashboardScoreCard
          title="Kliks"
          value={metrics.totalClicks}
          change={metrics.clicksChange}
          format="number"
          tooltip="Det totale antal klik på tværs af alle søgeord"
        />
        <DashboardScoreCard
          title="Eksponeringer"
          value={metrics.totalImpressions}
          change={metrics.impressionsChange}
          format="number"
          tooltip="Det totale antal visninger på tværs af alle søgeord"
        />
        <DashboardScoreCard
          title="CTR"
          value={metrics.avgCTR}
          change={metrics.ctrChange}
          format="percentage"
          tooltip="Procentdel af visninger der resulterede i klik"
        />
        <DashboardScoreCard
          title="Gns. position"
          value={metrics.avgPosition}
          change={metrics.avgPositionChange}
          format="position"
          reversed={true}
          tooltip="Den gennemsnitlige position for alle dine søgeord"
        />
      </div>

      <div className="rounded-xl bg-white py-6">
        <DashboardGraph data={graphData} compareData={compareGraphData} />
      </div>
    </div>
  );
}
