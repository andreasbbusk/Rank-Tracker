"use client";

import { persist } from "zustand/middleware";
import { createWithEqualityFn } from "zustand/traditional";

type RankTrackerTab = "keyword" | "dashboard" | "content-intelligence";

type RankTrackerStore = {
  property: string | null | undefined;
  changeProperty: (property: string | null | undefined) => void;

  dateRanges: string | null | undefined;
  changeDateRanges: (dateRanges: string | null | undefined) => void;

  compareType: "period" | "last_year";
  changeCompareType: (compareType: "period" | "last_year") => void;

  tab: RankTrackerTab;
  changeTab: (tab: RankTrackerTab) => void;

  filters: string;
  changeFilters: (filters: string) => void;

  clearStore: () => void;
};

export const useRankTrackerStore = createWithEqualityFn<RankTrackerStore>()(
  persist(
    (set): RankTrackerStore => ({
      property: null,
      changeProperty: (property) => set({ property }),

      dateRanges: null,
      changeDateRanges: (dateRanges) => set({ dateRanges }),

      compareType: "last_year",
      changeCompareType: (compareType) => set({ compareType }),

      tab: "keyword",
      changeTab: (tab) => set({ tab }),

      filters: "",
      changeFilters: (filters) => set({ filters }),

      clearStore: () =>
        set({
          property: null,
          dateRanges: null,
          compareType: "last_year",
          tab: "keyword",
          filters: "",
        }),
    }),
    {
      name: "rank-tracker-storage",
    },
  ),
);
