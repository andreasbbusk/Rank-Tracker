"use client";

import { ReportMetrics } from "../../types";

interface MetricsBlockProps {
  content: ReportMetrics & {
    previousPeriod?: {
      totalKeywords: number;
      avgPosition: number;
      totalClicks: number;
      totalImpressions: number;
      avgCTR: number;
      estimatedValue: number;
    };
    previousDateRange?: { from: string; to: string };
    changes?: {
      keywordsChange: number;
      positionChange: number;
      clicksChange: number;
      impressionsChange: number;
      ctrChange: number;
      valueChange: number;
    };
    estimatedValue?: number;
  };
  renderActionButtons: () => React.ReactNode;
}

const MetricsBlock = ({
  content: metrics,
  renderActionButtons,
}: MetricsBlockProps) => {
  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat("da-DK").format(num);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("da-DK", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Helper function to render change indicator
  const renderChangeIndicator = (
    change: number,
    isInverted = false,
    unit = "",
  ) => {
    if (change === 0) {
      return (
        <div className="inline-flex items-center gap-1.5 rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600">
          <div className="h-1.5 w-1.5 rounded-full bg-gray-400" />
          Ingen ændring
        </div>
      );
    }

    const isPositive = isInverted ? change < 0 : change > 0;
    const colorClass = isPositive
      ? "bg-green-50 text-green-700 border-green-200"
      : "bg-red-50 text-red-700 border-red-200";
    const prefix = change > 0 ? "+ " : "";

    return (
      <div
        className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium ${colorClass}`}
      >
        {prefix}
        {Math.abs(change).toFixed(unit === "pos." ? 1 : 0)} {unit}
      </div>
    );
  };

  const MetricCard = ({
    title,
    currentValue,
    currentUnit = "",
    previousValue,
    dateRange,
    previousDateRange,
    change,
  }: {
    title: string;
    currentValue: string | number;
    currentUnit?: string;
    previousValue?: string | number;
    dateRange: { from: string; to: string };
    previousDateRange?: { from: string; to: string };
    change?: React.ReactNode;
  }) => (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
      <div className="space-y-4">
        {/* Current Period */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-900">{title}</h4>
            {change && <div className="flex-shrink-0">{change}</div>}
          </div>
          <p className="text-xs text-gray-500">
            {formatDate(dateRange.from)} - {formatDate(dateRange.to)}
          </p>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-semibold text-gray-900">
              {currentValue}
            </span>
            {currentUnit && (
              <span className="text-sm font-medium text-gray-500">
                {currentUnit}
              </span>
            )}
          </div>
        </div>

        {/* Previous Period */}
        {previousValue !== undefined && previousDateRange && (
          <div className="space-y-1 border-t border-gray-100 pt-3">
            <p className="text-xs text-gray-400">Forrige periode</p>
            <p className="text-xs text-gray-400">
              {formatDate(previousDateRange.from)} -{" "}
              {formatDate(previousDateRange.to)}
            </p>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-medium text-gray-600">
                {previousValue}
              </span>
              {currentUnit && (
                <span className="text-xs text-gray-400">{currentUnit}</span>
              )}
            </div>
          </div>
        )}

        {/* Show comparison note when no previous data */}
        {!previousValue && !previousDateRange && (
          <div className="border-t border-gray-100 pt-3">
            <p className="text-xs text-gray-400">
              Ingen sammenligningsdata tilgængelig
            </p>
          </div>
        )}
      </div>
    </div>
  );

  // Safety check for metrics data
  if (!metrics || !metrics.dateRange) {
    return (
      <>
        {renderActionButtons()}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="text-center text-gray-500">
            <p className="text-sm">Ingen data tilgængelig for denne periode</p>
            <p className="mt-1 text-xs text-gray-400">
              Rapportens metrics kunne ikke indlæses
            </p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {renderActionButtons()}

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            Overblik på dine {formatNumber(metrics.totalKeywords || 0)} søgeord
          </h3>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <MetricCard
            title="Gns. position"
            currentValue={metrics.avgPosition?.toFixed(1) || "0.0"}
            previousValue={metrics.previousPeriod?.avgPosition?.toFixed(1)}
            dateRange={metrics.dateRange}
            previousDateRange={metrics.previousDateRange}
            change={
              metrics.changes?.positionChange !== undefined
                ? renderChangeIndicator(
                    metrics.changes.positionChange,
                    true,
                    "pos.",
                  )
                : null
            }
          />

          <MetricCard
            title="Trafik"
            currentValue={formatNumber(metrics.totalClicks || 0)}
            previousValue={
              metrics.previousPeriod?.totalClicks !== undefined
                ? formatNumber(metrics.previousPeriod.totalClicks)
                : undefined
            }
            dateRange={metrics.dateRange}
            previousDateRange={metrics.previousDateRange}
            change={
              metrics.changes?.clicksChange !== undefined
                ? renderChangeIndicator(
                    metrics.changes.clicksChange,
                    false,
                    "besøg",
                  )
                : null
            }
          />

          <MetricCard
            title="Estimerede værdi"
            currentValue={formatNumber(
              metrics.estimatedValue || (metrics.totalClicks || 0) * 12,
            )}
            currentUnit="DKK"
            previousValue={
              metrics.previousPeriod?.estimatedValue !== undefined
                ? formatNumber(metrics.previousPeriod.estimatedValue)
                : undefined
            }
            dateRange={metrics.dateRange}
            previousDateRange={metrics.previousDateRange}
            change={
              metrics.changes?.valueChange !== undefined
                ? renderChangeIndicator(
                    metrics.changes.valueChange,
                    false,
                    "DKK",
                  )
                : null
            }
          />
        </div>
      </div>
    </>
  );
};

export default MetricsBlock;
