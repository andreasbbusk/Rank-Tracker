"use client";

import { useRankTrackerStore } from "@/modules/rank-tracker/store/rank-tracker.store";
import { getDateRanges } from "@/modules/analytics/utils/helpers/getDateRanges";
import { useQueryString } from "@/modules/core/hooks/useQueryString";
import useStore from "@/modules/core/hooks/useStore";
import { useCallback, useEffect, useRef } from "react";
import { Domain } from "../types";

function normalizeUrl(url: string) {
  const [path, query = ""] = url.split("?");
  const params = new URLSearchParams(query);
  params.sort();
  const normalizedQuery = params.toString();
  return normalizedQuery ? `${path}?${normalizedQuery}` : path;
}

export default function RankTrackerSearchParamsWrapper({
  domains,
  children,
}: {
  domains: Domain[];
  children: React.ReactNode;
}) {
  const property = useStore(useRankTrackerStore, (state) => state.property);
  const dateRange = useStore(useRankTrackerStore, (state) => state.dateRanges);
  const tab = useStore(useRankTrackerStore, (state) => state.tab);
  const filters = useStore(useRankTrackerStore, (state) => state.filters);

  const { router, pathname, searchParams } = useQueryString();

  // Track previous URL to prevent duplicate updates
  const prevUrlRef = useRef<string | null>(null);
  const shouldSkipNextUpdate = useRef(false);

  const { dateRanges } = getDateRanges({
    searchParams: { range: undefined, rangeCompare: undefined },
  });

  const placeholderDateRange = `range=${dateRanges[0].start_date}_${dateRanges[0].end_date}`;

  const currentDomain = searchParams.get("domain");
  const currentTab = searchParams.get("tab");
  const currentRange = searchParams.get("range");
  const currentRangeCompare = searchParams.get("rangeCompare");
  const currentFilterParams = new URLSearchParams(searchParams.toString());
  currentFilterParams.delete("domain");
  currentFilterParams.delete("tab");
  currentFilterParams.delete("range");
  currentFilterParams.delete("rangeCompare");
  const currentFilters = currentFilterParams.toString();

  const effectiveProperty = property ?? currentDomain;
  const effectiveTab = tab || currentTab || (effectiveProperty ? "keyword" : null);
  const effectiveDateRange =
    dateRange && dateRange.trim().length > 0
      ? dateRange
      : currentRange
        ? `range=${currentRange}${currentRangeCompare ? `&rangeCompare=${currentRangeCompare}` : ""}`
        : placeholderDateRange;
  const effectiveFilters =
    filters && filters.trim().length > 0 ? filters : currentFilters;

  const isStoreReady =
    property !== undefined &&
    dateRange !== undefined &&
    tab !== undefined &&
    filters !== undefined;
  // Check if we're on the main page with no domain parameter
  const isMainPage = pathname === "/" && !currentDomain;

  // Check if we're on the domain page and only missing the tab parameter
  const isMissingOnlyTab =
    currentDomain && !currentTab && pathname.includes("/domain");

  // Memoize URL construction to prevent unnecessary re-renders
  const constructUrl = useCallback(() => {
    // Initialize query string with date range parameters
    let querystring = "";

    // Add date range parameters
    querystring += effectiveDateRange;

    // If we're on the main page with no domain, only include date range parameters
    if (isMainPage) {
      return `${pathname}?${querystring}`;
    }

    // For all other cases, include domain and tab as appropriate

    // Add tab parameter - use current tab, or default to "keyword" if domain exists but no tab is set
    const activeTab = effectiveTab;
    if (activeTab) {
      if (querystring) {
        querystring = `tab=${activeTab}&${querystring}`;
      } else {
        querystring = `tab=${activeTab}`;
      }
    }

    // Add domain parameter if it exists in the store
    if (effectiveProperty) {
      if (querystring) {
        querystring = `domain=${effectiveProperty}&${querystring}`;
      } else {
        querystring = `domain=${effectiveProperty}`;
      }
    }

    // Add filters if available
    if (effectiveFilters) {
      querystring += `&${effectiveFilters}`;
    }

    return `${pathname}?${querystring}`;
  }, [
    effectiveDateRange,
    effectiveTab,
    effectiveProperty,
    effectiveFilters,
    isMainPage,
    pathname,
  ]);

  // Keep store state aligned with URL state after navigations (including hard redirects)
  useEffect(() => {
    const urlDateRange = currentRange
      ? `range=${currentRange}${currentRangeCompare ? `&rangeCompare=${currentRangeCompare}` : ""}`
      : placeholderDateRange;

    const urlTab =
      currentTab ||
      (currentDomain && pathname.includes("/domain") ? "keyword" : null);

    const nextState: Partial<{
      property: string | null;
      tab: "keyword" | "dashboard" | "content-intelligence";
      dateRanges: string;
      filters: string;
    }> = {};

    const storeState = useRankTrackerStore.getState();
    const nextProperty = currentDomain || null;

    if (storeState.property !== nextProperty) {
      nextState.property = nextProperty;
    }

    if (
      urlTab &&
      (urlTab === "keyword" ||
        urlTab === "dashboard" ||
        urlTab === "content-intelligence") &&
      storeState.tab !== urlTab
    ) {
      nextState.tab = urlTab;
    }

    if (storeState.dateRanges !== urlDateRange) {
      nextState.dateRanges = urlDateRange;
    }

    if (storeState.filters !== currentFilters) {
      nextState.filters = currentFilters;
    }

    if (Object.keys(nextState).length > 0) {
      useRankTrackerStore.setState(nextState);
    }
  }, [
    currentDomain,
    currentFilters,
    currentRange,
    currentRangeCompare,
    currentTab,
    pathname,
    placeholderDateRange,
  ]);

  // Set default tab to "keyword" if a domain is selected but no tab is set
  useEffect(() => {
    if (!isStoreReady) {
      return;
    }

    // If we just have the domain parameter but no tab, we'll soon be updating
    // to add tab=keyword - mark that we should skip the next URL update
    if (isMissingOnlyTab && property && !tab) {
      shouldSkipNextUpdate.current = true;
      useRankTrackerStore.setState({ tab: "keyword" });
    }
  }, [property, tab, isMissingOnlyTab, isStoreReady]);

  useEffect(() => {
    if (!isStoreReady) {
      return;
    }

    // If we should skip this update, reset the flag and return
    if (shouldSkipNextUpdate.current) {
      shouldSkipNextUpdate.current = false;
      return;
    }

    const newUrl = constructUrl();

    // If we're just adding tab=keyword to a URL that already has the domain,
    // handle it with replaceState instead of a full navigation
    if (isMissingOnlyTab && currentDomain) {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", "keyword");
      window.history.replaceState({}, "", url.toString());
      prevUrlRef.current = `${url.pathname}${url.search}`;
      return;
    }

    const currentUrl = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
    const normalizedCurrentUrl = normalizeUrl(currentUrl);
    const normalizedNewUrl = normalizeUrl(newUrl);

    // Avoid pushing identical URLs (also handles remounts and query order changes)
    if (normalizedNewUrl === normalizedCurrentUrl) {
      prevUrlRef.current = currentUrl;
      return;
    }

    // Only update if the URL has actually changed
    if (
      !prevUrlRef.current ||
      normalizedNewUrl !== normalizeUrl(prevUrlRef.current)
    ) {
      prevUrlRef.current = newUrl;

      // Update the URL
      router.push(newUrl, {
        scroll: false,
      });
    }
  }, [
    constructUrl,
    router,
    isMissingOnlyTab,
    currentDomain,
    pathname,
    searchParams,
    isStoreReady,
  ]);

  return <>{children}</>;
}
