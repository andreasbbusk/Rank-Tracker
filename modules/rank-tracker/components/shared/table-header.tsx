"use client";

import { buttonVariants } from "@/modules/core/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/modules/core/components/ui/tooltip";
import { cn } from "@/modules/core/lib/utils";
import { Column } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";

interface TableHeaderProps<TData> {
  column: Column<TData, unknown>;
  title: string;
  description?: string;
  align?: "left" | "center" | "right";
  hideSort?: boolean;
}

export function TableHeader<TData>({
  column,
  title,
  description,
  align = "left",
  hideSort = false,
}: TableHeaderProps<TData>) {
  return (
    <span
      onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      className={cn("group flex cursor-pointer", {
        "justify-end": align === "right",
        "justify-center": align === "center",
      })}
    >
      <TooltipProvider>
        <Tooltip delayDuration={150}>
          <TooltipTrigger
            className={cn("flex items-center gap-1", {
              "justify-end": align === "right",
              "justify-center": align === "center",
            })}
          >
            <span className="transtion-color w-max group-hover:text-primary">
              {title}
            </span>
            {!hideSort && column.getSortIndex() === 0 && (
              <span
                className={cn(
                  buttonVariants({
                    variant: "ghost",
                  }),
                  "h-8 w-8 p-0 group-hover:bg-accent",
                )}
              >
                <ArrowUpDown className={cn("h-4 w-4 text-primary")} />
              </span>
            )}
          </TooltipTrigger>
          {description && (
            <TooltipContent className="max-w-[300px] border border-black/10 bg-white py-2 text-foreground shadow-sm">
              <p className="whitespace-pre-line text-left font-medium">
                {description}
              </p>
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>
    </span>
  );
}
