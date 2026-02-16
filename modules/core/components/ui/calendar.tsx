"use client";

import * as React from "react";
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronUpIcon,
} from "@radix-ui/react-icons";
import { DayPicker } from "react-day-picker";

import { cn } from "@/modules/core/lib/utils";
import { buttonVariants } from "@/modules/core/components/ui/button";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  const navButtonClassName = cn(
    buttonVariants({ variant: "outline" }),
    "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
  );

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("flex justify-center p-4", className)}
      classNames={{
        months:
          "relative flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0 mx-auto",
        month: "space-y-4",
        month_caption: "flex justify-center pt-1 relative items-center",
        caption: "flex justify-center pt-1 relative items-center",
        caption_label: "text-sm font-medium",
        nav: "pointer-events-none absolute inset-x-0 top-1 z-10 flex items-center justify-between",
        button_previous: cn(navButtonClassName, "ml-4 pointer-events-auto"),
        button_next: cn(navButtonClassName, "pointer-events-auto"),
        nav_button: navButtonClassName,
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        month_grid: "w-full border-collapse space-y-1",
        table: "w-full border-collapse space-y-1",
        weekdays: "flex",
        head_row: "flex",
        weekday:
          "text-muted-foreground rounded-md w-8 font-normal text-[0.8rem]",
        head_cell:
          "text-muted-foreground rounded-md w-8 font-normal text-[0.8rem]",
        week: "flex w-full mt-2",
        row: "flex w-full mt-2",
        day_button: cn(
          buttonVariants({ variant: "ghost" }),
          "h-8 w-8 rounded-xl p-0 font-normal aria-selected:opacity-100",
        ),
        selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        today: "border text-accent-foreground",
        outside:
          "day-outside text-muted-foreground opacity-50  aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
        disabled: "text-muted-foreground opacity-50",
        range_middle:
          "aria-selected:bg-accent aria-selected:text-accent-foreground",
        range_start: "day-range-start",
        range_end: "day-range-end",
        hidden: "invisible",
        cell: cn(
          "relative p-0 text-center text-sm focus-within:relative focus-within:z-20 [&:has([aria-selected])]:bg-accent [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected].day-range-end)]:rounded-r-xl",
          props.mode === "range"
            ? "[&:has(>.day-range-end)]:rounded-r-xl [&:has(>.day-range-start)]:rounded-l-xl first:[&:has([aria-selected])]:rounded-l-xl last:[&:has([aria-selected])]:rounded-r-xl"
            : "[&:has([aria-selected])]:rounded-xl",
        ),
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-8 w-8 rounded-xl p-0 font-normal aria-selected:opacity-100",
        ),
        day_range_start: "day-range-start",
        day_range_end: "day-range-end",
        day_selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        day_today: "border text-accent-foreground",
        day_outside:
          "day-outside text-muted-foreground opacity-50  aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
        day_disabled: "text-muted-foreground opacity-50",
        day_range_middle:
          "aria-selected:bg-accent aria-selected:text-accent-foreground",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, ...iconProps }) => {
          if (orientation === "left") {
            return <ChevronLeftIcon className="h-4 w-4" {...iconProps} />;
          }
          if (orientation === "right") {
            return <ChevronRightIcon className="h-4 w-4" {...iconProps} />;
          }
          if (orientation === "up") {
            return <ChevronUpIcon className="h-4 w-4" {...iconProps} />;
          }
          return <ChevronDownIcon className="h-4 w-4" {...iconProps} />;
        },
        DayButton: ({ className: dayButtonClassName, day, modifiers, ...buttonProps }: any) => (
          <button
            {...buttonProps}
            aria-selected={modifiers?.selected || undefined}
            className={cn(
              dayButtonClassName,
              modifiers?.range_start && "day-range-start",
              modifiers?.range_end && "day-range-end",
              modifiers?.outside && "day-outside",
            )}
          />
        ),
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
