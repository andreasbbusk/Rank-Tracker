"use client";

import { DateRange } from "@/modules/core/components/ui/date-range-picker";
import { keywordColumns } from "@/modules/rank-tracker/constants";
import { Keyword } from "@/modules/rank-tracker/types/index";
import { ColumnDef } from "@tanstack/react-table";
import { useCallback, useEffect, useState, useMemo, useRef } from "react";
import { KeywordTable } from "./keyword-table";
import { Loader2 } from "lucide-react";
import React from "react";

interface KeywordTableWrapperProps {
  data: Keyword[];
  domainId?: string;
  className?: string;
  pSize?: number;
  sortColumn?: string;
  disableSearch?: boolean;
  hasPagination?: boolean;
  disableBorder?: boolean;
  selectedDateRanges?: DateRange[];
  gscData?: any;
}

function KeywordTableWrapperComponent({
  data,
  domainId,
  className,
  pSize = 30,
  sortColumn = "ranking",
  disableSearch = false,
  hasPagination = true,
  disableBorder = false,
  selectedDateRanges = [],
  gscData,
}: KeywordTableWrapperProps) {
  const [formattedData, setFormattedData] = useState<Keyword[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshTimestamp, setLastRefreshTimestamp] = useState<number>(
    Date.now(),
  );
  const [forceUpdate, setForceUpdate] = useState(0);
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Format the incoming data
  const formatData = useCallback((inputData: Keyword[]) => {
    if (!inputData || !Array.isArray(inputData)) return [];

    console.log(`Formatting ${inputData.length} keywords`);

    const defaultOverallStats = {
      clicks: 0,
      impressions: 0,
      position: null,
      ctr: 0,
    };
    const defaultLatestStats = [
      { position: 0, page: "", clicks: 0, impressions: 0 },
    ];
    const defaultSearchVolume = {
      avg_searches: 0,
      month: new Date().toISOString().substring(0, 7),
    };

    const newData = inputData
      // Filter for date_range_0 OR items without a dateRange (new keywords)
      .filter((item) => !item.dateRange || item.dateRange === "date_range_0")
      .map((item) => {
        // Find the comparison data if it exists
        const dataRange1 = inputData.find(
          (i) =>
            i.dateRange === "date_range_1" && String(i.id) === String(item.id),
        );

        // Check if this is likely a newly created keyword
        const isNewKeyword =
          !item.latest_stats ||
          !item.overall_stats ||
          !item.search_volume ||
          (item.latest_stats && item.latest_stats.length === 0);

        // For new keywords, ensure we set default values
        const initializedStats = isNewKeyword
          ? {
              latest_stats: defaultLatestStats,
              overall_stats: defaultOverallStats,
              search_volume: defaultSearchVolume,
            }
          : {};

        // Ensure all required properties are set with sensible defaults
        return {
          ...item,
          ...initializedStats, // Apply initialized stats for new keywords
          id: String(item.id),
          title: item.title || "",
          star_keyword: !!item.star_keyword,
          tags: Array.isArray(item.tags) ? item.tags : [],
          latest_stats: item.latest_stats || defaultLatestStats,
          overall_stats: item.overall_stats || defaultOverallStats,
          search_volume: item.search_volume || defaultSearchVolume,
          location: item.location || { country: "DNK", device: "all" },
          created_at: item.created_at || new Date().toISOString(),
          updated_at: item.updated_at || new Date().toISOString(),
          // Ensure date_range_0 is properly structured
          date_range_0: {
            ...(item.date_range_0 || item),
            id: Number(item.id),
            latest_stats: item.latest_stats || defaultLatestStats,
            overall_stats: item.overall_stats || defaultOverallStats,
            search_volume: item.search_volume || defaultSearchVolume,
            dateRange: "date_range_0",
          },
          // Add comparison data if it exists
          date_range_1: dataRange1
            ? {
                ...dataRange1,
                id: Number(dataRange1?.id),
                latest_stats: dataRange1?.latest_stats || defaultLatestStats,
                overall_stats: dataRange1?.overall_stats || defaultOverallStats,
                search_volume: dataRange1?.search_volume || defaultSearchVolume,
                dateRange: "date_range_1",
              }
            : undefined,
        };
      });

    console.log(`Formatted data: ${newData.length} keywords`);
    return newData as unknown as Keyword[];
  }, []);

  // Handle manual refresh function that can be called from outside
  const refreshData = useCallback(() => {
    // Cancel any existing refresh timer
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
    }

    setIsRefreshing(true);
    setForceUpdate((prev) => prev + 1);
    setLastRefreshTimestamp(Date.now());

    // Clear any cached data for new keywords
    if (typeof window !== "undefined" && window.localStorage) {
      // Filter localStorage for keyword-related caches and clear them
      Object.keys(localStorage).forEach((key) => {
        if (
          key.includes("keyword") ||
          key.includes("ranker") ||
          key.includes("domain")
        ) {
          try {
            localStorage.removeItem(key);
          } catch (e) {
            console.error("Error clearing cached data:", e);
          }
        }
      });
    }

    // Only modify the URL if we need to fix a redirect loop
    if (typeof window !== "undefined") {
      const currentUrl = new URL(window.location.href);
      const isOnDomainPage = window.location.pathname.includes("/domain");
      const hasRedirectParam = currentUrl.searchParams.has("redirect");

      // If we're on the domain page with a redirect parameter, clean up the URL
      if (isOnDomainPage && hasRedirectParam) {
        currentUrl.searchParams.delete("redirect");

        // Use history.replaceState to update the URL without causing a navigation
        if (window.history && window.history.replaceState) {
          window.history.replaceState({}, "", currentUrl.toString());
        }
      }
    }

    // Add timeout to ensure we're not stuck in loading state if something fails
    refreshTimerRef.current = setTimeout(() => {
      setIsRefreshing(false);
      refreshTimerRef.current = null;
    }, 5000);
  }, []);

  // Listen for keyword-table-update events
  useEffect(() => {
    if (!domainId) return;

    // Define handler function
    const handleKeywordTableUpdate = (event: Event) => {
      // Cast to CustomEvent to access detail property
      const customEvent = event as CustomEvent;
      const eventDetail = customEvent.detail || {};
      const eventDomainId = eventDetail.domainId;
      const freshData = eventDetail.freshData;
      const timestamp = eventDetail.timestamp || Date.now();
      const source = eventDetail.source;

      // Only process if this is for our domain
      if (eventDomainId && eventDomainId === domainId) {
        console.log(
          "KeywordTableWrapper: Received update event for domain",
          domainId,
          "source:",
          source,
          "freshData:",
          freshData
            ? `${Array.isArray(freshData) ? freshData.length : "unknown"} items`
            : "none",
          "timestamp:",
          new Date(timestamp).toISOString(),
        );

        // Set to refreshing state to trigger visual indicators
        setIsRefreshing(true);

        // Force immediate UI update for new data
        setForceUpdate((prevForceUpdate) => prevForceUpdate + 1);

        // If we have fresh data from any source, update local state immediately
        if (Array.isArray(freshData) && freshData.length > 0) {
          // Format the data with our formatter to ensure consistency
          const newFormattedData = formatData(freshData);

          // Update the formatted data state to include both existing and new data
          setFormattedData((prevData) => {
            // First, create a map of existing keywords by ID for quick lookups
            const keywordMap = new Map(prevData.map((k) => [k.id, k]));

            // For each new/updated keyword
            newFormattedData.forEach((keyword) => {
              // If it already exists, update it; otherwise add it
              keywordMap.set(keyword.id, keyword);
            });

            // Convert the map back to an array
            const updatedData = Array.from(keywordMap.values());

            console.log(
              `Updated keyword table data: ${updatedData.length} total keywords (${newFormattedData.length} updated/added)`,
            );

            return updatedData;
          });
        }

        // Always refresh data to ensure backend changes are reflected
        refreshData();
      }
    };

    // Register the refresh function globally
    if (typeof window !== "undefined") {
      window.addEventListener("keyword-table-update", handleKeywordTableUpdate);
      (window as any)[`refreshKeywordTable_${domainId}`] = refreshData;
    }

    // Cleanup
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener(
          "keyword-table-update",
          handleKeywordTableUpdate,
        );
        delete (window as any)[`refreshKeywordTable_${domainId}`];
      }

      // Clear any pending refresh timer
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
    };
  }, [domainId, refreshData, formatData]);

  // Memoize data processing to prevent repeated calculations
  const processedData = useMemo(() => {
    if (!data) return [];

    return formatData(data);
  }, [data, formatData]);

  // Process data when it changes or on force update
  useEffect(() => {
    if (!data) return;

    console.log("Processing data update, rows:", processedData.length);

    // Check if we have existing data to merge with
    if (formattedData.length > 0) {
      // Use a map to efficiently update existing records or add new ones
      const keywordMap = new Map(formattedData.map((k) => [k.id, k]));

      processedData.forEach((keyword) => {
        keywordMap.set(keyword.id, keyword);
      });

      setFormattedData(Array.from(keywordMap.values()));
    } else {
      // Initial load or reset case - just set the data
      setFormattedData(processedData);
    }

    // Reset refreshing state after data has been processed
    setIsRefreshing(false);
  }, [processedData, forceUpdate]);

  // Create a stable representation of date ranges for comparison
  const dateRangeKey = useMemo(() => {
    if (!selectedDateRanges || selectedDateRanges.length === 0) return "";

    return selectedDateRanges
      .filter((r) => r && r.from && r.to)
      .map((r) => `${r.from?.toISOString()}_${r.to?.toISOString()}`)
      .join("|");
  }, [selectedDateRanges]);

  // Listen for date range changes to refresh data
  useEffect(() => {
    if (!dateRangeKey) return;

    const hasValidDateRanges = selectedDateRanges.every(
      (range) => range && range.from && range.to,
    );

    if (hasValidDateRanges) {
      console.log("Date ranges changed, refreshing keyword data");

      // Use a debounce to prevent multiple refreshes if many updates happen at once
      const debounceTimer = setTimeout(() => {
        refreshData();
      }, 300);

      return () => clearTimeout(debounceTimer);
    }
  }, [dateRangeKey, refreshData, selectedDateRanges]);

  // Memoize the table columns to prevent unnecessary re-renders
  const memoizedColumns = useMemo(() => {
    return keywordColumns as ColumnDef<Keyword>[];
  }, []);

  return (
    <div className={className}>
      {isRefreshing && (
        <div className="flex items-center justify-center py-2 text-sm text-gray-500">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Opdaterer søgeord...
        </div>
      )}
      <KeywordTable
        columns={memoizedColumns}
        data={formattedData}
        isLoading={isRefreshing}
        isDataReady={!isRefreshing}
        onFilteredDataChange={() => {}}
        selectedDateRanges={selectedDateRanges}
        className={className}
        pSize={pSize}
        sortColumn={sortColumn}
        disableSearch={disableSearch}
        hasPagination={hasPagination}
        disableBorder={disableBorder}
      />
    </div>
  );
}

// Wrap the component in React.memo to prevent unnecessary re-renders
const KeywordTableWrapper = React.memo(KeywordTableWrapperComponent);

export default KeywordTableWrapper;
