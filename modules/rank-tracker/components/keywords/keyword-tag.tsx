"use client";

import { cn } from "@/modules/core/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/modules/core/components/ui/tooltip";

interface KeywordTagProps {
  name: string | string[];
  className?: string;
}

export function KeywordTag({ name, className }: KeywordTagProps) {
  const tags = Array.isArray(name) ? name : [name];

  if (tags.length <= 2) {
    return (
      <div className="flex gap-1">
        {tags.map((tag) => (
          <span
            key={tag}
            className={cn(
              "inline-flex items-center rounded-full border border-gray-200 bg-white px-2 py-0.5 text-xs font-normal text-primary",
              className,
            )}
          >
            {tag}
          </span>
        ))}
      </div>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="relative inline-flex">
            <span
              className={cn(
                "inline-flex items-center rounded-full border border-gray-200 bg-white px-2 py-0.5 text-xs font-normal text-primary",
                className,
              )}
            >
              {tags[0]}
            </span>
            <span className="absolute -right-2 -top-1 flex h-4 w-4 items-center justify-center rounded-full border border-gray-200 bg-white text-[10px] font-normal text-black">
              {tags.length}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent
          align="start"
          className="w-fit rounded-lg border-none bg-white p-2 shadow-md"
        >
          <div className="flex max-w-[300px] flex-wrap gap-1.5">
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center rounded-full bg-white px-2 py-0.5 text-xs font-normal text-primary ring-1 ring-inset ring-gray-500/10"
              >
                {tag}
              </span>
            ))}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
