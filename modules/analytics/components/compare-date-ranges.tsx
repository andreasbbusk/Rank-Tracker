import { Button } from "@/modules/core/components/ui/button";
import { DateRange } from "@/modules/core/components/ui/date-range-picker";
import { cn } from "@/modules/core/lib/utils";
import { Check } from "lucide-react";

export default function CompareDateRanges({
  range,
  setRangeCompare,
  setUpdate,
  changeCompareType,
  compareType,
  rangeCompare,
}: {
  range: DateRange;
  setRangeCompare: (range: DateRange | undefined) => void;
  setUpdate: (date: Date) => void;
  rangeCompare?: DateRange;
  compareType: "period" | "last_year" | undefined;
  changeCompareType: (type: "period" | "last_year") => void;
}) {
  function setCompare(type: "period" | "last_year") {
    if (type === "period") {
      const periodDuration = range.to
        ? range.to.getTime() - range.from.getTime()
        : 0;

      setRangeCompare({
        from: new Date(range.from.getTime() - periodDuration - 86400000), // Subtract an extra day to exclude range.from
        to: new Date(range.from.getTime() - 86400000), // Subtract one day to exclude range.from
      });
    } else {
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
    }

    changeCompareType(type);
    setUpdate(new Date());
  }

  const options = [
    { label: "Forrige periode", value: "period" },
    { label: "Sidste år", value: "last_year" },
  ] as const;

  return (
    <div className="mt-2 flex w-[180px] flex-col gap-2">
      {options.map((option) => (
        <Button
          key={option.value}
          onClick={() => setCompare(option.value)}
          variant={"ghost"}
          className={cn(
            option.value === compareType && rangeCompare && "text-primary",
            "justify-between text-left",
          )}
        >
          {option.label}
          {option.value === compareType && rangeCompare && (
            <Check className="ml-2 h-4 w-4" />
          )}
        </Button>
      ))}
      <Button
        variant={"ghost"}
        disabled={!rangeCompare}
        className="justify-start text-left text-red-600 hover:text-red-600"
        onClick={() => {
          setRangeCompare(undefined);
          setUpdate(new Date());
        }}
      >
        Fjern sammenligning
      </Button>
    </div>
  );
}
