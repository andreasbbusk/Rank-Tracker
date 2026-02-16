"use client";

import { useRankTrackerStore } from "@/modules/rank-tracker/store/rank-tracker.store";
import { getDateRanges } from "@/modules/analytics/utils/helpers/getDateRanges";
import { useQueryString } from "@/modules/core/hooks/useQueryString";
import useStore from "@/modules/core/hooks/useStore";
import { useCallback, useEffect, useRef } from "react";
import { Domain } from "../types";

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
  const redirect = searchParams.get("redirect");
  const currentTab = searchParams.get("tab");
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
    if (dateRange) {
      querystring += dateRange;
    } else {
      querystring += placeholderDateRange;
    }

    // If we're on the main page with no domain, only include date range parameters
    if (isMainPage) {
      return `${pathname}?${querystring}`;
    }

    // For all other cases, include domain and tab as appropriate

    // Add tab parameter - use current tab, or default to "keyword" if domain exists but no tab is set
    const activeTab = tab || (property ? "keyword" : null);
    if (activeTab) {
      if (querystring) {
        querystring = `tab=${activeTab}&${querystring}`;
      } else {
        querystring = `tab=${activeTab}`;
      }
    }

    // Add domain parameter if it exists in the store
    if (property) {
      if (querystring) {
        querystring = `domain=${property}&${querystring}`;
      } else {
        querystring = `domain=${property}`;
      }
    }

    // Add filters if available
    if (filters) {
      querystring += `&${filters}`;
    }

    return `${pathname}?${querystring}`;
  }, [
    property,
    dateRange,
    tab,
    filters,
    isMainPage,
    pathname,
    placeholderDateRange,
  ]);

  useEffect(() => {
    if (redirect) {
      useRankTrackerStore.setState({ property: currentDomain });

      // When we're redirecting with a domain set, we'll set the tab in the store
      // This will prevent unnecessary URL updates
      if (currentDomain && !currentTab) {
        useRankTrackerStore.setState({ tab: "keyword" });
        shouldSkipNextUpdate.current = true;
      }
    }
  }, [redirect, currentDomain, currentTab]);

  // Set default tab to "keyword" if a domain is selected but no tab is set
  useEffect(() => {
    // If we just have the domain parameter but no tab, we'll soon be updating
    // to add tab=keyword - mark that we should skip the next URL update
    if (isMissingOnlyTab && property && !tab) {
      shouldSkipNextUpdate.current = true;
      useRankTrackerStore.setState({ tab: "keyword" });
    }
  }, [property, tab, isMissingOnlyTab]);

  useEffect(() => {
    // Skip if there's a redirect parameter - we'll handle this separately
    if (redirect) return;

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
      prevUrlRef.current = url.toString();
      return;
    }

    // Only update if the URL has actually changed
    if (newUrl !== prevUrlRef.current) {
      prevUrlRef.current = newUrl;

      // Update the URL
      router.push(newUrl, {
        scroll: false,
      });
    }
  }, [constructUrl, redirect, router, isMissingOnlyTab, currentDomain]);

  return <>{children}</>;
}
