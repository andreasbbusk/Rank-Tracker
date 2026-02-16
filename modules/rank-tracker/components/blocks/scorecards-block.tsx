"use client";

import DashboardScoreCard from "../keywords/dashboard-scorecard";
import { DashboardMetrics } from "../../types";

interface ScorecardsBlockProps {
  content: DashboardMetrics;
  renderActionButtons: () => React.ReactNode;
}

const ScorecardsBlock = ({
  content: metrics,
  renderActionButtons,
}: ScorecardsBlockProps) => {
  if (!metrics) {
    return (
      <>
        {renderActionButtons()}
        <div className="text-center text-gray-500">
          Ingen data tilgængelig for dashboard kort
        </div>
      </>
    );
  }

  return (
    <>
      {renderActionButtons()}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <DashboardScoreCard
          title="Antal søgeord"
          value={metrics.totalKeywords}
          change={metrics.keywordsChange}
          format="number"
          tooltip="Det totale antal søgeord du tracker"
          showTooltip={false}
        />
        <DashboardScoreCard
          title="Top 1-3"
          value={metrics.topPositionKeywords}
          format="number"
          tooltip="Antal søgeord der rangerer mellem position 1-3"
          showTooltip={false}
        />
        <DashboardScoreCard
          title="Top 3-10"
          value={metrics.midPositionKeywords}
          format="number"
          tooltip="Antal søgeord der rangerer mellem position 4-10"
          showTooltip={false}
        />
        <DashboardScoreCard
          title="CTR"
          value={metrics.avgCTR}
          change={metrics.ctrChange}
          format="percentage"
          tooltip="Procentdel af visninger der resulterede i klik"
          showTooltip={false}
        />
      </div>
    </>
  );
};

export default ScorecardsBlock;
