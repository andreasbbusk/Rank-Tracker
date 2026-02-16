"use client";

import { Button } from "@/modules/core/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/modules/core/components/ui/tooltip";
import { cn } from "@/modules/core/lib/utils";
import { ArrowDown, ArrowUp, HelpCircle } from "lucide-react";

interface DashboardScoreCardProps {
  title: string;
  value: number | string;
  previousValue?: number | string;
  change?: number;
  tooltip?: string;
  tooltipTitle?: string;
  format?: "number" | "percentage" | "currency" | "position";
  reversed?: boolean;
  showTooltip?: boolean;
}

const formatValue = (
  value: number | string | undefined | null,
  format: DashboardScoreCardProps["format"] = "number",
) => {
  if (value === undefined || value === null) return "0";
  if (typeof value === "string") return value;

  try {
    switch (format) {
      case "percentage":
        return `${value.toLocaleString("da-DK", { maximumFractionDigits: 2 })}%`;
      case "position":
        return value.toLocaleString("da-DK", { maximumFractionDigits: 1 });
      case "currency":
        return value.toLocaleString("da-DK", { maximumFractionDigits: 2 });
      default:
        return value.toLocaleString("da-DK");
    }
  } catch (error) {
    console.error("Error formatting value:", error);
    return "0";
  }
};

export default function DashboardScoreCard({
  title,
  value = 0,
  previousValue,
  change,
  tooltip,
  tooltipTitle,
  format = "number",
  reversed = false,
  showTooltip = true,
}: DashboardScoreCardProps) {
  const showChange = change !== undefined && !isNaN(change) && change !== 0;
  const isPositive = reversed ? change! < 0 : change! > 0;

  return (
    <div className="h-full rounded-2xl border border-black/10 p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <h3 className="whitespace-pre-wrap text-[0.9rem] font-medium">
            {title}
          </h3>
          {tooltip && showTooltip && (
            <TooltipProvider>
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    className="h-6 min-w-6 max-w-6 p-0 hover:bg-[#EEEEEE]"
                  >
                    <HelpCircle className="h-3 min-w-3 max-w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="max-w-[300px] border border-black/10 bg-white py-2 text-foreground shadow-sm">
                  {tooltipTitle && (
                    <p className="mb-1.5 whitespace-pre-line text-left font-semibold">
                      {tooltipTitle}
                    </p>
                  )}
                  <p className="whitespace-pre-line text-left font-medium">
                    {tooltip}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xl font-medium">
          {formatValue(value, format)}
        </span>

        {showChange && (
          <div className="flex flex-row gap-1">
            <div
              className={cn(
                isPositive ? "bg-green-500/10" : "bg-red-500/10",
                "rounded-full p-1",
              )}
            >
              {isPositive ? (
                <ArrowUp className="h-3 w-3 text-green-500" />
              ) : (
                <ArrowDown className="h-3 w-3 text-red-500" />
              )}
            </div>
            <span
              className={cn(
                isPositive ? "text-green-500" : "text-red-500",
                "text-sm font-medium",
              )}
            >
              {Math.abs(change).toLocaleString("da-DK", {
                maximumFractionDigits: 2,
              })}
              %
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
