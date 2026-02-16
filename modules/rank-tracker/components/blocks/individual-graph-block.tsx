"use client";

import { BarChart3 } from "lucide-react";
import DashboardGraph from "../keywords/graphs/dashboard-graph";
import { GraphStats, ReportContentBlock } from "../../types";

interface IndividualGraphBlockProps {
  blockType: ReportContentBlock["type"];
  content: {
    graphData: GraphStats[];
    compareGraphData?: GraphStats[];
  };
  renderActionButtons: () => React.ReactNode;
}

const IndividualGraphBlock = ({
  blockType,
  content,
  renderActionButtons,
}: IndividualGraphBlockProps) => {
  // Individual Graph Renderers
  const renderIndividualGraph = (
    title: string,
    metric: "clicks" | "impressions" | "position" | "ctr",
  ) => {
    if (!content || !content.graphData || content.graphData.length === 0) {
      return (
        <>
          {renderActionButtons()}

          <div className="flex h-64 items-center justify-center rounded-lg bg-gray-50">
            <div className="text-center">
              <BarChart3 className="mx-auto mb-2 h-12 w-12 text-gray-400" />
              <p className="text-gray-500">Ingen graf data tilgængelig</p>
            </div>
          </div>
        </>
      );
    }

    return (
      <>
        {renderActionButtons()}

        <div className="rounded-xl bg-white py-6">
          <DashboardGraph
            data={content.graphData}
            compareData={content.compareGraphData}
            initialMetric={metric}
          />
        </div>
      </>
    );
  };

  const renderGraphClicks = () =>
    renderIndividualGraph("Klik over tid", "clicks");
  const renderGraphImpressions = () =>
    renderIndividualGraph("Visninger over tid", "impressions");
  const renderGraphPosition = () =>
    renderIndividualGraph("Position over tid", "position");
  const renderGraphCtr = () => renderIndividualGraph("CTR over tid", "ctr");

  // Route to the appropriate renderer based on block type
  switch (blockType) {
    case "graph-clicks":
      return renderGraphClicks();
    case "graph-impressions":
      return renderGraphImpressions();
    case "graph-position":
      return renderGraphPosition();
    case "graph-ctr":
      return renderGraphCtr();
    default:
      return (
        <>
          {renderActionButtons()}
          <div className="text-center text-gray-500">
            Ukendt graf type: {blockType}
          </div>
        </>
      );
  }
};

export default IndividualGraphBlock;
