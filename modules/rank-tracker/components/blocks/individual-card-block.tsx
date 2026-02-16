"use client";

import DashboardScoreCard from "../keywords/dashboard-scorecard";
import { DashboardMetrics, ReportContentBlock } from "../../types";

interface IndividualCardBlockProps {
  blockType: ReportContentBlock["type"];
  content: DashboardMetrics;
  renderActionButtons: () => React.ReactNode;
}

const IndividualCardBlock = ({
  blockType,
  content: metrics,
  renderActionButtons,
}: IndividualCardBlockProps) => {
  // Individual Score Card Renderers
  const renderIndividualScoreCard = (
    title: string,
    value: number | string,
    change?: number,
    format?: "number" | "percentage" | "currency" | "position",
    tooltip?: string,
    reversed?: boolean,
  ) => {
    return (
      <>
        {renderActionButtons()}

        <div className="flex justify-center">
          <div className="w-full max-w-sm">
            <DashboardScoreCard
              title={title}
              value={value}
              change={change}
              format={format}
              tooltip={tooltip}
              reversed={reversed}
              showTooltip={false}
            />
          </div>
        </div>
      </>
    );
  };

  const renderCardKeywords = () => {
    return renderIndividualScoreCard(
      "Antal søgeord",
      metrics?.totalKeywords || 0,
      metrics?.keywordsChange,
      "number",
      "Det totale antal søgeord du tracker",
    );
  };

  const renderCardPosition = () => {
    return renderIndividualScoreCard(
      "Gns. position",
      metrics?.avgPosition || 0,
      metrics?.avgPositionChange,
      "position",
      "Den gennemsnitlige position for alle dine søgeord",
      true,
    );
  };

  const renderCardClicks = () => {
    return renderIndividualScoreCard(
      "Kliks",
      metrics?.totalClicks || 0,
      metrics?.clicksChange,
      "number",
      "Det totale antal klik på tværs af alle søgeord",
    );
  };

  const renderCardImpressions = () => {
    return renderIndividualScoreCard(
      "Eksponeringer",
      metrics?.totalImpressions || 0,
      metrics?.impressionsChange,
      "number",
      "Det totale antal visninger på tværs af alle søgeord",
    );
  };

  const renderCardCtr = () => {
    return renderIndividualScoreCard(
      "CTR",
      metrics?.avgCTR || 0,
      metrics?.ctrChange,
      "percentage",
      "Procentdel af visninger der resulterede i klik",
    );
  };

  const renderCardTopPositions = () => {
    return (
      <>
        {renderActionButtons()}

        <h3 className="mb-6 text-lg font-medium text-gray-900">
          Top positioner
        </h3>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <DashboardScoreCard
            title="Top 1-3"
            value={metrics?.topPositionKeywords || 0}
            format="number"
            tooltip="Antal søgeord der rangerer mellem position 1-3"
            showTooltip={false}
          />
          <DashboardScoreCard
            title="Top 3-10"
            value={metrics?.midPositionKeywords || 0}
            format="number"
            tooltip="Antal søgeord der rangerer mellem position 4-10"
            showTooltip={false}
          />
          <DashboardScoreCard
            title="Top 10-20"
            value={metrics?.lowPositionKeywords || 0}
            format="number"
            tooltip="Antal søgeord der rangerer mellem position 11-20"
            showTooltip={false}
          />
        </div>
      </>
    );
  };

  // Route to the appropriate renderer based on block type
  switch (blockType) {
    case "card-keywords":
      return renderCardKeywords();
    case "card-position":
      return renderCardPosition();
    case "card-clicks":
      return renderCardClicks();
    case "card-impressions":
      return renderCardImpressions();
    case "card-ctr":
      return renderCardCtr();
    case "card-top-positions":
      return renderCardTopPositions();
    default:
      return (
        <>
          {renderActionButtons()}
          <div className="text-center text-gray-500">
            Ukendt kort type: {blockType}
          </div>
        </>
      );
  }
};

export default IndividualCardBlock;
