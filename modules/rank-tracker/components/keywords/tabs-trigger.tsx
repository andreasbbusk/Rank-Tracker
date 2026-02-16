"use client";

import { useRankTrackerStore } from "@/modules/rank-tracker/store/rank-tracker.store";
import { Tabs, TabsList, TabsTrigger } from "@/modules/core/components/ui/tabs";
import useStore from "@/modules/core/hooks/useStore";

export function KeywordTabsTrigger() {
  const tab = useStore(useRankTrackerStore, (state) => state.tab);
  const changeTab = useRankTrackerStore((state) => state.changeTab);

  return (
    <Tabs
      value={tab}
      className="flex w-full items-center gap-4"
      onValueChange={(value) => changeTab(value as "keyword" | "dashboard")}
    >
      <h3 className="text-sm font-medium text-gray-500">Vælg visning</h3>
      <TabsList className="grid w-full max-w-[250px] grid-cols-2">
        <TabsTrigger value="keyword" className="data-[state=active]:bg-white">
          Søgeord
        </TabsTrigger>
        <TabsTrigger value="dashboard" className="data-[state=active]:bg-white">
          Dashboard
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
