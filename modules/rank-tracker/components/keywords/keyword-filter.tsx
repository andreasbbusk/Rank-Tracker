"use client";

import { useRankTrackerStore } from "@/modules/rank-tracker/store/rank-tracker.store";
import { Badge } from "@/modules/core/components/ui/badge";
import { Button } from "@/modules/core/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/modules/core/components/ui/dialog";
import { Input } from "@/modules/core/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/modules/core/components/ui/select";
import { cn } from "@/modules/core/lib/utils";
import { isoCountries } from "@/modules/rank-tracker/constants/iso-countries";
import { Plus, Star, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { KeywordTagSelector } from "./keyword-tag-selector";

interface Tag {
  id?: string | number;
  name: string;
}

interface KeywordFilterProps {
  initialTags?: Tag[];
}

interface FilterState {
  country: string;
  search: string[];
  starred: boolean;
  tags: string[];
  landingPages: string[];
  rank: {
    type: "equals" | "between" | "greater" | "less" | null;
    value1: number | null;
    value2: number | null;
  };
  clicks: {
    type: "greater" | "less" | "between" | null;
    value1: number | null;
    value2: number | null;
  };
  impressions: {
    type: "greater" | "less" | "between" | null;
    value1: number | null;
    value2: number | null;
  };
}

// Add constant for default country value
const ALL_COUNTRIES = "ALL";

function KeywordFilterContent({
  initialTags: defaultTags = [],
}: KeywordFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);
  const [currentSearch, setCurrentSearch] = useState("");
  const [currentLandingPage, setCurrentLandingPage] = useState("");
  const [filteredSearchTerms, setFilteredSearchTerms] = useState<string[]>([]);
  const [filteredLandingPages, setFilteredLandingPages] = useState<string[]>(
    [],
  );
  const [selectedTags, setSelectedTags] = useState<string[]>(
    Array.isArray(defaultTags) ? defaultTags.map((tag) => tag.name) : [],
  );

  // Get the domain ID from the URL
  const domainId = useMemo(() => {
    const domain = searchParams.get("domain");
    return domain || "1"; // Default to '1' if not found
  }, [searchParams]);

  // Replace React Query with direct usage of initialTags
  const isLoadingTags = false; // No longer loading tags since they're passed as props
  const isTagError = false; // No error handling needed here
  const tagError = null;
  const availableTags = defaultTags || []; // Use the tags passed via props, ensuring it's always an array

  // Keep the refetchTags function to maintain compatibility, but make it a no-op
  const refetchTags = async () => {
    // This is now a no-op since we're not fetching tags on the client
    return;
  };

  // Normalize tags to handle both string and object formats with better type safety
  const normalizedAvailableTags = useMemo(() => {
    if (!availableTags || !Array.isArray(availableTags)) {
      return [];
    }
    return availableTags
      .filter(
        (tag): tag is Tag =>
          tag !== null &&
          typeof tag === "object" &&
          "name" in tag &&
          typeof tag.name === "string",
      )
      .map((tag) => tag.name);
  }, [availableTags]);

  // Split search terms by both comma and space with better error handling
  const initialSearches = useMemo(() => {
    const searchParam = searchParams.get("search");
    if (!searchParam) return [];

    return searchParam.split(/[,\s]+/).filter(Boolean);
  }, [searchParams]);

  // Handle tags param with better error handling
  const initialTags = useMemo(() => {
    const tagsParam = searchParams.get("tags");
    if (!tagsParam) return [];

    return tagsParam.split(",").filter(Boolean);
  }, [searchParams]);

  const getCountryName = (countryCode: string) => {
    if (countryCode === ALL_COUNTRIES) return "Alle lande";
    const country = isoCountries.find((c) => c.code === countryCode);
    return country ? country.name : countryCode;
  };

  const getCountryCode = (countryName: string) => {
    if (countryName === "Alle lande") return ALL_COUNTRIES;
    // First try exact match
    const exactMatch = isoCountries.find((c) => c.name === countryName);
    if (exactMatch) return exactMatch.code;

    // Then try case-insensitive match
    const caseInsensitiveMatch = isoCountries.find(
      (c) => c.name.toLowerCase() === countryName.toLowerCase(),
    );
    if (caseInsensitiveMatch) return caseInsensitiveMatch.code;

    // If it's already a code, verify it exists
    const isValidCode = isoCountries.find((c) => c.code === countryName);
    if (isValidCode) return countryName;

    return ALL_COUNTRIES; // Default to All Countries if no match found
  };

  // Update initial state to use ALL_COUNTRIES as default
  const initialCountry = useMemo(() => {
    const countryParam = searchParams.get("country");
    if (!countryParam) return ALL_COUNTRIES;
    return getCountryCode(countryParam);
  }, [searchParams]);

  // Initialize filters state
  const [filters, setFilters] = useState<FilterState>({
    country: initialCountry,
    search: initialSearches,
    starred: searchParams.get("starred") === "true",
    tags: searchParams.get("tags")?.split(",").filter(Boolean) || [],
    landingPages:
      searchParams.get("landingPages")?.split(",").filter(Boolean) || [],
    rank: {
      type:
        (searchParams.get("rankType") as FilterState["rank"]["type"]) || null,
      value1: searchParams.get("rankValue1")
        ? Number(searchParams.get("rankValue1"))
        : null,
      value2: searchParams.get("rankValue2")
        ? Number(searchParams.get("rankValue2"))
        : null,
    },
    clicks: {
      type:
        (searchParams.get("clicksType") as FilterState["clicks"]["type"]) ||
        null,
      value1: searchParams.get("clicksValue1")
        ? Number(searchParams.get("clicksValue1"))
        : null,
      value2: searchParams.get("clicksValue2")
        ? Number(searchParams.get("clicksValue2"))
        : null,
    },
    impressions: {
      type:
        (searchParams.get(
          "impressionsType",
        ) as FilterState["impressions"]["type"]) || null,
      value1: searchParams.get("impressionsValue1")
        ? Number(searchParams.get("impressionsValue1"))
        : null,
      value2: searchParams.get("impressionsValue2")
        ? Number(searchParams.get("impressionsValue2"))
        : null,
    },
  });

  const [appliedFilters, setAppliedFilters] = useState<FilterState>({
    ...filters,
  });

  // Filter search terms based on current input
  useEffect(() => {
    if (currentSearch.trim()) {
      const searchLower = currentSearch.toLowerCase();
      const filtered = filters.search.filter((term) =>
        term.toLowerCase().includes(searchLower),
      );
      setFilteredSearchTerms(filtered);
    } else {
      setFilteredSearchTerms(filters.search);
    }
  }, [currentSearch, filters.search]);

  const excludedParams = ["domain", "tab", "range", "rangeCompare"];

  const queryString = Object.fromEntries(
    searchParams.entries().filter(([key]) => !excludedParams.includes(key)),
  );
  const queryStringValue = new URLSearchParams(queryString).toString();

  const changeFilters = useRankTrackerStore((state) => state.changeFilters);

  useEffect(() => {
    changeFilters(queryStringValue);
  }, [queryStringValue, changeFilters]);

  const handleFilterChange = useCallback(
    (value: string | boolean, type: keyof FilterState) => {
      if (type === "search") {
        setCurrentSearch(String(value).toLowerCase());
      } else if (type === "country") {
        // Ensure we're storing the ISO code
        const countryCode =
          typeof value === "string" ? getCountryCode(value) : ALL_COUNTRIES;
        setFilters((prev) => ({
          ...prev,
          country: countryCode,
        }));
      } else {
        const updatedFilters = {
          ...filters,
          [type]:
            type === "tags"
              ? typeof value === "string" && filters.tags.includes(value)
                ? filters.tags.filter((t) => t !== value)
                : typeof value === "string"
                  ? [...filters.tags, value]
                  : filters.tags
              : type === "starred"
                ? Boolean(value)
                : String(value).toLowerCase(),
        };
        setFilters(updatedFilters);
      }
    },
    [filters],
  );

  const handleTagSelect = useCallback(
    (tagName: string) => {
      if (!tagName) return;

      const updatedTags = filters.tags.includes(tagName)
        ? filters.tags.filter((t) => t !== tagName)
        : [...filters.tags, tagName];

      setFilters((prev) => ({
        ...prev,
        tags: updatedTags,
      }));
      setSelectedTags(updatedTags);
    },
    [filters.tags],
  );

  const handleRemoveTag = useCallback(
    (tagToRemove: string) => {
      if (!tagToRemove) return;

      const updatedTags = filters.tags.filter((tag) => tag !== tagToRemove);
      setFilters((prev) => ({
        ...prev,
        tags: updatedTags,
      }));
      setSelectedTags(updatedTags);
    },
    [filters.tags],
  );

  // Add a function to check if there are pending changes
  const hasPendingChanges = useCallback(() => {
    // Check basic filters
    const basicChanges =
      filters.starred !== appliedFilters.starred ||
      filters.country !== appliedFilters.country ||
      filters.tags.length !== appliedFilters.tags.length ||
      filters.tags.some((tag) => !appliedFilters.tags.includes(tag)) ||
      filters.search.length !== appliedFilters.search.length ||
      filters.search.some((term) => !appliedFilters.search.includes(term));

    // Check landing pages
    const landingPagesChanged =
      filters.landingPages.length !== appliedFilters.landingPages.length ||
      filters.landingPages.some(
        (page) => !appliedFilters.landingPages.includes(page),
      );

    // Check rank filter changes
    const rankChanged =
      filters.rank.type !== appliedFilters.rank.type ||
      filters.rank.value1 !== appliedFilters.rank.value1 ||
      filters.rank.value2 !== appliedFilters.rank.value2;

    // Check clicks filter changes
    const clicksChanged =
      filters.clicks.type !== appliedFilters.clicks.type ||
      filters.clicks.value1 !== appliedFilters.clicks.value1 ||
      filters.clicks.value2 !== appliedFilters.clicks.value2;

    // Check impressions filter changes
    const impressionsChanged =
      filters.impressions.type !== appliedFilters.impressions.type ||
      filters.impressions.value1 !== appliedFilters.impressions.value1 ||
      filters.impressions.value2 !== appliedFilters.impressions.value2;

    return (
      basicChanges ||
      landingPagesChanged ||
      rankChanged ||
      clicksChanged ||
      impressionsChanged
    );
  }, [filters, appliedFilters]);

  const handleAddSearchTerm = useCallback(() => {
    if (!currentSearch) return;

    const newTerm = currentSearch.toLowerCase().trim();

    // Don't add if the term already exists
    if (filters.search.includes(newTerm)) {
      return;
    }

    // Update filters to add the new term to existing terms
    setFilters((prevFilters: FilterState) => ({
      ...prevFilters,
      search: [...prevFilters.search, newTerm],
    }));

    // Clear the search input
    setCurrentSearch("");

    // Update filtered terms
    setFilteredSearchTerms((prevTerms: string[]) => [...prevTerms, newTerm]);
  }, [currentSearch, filters.search]);

  const handleRemoveSearchTerm = useCallback(
    (termToRemove: string) => {
      const updatedTerms = filters.search.filter(
        (term) => term !== termToRemove,
      );
      setFilters((prev) => ({
        ...prev,
        search: updatedTerms,
      }));
    },
    [filters.search],
  );

  const handleAddLandingPage = useCallback(() => {
    if (!currentLandingPage) return;

    const newLandingPage = currentLandingPage.trim().toLowerCase();

    // Don't add if it already exists
    if (filters.landingPages.includes(newLandingPage)) {
      return;
    }

    setFilters((prevFilters) => ({
      ...prevFilters,
      landingPages: [...prevFilters.landingPages, newLandingPage],
    }));

    setCurrentLandingPage("");
  }, [currentLandingPage, filters.landingPages]);

  const handleRemoveLandingPage = useCallback((pageToRemove: string) => {
    setFilters((prev) => ({
      ...prev,
      landingPages: prev.landingPages.filter((page) => page !== pageToRemove),
    }));
  }, []);

  const handleMetricFilterChange = useCallback(
    (
      metric: "rank" | "clicks" | "impressions",
      type: "equals" | "between" | "greater" | "less" | null,
      value1: number | null,
      value2: number | null = null,
    ) => {
      setFilters((prev) => ({
        ...prev,
        [metric]: {
          type,
          value1,
          value2,
        },
      }));
    },
    [],
  );

  const handleApplyFilters = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());

    // Handle search terms - ensure they are unique and properly formatted
    if (filters.search.length) {
      const uniqueTerms = Array.from(
        new Set(filters.search.map((term) => term.trim().toLowerCase())),
      );
      params.set("search", uniqueTerms.join(","));
    } else {
      params.delete("search");
    }

    // Handle tags - ensure they are unique
    if (filters.tags.length) {
      const uniqueTags = Array.from(new Set(filters.tags));
      params.set("tags", uniqueTags.join(","));
    } else {
      params.delete("tags");
    }

    // Handle starred
    if (filters.starred) {
      params.set("starred", "true");
    } else {
      params.delete("starred");
    }

    // Handle country - store the full name in URL but keep ISO code in state
    if (filters.country !== ALL_COUNTRIES) {
      const countryName = getCountryName(filters.country);
      params.set("country", countryName);
    } else {
      params.delete("country");
    }

    // Handle landing pages
    if (filters.landingPages.length) {
      params.set("landingPages", filters.landingPages.join(","));
    } else {
      params.delete("landingPages");
    }

    // Handle rank filter - only apply if both type and value1 exist
    if (filters.rank.type && filters.rank.value1 !== null) {
      params.set("rankType", filters.rank.type);
      params.set("rankValue1", filters.rank.value1.toString());
      // Only set value2 if type is 'between' and value2 exists
      if (filters.rank.type === "between" && filters.rank.value2 !== null) {
        params.set("rankValue2", filters.rank.value2.toString());
      }
    } else {
      params.delete("rankType");
      params.delete("rankValue1");
      params.delete("rankValue2");
    }

    // Handle clicks filter - only apply if both type and value1 exist
    if (filters.clicks.type && filters.clicks.value1 !== null) {
      params.set("clicksType", filters.clicks.type);
      params.set("clicksValue1", filters.clicks.value1.toString());
      // Only set value2 if type is 'between' and value2 exists
      if (filters.clicks.type === "between" && filters.clicks.value2 !== null) {
        params.set("clicksValue2", filters.clicks.value2.toString());
      }
    } else {
      params.delete("clicksType");
      params.delete("clicksValue1");
      params.delete("clicksValue2");
    }

    // Handle impressions filter - only apply if both type and value1 exist
    if (filters.impressions.type && filters.impressions.value1 !== null) {
      params.set("impressionsType", filters.impressions.type);
      params.set("impressionsValue1", filters.impressions.value1.toString());
      // Only set value2 if type is 'between' and value2 exists
      if (
        filters.impressions.type === "between" &&
        filters.impressions.value2 !== null
      ) {
        params.set("impressionsValue2", filters.impressions.value2.toString());
      }
    } else {
      params.delete("impressionsType");
      params.delete("impressionsValue1");
      params.delete("impressionsValue2");
    }

    router.push(`?${params.toString()}`, { scroll: false });
    setAppliedFilters({ ...filters });
    setIsOpen(false);
  }, [filters, router, searchParams]);

  const handleRemoveFilter = useCallback(
    (type: keyof FilterState, specificValue?: string) => {
      const params = new URLSearchParams(searchParams.toString());

      if (specificValue && (type === "search" || type === "tags")) {
        // Remove specific value from array filters
        const currentValues = params.get(type)?.split(",") || [];
        const updatedValues = currentValues.filter(
          (value) => value !== specificValue,
        );

        if (updatedValues.length > 0) {
          params.set(type, updatedValues.join(","));
        } else {
          params.delete(type);
        }

        // Update local state
        const updatedFilters = {
          ...filters,
          [type]: updatedValues,
        };
        setFilters(updatedFilters);
        setAppliedFilters(updatedFilters);
      } else {
        params.delete(type);
        const newValue =
          type === "country" ? ALL_COUNTRIES : type === "starred" ? false : [];

        const updatedFilters = {
          ...filters,
          [type]: newValue,
        };
        setFilters(updatedFilters);
        setAppliedFilters(updatedFilters);
      }
      if (type === "rank") {
        params.delete("rankType");
        params.delete("rankValue1");
        params.delete("rankValue2");
      }

      if (type === "clicks") {
        params.delete("clicksType");
        params.delete("clicksValue1");
        params.delete("clicksValue2");
      }

      if (type === "impressions") {
        params.delete("impressionsType");
        params.delete("impressionsValue1");
        params.delete("impressionsValue2");
      }

      router.push(`?${params.toString()}`, { scroll: false });
    },
    [filters, router, searchParams],
  );

  const hasAnyFilters = useCallback(() => {
    return (
      appliedFilters.starred ||
      appliedFilters.country !== ALL_COUNTRIES ||
      appliedFilters.tags.length > 0 ||
      appliedFilters.search.length > 0 ||
      appliedFilters.landingPages.length > 0 ||
      appliedFilters.rank.type !== null ||
      appliedFilters.clicks.type !== null ||
      appliedFilters.impressions.type !== null
    );
  }, [appliedFilters]);

  const handleClearAllFilters = useCallback(() => {
    // Update URL params without navigation
    const params = new URLSearchParams(searchParams.toString());

    // Clear all filter params
    params.delete("search");
    params.delete("tags");
    params.delete("starred");
    params.delete("country");
    params.delete("landingPages");
    params.delete("rankType");
    params.delete("rankValue1");
    params.delete("rankValue2");
    params.delete("clicksType");
    params.delete("clicksValue1");
    params.delete("clicksValue2");
    params.delete("impressionsType");
    params.delete("impressionsValue1");
    params.delete("impressionsValue2");

    // Update URL without navigation
    router.push(`?${params.toString()}`, { scroll: false });

    const defaultFilters = {
      country: ALL_COUNTRIES,
      search: [],
      starred: false,
      tags: [],
      landingPages: [],
      rank: {
        type: null,
        value1: null,
        value2: null,
      },
      clicks: {
        type: null,
        value1: null,
        value2: null,
      },
      impressions: {
        type: null,
        value1: null,
        value2: null,
      },
    };

    setFilters(defaultFilters);
    setAppliedFilters(defaultFilters);
  }, [router, searchParams]);

  // Handle the handleAddNewTag function to show a message instead of trying to add a tag
  const handleAddNewTag = useCallback(
    async (newTagName: string) => {
      if (!newTagName || normalizedAvailableTags.includes(newTagName)) return;

      // Instead of trying to add the tag, just show a toast message
      toast.info(
        "Tags kan kun tilføjes via admin-panelet. Kontakt administrator for at få tilføjet et nyt tag.",
      );
    },
    [normalizedAvailableTags],
  );

  return (
    <div className="flex items-center gap-2">
      {/* Applied Filters */}
      <div className="flex items-center gap-2">
        {appliedFilters.search.map(
          (term) =>
            term && (
              <Badge
                key={term}
                variant="outline"
                className="flex h-8 items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2 text-sm text-gray-900"
              >
                <span className="whitespace-nowrap font-medium text-gray-900">
                  Søgeord
                </span>
                <span className="whitespace-nowrap text-gray-500">
                  indeholder
                </span>
                <span className="whitespace-nowrap font-medium text-gray-900">
                  {term}
                </span>
                <X
                  className="h-3.5 w-3.5 shrink-0 cursor-pointer text-gray-400 hover:text-gray-700"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveFilter("search", term);
                  }}
                  aria-label="Fjern søgefilter"
                />
              </Badge>
            ),
        )}

        {appliedFilters.tags.map(
          (tag) =>
            tag && (
              <Badge
                key={tag}
                variant="outline"
                className="flex h-8 items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2 text-sm text-gray-900"
              >
                <span className="whitespace-nowrap font-medium text-gray-900">
                  Tag
                </span>
                <span className="whitespace-nowrap text-gray-500">
                  er lig med
                </span>
                <span className="whitespace-nowrap rounded-xl border px-1 py-0.5 text-xs font-medium text-primary">
                  {tag}
                </span>
                <X
                  className="h-3.5 w-3.5 shrink-0 cursor-pointer text-gray-400 hover:text-gray-700"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveFilter("tags", tag);
                  }}
                  aria-label="Fjern tag filter"
                />
              </Badge>
            ),
        )}

        {appliedFilters.starred && (
          <Badge
            variant="outline"
            className="flex h-8 items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2 text-sm text-gray-900"
          >
            <span className="whitespace-nowrap font-medium text-gray-900">
              Favoritter
            </span>
            <Star className="h-3.5 w-3.5 fill-primary text-primary" />
            <X
              className="h-3.5 w-3.5 shrink-0 cursor-pointer text-gray-400 hover:text-gray-700"
              onClick={(e) => {
                e.stopPropagation();
                handleRemoveFilter("starred");
              }}
              aria-label="Fjern favorit filter"
            />
          </Badge>
        )}

        {appliedFilters.country !== ALL_COUNTRIES ? (
          <Badge
            variant="outline"
            className="flex h-8 items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2 text-sm text-gray-900"
          >
            <span className="whitespace-nowrap font-medium text-gray-900">
              Land
            </span>
            <span className="whitespace-nowrap text-gray-500">er lig med</span>
            <span className="whitespace-nowrap font-medium text-gray-900">
              {getCountryName(appliedFilters.country)}
            </span>
            <X
              className="h-3.5 w-3.5 shrink-0 cursor-pointer text-gray-400 hover:text-gray-700"
              onClick={(e) => {
                e.stopPropagation();
                handleRemoveFilter("country");
              }}
              aria-label="Fjern landefilter"
            />
          </Badge>
        ) : null}

        {/* Rank filter badge */}
        {appliedFilters.rank.type && (
          <Badge
            variant="outline"
            className="flex h-8 items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2 text-sm text-gray-900"
          >
            <span className="whitespace-nowrap font-medium text-gray-900">
              Position
            </span>
            <span className="whitespace-nowrap text-gray-500">
              {appliedFilters.rank.type === "equals"
                ? "er"
                : appliedFilters.rank.type === "greater"
                  ? "større end"
                  : appliedFilters.rank.type === "less"
                    ? "mindre end"
                    : "mellem"}
            </span>
            <span className="whitespace-nowrap font-medium text-gray-900">
              {appliedFilters.rank.value1}
              {appliedFilters.rank.type === "between" &&
                appliedFilters.rank.value2 &&
                ` og ${appliedFilters.rank.value2}`}
            </span>
            <X
              className="h-3.5 w-3.5 shrink-0 cursor-pointer text-gray-400 hover:text-gray-700"
              onClick={(e) => {
                e.stopPropagation();
                handleRemoveFilter("rank");
              }}
              aria-label="Fjern positionsfilter"
            />
          </Badge>
        )}

        {/* Clicks filter badge */}
        {appliedFilters.clicks.type && (
          <Badge
            variant="outline"
            className="flex h-8 items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2 text-sm text-gray-900"
          >
            <span className="whitespace-nowrap font-medium text-gray-900">
              Kliks
            </span>
            <span className="whitespace-nowrap text-gray-500">
              {appliedFilters.clicks.type === "greater"
                ? "større end"
                : appliedFilters.clicks.type === "less"
                  ? "mindre end"
                  : "mellem"}
            </span>
            <span className="whitespace-nowrap font-medium text-gray-900">
              {appliedFilters.clicks.value1?.toLocaleString("da-DK")}
              {appliedFilters.clicks.type === "between" &&
                appliedFilters.clicks.value2 &&
                ` og ${appliedFilters.clicks.value2.toLocaleString("da-DK")}`}
            </span>
            <X
              className="h-3.5 w-3.5 shrink-0 cursor-pointer text-gray-400 hover:text-gray-700"
              onClick={(e) => {
                e.stopPropagation();
                handleRemoveFilter("clicks");
              }}
              aria-label="Fjern kliksfilter"
            />
          </Badge>
        )}

        {/* Impressions filter badge */}
        {appliedFilters.impressions.type && (
          <Badge
            variant="outline"
            className="flex h-8 items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2 text-sm text-gray-900"
          >
            <span className="whitespace-nowrap font-medium text-gray-900">
              Eksponeringer
            </span>
            <span className="whitespace-nowrap text-gray-500">
              {appliedFilters.impressions.type === "greater"
                ? "større end"
                : appliedFilters.impressions.type === "less"
                  ? "mindre end"
                  : "mellem"}
            </span>
            <span className="whitespace-nowrap font-medium text-gray-900">
              {appliedFilters.impressions.value1?.toLocaleString("da-DK")}
              {appliedFilters.impressions.type === "between" &&
                appliedFilters.impressions.value2 &&
                ` og ${appliedFilters.impressions.value2.toLocaleString("da-DK")}`}
            </span>
            <X
              className="h-3.5 w-3.5 shrink-0 cursor-pointer text-gray-400 hover:text-gray-700"
              onClick={(e) => {
                e.stopPropagation();
                handleRemoveFilter("impressions");
              }}
              aria-label="Fjern visningsfilter"
            />
          </Badge>
        )}

        {/* Landing pages filter badge */}
        {appliedFilters.landingPages.length > 0 && (
          <Badge
            variant="outline"
            className="flex h-8 items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2 text-sm text-gray-900"
          >
            <span className="whitespace-nowrap font-medium text-gray-900">
              Landingssider
            </span>
            <span className="whitespace-nowrap text-gray-500">indeholder</span>
            <span className="whitespace-nowrap font-medium text-gray-900">
              {appliedFilters.landingPages.join(", ")}
            </span>
            <X
              className="h-3.5 w-3.5 shrink-0 cursor-pointer text-gray-400 hover:text-gray-700"
              onClick={(e) => {
                e.stopPropagation();
                handleRemoveFilter("landingPages");
              }}
              aria-label="Fjern landingssidefilter"
            />
          </Badge>
        )}
      </div>

      {/* Separator - Only show if there are any filters */}
      {hasAnyFilters() && (
        <div className="mx-2 h-6 w-px bg-gray-200" aria-hidden="true" />
      )}

      {/* Filter Buttons */}
      <div className="flex items-center gap-2">
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2 py-1 text-sm text-gray-700 hover:bg-gray-50",
                hasPendingChanges() &&
                  "border-primary text-primary hover:bg-primary/5",
              )}
              aria-label="Tilføj filter"
            >
              <Plus className="h-3.5 w-3.5" />
              Tilføj filter
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] sm:max-w-[700px]">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold">
                Filtrer søgeord
              </DialogTitle>
            </DialogHeader>
            <div className="no-scrollbar max-h-[calc(90vh-180px)] overflow-y-auto px-1">
              <div className="space-y-6 pb-4 pr-5">
                {/* Quick Filters Section */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-gray-700">
                    Hurtige filtre
                  </h3>
                  <div className="grid gap-6">
                    {/* Favorites and Country */}
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">
                          Favoritter
                        </label>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start gap-2 shadow-sm transition-colors",
                            filters.starred
                              ? "bg-primary/5 text-primary hover:bg-primary/10"
                              : "hover:bg-gray-50",
                            filters.starred !== appliedFilters.starred &&
                              "border-primary",
                          )}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleFilterChange(!filters.starred, "starred");
                          }}
                        >
                          <Star
                            className={cn(
                              "h-4 w-4 transition-colors",
                              filters.starred
                                ? "fill-primary text-primary"
                                : "",
                            )}
                          />
                          <span className="text-sm">Vis kun favoritter</span>
                        </Button>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">
                          Land
                        </label>
                        <Select
                          value={filters.country}
                          onValueChange={(value) => {
                            handleFilterChange(value, "country");
                          }}
                        >
                          <SelectTrigger className="w-full shadow-sm">
                            <SelectValue>
                              {getCountryName(filters.country)}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup className="max-h-[300px] overflow-y-auto">
                              <SelectItem value={ALL_COUNTRIES}>
                                <span className="text-sm">Alle lande</span>
                              </SelectItem>
                              {isoCountries.map((country) => (
                                <SelectItem
                                  key={country.code}
                                  value={country.code}
                                >
                                  <span className="text-sm">
                                    {country.name}
                                  </span>
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Tags */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">
                        Tags
                      </label>
                      <div className="w-full">
                        <KeywordTagSelector
                          availableTags={normalizedAvailableTags.map(
                            (name) => ({ name }),
                          )}
                          selectedTags={filters.tags}
                          onTagSelect={handleTagSelect}
                          onAddNewTag={handleAddNewTag}
                          isLoading={isLoadingTags}
                          className="w-full"
                        />
                      </div>
                      {isTagError && (
                        <div className="mt-1 text-xs text-destructive">
                          Der opstod en fejl ved indlæsning af tags
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="h-px bg-gray-100" />

                {/* Search Terms Section */}
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-gray-700">Søgeord</h3>
                  <div className="flex w-full gap-2 p-[1px]">
                    <Input
                      id="search"
                      type="text"
                      placeholder="Skriv søgeord du vil filtrere efter..."
                      value={currentSearch}
                      onChange={(e) =>
                        handleFilterChange(e.target.value, "search")
                      }
                      onKeyDown={(e) =>
                        e.key === "Enter" && handleAddSearchTerm()
                      }
                      aria-label="Filtrer efter søgeord"
                      className="w-full min-w-0 flex-1 shadow-sm"
                    />
                    <Button
                      onClick={handleAddSearchTerm}
                      type="button"
                      variant="outline"
                      className="shrink-0 shadow-sm hover:bg-gray-50"
                      disabled={!currentSearch}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500">
                    Tilføj flere søgeord for at filtrere listen. Tryk på
                    plus-ikonet for at tilføje.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {(currentSearch ? filteredSearchTerms : filters.search).map(
                      (term) => (
                        <Badge
                          key={term}
                          variant="secondary"
                          className="flex items-center gap-1 bg-gray-50/50 text-gray-600 hover:bg-gray-100"
                        >
                          <X
                            className="h-3 w-3 cursor-pointer hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveSearchTerm(term);
                            }}
                            aria-label="Fjern søgeterm"
                          />
                          <span className="font-medium text-gray-900">
                            {term}
                          </span>
                        </Badge>
                      ),
                    )}
                  </div>
                </div>

                <div className="h-px bg-gray-100" />

                {/* Landing Pages Section */}
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-gray-700">
                    Landingssider
                  </h3>
                  <div className="flex w-full gap-2 p-[1px]">
                    <Input
                      type="text"
                      placeholder="Skriv URL du vil filtrere efter..."
                      value={currentLandingPage}
                      onChange={(e) => setCurrentLandingPage(e.target.value)}
                      onKeyDown={(e) =>
                        e.key === "Enter" && handleAddLandingPage()
                      }
                      className="w-full min-w-0 flex-1 shadow-sm"
                    />
                    <Button
                      onClick={handleAddLandingPage}
                      type="button"
                      variant="outline"
                      className="shrink-0 shadow-sm hover:bg-gray-50"
                      disabled={!currentLandingPage}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500">
                    Tilføj flere landingssider for at filtrere listen. Tryk på
                    plus-ikonet for at tilføje.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {filters.landingPages.map((page) => (
                      <Badge
                        key={page}
                        variant="secondary"
                        className="flex items-center gap-1 bg-gray-50/50 text-gray-600 hover:bg-gray-100"
                      >
                        <X
                          className="h-3 w-3 cursor-pointer hover:text-destructive"
                          onClick={() => handleRemoveLandingPage(page)}
                        />
                        <span className="text-sm font-medium text-gray-900">
                          {page}
                        </span>
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="h-px bg-gray-100" />

                {/* Metrics Section */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-gray-700">
                    Metrikker
                  </h3>

                  {/* Position Filter */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Position
                    </label>
                    <div className="flex flex-wrap items-start gap-2 p-[1px]">
                      <Select
                        value={filters.rank.type || ""}
                        onValueChange={(value) =>
                          handleMetricFilterChange(
                            "rank",
                            value as FilterState["rank"]["type"],
                            filters.rank.value1,
                          )
                        }
                      >
                        <SelectTrigger className="w-[200px] min-w-[200px] shadow-sm">
                          <SelectValue placeholder="Vælg filter type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="equals">
                            <span className="text-sm">Lig med</span>
                          </SelectItem>
                          <SelectItem value="between">
                            <span className="text-sm">Mellem</span>
                          </SelectItem>
                          <SelectItem value="greater">
                            <span className="text-sm">Større end</span>
                          </SelectItem>
                          <SelectItem value="less">
                            <span className="text-sm">Mindre end</span>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="flex min-w-[150px] flex-wrap items-center gap-2">
                        <Input
                          type="number"
                          placeholder="Værdi"
                          value={filters.rank.value1 || ""}
                          onChange={(e) =>
                            handleMetricFilterChange(
                              "rank",
                              filters.rank.type,
                              e.target.value ? Number(e.target.value) : null,
                              filters.rank.value2,
                            )
                          }
                          className="w-24 min-w-[96px] text-sm shadow-sm"
                        />
                        {filters.rank.type === "between" && (
                          <>
                            <span className="flex items-center text-sm text-gray-500">
                              og
                            </span>
                            <Input
                              type="number"
                              placeholder="Værdi"
                              value={filters.rank.value2 || ""}
                              onChange={(e) =>
                                handleMetricFilterChange(
                                  "rank",
                                  filters.rank.type,
                                  filters.rank.value1,
                                  e.target.value
                                    ? Number(e.target.value)
                                    : null,
                                )
                              }
                              className="w-24 min-w-[96px] text-sm shadow-sm"
                            />
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Clicks Filter */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Kliks
                    </label>
                    <div className="flex flex-wrap items-start gap-2 p-[1px]">
                      <Select
                        value={filters.clicks.type || ""}
                        onValueChange={(value) =>
                          handleMetricFilterChange(
                            "clicks",
                            value as FilterState["clicks"]["type"],
                            filters.clicks.value1,
                          )
                        }
                      >
                        <SelectTrigger className="w-[200px] min-w-[200px] shadow-sm">
                          <SelectValue placeholder="Vælg filter type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="greater">
                            <span className="text-sm">Større end</span>
                          </SelectItem>
                          <SelectItem value="less">
                            <span className="text-sm">Mindre end</span>
                          </SelectItem>
                          <SelectItem value="between">
                            <span className="text-sm">Mellem</span>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="flex min-w-[150px] flex-wrap items-center gap-2">
                        <Input
                          type="number"
                          placeholder="Værdi"
                          value={filters.clicks.value1 || ""}
                          onChange={(e) =>
                            handleMetricFilterChange(
                              "clicks",
                              filters.clicks.type,
                              e.target.value ? Number(e.target.value) : null,
                              filters.clicks.value2,
                            )
                          }
                          className="w-24 min-w-[96px] text-sm shadow-sm"
                        />
                        {filters.clicks.type === "between" && (
                          <>
                            <span className="flex items-center text-sm text-gray-500">
                              og
                            </span>
                            <Input
                              type="number"
                              placeholder="Værdi"
                              value={filters.clicks.value2 || ""}
                              onChange={(e) =>
                                handleMetricFilterChange(
                                  "clicks",
                                  filters.clicks.type,
                                  filters.clicks.value1,
                                  e.target.value
                                    ? Number(e.target.value)
                                    : null,
                                )
                              }
                              className="w-24 min-w-[96px] text-sm shadow-sm"
                            />
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Impressions Filter */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Eksponeringer
                    </label>
                    <div className="flex flex-wrap items-start gap-2 p-[1px]">
                      <Select
                        value={filters.impressions.type || ""}
                        onValueChange={(value) =>
                          handleMetricFilterChange(
                            "impressions",
                            value as FilterState["impressions"]["type"],
                            filters.impressions.value1,
                          )
                        }
                      >
                        <SelectTrigger className="w-[200px] min-w-[200px] shadow-sm">
                          <SelectValue placeholder="Vælg filter type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="greater">
                            <span className="text-sm">Større end</span>
                          </SelectItem>
                          <SelectItem value="less">
                            <span className="text-sm">Mindre end</span>
                          </SelectItem>
                          <SelectItem value="between">
                            <span className="text-sm">Mellem</span>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="flex min-w-[150px] flex-wrap items-center gap-2">
                        <Input
                          type="number"
                          placeholder="Værdi"
                          value={filters.impressions.value1 || ""}
                          onChange={(e) =>
                            handleMetricFilterChange(
                              "impressions",
                              filters.impressions.type,
                              e.target.value ? Number(e.target.value) : null,
                              filters.impressions.value2,
                            )
                          }
                          className="w-24 min-w-[96px] text-sm shadow-sm"
                        />
                        {filters.impressions.type === "between" && (
                          <>
                            <span className="flex items-center text-sm text-gray-500">
                              og
                            </span>
                            <Input
                              type="number"
                              placeholder="Værdi"
                              value={filters.impressions.value2 || ""}
                              onChange={(e) =>
                                handleMetricFilterChange(
                                  "impressions",
                                  filters.impressions.type,
                                  filters.impressions.value1,
                                  e.target.value
                                    ? Number(e.target.value)
                                    : null,
                                )
                              }
                              className="w-24 min-w-[96px] text-sm shadow-sm"
                            />
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter className="flex w-full justify-end gap-2 border-t pt-4">
              <Button
                variant="outline"
                onClick={() => setIsOpen(false)}
                className="w-full text-sm shadow-sm"
              >
                Annuller
              </Button>
              <Button
                onClick={handleApplyFilters}
                disabled={!hasPendingChanges()}
                className={cn(
                  "w-full text-sm shadow-sm",
                  hasPendingChanges() && "bg-primary hover:bg-primary/90",
                )}
              >
                Anvend filtre
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {hasAnyFilters() && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearAllFilters}
            className="h-7 gap-1.5 px-2 text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-700"
            aria-label="Ryd alle filtre"
          >
            <X className="h-3.5 w-3.5" />
            Ryd filtre
          </Button>
        )}
      </div>
    </div>
  );
}

export function KeywordFilter({ initialTags = [] }: KeywordFilterProps) {
  // Directly render the content component without the QueryClientProvider
  return <KeywordFilterContent initialTags={initialTags} />;
}
