"use client";

import { DateRangePicker } from "@/modules/core/components/ui/date-range-picker";
import { useRankTrackerStore } from "@/modules/rank-tracker/store/rank-tracker.store";
import { useSearchParams } from "next/navigation";

const formatDate = (date: Date): string => {
  const localDate = new Date(date);
  const year = localDate.getFullYear();
  const month = String(localDate.getMonth() + 1).padStart(2, "0");
  const day = String(localDate.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export default function RankTrackerDatePicker({
  compareType,
  changeCompareType,
}: {
  compareType: "period" | "last_year" | undefined;
  changeCompareType: (type: "period" | "last_year") => void;
}) {
  const searchParams = useSearchParams();
  const changeRankTrackerDateRanges = useRankTrackerStore(
    (state) => state.changeDateRanges,
  );

  const currentDate = new Date(new Date().setDate(new Date().getDate()));
  const millisecondsPerDay = 30 * 24 * 60 * 60 * 1000;
  const thirtyDaysAgo = new Date(currentDate.getTime() - millisecondsPerDay);

  const range = searchParams.get("range");
  const rangeCompare = searchParams.get("rangeCompare");

  let rangeFrom = thirtyDaysAgo.toISOString().split("T")[0];
  let rangeTo = currentDate.toISOString().split("T")[0];

  if (range) {
    rangeFrom = range.split("_")[0];
    rangeTo = range.split("_")[1];
  }

  let rangeCompareFrom: string | undefined;
  let rangeCompareTo: string | undefined;

  if (rangeCompare) {
    rangeCompareFrom = rangeCompare.split("_")[0];
    rangeCompareTo = rangeCompare.split("_")[1];
  }

  return (
    <DateRangePicker
      compareType={compareType}
      changeCompareType={changeCompareType}
      onUpdate={(values) => {
        if (!values.range.to) return;

        const from = formatDate(values.range.from);
        const to = formatDate(values.range.to);

        let queryString = `range=${from}_${to}`;

        if (values.rangeCompare?.to) {
          const compareFrom = formatDate(values.rangeCompare.from);
          const compareTo = formatDate(values.rangeCompare.to);
          queryString += `&rangeCompare=${compareFrom}_${compareTo}`;
        }

        changeRankTrackerDateRanges(queryString);
      }}
      initialDateFrom={new Date(rangeFrom)}
      initialDateTo={new Date(rangeTo)}
      initialCompareFrom={rangeCompareFrom && new Date(rangeCompareFrom)}
      initialCompareTo={rangeCompareTo && new Date(rangeCompareTo)}
      resetDateFrom={thirtyDaysAgo.toISOString().split("T")[0]}
      resetDateTo={currentDate.toISOString().split("T")[0]}
      align="end"
      locale="da-DK"
    />
  );
}
