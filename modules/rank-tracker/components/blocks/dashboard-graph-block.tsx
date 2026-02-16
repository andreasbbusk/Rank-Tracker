"use client";

import { BarChart3 } from "lucide-react";
import DashboardGraph from "../keywords/graphs/dashboard-graph";
import { GraphStats } from "../../types";

interface DashboardGraphBlockProps {
  content: {
    graphData: GraphStats[];
    compareGraphData?: GraphStats[];
    title?: string;
  };
  renderActionButtons: () => React.ReactNode;
}

const DashboardGraphBlock = ({
  content,
  renderActionButtons,
}: DashboardGraphBlockProps) => {
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
        <h3 className="mb-6 text-lg font-medium text-gray-900">
          {content.title}
        </h3>
        <DashboardGraph
          data={content.graphData}
          compareData={content.compareGraphData}
        />
      </div>
    </>
  );
};

export default DashboardGraphBlock;
