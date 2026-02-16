"use client";

import { useEffect, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/modules/core/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/modules/core/components/ui/select";
import { FormattedData, MetricView, metrics } from "./types";
import { Button } from "@/modules/core/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTrigger,
} from "@/modules/core/components/ui/dialog";
import GraphExplainer from "@/modules/analytics/components/graph-explainer";
import { ChartContainer } from "@/modules/core/components/ui/chart";

const months = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Maj",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Okt",
  "Nov",
  "Dec",
];

interface GeneralGraphProps {
  data: FormattedData[];
  initialMetric?: MetricView;
  showMetricSelector?: boolean;
  className?: string;
  showDetailedTooltip?: boolean;
  title?: string;
  tooltipDescription?: string;
  isModal?: boolean;
  isKeywordSpecific?: boolean;
  showTooltip?: boolean;
}

export const GeneralGraph = ({
  data,
  initialMetric = "clicks",
  showMetricSelector = true,
  className,
  showDetailedTooltip = false,
  title = "Søgeordsudvikling",
  tooltipDescription = "Udviklingen i dine søgeords præstation over tid",
  isModal = false,
  isKeywordSpecific = false,
  showTooltip = true,
}: GeneralGraphProps) => {
  const [selectedMetric, setSelectedMetric] =
    useState<MetricView>(initialMetric);
  const [maxPosition, setMaxPosition] = useState<number>(0);
  const [yAxisDomain, setYAxisDomain] = useState<[number, number]>([0, 0]);
  const [xAxisDomain, setXAxisDomain] = useState<[string, string]>([
    "auto",
    "auto",
  ]);
  const [mainDateTicks, setMainDateTicks] = useState<string[]>([]);
  const [mergedData, setMergedData] = useState<any[]>([]);

  // Filter data once at the component level
  const mainData = data?.filter((d) => !d.isComparison) ?? [];
  const comparisonData = data?.filter((d) => d.isComparison) ?? [];

  useEffect(() => {
    if (!data || !Array.isArray(data) || mainData.length === 0) return;

    // Calculate the total days in each range to determine the relative position
    const mainStartDate = new Date(mainData[0].date);
    const mainEndDate = new Date(mainData[mainData.length - 1].date);
    const mainTotalDays = Math.ceil(
      (mainEndDate.getTime() - mainStartDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    // Create merged dataset that aligns comparison data with main data dates
    const merged = mainData.map((mainItem, index) => {
      // Calculate the relative position (0 to 1) in the main range
      const mainItemDate = new Date(mainItem.date);
      const mainDayPosition = Math.ceil(
        (mainItemDate.getTime() - mainStartDate.getTime()) /
          (1000 * 60 * 60 * 24),
      );
      const relativePosition = mainDayPosition / mainTotalDays;

      // Find the corresponding index in the comparison data
      const compareIndex = Math.floor(
        relativePosition * (comparisonData.length - 1),
      );
      const compareItem = comparisonData[compareIndex];

      return {
        ...mainItem,
        compareValue: compareItem ? compareItem[selectedMetric] : null,
        compareDate: compareItem?.date || null,
      };
    });

    setMergedData(merged);

    const startDate = mainData[0].date;
    const endDate = mainData[mainData.length - 1].date;

    // Calculate date range and set appropriate interval
    const firstDate = new Date(startDate);
    const lastDate = new Date(endDate);
    const daysDifference = Math.ceil(
      (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    // Calculate number of ticks based on range
    let numTicks: number;
    if (daysDifference > 90) {
      numTicks = 6;
    } else if (daysDifference > 30) {
      numTicks = 8;
    } else if (daysDifference > 14) {
      numTicks = 7;
    } else {
      numTicks = Math.min(mainData.length, 6);
    }

    // Calculate ticks with guaranteed first and last dates
    const ticks = [startDate];

    if (mainData.length > 2) {
      const step = Math.max(
        1,
        Math.floor((mainData.length - 2) / (numTicks - 2)),
      );
      for (let i = step; i < mainData.length - step; i += step) {
        ticks.push(mainData[i].date);
      }
    }

    if (ticks[ticks.length - 1] !== endDate) {
      ticks.push(endDate);
    }

    setMainDateTicks(ticks);
    setXAxisDomain([startDate, endDate]);

    // Calculate domains based on metric type - use both main and comparison data for Y-axis scaling
    const mainValues = mainData.map((d) => Number(d[selectedMetric]) || 0);
    const comparisonValues = comparisonData.map(
      (d) => Number(d[selectedMetric]) || 0,
    );
    const allValues = [...mainValues, ...comparisonValues];
    const maxValue = Math.max(...allValues);

    if (selectedMetric === "position") {
      const minPos = Math.min(...allValues.filter((v) => v > 0));
      const maxPos = Math.max(...allValues);

      // Calculate appropriate upper bound and step size
      let upperValue;
      if (maxPos <= 10) {
        upperValue = 10;
      } else if (maxPos <= 20) {
        upperValue = 20;
      } else if (maxPos <= 50) {
        upperValue = Math.ceil(maxPos / 10) * 10;
      } else if (maxPos <= 100) {
        upperValue = Math.ceil(maxPos / 20) * 20;
      } else {
        upperValue = Math.ceil(maxPos / 50) * 50;
      }

      setMaxPosition(upperValue);
      setYAxisDomain([1, upperValue]);
    } else if (selectedMetric === "ctr") {
      const maxCTR = Math.max(...mainValues);
      // If max CTR is less than 10%, scale to nearest whole number for better readability
      if (maxCTR < 10) {
        setYAxisDomain([0, Math.ceil(maxCTR + 1)]);
      }
      // If max CTR is between 10% and 50%, scale to nearest 5%
      else if (maxCTR < 50) {
        setYAxisDomain([0, Math.ceil(maxCTR / 5) * 5]);
      }
      // If max CTR is over 50%, cap at 100%
      else {
        setYAxisDomain([0, 100]);
      }
    } else {
      const padding = maxValue * 0.1;
      setYAxisDomain([0, Math.ceil(maxValue + padding)]);
    }
  }, [data, selectedMetric]);

  const formatDate = (dateStr: string, includeYear: boolean = false) => {
    const date = new Date(dateStr);
    const day = date.getDate();
    const month = months[date.getMonth()];
    return includeYear
      ? `${day} ${month} ${date.getFullYear()}`
      : `${day} ${month}`;
  };

  const currentMetric =
    metrics.find((m) => m.key === selectedMetric) || metrics[0];

  const getMetricTooltip = (metricKey: MetricView): string => {
    if (isKeywordSpecific) {
      switch (metricKey) {
        case "clicks":
          return `Udviklingen i antal klik på søgeordet "${title}". Dette viser hvor mange besøgende der kommer til din hjemmeside via dette søgeord i Google.`;
        case "impressions":
          return `Udviklingen i antal visninger af søgeordet "${title}" i Google søgeresultater. Dette viser hvor ofte din hjemmeside bliver vist for dette søgeord.`;
        case "position":
          return `Udviklingen i placeringen for søgeordet "${title}" i Google. En lavere position er bedre, da position 1 er øverst i søgeresultaterne.`;
        case "ctr":
          return `Udviklingen i Click-Through-Rate (CTR) for søgeordet "${title}". CTR viser hvor mange procent af visningerne der resulterer i klik på din hjemmeside.`;
        default:
          return `Udviklingen for søgeordet "${title}" over tid`;
      }
    }

    switch (metricKey) {
      case "clicks":
        return "Udviklingen i antal klik på dine søgeord over tid. Dette viser hvor mange besøgende der kommer til din hjemmeside via Google søgninger.";
      case "impressions":
        return "Udviklingen i antal visninger af dine søgeord i Google søgeresultater. Dette viser hvor ofte din hjemmeside bliver vist i søgeresultaterne.";
      case "position":
        return "Udviklingen i dine søgeords placeringer i Google. En lavere position er bedre, da position 1 er øverst i søgeresultaterne.";
      case "ctr":
        return "Udviklingen i Click-Through-Rate (CTR) over tid. CTR viser hvor mange procent af visningerne der resulterer i klik på din hjemmeside.";
      default:
        return "Udviklingen i dine søgeords præstation over tid";
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const mainValue = payload[0]?.value;
      const compareValue = payload[1]?.value;
      const mainDate = label;
      const compareDate = payload[0]?.payload?.compareDate;

      return (
        <div className="rounded-lg border bg-background p-2 shadow-sm">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-1.5">
              <span className="block w-[120px] text-[0.70rem] uppercase text-muted-foreground">
                {formatDate(mainDate, true)}
              </span>
              <span
                style={{ backgroundColor: currentMetric.color }}
                className="h-2 w-2 rounded-full"
              />
              <span className="font-semibold text-muted-foreground">
                {selectedMetric === "ctr"
                  ? `${Number(mainValue).toFixed(2)}%`
                  : currentMetric.format(mainValue)}
              </span>
              <span className="text-[0.70rem] text-muted-foreground">
                {currentMetric.name}
              </span>
            </div>
            {compareValue !== null &&
              compareValue !== undefined &&
              compareDate && (
                <div className="flex items-center gap-1.5">
                  <span className="block w-[120px] text-[0.70rem] uppercase text-muted-foreground">
                    {formatDate(compareDate, true)}
                  </span>
                  <span
                    style={{
                      backgroundColor: currentMetric.color,
                      opacity: 0.5,
                    }}
                    className="h-2 w-2 rounded-full"
                  />
                  <span className="font-semibold text-muted-foreground">
                    {selectedMetric === "ctr"
                      ? `${Number(compareValue).toFixed(2)}%`
                      : currentMetric.format(compareValue)}
                  </span>
                  <span className="text-[0.70rem] text-muted-foreground">
                    {currentMetric.name}
                  </span>
                </div>
              )}
          </div>
        </div>
      );
    }
    return null;
  };

  if (!data || data.length === 0) {
    return (
      <div
        className={cn(
          "flex h-[300px] items-center justify-center rounded-2xl border border-black/10 bg-white shadow-sm",
          className,
        )}
      >
        <p className="text-sm text-gray-500">Ingen data tilgængelig</p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        !isModal
          ? "relative col-span-1 flex h-[296px] flex-col justify-between rounded-2xl border border-black/10 bg-white py-6 shadow-sm"
          : "relative col-span-1 flex flex-col justify-between rounded-2xl bg-white py-6",
        className,
      )}
    >
      <div
        className={cn(
          "flex w-full flex-col items-start gap-[0.3rem]",
          isModal ? "px-6 pr-16" : "px-6",
        )}
      >
        <article className="flex w-full flex-row items-center justify-between">
          <div className="flex flex-row items-center gap-1">
            <h2 className="text-sm font-medium">{currentMetric.name}</h2>
            {!isModal && (
              <GraphExplainer description={getMetricTooltip(selectedMetric)} />
            )}
          </div>
          <div className="flex items-center gap-2">
            {showMetricSelector && (
              <Select
                value={selectedMetric}
                onValueChange={(value) =>
                  setSelectedMetric(value as MetricView)
                }
              >
                <SelectTrigger className="h-8 w-[180px]">
                  <SelectValue placeholder="Vælg metrik" />
                </SelectTrigger>
                <SelectContent>
                  {metrics.map((metric) => (
                    <SelectItem key={metric.key} value={metric.key}>
                      {metric.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {!isModal && (
              <Dialog>
                <DialogTrigger asChild className="hidden md:block">
                  <Button
                    variant={"ghost"}
                    className="hidden h-8 w-8 items-center justify-center p-0 md:block"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="mx-auto h-6 w-6 text-black/50"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15"
                      />
                    </svg>
                  </Button>
                </DialogTrigger>

                <DialogContent className="max-h-[90vh] w-full max-w-[90vw] p-0">
                  <DialogHeader>
                    <GeneralGraph
                      data={data}
                      initialMetric={selectedMetric}
                      showMetricSelector={showMetricSelector}
                      showDetailedTooltip={showDetailedTooltip}
                      title={title}
                      tooltipDescription={getMetricTooltip(selectedMetric)}
                      isModal={true}
                    />
                  </DialogHeader>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </article>
      </div>

      <ChartContainer
        config={{
          current: {
            label: "Current",
            color: currentMetric.color,
          },
          compare: {
            label: "Compare",
            color: currentMetric.color,
          },
        }}
        className="h-[150px] w-full"
      >
        <ResponsiveContainer width="100%" height="100%" className="px-6">
          <LineChart
            data={mergedData}
            margin={{ top: 10, right: 30, bottom: 0, left: -26 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={(value) => formatDate(value)}
              tickMargin={8}
              tickLine={false}
              axisLine={false}
              minTickGap={40}
              ticks={mainDateTicks}
              domain={xAxisDomain}
              type="category"
              allowDataOverflow={false}
            />
            <YAxis
              tickFormatter={(value) => {
                if (selectedMetric === "ctr") {
                  return Math.round(value) + "%";
                }
                if (value >= 1000000)
                  return (value / 1000000).toLocaleString() + "m";
                if (value >= 1000) return (value / 1000).toLocaleString() + "k";
                return value.toLocaleString();
              }}
              tickMargin={26}
              tickLine={false}
              axisLine={false}
              reversed={selectedMetric === "position"}
              width={60}
              tick={{ textAnchor: "start", dx: 0, width: "max-content" }}
              domain={
                selectedMetric === "position"
                  ? [1, maxPosition]
                  : selectedMetric === "ctr"
                    ? [0, Math.min(100, Math.ceil(yAxisDomain[1]))]
                    : yAxisDomain
              }
              ticks={
                selectedMetric === "position"
                  ? (() => {
                      const maxPos = yAxisDomain[1];

                      // Define tick intervals based on range
                      if (maxPos <= 10) {
                        return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
                      } else if (maxPos <= 20) {
                        return [1, 5, 10, 15, 20];
                      } else if (maxPos <= 50) {
                        return [1, 10, 20, 30, 40, 50];
                      } else if (maxPos <= 100) {
                        return [1, 20, 40, 60, 80, 100];
                      } else {
                        const step = Math.ceil(maxPos / 200) * 50;
                        return [
                          1,
                          ...Array.from(
                            { length: Math.min(5, Math.floor(maxPos / step)) },
                            (_, i) => (i + 1) * step,
                          ),
                        ];
                      }
                    })()
                  : undefined
              }
              allowDataOverflow={false}
              interval={0}
              allowDecimals={false}
            />
            {showTooltip && (
              <Tooltip
                content={<CustomTooltip />}
                cursor={false}
                offset={10}
                allowEscapeViewBox={{ x: false, y: false }}
                wrapperStyle={{ outline: "none" }}
              />
            )}
            <Line
              type="monotone"
              dataKey={selectedMetric}
              name={currentMetric.name}
              stroke={currentMetric.color}
              strokeWidth={2}
              dot={false}
              isAnimationActive={true}
              animationDuration={450}
              animationBegin={0}
              animationEasing="ease-in-out"
              activeDot={{
                r: 4,
                strokeWidth: 2,
                stroke: "white",
                fill: currentMetric.color,
              }}
            />
            {comparisonData.length > 0 && (
              <Line
                type="monotone"
                dataKey="compareValue"
                name={`${currentMetric.name} (Sammenligning)`}
                stroke={currentMetric.color}
                strokeWidth={2}
                strokeDasharray="4 4"
                strokeOpacity={0.5}
                dot={false}
                isAnimationActive={true}
                animationDuration={450}
                animationBegin={0}
                animationEasing="ease-in-out"
                activeDot={{ r: 4 }}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </ChartContainer>
    </div>
  );
};
