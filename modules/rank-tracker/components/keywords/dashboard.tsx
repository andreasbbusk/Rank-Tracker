import { Loader2 } from "lucide-react";
import { createDashboardView } from "../../actions/ranker-views.actions";
import { calculateMetrics } from "../../utils/calculate-dashboard-metrics";
import DashboardClient from "./dashboard-client";

export default async function Dashboard({
  domainId,
  dateRanges,
}: {
  domainId: string;
  dateRanges: {
    start_date: string;
    end_date: string;
  }[];
}) {
  if (!domainId) {
    return (
      <div className="flex h-[calc(100vh-200px)] items-center justify-center">
        <p className="text-lg text-gray-500">Vælg venligst et domæne</p>
      </div>
    );
  }

  try {
    const dashboardData = await createDashboardView(domainId, dateRanges);

    // Handle no data or empty records
    if (
      !dashboardData ||
      !dashboardData.records ||
      dashboardData.records.length === 0
    ) {
      return (
        <div className="flex h-[calc(100vh-200px)] items-center justify-center">
          <p className="text-lg text-gray-500">Ingen data fundet</p>
        </div>
      );
    }

    // Calculate metrics using the utility function
    const metrics = calculateMetrics(dashboardData);

    // Extract graph data for current and comparison periods
    let graphData = [];
    let compareGraphData = [];

    if (dashboardData.records[0]?.graph_stats) {
      graphData = dashboardData.records[0].graph_stats;
    }

    if (dashboardData.records[1]?.graph_stats) {
      compareGraphData = dashboardData.records[1].graph_stats;
    }

    return (
      <DashboardClient
        domainId={domainId}
        metrics={metrics}
        graphData={graphData}
        compareGraphData={compareGraphData}
      />
    );
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    return (
      <div className="flex h-[calc(100vh-200px)] flex-col items-center justify-center gap-4">
        <p className="text-lg text-gray-500">
          Der opstod en fejl ved indlæsning af data
        </p>
        <p className="text-sm text-gray-400">Prøv venligst igen senere</p>
      </div>
    );
  }
}

export function DashboardLoading() {
  return (
    <div>
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

      <div className="mt-6 rounded-xl bg-white py-6">
        <div className="flex h-[296px] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </div>
    </div>
  );
}
