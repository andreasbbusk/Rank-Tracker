import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { isoCountries } from "../constants/iso-countries";
import { ColumnDef } from "@tanstack/react-table";
import { SortingState } from "@tanstack/react-table";

interface DataTableProps<TData extends Record<string, any>, TValue> {
  data: TData[];
  setSorting: (sorting: SortingState) => void;
  sortColumn: string;
  columns: ColumnDef<TData>[];
}

export default function useKeywordTable<TData extends Record<string, any>>({
  data,
  setSorting,
  sortColumn,
  columns,
}: DataTableProps<TData, any>) {
  const filterParams = useSearchParams();
  const [localData, setLocalData] = useState(data);

  // Improved filter application with more logging and error handling
  const applyFilters = useCallback(
    (inputData: TData[]) => {
      try {
        let processed = [...inputData];
        const isStarredFilter = filterParams.get("starred") === "true";
        const searchTerms =
          filterParams
            .get("search")
            ?.toLowerCase()
            .split(",")
            .filter(Boolean) || [];
        const selectedTags =
          filterParams.get("tags")?.split(",").filter(Boolean) || [];
        const landingPages =
          filterParams
            .get("landingPages")
            ?.toLowerCase()
            .split(",")
            .filter(Boolean) || [];
        const selectedCountry = filterParams.get("country");

        // Get metric filters
        const rankType = filterParams.get("rankType");
        const rankValue1 = filterParams.get("rankValue1")
          ? Number(filterParams.get("rankValue1"))
          : null;
        const rankValue2 = filterParams.get("rankValue2")
          ? Number(filterParams.get("rankValue2"))
          : null;

        const clicksType = filterParams.get("clicksType");
        const clicksValue1 = filterParams.get("clicksValue1")
          ? Number(filterParams.get("clicksValue1"))
          : null;
        const clicksValue2 = filterParams.get("clicksValue2")
          ? Number(filterParams.get("clicksValue2"))
          : null;

        const impressionsType = filterParams.get("impressionsType");
        const impressionsValue1 = filterParams.get("impressionsValue1")
          ? Number(filterParams.get("impressionsValue1"))
          : null;
        const impressionsValue2 = filterParams.get("impressionsValue2")
          ? Number(filterParams.get("impressionsValue2"))
          : null;

        // Apply filters in sequence
        if (isStarredFilter) {
          processed = processed.filter((keyword) => keyword.star_keyword);
        }

        if (searchTerms.length > 0) {
          processed = processed.filter((keyword) =>
            searchTerms.some((term) =>
              keyword.title.toLowerCase().includes(term),
            ),
          );
        }

        if (selectedTags.length > 0) {
          processed = processed.filter((keyword) =>
            selectedTags.every((selectedTag) =>
              keyword.tags?.some((tag: any) => {
                const tagName = typeof tag === "string" ? tag : tag.name;
                return tagName.toLowerCase() === selectedTag.toLowerCase();
              }),
            ),
          );
        }

        // Apply country filter using ISO country code
        if (selectedCountry && selectedCountry !== "DNK") {
          const countryIso =
            isoCountries.find((c) => c.name === selectedCountry)?.code ||
            selectedCountry;
          processed = processed.filter((keyword) => {
            const keywordCountry = keyword.location?.country;
            return keywordCountry === countryIso;
          });
        }

        // Apply landing page filter
        if (landingPages.length > 0) {
          processed = processed.filter((keyword) => {
            const keywordPages = keyword.latest_stats?.[0]?.page
              ? Array.isArray(keyword.latest_stats[0].page)
                ? keyword.latest_stats[0].page
                : [keyword.latest_stats[0].page]
              : [];
            return landingPages.some((filterPage) =>
              keywordPages.some((keywordPage: any) =>
                keywordPage.toLowerCase().includes(filterPage),
              ),
            );
          });
        }

        // Apply rank filter
        if (rankType && rankValue1 !== null) {
          processed = processed.filter((keyword) => {
            const position = keyword.latest_stats?.[0]?.position;
            if (position === undefined || position === null) return false;

            switch (rankType) {
              case "equals":
                return position === rankValue1;
              case "greater":
                return position > rankValue1;
              case "less":
                return position < rankValue1;
              case "between":
                return rankValue2 !== null
                  ? position >= rankValue1 && position <= rankValue2
                  : true;
              default:
                return true;
            }
          });
        }

        // Apply clicks filter
        if (clicksType && clicksValue1 !== null) {
          processed = processed.filter((keyword) => {
            const clicks = keyword.overall_stats?.clicks;
            if (clicks === undefined || clicks === null) return false;

            switch (clicksType) {
              case "greater":
                return clicks > clicksValue1;
              case "less":
                return clicks < clicksValue1;
              case "between":
                return clicksValue2 !== null
                  ? clicks >= clicksValue1 && clicks <= clicksValue2
                  : true;
              default:
                return true;
            }
          });
        }

        // Apply impressions filter
        if (impressionsType && impressionsValue1 !== null) {
          processed = processed.filter((keyword) => {
            const impressions = keyword.overall_stats?.impressions;
            if (impressions === undefined || impressions === null) return false;

            switch (impressionsType) {
              case "greater":
                return impressions > impressionsValue1;
              case "less":
                return impressions < impressionsValue1;
              case "between":
                return impressionsValue2 !== null
                  ? impressions >= impressionsValue1 &&
                      impressions <= impressionsValue2
                  : true;
              default:
                return true;
            }
          });
        }

        // Get user preferences from URL params
        const initialSortField = filterParams.get("sort") || sortColumn;

        // Validate the sort field exists as a column
        const sortFieldExists = columns.some((col) => {
          const colDef = col as { accessorKey?: string };
          return colDef.accessorKey === initialSortField;
        });

        if (!sortFieldExists) {
          console.warn(
            `Sort column '${initialSortField}' does not exist, using default sorting`,
          );
        }

        // Set valid sort state
        if (sortFieldExists) {
          setSorting([
            { id: initialSortField, desc: filterParams.get("dir") === "desc" },
          ]);
        }

        return processed;
      } catch (error) {
        console.error("Error applying filters:", error);
        return inputData;
      }
    },
    [filterParams, sortColumn, columns, setSorting],
  );

  // Update local data when data changes
  useEffect(() => {
    if (!data) return;

    const processed = applyFilters(data);
    setLocalData(processed);
  }, [data, applyFilters, localData.length]);

  // Listen for keyword events to handle immediate updates
  useEffect(() => {
    // Define event handler to react to direct keyword-table-update events
    const handleKeywordUpdate = (event: Event) => {
      const customEvent = event as CustomEvent;
      const freshData = customEvent.detail?.freshData;

      if (Array.isArray(freshData) && freshData.length > 0) {
        // Update local data with new keywords
        setLocalData((prevData) => {
          // Add new items while avoiding duplicates
          const existingIds = new Set(prevData.map((item) => item.id));
          const newItems = freshData.filter(
            (item) => !existingIds.has(item.id),
          );

          if (newItems.length === 0) return prevData;

          // Apply filters to combined data
          const combinedData = [...prevData, ...newItems] as TData[];
          return applyFilters(combinedData);
        });
      }
    };

    // Register for events
    if (typeof window !== "undefined") {
      window.addEventListener("keyword-table-update", handleKeywordUpdate);
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("keyword-table-update", handleKeywordUpdate);
      }
    };
  }, [applyFilters]);

  return { localData, setLocalData };
}
