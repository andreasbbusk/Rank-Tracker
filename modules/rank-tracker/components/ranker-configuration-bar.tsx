"use client";

import { useSidebar } from "@/modules/core/components/ui/sidebar";
import { cn } from "@/modules/core/lib/utils";
import Image from "next/image";
import { usePathname } from "next/navigation";
import RankTrackerConfiguration from "./rank-tracker-configuration";
import RankTrackerSearchParamsWrapper from "./rank-tracker-searchparams-wrapper";

import DatePicker from "@/modules/rank-tracker/components/date-picker";
import { useRankTrackerStore } from "@/modules/rank-tracker/store/rank-tracker.store";
import useStore from "@/modules/core/hooks/useStore";
import { Domain } from "../types";

interface RankerConfigurationBarProps {
  domains?: Domain[];
}

export default function RankerConfigurationBar({
  domains = [],
}: RankerConfigurationBarProps) {
  const { open } = useSidebar();
  const pathname = usePathname();

  const compareType = useStore(
    useRankTrackerStore,
    (state) => state.compareType,
  );
  const changeCompareType = useRankTrackerStore(
    (state) => state.changeCompareType,
  );

  // Check if we're on a report page
  const isReportPage = pathname?.includes("/report/");

  // Don't show configuration bar on report pages
  if (isReportPage) {
    return null;
  }

  return (
    <section
      className={cn(
        "ignore z-10 rounded-t-xl border-b border-b-black/10 bg-white transition-all duration-200 ease-linear lg:sticky lg:right-2 lg:top-0",
        open ? "lg:left-[294px]" : "lg:left-2",
      )}
    >
      <div className="mx-auto flex w-full max-w-9xl flex-col justify-between gap-4 px-4 py-3 md:px-6 xl:flex-row xl:items-center">
        <div className="flex gap-4">
          <div className="flex items-center gap-2">
            <Image
              src="/images/icons/chart-bar.svg"
              alt="Rank tracker ikon"
              width={20}
              height={20}
              className="text-black"
            />
            <h2 className="font-medium transition-all duration-200">
              Rank Tracker
            </h2>
          </div>
        </div>

        <div className="flex flex-1 flex-col justify-end gap-4 md:flex-row md:items-center">
          {/* Regular rank tracker navigation with domain selector and date picker */}
          <div className="flex flex-1 flex-col justify-end gap-4 md:flex-row md:items-center">
            <RankTrackerSearchParamsWrapper domains={domains}>
              <RankTrackerConfiguration domains={domains} />
            </RankTrackerSearchParamsWrapper>
            <DatePicker
              compareType={compareType}
              changeCompareType={changeCompareType}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
