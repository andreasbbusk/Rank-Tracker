"use client";

import { BarChart3 } from "lucide-react";

interface GraphBlockProps {
  content: {
    dateRange?: { from: string; to: string };
    chartType?: string;
  };
  renderActionButtons: () => React.ReactNode;
}

const GraphBlock = ({ content, renderActionButtons }: GraphBlockProps) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("da-DK", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <>
      {renderActionButtons()}

      <h3 className="mb-6 text-lg font-medium text-gray-900">
        Performance graf for valgte periode
      </h3>

      <div className="flex h-64 items-center justify-center rounded-lg bg-gray-50">
        <div className="text-center">
          <BarChart3 className="mx-auto mb-2 h-12 w-12 text-gray-400" />
          <p className="text-gray-500">Graf kommer snart</p>
          <p className="text-sm text-gray-400">
            Viser data for{" "}
            {formatDate(content?.dateRange?.from || "2025-06-04")} -{" "}
            {formatDate(content?.dateRange?.to || "2025-06-06")}
          </p>
        </div>
      </div>
    </>
  );
};

export default GraphBlock;
