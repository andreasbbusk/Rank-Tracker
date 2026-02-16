"use client";

import { Button } from "@/modules/core/components/ui/button";
import { CSVLink } from "react-csv";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/modules/core/components/ui/tooltip";
import { toast } from "sonner";
import { useEffect, useRef, useState } from "react";
import {
  Keyword,
  Domain,
  DomainWithAnalytics,
} from "@/modules/rank-tracker/types/index";

interface DateRange {
  from: Date;
  to: Date;
}

interface Props {
  data: Keyword[] | DomainWithAnalytics[];
  type: "keyword" | "domain";
  isDisabled?: boolean;
  selectedDateRanges?: DateRange[];
  domain?: Domain;
}

export default function CSVExport({
  data,
  type,
  isDisabled,
  selectedDateRanges = [],
  domain,
}: Props) {
  const [isClient, setIsClient] = useState(false);
  const csvRef = useRef<any>(null);
  const [currentData, setCurrentData] = useState<any[]>(data);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Effect to sync with filtered data from table
  useEffect(() => {
    const getFilteredData = () => {
      const filteredDataElement = document.getElementById(
        `${type}-filtered-data`,
      );
      if (filteredDataElement) {
        try {
          const filteredData = JSON.parse(
            filteredDataElement.textContent || "[]",
          );
          setCurrentData(filteredData);
        } catch (e) {
          console.error("Error parsing filtered data:", e);
          setCurrentData(data);
        }
      } else {
        setCurrentData(data);
      }
    };

    getFilteredData();
    // Set up an observer to watch for changes in the filtered data
    const observer = new MutationObserver(getFilteredData);
    const filteredDataElement = document.getElementById(
      `${type}-filtered-data`,
    );

    if (filteredDataElement) {
      observer.observe(filteredDataElement, {
        characterData: true,
        childList: true,
        subtree: true,
      });
    }

    return () => observer.disconnect();
  }, [data, type]);

  const handleDownload = () => {
    if (!isClient || !csvRef.current) return;
    csvRef.current.link.click();
  };

  const handleCSVClick = () => {
    if (type === "keyword") {
      // Get unique keywords count using the same deduplication logic
      const uniqueKeywordsCount = currentData.reduce(
        (acc: Keyword[], current) => {
          const isDuplicate = acc.find((item) => item.title === current.title);
          if (!isDuplicate) {
            acc.push(current);
          }
          return acc;
        },
        [],
      ).length;

      toast.success("CSV-fil er blevet downloadet", {
        description: `${uniqueKeywordsCount} søgeord er blevet eksporteret`,
      });
    } else {
      toast.success("CSV-fil er blevet downloadet", {
        description: `${currentData.length} domæner er blevet eksporteret`,
      });
    }
  };

  const formatKeywordData = (items: Keyword[]) => {
    // Get the main date range (first one in the array)
    const mainDateRange = selectedDateRanges[0];

    // Deduplicate items based on title (keyword)
    const uniqueItems = items.reduce((acc: Keyword[], current) => {
      const isDuplicate = acc.find((item) => item.title === current.title);

      if (!isDuplicate) {
        acc.push(current);
      }
      return acc;
    }, []);

    return uniqueItems.map((item) => {
      // Get data directly from the item
      const latest_stats = item.latest_stats?.[0];
      const overall_stats = item.overall_stats;
      const search_volume = item.search_volume;

      // Handle landing pages from latest_stats
      const landingPages: string[] = latest_stats?.page
        ? latest_stats.page.split(",").map((page) => page.trim())
        : [];

      // Primary landing page is always the first one in the array
      const primaryLandingPage =
        landingPages.length > 0 ? landingPages[0] : "-";

      // Other landing pages are all remaining URLs after the first one, joined with newlines
      const otherLandingPages =
        landingPages.length > 1 ? landingPages.slice(1).join("\n") : "-";

      // Format dates to match table format (Danish locale)
      const formatDate = (date: Date | string | undefined) => {
        if (!date) return "-";
        const dateObj = typeof date === "string" ? new Date(date) : date;
        return dateObj.toLocaleDateString("da-DK", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        });
      };

      // Format numbers with Danish locale
      const formatNumber = (num: number | undefined | null) => {
        if (num === undefined || num === null) return "0";
        return num.toLocaleString("da-DK");
      };

      // Get position from latest_stats
      const position = latest_stats?.position;
      const formattedPosition =
        position !== undefined && position !== null && !isNaN(Number(position))
          ? Math.round(Number(position)).toString()
          : "Ikke i top 100";

      // Get metrics from overall_stats
      const clicks = overall_stats?.clicks ?? 0;
      const impressions = overall_stats?.impressions ?? 0;
      const monthlySearchVolume = search_volume?.avg_searches ?? 0;

      // Format tags exactly as shown in table
      const formattedTags = Array.isArray(item.tags)
        ? item.tags
            .map((tag) => (typeof tag === "string" ? tag : tag.name))
            .filter(Boolean)
            .join(", ")
        : typeof item.tags === "string"
          ? item.tags
          : "-";

      return {
        domain: domain?.url || "-",
        title: domain?.display_name || "-",
        start_date: mainDateRange ? formatDate(mainDateRange.from) : "-",
        end_date: mainDateRange ? formatDate(mainDateRange.to) : "-",
        created_at: formatDate(item.created_at),
        keyword: item.title || "-",
        tags: formattedTags,
        country: "Danmark",
        landing_page: primaryLandingPage,
        other_landing_pages: otherLandingPages,
        position: formattedPosition,
        clicks: formatNumber(clicks),
        impressions: formatNumber(impressions),
        search_volume: formatNumber(monthlySearchVolume),
      };
    });
  };

  const formatDomainData = (items: DomainWithAnalytics[]) => {
    // Get the main date range (first one in the array)
    const mainDateRange = selectedDateRanges[0];

    // Format dates to match table format (Danish locale)
    const formatDate = (date: Date | string | undefined) => {
      if (!date) return "-";
      const dateObj = typeof date === "string" ? new Date(date) : date;
      return dateObj.toLocaleDateString("da-DK", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
    };

    // Format numbers with Danish locale
    const formatNumber = (num: number | undefined | null) => {
      if (num === undefined || num === null) return "0";
      return num.toLocaleString("da-DK");
    };

    return items.map((item) => {
      return {
        display_name: item.display_name || "-",
        url: item.url || "-",
        start_date: mainDateRange ? formatDate(mainDateRange.from) : "-",
        end_date: mainDateRange ? formatDate(mainDateRange.to) : "-",
        created_at: formatDate(item.created_at),
        keywords_count: formatNumber(item.keywords_count),
        avg_position: formatNumber(item.avg_position),
        clicks: formatNumber(item.clicks),
        impressions: formatNumber(item.impressions),
        top_3_keywords: formatNumber(item.top_3_keywords),
      };
    });
  };

  const getHeaders = () => {
    if (type === "keyword") {
      return [
        { label: "Domæne", key: "domain" },
        { label: "Visningsnavn", key: "title" },
        { label: "Start dato", key: "start_date" },
        { label: "Slut dato", key: "end_date" },
        { label: "Dato for oprettelse", key: "created_at" },
        { label: "Søgeord", key: "keyword" },
        { label: "Tags", key: "tags" },
        { label: "Land", key: "country" },
        { label: "Primær landingsside", key: "landing_page" },
        { label: "Øvrige landingssider", key: "other_landing_pages" },
        { label: "Position", key: "position" },
        { label: "Kliks", key: "clicks" },
        { label: "Eksponeringer", key: "impressions" },
        { label: "Månedlig søgevolumen", key: "search_volume" },
      ];
    } else {
      return [
        { label: "Visningsnavn", key: "display_name" },
        { label: "URL", key: "url" },
        { label: "Start dato", key: "start_date" },
        { label: "Slut dato", key: "end_date" },
        { label: "Dato for oprettelse", key: "created_at" },
        { label: "Antal søgeord", key: "keywords_count" },
        { label: "Gns. position", key: "avg_position" },
        { label: "Kliks", key: "clicks" },
        { label: "Eksponeringer", key: "impressions" },
        { label: "Søgeord i top 3", key: "top_3_keywords" },
      ];
    }
  };

  const getFormattedData = () => {
    if (type === "keyword") {
      return formatKeywordData(currentData as Keyword[]);
    } else {
      return formatDomainData(currentData as DomainWithAnalytics[]);
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="secondary"
            size="icon"
            className="border"
            disabled={isDisabled}
            onClick={handleDownload}
          >
            {isClient && (
              <CSVLink
                ref={csvRef}
                data={getFormattedData()}
                headers={getHeaders()}
                filename={`${type === "keyword" ? domain?.display_name || "søgeord" : "domæner"}.csv`}
                className="hidden"
                onClick={handleCSVClick}
              />
            )}
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M6.75 0.75C6.75 0.335787 6.41421 0 6 0C5.58579 0 5.25 0.335786 5.25 0.75L5.25 6.43934L3.03033 4.21967C2.73744 3.92678 2.26256 3.92678 1.96967 4.21967C1.67678 4.51256 1.67678 4.98744 1.96967 5.28033L5.46967 8.78033C5.76256 9.07322 6.23744 9.07322 6.53033 8.78033L10.0303 5.28033C10.3232 4.98744 10.3232 4.51256 10.0303 4.21967C9.73744 3.92678 9.26256 3.92678 8.96967 4.21967L6.75 6.43934L6.75 0.75Z"
                fill="#6B7280"
              />
              <path
                d="M1.5 7.75C1.5 7.33579 1.16421 7 0.75 7C0.335786 7 0 7.33579 0 7.75V9.25C0 10.7688 1.23122 12 2.75 12H9.25C10.7688 12 12 10.7688 12 9.25V7.75C12 7.33579 11.6642 7 11.25 7C10.8358 7 10.5 7.33579 10.5 7.75V9.25C10.5 9.94036 9.94036 10.5 9.25 10.5H2.75C2.05964 10.5 1.5 9.94036 1.5 9.25V7.75Z"
                fill="#6B7280"
              />
            </svg>
          </Button>
        </TooltipTrigger>
        <TooltipContent className="border border-[#E9E9E9] bg-white">
          <p className="text-black">Download CSV-fil</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
