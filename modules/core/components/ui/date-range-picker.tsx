"use client";

import { cn } from "@/modules/core/lib/utils";
import { ArrowRightLeft, CalendarIcon, Check, ChevronDown } from "lucide-react";
import { useEffect, useRef, useState, type FC } from "react";
import { Button } from "./button";
import { Calendar } from "./calendar";
import { DateInput } from "./date-input";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./tooltip"; // TODO: Implement tooltip on sammenlign

import CompareDateRanges from "@/modules/analytics/components/compare-date-ranges";
import { usePathname, useSearchParams } from "next/navigation";
import { Label } from "./label";

export interface DateRangePickerProps {
  compareType: "period" | "last_year" | undefined;
  changeCompareType: (type: "period" | "last_year") => void;
  /** Click handler for applying the updates from DateRangePicker. */
  onUpdate?: (values: { range: DateRange; rangeCompare?: DateRange }) => void;
  /** Initial value for start date */
  initialDateFrom?: Date | string;
  /** Initial value for end date */
  initialDateTo?: Date | string;
  /** Initial value for start date for compare */
  initialCompareFrom?: Date | string;
  /** Initial value for end date for compare */
  initialCompareTo?: Date | string;
  /** Reset the start date */
  resetDateFrom?: Date | string;
  /** Reset the end date */
  resetDateTo?: Date | string;
  /** Alignment of popover */
  align?: "start" | "center" | "end";
  /** Option for locale */
  locale?: string;
  /** Option for showing compare feature */
}

const formatDate = (date: Date, locale: string = "en-us"): string => {
  return date.toLocaleDateString(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

export interface DateRange {
  from: Date;
  to: Date | undefined;
}

interface Preset {
  name: string;
  label: string;
}

// Define presets
const PRESETS: Preset[] = [
  { name: "last7Days", label: "Seneste 7 dage" },
  { name: "last30Days", label: "Seneste 30 dage" },
  { name: "last90Days", label: "Seneste 90 dage" },
  { name: "last365Days", label: "Seneste 365 dage" },
  { name: "lastMonth", label: "Seneste måned" },
  { name: "last12Months", label: "Seneste 12 måneder" },
  { name: "lastYear", label: "Sidste år" },
  { name: "weekToDate", label: "Uge til dato" },
  { name: "monthToDate", label: "Denne måned til dato" },
  { name: "quarterToDate", label: "Dette kvartal til dato" },
  { name: "yearToDate", label: "Dette år til dato" },
];

/** The DateRangePicker component allows a user to select a range of dates */
export const DateRangePicker: FC<DateRangePickerProps> & {
  filePath: string;
} = ({
  compareType,
  changeCompareType,
  initialDateFrom = new Date(new Date().setHours(0, 0, 0, 0)),
  initialDateTo,
  initialCompareFrom,
  initialCompareTo,
  resetDateFrom,
  resetDateTo,
  onUpdate,
  align = "end",
  locale = "en-US",
}): JSX.Element => {
  const [isOpen, setIsOpen] = useState(false);
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [update, setUpdate] = useState(new Date());
  const [range, setRange] = useState<DateRange>({
    from: new Date(new Date(initialDateFrom).setHours(0, 0, 0, 0)),
    to: initialDateTo
      ? new Date(new Date(initialDateTo).setHours(0, 0, 0, 0))
      : new Date(new Date(initialDateFrom).setHours(0, 0, 0, 0)),
  });
  const [rangeCompare, setRangeCompare] = useState<DateRange | undefined>(
    initialCompareFrom
      ? {
          from: new Date(new Date(initialCompareFrom).setHours(0, 0, 0, 0)),
          to: initialCompareTo
            ? new Date(new Date(initialCompareTo).setHours(0, 0, 0, 0))
            : new Date(new Date(initialCompareFrom).setHours(0, 0, 0, 0)),
        }
      : undefined,
  );
  const pathname = usePathname();

  const searchParams = useSearchParams();

  const dateRange = searchParams.get("range");
  const dateRangeCompare = searchParams.get("rangeCompare");

  // Refs to store the values of range and rangeCompare when the date picker is opened
  const openedRangeRef = useRef<DateRange | undefined>(undefined);
  const openedRangeCompareRef = useRef<DateRange | undefined>(undefined);

  const [selectedPreset, setSelectedPreset] = useState<string | undefined>(
    undefined,
  );

  const [isSmallScreen, setIsSmallScreen] = useState(
    typeof window !== "undefined" ? window.innerWidth < 960 : false,
  );

  // const isSearchConsole =
  //   pathname.includes('google-search-console') ||
  //   pathname.includes('/analytics/overview') ||
  //   pathname.includes('/tool/rank-tracker');

  const isSearchConsole = false;

  const isKlaviyoAnalytics = pathname.includes("/tool/analytics/klaviyo");

  useEffect(() => {
    const rangeFrom = dateRange?.split("_")[0];
    const rangeTo = dateRange?.split("_")[1];

    if (!rangeFrom || !rangeTo) return;

    setRange({
      from: new Date(rangeFrom),
      to: new Date(rangeTo),
    });

    const rangeCompareFrom = dateRangeCompare?.split("_")[0];
    const rangeCompareTo = dateRangeCompare?.split("_")[1];

    if (!rangeCompareFrom || !rangeCompareTo) return;

    setRangeCompare({
      from: new Date(rangeCompareFrom),
      to: new Date(rangeCompareTo),
    });
  }, [dateRange]);

  useEffect(() => {
    const handleResize = (): void => {
      setIsSmallScreen(window.innerWidth < 960);
    };

    window.addEventListener("resize", handleResize);

    // Clean up event listener on unmount
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const getPresetRange = (presetName: string): DateRange => {
    const preset = PRESETS.find(({ name }) => name === presetName);
    if (!preset) throw new Error(`Unknown date range preset: ${presetName}`);

    let from: Date;
    let to = new Date();
    const today = new Date();

    // If isSearchConsole is true, adjust the 'to' date to be 3 days before today
    if (isSearchConsole) {
      to.setDate(today.getDate() - 3);
    } else {
      to.setDate(today.getDate() - 1); // Normally, 'to' should be 1 day before today
    }

    switch (preset.name) {
      case "last7Days":
        from = new Date(to); // Create a new Date object for `from` to avoid modifying `to`
        from.setDate(to.getDate() - 6); // Start from 6 days before the 'to' date
        break;
      case "last30Days":
        from = new Date(to);
        from.setDate(to.getDate() - 29); // Start from 29 days before the 'to' date
        break;
      case "last90Days":
        from = new Date(to);
        from.setDate(to.getDate() - 89); // Start from 89 days before the 'to' date
        break;
      case "last365Days":
        from = new Date(to);
        from.setDate(to.getDate() - 364); // Start from 364 days before the 'to' date
        break;
      case "lastMonth":
        from = new Date(to.getFullYear(), to.getMonth() - 1, 1);
        to = new Date(to.getFullYear(), to.getMonth(), 0);
        break;
      case "last12Months":
        from = new Date(to.getFullYear(), to.getMonth() - 12, 1);
        to = new Date(to.getFullYear(), to.getMonth(), 0);
        break;
      case "lastYear":
        from = new Date(to.getFullYear() - 1, 0, 1);
        to = new Date(to.getFullYear() - 1, 11, 31);
        break;
      case "weekToDate":
        from = new Date(to);
        from.setDate(to.getDate() - to.getDay()); // Start from the beginning of the week
        break;
      case "monthToDate":
        from = new Date(to.getFullYear(), to.getMonth(), 1); // Start from the first day of the current month
        break;
      case "quarterToDate":
        const currentQuarterStartMonth = Math.floor(to.getMonth() / 3) * 3;
        from = new Date(to.getFullYear(), currentQuarterStartMonth, 1);
        break;
      case "yearToDate":
        from = new Date(to.getFullYear(), 0, 1); // Start from the first day of the current year
        break;
      default:
        throw new Error(`Unknown date range preset: ${presetName}`);
    }

    // Normalize times
    from.setHours(0, 0, 0, 0);
    to.setHours(23, 59, 59, 999);

    return { from, to };
  };

  const setPreset = (preset: string): void => {
    const range = getPresetRange(preset);
    setRange(range);
    if (rangeCompare) {
      const rangeCompare = {
        from: new Date(
          range.from.getFullYear() - 1,
          range.from.getMonth(),
          range.from.getDate(),
        ),
        to: range.to
          ? new Date(
              range.to.getFullYear() - 1,
              range.to.getMonth(),
              range.to.getDate(),
            )
          : undefined,
      };
      setRangeCompare(rangeCompare);
    }
  };

  const checkPreset = (): void => {
    const normalizeDateOnly = (date: Date | undefined): Date => {
      if (!date) return new Date(0);
      const normalized = new Date(date);
      normalized.setHours(0, 0, 0, 0);
      return normalized;
    };

    for (const preset of PRESETS) {
      const presetRange = getPresetRange(preset.name);

      const normalizedRangeFrom = normalizeDateOnly(range.from);
      const normalizedPresetFrom = normalizeDateOnly(presetRange.from);
      const normalizedRangeTo = normalizeDateOnly(range.to);
      const normalizedPresetTo = normalizeDateOnly(presetRange.to);

      if (
        normalizedRangeFrom.getTime() === normalizedPresetFrom.getTime() &&
        normalizedRangeTo.getTime() === normalizedPresetTo.getTime()
      ) {
        setSelectedPreset(preset.name);
        return;
      }
    }

    setSelectedPreset(undefined);
  };

  const resetValues = (): void => {
    setRange({
      from:
        typeof initialDateFrom === "string" || typeof resetDateFrom === "string"
          ? new Date(resetDateFrom || initialDateFrom)
          : resetDateFrom || initialDateFrom,
      to: initialDateTo
        ? typeof initialDateTo === "string" || typeof resetDateTo === "string"
          ? new Date(resetDateTo || initialDateTo)
          : resetDateTo || initialDateTo
        : typeof initialDateFrom === "string"
          ? new Date(initialDateFrom)
          : initialDateFrom,
    });
    setRangeCompare(
      initialCompareFrom
        ? {
            from:
              typeof initialCompareFrom === "string"
                ? new Date(initialCompareFrom)
                : initialCompareFrom,
            to: initialCompareTo
              ? typeof initialCompareTo === "string"
                ? new Date(initialCompareTo)
                : initialCompareTo
              : typeof initialCompareFrom === "string"
                ? new Date(initialCompareFrom)
                : initialCompareFrom,
          }
        : undefined,
    );
  };

  useEffect(() => {
    checkPreset();
  }, [range]);

  const PresetButton = ({
    preset,
    label,
    isSelected,
  }: {
    preset: string;
    label: string;
    isSelected: boolean;
  }): JSX.Element => (
    <Button
      className={cn(
        isSelected && "pointer-events-none",
        "w-full justify-start px-2.5 py-1.5",
      )}
      variant="ghost"
      onClick={() => {
        setPreset(preset);
      }}
    >
      {label}

      <div className="ml-auto">
        <Check
          className={cn(
            isSelected ? "opacity-100" : "opacity-0",
            "ml-2 h-4 w-4 transition-opacity",
          )}
        />
      </div>
    </Button>
  );

  // Helper function to check if two date ranges are equal
  const areRangesEqual = (a?: DateRange, b?: DateRange) => {
    if (!a || !b) return a === b; // If either is undefined, return true if both are undefined
    return (
      a.from.getTime() === b.from.getTime() &&
      (!a.to || !b.to || a.to.getTime() === b.to.getTime())
    );
  };

  let maxDate = new Date();

  if (isSearchConsole) {
    maxDate = new Date(new Date().setDate(new Date().getDate() - 3));
  }

  useEffect(() => {
    if (isOpen) {
      openedRangeRef.current = range;
      openedRangeCompareRef.current = rangeCompare;
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) return;
    onUpdate?.({ range, rangeCompare });
  }, [update, range, rangeCompare]);

  useEffect(() => {
    if (!rangeCompare) return;
    if (compareType === "last_year") {
      setRangeCompare({
        from: new Date(
          range.from.getFullYear() - 1,
          range.from.getMonth(),
          range.from.getDate(),
        ),
        to: range.to
          ? new Date(
              range.to.getFullYear() - 1,
              range.to.getMonth(),
              range.to.getDate(),
            )
          : undefined,
      });
    } else if (compareType === "period") {
      const periodDuration = range.to
        ? range.to.getTime() - range.from.getTime()
        : 0;

      setRangeCompare({
        from: new Date(range.from.getTime() - periodDuration - 86400000), // Subtract an extra day to exclude range.from
        to: new Date(range.from.getTime() - 86400000), // Subtract one day to exclude range.from
      });
    }
  }, [range, compareType]);

  const disableCompare = [
    "/google-search-console/ctr",
    "/google-search-console/brand-no-brand",
    "/tool/analytics/klaviyo",
  ].some((path) => pathname.includes(path));

  // Add this helper function to validate date range
  const validateKlaviyoDateRange = (
    from: Date,
    to: Date | undefined,
  ): DateRange => {
    if (!isKlaviyoAnalytics || !to) return { from, to };

    // Calculate the difference in milliseconds
    const diffTime = Math.abs(to.getTime() - from.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // If the range is more than 365 days
    if (diffDays > 365) {
      // Adjust the 'from' date to be exactly 1 year before 'to'
      const newFrom = new Date(to);
      newFrom.setFullYear(to.getFullYear() - 1);
      newFrom.setHours(0, 0, 0, 0);
      return { from: newFrom, to };
    }

    return { from, to };
  };

  // Update the setRange calls to include validation
  // Find and replace the existing setRange calls with these modified versions:

  // For date input changes
  const handleFromDateChange = (date: Date) => {
    let toDate = range.to == null || date > range.to ? date : range.to;

    if (toDate > new Date()) {
      toDate = new Date();
    }

    let maxDate = new Date();

    if (isSearchConsole) {
      maxDate = new Date(new Date().setDate(new Date().getDate() - 4));
    }

    if (date > maxDate) {
      date = new Date(
        new Date().setDate(new Date().getDate() - (isSearchConsole ? 4 : 1)),
      );
    }

    const validatedRange = validateKlaviyoDateRange(date, toDate);
    setRange(validatedRange);
  };

  const handleToDateChange = (date: Date) => {
    const fromDate = date < range.from ? date : range.from;

    let maxDate = new Date();

    if (isSearchConsole) {
      maxDate = new Date(new Date().setDate(new Date().getDate() - 3));
    }

    if (date > maxDate) {
      date = new Date(
        new Date().setDate(new Date().getDate() - (isSearchConsole ? 3 : 0)),
      );
    }

    const validatedRange = validateKlaviyoDateRange(fromDate, date);
    setRange(validatedRange);
  };

  // Update the Calendar onSelect handler
  const handleCalendarSelect = (
    value: { from?: Date; to?: Date } | undefined,
  ) => {
    if (!value) return;

    if (isKlaviyoAnalytics) {
      const from = value.from;
      const to = value.to;

      if (from && to) {
        const diffTime = Math.abs(to.getTime() - from.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays > 365) {
          // If range is more than a year, keep the most recently selected date
          // and adjust the other date to maintain the one-year limit
          const mostRecentDate = range.from === from ? to : from;
          const newRange =
            range.from === from
              ? {
                  from,
                  to: new Date(from.getTime() + 365 * 24 * 60 * 60 * 1000),
                }
              : {
                  from: new Date(to.getTime() - 365 * 24 * 60 * 60 * 1000),
                  to,
                };
          setRange(newRange);
          return;
        }
      }
    }

    setRange({
      from: value.from ?? range.from,
      to: value.to ?? range.to,
    });
  };

  // Add this function to calculate disabled dates for Klaviyo
  const getDisabledDates = () => {
    // First handle non-Klaviyo pages
    if (!isKlaviyoAnalytics) {
      return { after: maxDate };
    }

    // For Klaviyo Analytics pages
    if (range.from && !range.to) {
      // If only 'from' date is selected
      const maxAllowed = new Date(range.from);
      maxAllowed.setFullYear(maxAllowed.getFullYear() + 1);
      maxAllowed.setDate(maxAllowed.getDate() - 1); // Subtract one day to make it exactly one year

      const minAllowed = new Date(range.from);
      minAllowed.setFullYear(minAllowed.getFullYear() - 1);
      minAllowed.setDate(minAllowed.getDate() + 1); // Add one day to make it exactly one year

      return {
        before: minAllowed,
        after: maxAllowed > maxDate ? maxDate : maxAllowed,
        // Add a custom function to disable dates outside the allowed range
        dates: (date: Date) => {
          const time = date.getTime();
          return time < minAllowed.getTime() || time > maxAllowed.getTime();
        },
      };
    }

    if (range.to && !range.from) {
      // If only 'to' date is selected
      const minAllowed = new Date(range.to);
      minAllowed.setFullYear(minAllowed.getFullYear() - 1);
      minAllowed.setDate(minAllowed.getDate() + 1);

      const maxAllowed = new Date(range.to);
      maxAllowed.setFullYear(maxAllowed.getFullYear() + 1);
      maxAllowed.setDate(maxAllowed.getDate() - 1);

      return {
        before: minAllowed,
        after: maxDate,
        // Add a custom function to disable dates outside the allowed range
        dates: (date: Date) => {
          const time = date.getTime();
          return (
            time < minAllowed.getTime() ||
            time > (maxAllowed > maxDate ? maxDate : maxAllowed).getTime()
          );
        },
      };
    }

    // If no dates are selected or both dates are selected
    return { after: maxDate };
  };

  return (
    <div className="flex items-center gap-2">
      {!disableCompare && (
        <TooltipProvider>
          <Tooltip open={!isCompareOpen ? undefined : false}>
            <Popover open={isCompareOpen} onOpenChange={setIsCompareOpen}>
              <PopoverTrigger asChild>
                <TooltipTrigger asChild>
                  <Button
                    id="date-picker-step-3"
                    className={cn(
                      rangeCompare && "border-primary text-primary",
                      "transition-color flex h-10 w-10 min-w-10 max-w-10 items-center justify-center p-0",
                    )}
                    variant={"outline"}
                  >
                    <ArrowRightLeft className="mr-0 h-4 w-4" />
                  </Button>
                </TooltipTrigger>
              </PopoverTrigger>
              <PopoverContent id="date-picker-step-4" className="p-1">
                <Label className="px-2.5 text-xs text-foreground/60">
                  Sammenlign
                </Label>
                <CompareDateRanges
                  range={range}
                  setRangeCompare={setRangeCompare}
                  setUpdate={setUpdate}
                  rangeCompare={rangeCompare}
                  changeCompareType={changeCompareType}
                  compareType={compareType}
                />
              </PopoverContent>
            </Popover>
            <TooltipContent className="border border-black/10 bg-white py-2 text-foreground shadow-sm">
              <p>Sammenlign perioder</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      <Popover
        open={isOpen}
        onOpenChange={(open: boolean) => {
          setIsOpen(open);
          setUpdate(new Date());
        }}
      >
        <PopoverTrigger asChild>
          <Button
            id="date-picker-step-1"
            className="flex h-10 w-full justify-between px-3 md:w-max"
            variant="outline"
          >
            <div className="flex items-center gap-2">
              <CalendarIcon className={cn("mr-2 h-4 w-4")} />
              <div className="flex flex-col">
                <div className="text-right">
                  <div>{`${formatDate(range.from, locale)}${
                    range.to != null ? " - " + formatDate(range.to, locale) : ""
                  }`}</div>
                </div>
                {rangeCompare != null &&
                  !pathname.includes("/google-search-console/ctr") &&
                  !pathname.includes(
                    "/google-search-console/brand-no-brand",
                  ) && (
                    <div className="-mt-1 text-xs opacity-60">
                      <>
                        vs. {formatDate(rangeCompare.from, locale)}
                        {rangeCompare.to != null
                          ? ` - ${formatDate(rangeCompare.to, locale)}`
                          : ""}
                      </>
                    </div>
                  )}
              </div>
            </div>
            <ChevronDown
              className={cn(
                isOpen && "rotate-180",
                "ml-2 h-4 w-4 transition-transform",
              )}
            />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          id="date-picker-step-2"
          align={align}
          className="w-auto"
        >
          <div className="flex">
            <div className="flex">
              {!isSmallScreen && (
                <div className="-mt-4 flex flex-col items-start gap-1 border-r pt-4">
                  <h2 className="mb-2 text-[18px] font-medium">Presets</h2>
                  <div className="flex h-[326px] w-full flex-col items-start gap-1 overflow-auto pb-4 pr-4">
                    {PRESETS?.map((preset) => {
                      return (
                        <PresetButton
                          key={preset.name}
                          preset={preset.name}
                          label={preset.label}
                          isSelected={selectedPreset === preset.name}
                        />
                      );
                    })}
                  </div>
                </div>
              )}
              <div className="flex flex-col">
                <div className="flex flex-col items-center justify-center gap-2 px-3 pb-4 lg:flex-row lg:items-start lg:pb-0">
                  {isSmallScreen && (
                    <Select
                      defaultValue={selectedPreset}
                      onValueChange={(value) => {
                        setPreset(value);
                      }}
                    >
                      <SelectTrigger className="mx-auto mb-2 w-full">
                        <SelectValue placeholder="Vælg preset..." />
                      </SelectTrigger>
                      <SelectContent>
                        {PRESETS?.map((preset) => (
                          <SelectItem key={preset.name} value={preset.name}>
                            {preset.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                      <DateInput
                        value={range.from}
                        onChange={handleFromDateChange}
                      />
                      <div className="py-1">-</div>
                      <DateInput
                        value={range.to}
                        onChange={handleToDateChange}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <Calendar
                    className="w-full"
                    mode="range"
                    onSelect={handleCalendarSelect}
                    selected={range}
                    numberOfMonths={isSmallScreen ? 1 : 2}
                    showOutsideDays={true}
                    disabled={getDisabledDates()}
                    defaultMonth={
                      new Date(
                        new Date().setMonth(
                          new Date().getMonth() - (isSmallScreen ? 0 : 1),
                        ),
                      )
                    }
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="-mx-4 flex justify-between gap-2 border-t px-4 pt-4">
            <Button
              onClick={() => {
                resetValues();
              }}
              variant="ghost"
              className="text-destructive"
            >
              Nulstil
            </Button>
            <div>
              <Button
                onClick={() => {
                  setIsOpen(false);
                }}
                variant="ghost"
              >
                Annuller
              </Button>
              <Button
                onClick={() => {
                  setIsOpen(false);
                  if (
                    !areRangesEqual(range, openedRangeRef.current) ||
                    !areRangesEqual(rangeCompare, openedRangeCompareRef.current)
                  ) {
                    onUpdate?.({ range, rangeCompare });
                  }
                }}
              >
                Opdater
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

DateRangePicker.displayName = "DateRangePicker";
DateRangePicker.filePath =
  "libs/shared/ui-kit/src/lib/date-range-picker/date-range-picker.tsx";
