"use client";

import {
  QueryClient,
  QueryClientProvider,
  useMutation,
} from "@tanstack/react-query";
import Image from "next/image";
import {
  ColumnFiltersState,
  ColumnResizeMode,
  SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import {
  ArrowDown,
  ArrowUp,
  ChevronRight,
  Link2,
  Link2Off,
  MoreVertical,
  Search,
  Star,
  FileText,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import {
  createContext,
  memo,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import { Button } from "@/modules/core/components/ui/button";
import { DateRange } from "@/modules/core/components/ui/date-range-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/modules/core/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/modules/core/components/ui/dropdown-menu";
import { Input } from "@/modules/core/components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/modules/core/components/ui/pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/modules/core/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/modules/core/components/ui/tooltip";
import { cn } from "@/modules/core/lib/utils";
import {
  myCustomCompareSorting,
  myCustomSorting,
  number,
} from "@/modules/core/utils/sorters";
import {
  deleteKeyword,
  updateKeyword,
} from "@/modules/rank-tracker/actions/ranker-keyword.actions";
import { SortableColumnHeader } from "@/modules/rank-tracker/components/shared/column-defs";
import { keywordColumns } from "@/modules/rank-tracker/constants";
import { convertToAlpha2 } from "@/modules/rank-tracker/constants/iso-countries";
import useKeywordTable from "@/modules/rank-tracker/hooks/use-keyword-table";
import { Keyword } from "@/modules/rank-tracker/types/index";
import { EditKeywordModal } from "../edit-keyword-modal";
import KeywordAnalysis from "../keyword-analysis";
import { KeywordTag } from "../keyword-tag";

interface DataTableProps<TData extends Record<string, any>, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  className?: string;
  pSize?: number;
  sortColumn?: string;
  disableSearch?: boolean;
  hasPagination?: boolean;
  disableBorder?: boolean;
  selectedDateRanges: DateRange[];
  isLoading?: boolean;
  isDataReady?: boolean;
  onFilteredDataChange?: (data: TData[]) => void;
}

const QueryClientContext = createContext<QueryClient | null>(null);

function useQueryClientContext() {
  const context = useContext(QueryClientContext);
  if (!context) {
    throw new Error(
      "useQueryClientContext must be used within a QueryClientProvider",
    );
  }
  return context;
}

// Define comparison accessors outside the component
const positionChangeAccessorKey = "position_change";
const clicksChangeAccessorKey = "clicks_change";
const impressionsChangeAccessorKey = "impressions_change";

export function KeywordTable<TData extends Keyword>(
  props: DataTableProps<TData, any>,
) {
  const queryClient = useMemo(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 0,
            refetchOnWindowFocus: true,
            refetchOnReconnect: true,
          },
        },
      }),
    [],
  );

  return (
    <QueryClientProvider client={queryClient}>
      <QueryClientContext.Provider value={queryClient}>
        <KeywordTableContent {...props} />
      </QueryClientContext.Provider>
    </QueryClientProvider>
  );
}

const KeywordTableContent = memo(function KeywordTableContentComponent<
  TData extends Keyword,
>(props: DataTableProps<TData, any>) {
  const {
    columns,
    data,
    className,
    pSize,
    sortColumn = "position",
    disableSearch = false,
    hasPagination = true,
    disableBorder = false,
    selectedDateRanges,
    onFilteredDataChange,
  } = props;

  const filterParams = useSearchParams();
  const queryClient = useQueryClientContext();
  const domainId = filterParams.get("domain");

  // State management
  const [sorting, setSorting] = useState<SortingState>(
    [
      { id: "position", desc: false },
      { id: sortColumn, desc: true },
    ].filter((item) => {
      // Only include sort columns that are valid
      // This avoids 'Column with id 'keyword' does not exist' errors
      return columns.some((col) => {
        const colDef = col as { accessorKey?: string };
        return colDef.accessorKey === item.id;
      });
    }),
  );
  const [isComparisonSorting, setIsComparisonSorting] =
    useState<boolean>(false);
  const [activeComparisonColumn, setActiveComparisonColumn] = useState<
    string | null
  >(null);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string>();
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedKeyword, setSelectedKeyword] = useState<TData | null>(null);
  const [showAnalysisDialog, setShowAnalysisDialog] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedKeywordForEdit, setSelectedKeywordForEdit] =
    useState<TData | null>(null);
  const [shouldForceRefresh, setShouldForceRefresh] = useState(false);
  const [columnSizing, setColumnSizing] = useState<Record<string, number>>({});

  const { localData, setLocalData } = useKeywordTable({
    data: props.data,
    setSorting,
    sortColumn,
    columns,
  });

  // Add event listener for keyword-table-update event
  useEffect(() => {
    // Define refresh function
    const forceRefreshKeywords = async () => {
      setShouldForceRefresh(true);

      try {
        // Clear all query cache
        queryClient.clear();

        // Remove specific query cache
        queryClient.removeQueries({
          predicate: (query) =>
            Array.isArray(query.queryKey) &&
            (query.queryKey[0] === "domainKeywordsView" ||
              query.queryKey[0] === "keywords" ||
              query.queryKey[0] === "keywordCreate" ||
              query.queryKey[0] === "keywordsCreate"),
        });

        // Invalidate queries with specific domain
        if (domainId) {
          await queryClient.invalidateQueries({
            queryKey: ["domainKeywordsView", domainId],
          });
        }

        // Fetch fresh data - force immediate refetch
        await queryClient.refetchQueries({
          type: "all",
          stale: true,
          exact: false,
        });

        // Update local data to ensure UI is in sync with server data
        if (props.data && props.data.length > 0) {
          setLocalData(props.data);
        }

        setShouldForceRefresh(false);
        return true;
      } catch (error) {
        setShouldForceRefresh(false);
        return false;
      }
    };

    // Expose the refresh function globally
    if (typeof window !== "undefined" && domainId) {
      (window as any)[`refreshKeywordTable_${domainId}`] = forceRefreshKeywords;

      // Also expose a general refresh method on the queryClient
      const methodKey = `forceRefreshKeywords_${domainId}`;
      (queryClient as any)[methodKey] = forceRefreshKeywords;
    }

    // Event handler for the keyword-table-update event
    const handleKeywordTableUpdate = async (event: Event) => {
      // Cast to CustomEvent to access detail property
      const customEvent = event as CustomEvent;
      const eventDetail = customEvent.detail || {};
      const eventDomainId = eventDetail.domainId;
      const freshData = eventDetail.freshData;
      const source = eventDetail.source;

      // Only process if this is our domain
      if (eventDomainId && eventDomainId === domainId) {
        // First, try to update local state for immediate feedback
        if (
          source === "createKeywords" &&
          Array.isArray(freshData) &&
          freshData.length > 0
        ) {
          try {
            // Format the keywords correctly
            const formattedKeywords = freshData.map((keyword) => ({
              ...keyword,
              // Ensure these properties are set correctly to avoid display issues
              id: String(keyword.id),
              date_range_0: {
                ...(keyword.date_range_0 || {}),
                id: Number(keyword.id),
                latest_stats: keyword.latest_stats || [
                  { position: null, page: [] },
                ],
                overall_stats: keyword.overall_stats || {
                  clicks: 0,
                  impressions: 0,
                },
                search_volume: keyword.search_volume || { avg_searches: 0 },
                dateRange: "date_range_0",
              },
              // New keywords won't have comparison data
              date_range_1: undefined,
            }));

            // Update local data with the new formatted keywords
            setLocalData((prevData) => {
              // Make sure we don't have duplicates by checking IDs
              const existingIds = new Set(prevData.map((k) => k.id));
              const newKeywords = formattedKeywords.filter(
                (k) => !existingIds.has(k.id),
              );

              if (newKeywords.length === 0) return prevData;

              return [...prevData, ...newKeywords];
            });
          } catch (error) {
            // Error handling
          }
        }

        // Always force a refresh from the server regardless of the source or whether local updates succeeded
        setShouldForceRefresh(true);

        try {
          // Clear cache for relevant queries
          queryClient.invalidateQueries({
            queryKey: ["domainKeywordsView"],
          });

          if (domainId) {
            queryClient.invalidateQueries({
              queryKey: ["domainKeywordsView", domainId],
            });
          }

          // Force immediate refetch of all queries
          await queryClient.refetchQueries({
            type: "all",
            stale: true,
            exact: false,
          });
        } catch (error) {
          // Error handling
        } finally {
          setShouldForceRefresh(false);
        }
      }
    };

    // Register event listener
    if (typeof window !== "undefined") {
      window.addEventListener("keyword-table-update", handleKeywordTableUpdate);
    }

    // Cleanup
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener(
          "keyword-table-update",
          handleKeywordTableUpdate,
        );

        // Also clean up the global refresh function
        if (domainId) {
          delete (window as any)[`refreshKeywordTable_${domainId}`];
          delete (queryClient as any)[`forceRefreshKeywords_${domainId}`];
        }
      }
    };
  }, [queryClient, domainId, props.data]);

  // Mutations
  const deleteMutation = useMutation({
    mutationFn: deleteKeyword,
    onMutate: async (deletedId) => {
      // Optimistisk UI opdatering - fjern søgeordet med det samme fra UI
      // Dette sker INDEN server-kaldet er færdigt, så brugeren ser en øjeblikkelig opdatering
      setLocalData((prevData) =>
        prevData.filter((item) => item.id !== deletedId),
      );

      return { deletedId };
    },
    onSuccess: async (result, deletedId) => {
      // Server kaldet er afsluttet med success
      if (itemToDelete) {
        // Vis success besked til brugeren
        toast.success("Søgeord slettet");

        // Opdater props.data hvis vi er i en filtreret visning
        const isStarredFilter = filterParams.get("starred") === "true";
        if (isStarredFilter && props.data) {
          const dataIndex = props.data.findIndex((k) => k.id === deletedId);
          if (dataIndex !== -1) {
            props.data.splice(dataIndex, 1);
          }
        }
      }

      // Ryd dialog staten efter sletning
      setShowDeleteDialog(false);
      setItemToDelete(undefined);
    },
    onError: (error, deletedId, context) => {
      // Rulllback den optimistiske opdatering hvis der opstod en fejl
      if (context?.deletedId) {
        // Genindlæs data fra server for at sikre korrekt tilstand
        queryClient.invalidateQueries({ queryKey: ["keywords"] });
      }

      toast.error("Der opstod en fejl ved sletning af søgeordet");
    },
    onSettled: () => {
      // Dette sker altid - uanset success eller fejl
      setIsDeleting(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: updateKeyword,
    onSuccess: async (result, variables) => {
      if (!("error" in result) || !result.error) {
        // Update the keyword in the data
        // This is a placeholder and should be replaced with actual data update logic
      }
    },
  });

  // Helper functions
  const handleDelete = useCallback((id: string) => {
    setItemToDelete(id);
    setShowDeleteDialog(true);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!itemToDelete) return;

    // Sæt loading tilstand og start mutation
    setIsDeleting(true);

    try {
      await deleteMutation.mutateAsync(itemToDelete);
      // onSuccess vil blive kaldt automatisk fra react-query
    } catch (error) {
      // onError vil blive kaldt automatisk fra react-query
    }
    // onSettled vil blive kaldt automatisk fra react-query uanset resultatet
  }, [itemToDelete, deleteMutation]);

  const handleEdit = useCallback((item: TData) => {
    setSelectedKeywordForEdit(item);
    setIsEditModalOpen(true);
  }, []);

  // Add a function to handle keyword updates
  const handleKeywordUpdate = useCallback(
    (updatedKeyword: TData) => {
      setLocalData((prevData) =>
        prevData.map((item) =>
          item.id === updatedKeyword.id ? (updatedKeyword as TData) : item,
        ),
      );
      queryClient.invalidateQueries({ queryKey: ["keywords"] });
    },
    [queryClient],
  );

  const handleUpdateItem = useCallback(
    async (updatedItem: TData) => {
      const {
        id,
        title,
        star_keyword,
        location,
        tags,
        created_at,
        updated_at,
      } = updatedItem;
      try {
        const result = await updateMutation.mutateAsync({
          id,
          domain: filterParams.get("domain") || "",
          title,
          star_keyword,
          location,
          tags,
          created_at: created_at || new Date().toISOString(),
          updated_at: updated_at || new Date().toISOString(),
        });
      } catch (error) {
        // Error handling
      }
    },
    [updateMutation],
  );

  const handleToggleStar = useCallback(
    async (e: React.MouseEvent, item: TData) => {
      e.stopPropagation();
      try {
        if (!item.id) {
          toast.error("Kunne ikke finde søgeord ID");
          return;
        }

        const newStarStatus = !item.star_keyword;
        const isStarredFilter = filterParams.get("starred") === "true";

        // Update the item in the parent data first
        const updatedItem = {
          ...item,
          domain: filterParams.get("domain") || "",
          star_keyword: newStarStatus,
          updated_at: new Date().toISOString(),
        };

        // If we're in starred filter mode and unstarring, remove from view
        if (isStarredFilter && !newStarStatus) {
          setLocalData((prevData) => prevData.filter((k) => k.id !== item.id));
        } else {
          // Otherwise update the star status in local data
          setLocalData((prevData) =>
            prevData.map((keyword) =>
              keyword.id === item.id
                ? { ...keyword, star_keyword: newStarStatus }
                : keyword,
            ),
          );
        }

        // Make the API call
        await updateMutation.mutateAsync(updatedItem);

        // Force an immediate refetch to sync all data
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["keywords"] }),
          queryClient.refetchQueries({
            queryKey: ["keywords"],
            exact: true,
          }),
        ]);

        // Update the props.data reference to ensure parent state is updated
        if (props.data) {
          const dataIndex = props.data.findIndex((k) => k.id === item.id);
          if (dataIndex !== -1) {
            props.data[dataIndex] = {
              ...props.data[dataIndex],
              star_keyword: newStarStatus,
            } as TData;
          }
        }

        toast.success(
          newStarStatus ? "Tilføjet til favoritter" : "Fjernet fra favoritter",
        );
      } catch (error) {
        const isStarredFilter = filterParams.get("starred") === "true";
        // Revert the optimistic update on error
        if (isStarredFilter && item.star_keyword) {
          // If we're in starred filter and the item was starred, add it back
          setLocalData((prevData) => [...prevData, item as TData]);
        } else {
          // Otherwise just revert the star status
          setLocalData((prevData) =>
            prevData.map((keyword) =>
              keyword.id === item.id
                ? { ...keyword, star_keyword: item.star_keyword }
                : keyword,
            ),
          );
        }
        toast.error("Der opstod en fejl ved opdatering af favorit status");
      }
    },
    [updateMutation, queryClient, filterParams, props.data],
  );

  const handleAnalysisClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>, item: TData) => {
      e.stopPropagation();
      const keywordForAnalysis = {
        ...item,
        id: item.id,
        domain: String(item.domain),
        title: item.title,
        star_keyword: item.star_keyword,
        location: item.location,
        tags: item.tags,
        latest_fetch: item.latest_fetch ?? null,
      };
      setSelectedKeyword(keywordForAnalysis);
      setShowAnalysisDialog(true);
    },
    [],
  );

  const updatePreferredUrl = useCallback(
    async (item: TData, newPreferredUrl: string | undefined) => {
      try {
        await handleUpdateItem({
          ...item,
          preferred_url: newPreferredUrl,
        });

        // Use the queryClient from context
        queryClient.invalidateQueries({ queryKey: ["keywords"] });
      } catch (error) {
        // Error handling
      }
    },
    [handleUpdateItem],
  );

  // Add these memoized cell components before the KeywordTable component
  const TitleCell = memo(function TitleCell({
    value,
    item,
    onEdit,
    onDelete,
    onToggleStar,
    onAnalysisClick,
  }: {
    value: string;
    item: TData;
    onEdit: (item: TData) => void;
    onDelete: (id: string) => void;
    onToggleStar: (e: React.MouseEvent, item: TData) => void;
    onAnalysisClick: (
      e: React.MouseEvent<HTMLButtonElement>,
      item: TData,
    ) => void;
  }) {
    const [isTruncated, setIsTruncated] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [showTooltip, setShowTooltip] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const textRef = useRef<HTMLSpanElement>(null);
    const countryCodeRef = useRef<HTMLSpanElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const tooltipTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const buttonWidth = 85; // Analyseknappens bredde + buffer (ca. 75px + 10px buffer)

    // Check if keyword has a note
    const hasNote =
      item.notes && Array.isArray(item.notes) && item.notes.length > 0;

    // Helper function to format date to Danish format
    const formatDateToDanish = (dateString: string): string => {
      const date = new Date(dateString);
      const months = [
        "jan",
        "feb",
        "mar",
        "apr",
        "maj",
        "jun",
        "jul",
        "aug",
        "sep",
        "okt",
        "nov",
        "dec",
      ];

      const day = date.getDate();
      const month = months[date.getMonth()];
      const year = date.getFullYear();

      return `${day} ${month} ${year}`;
    };

    const formatNoteForTooltip = (
      note: {
        id: number;
        description: string;
        created_at?: string;
        updated_at?: string;
      },
      index: number,
    ): string => {
      const dateToUse = note.created_at || note.updated_at;
      if (!dateToUse) return `${index + 1}. ${note.description}`;

      const formattedDate = formatDateToDanish(dateToUse);
      return `${formattedDate}: ${note.description}`;
    };

    const noteText =
      hasNote && item.notes
        ? item.notes
            .sort((a, b) => {
              const dateA = new Date(a.created_at || a.updated_at || 0);
              const dateB = new Date(b.created_at || b.updated_at || 0);
              return dateB.getTime() - dateA.getTime();
            })
            .map(formatNoteForTooltip)
            .join("\n\n")
        : "";
    const noteCount = hasNote && item.notes ? item.notes.length : 0;

    // Beregn maksimal tekstbredde baseret på containerbredde og om teksten er lang
    const updateTruncation = useCallback(() => {
      if (!containerRef.current || !textRef.current) return;

      const containerWidth = containerRef.current.clientWidth;

      // Kort søgeord (< 16 tegn) - trunkér ikke
      if (value.length < 16) {
        textRef.current.style.maxWidth = "100%";
        setIsTruncated(false);
        return;
      }

      // Langt søgeord - sæt fast maxWidth, så der altid er plads til knappen
      const maxWidth = containerWidth - buttonWidth;
      textRef.current.style.maxWidth = isExpanded ? "none" : `${maxWidth}px`;

      // Tjek om teksten er trunkeret
      setIsTruncated(
        textRef.current.scrollWidth > textRef.current.clientWidth &&
          !isExpanded,
      );
    }, [value, isExpanded]);

    // Opdater trunkering ved mount og resize
    useEffect(() => {
      updateTruncation();

      const handleResize = () => {
        updateTruncation();
      };

      window.addEventListener("resize", handleResize);
      return () => {
        window.removeEventListener("resize", handleResize);
        // Ryd eventuelle timeout ved unmount
        if (tooltipTimeoutRef.current) {
          clearTimeout(tooltipTimeoutRef.current);
        }
      };
    }, [updateTruncation]);

    // Debounced tooltip handlers for at  undgå flimren
    const handleMouseEnter = useCallback(() => {
      if (!isTruncated) return;

      // Ryd eksisterende timeout hvis det findes
      if (tooltipTimeoutRef.current) {
        clearTimeout(tooltipTimeoutRef.current);
      }

      // Sæt ny timeout for at vise tooltip
      tooltipTimeoutRef.current = setTimeout(() => {
        setShowTooltip(true);
      }, 200); // 200ms forsinker tooltip-visning for at undgå flimren
    }, [isTruncated]);

    const handleMouseLeave = useCallback(() => {
      // Ryd eksisterende timeout hvis det findes
      if (tooltipTimeoutRef.current) {
        clearTimeout(tooltipTimeoutRef.current);
      }

      // Sæt ny timeout for at skjule tooltip
      tooltipTimeoutRef.current = setTimeout(() => {
        setShowTooltip(false);
      }, 200); // 200ms forsinker skjuling af tooltip
    }, []);

    const handleToggleExpand = useCallback((e: React.MouseEvent) => {
      e.stopPropagation();
      setIsExpanded((prev) => !prev);
      setShowTooltip(false);
    }, []);

    const countryCode = useMemo(() => {
      const alpha3Code = item.location?.country;
      if (!alpha3Code) return null;
      return convertToAlpha2(alpha3Code);
    }, [item.location?.country]);

    return (
      <div className="group relative flex min-w-[270px] max-w-[320px] items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0 border bg-white"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-[180px]">
            <DropdownMenuItem onClick={() => onEdit(item)}>
              Rediger søgeord
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEdit(item)}>
              Tilføj tag
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onDelete(item.id)}
              className="text-destructive"
            >
              Slet søgeord
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={(e) => onToggleStar(e, item)}
            className="cursor-pointer hover:opacity-80"
          >
            <Star
              className={cn(
                "h-4 w-4",
                item.star_keyword
                  ? "fill-primary text-primary"
                  : "text-primary/50",
              )}
            />
          </button>
        </div>
        <div
          ref={containerRef}
          className={cn(
            "flex min-w-0 flex-1 cursor-pointer flex-col gap-1",
            isExpanded && "z-10",
          )}
        >
          <div className="flex min-w-0 items-center gap-2">
            <TooltipProvider>
              <Tooltip open={isTruncated && showTooltip && !isExpanded}>
                <TooltipTrigger asChild>
                  <div
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                    className={cn("max-w-full", isExpanded && "relative")}
                  >
                    <span
                      ref={textRef}
                      className={cn(
                        "block font-medium",
                        !isExpanded && "truncate",
                        isExpanded &&
                          "absolute z-10 rounded-md border bg-white p-1 shadow-md",
                      )}
                      onClick={isTruncated ? handleToggleExpand : undefined}
                      style={{
                        cursor: isTruncated ? "pointer" : "default",
                        maxWidth: isExpanded ? "300px" : undefined,
                      }}
                    >
                      {value}
                      {isTruncated && !isExpanded && (
                        <span className="ml-1 text-xs text-primary">...</span>
                      )}
                      {isExpanded && (
                        <Button
                          variant="link"
                          size="sm"
                          onClick={handleToggleExpand}
                          className="ml-1 h-auto p-0 text-xs text-primary"
                        >
                          Skjul
                        </Button>
                      )}
                    </span>
                    {isExpanded && <span className="opacity-0">{value}</span>}
                  </div>
                </TooltipTrigger>
                {isTruncated && (
                  <TooltipContent
                    side="top"
                    align="center"
                    className="rounded-md border border-gray-300 bg-white p-2 text-black"
                  >
                    <p className="text-xs">{value}</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
            {hasNote && (
              <TooltipProvider>
                <Tooltip delayDuration={150}>
                  <TooltipTrigger asChild>
                    <div className="relative flex h-4 w-4 items-center justify-center">
                      <Image
                        src="/images/icons/notes-bar.svg"
                        alt="Note"
                        width={15}
                        height={15}
                      />
                      {noteCount > 1 && (
                        <span className="absolute -left-2 -top-2 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-gray-200 text-[10px] font-medium text-gray-700">
                          {noteCount}
                        </span>
                      )}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent
                    className="max-w-[300px] border border-gray-200 bg-white p-3 shadow-md"
                    side="top"
                  >
                    <div className="space-y-2">
                      {noteCount > 1 && (
                        <p className="text-xs font-medium text-gray-900">
                          {noteCount} noter
                        </p>
                      )}
                      <p className="whitespace-pre-wrap text-xs text-gray-700">
                        {noteText}
                      </p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            {countryCode && (
              <span
                ref={countryCodeRef}
                className="inline-flex items-center rounded-md border bg-white px-1 text-[10px] font-normal text-gray-600 transition-opacity duration-100 group-hover:opacity-0"
              >
                {countryCode}
              </span>
            )}
          </div>
          {item.tags?.length ? (
            <div className="flex flex-wrap gap-1">
              <KeywordTag
                name={
                  item.tags?.map((tag) =>
                    typeof tag === "string" ? tag : tag.name,
                  ) || []
                }
              />
            </div>
          ) : null}
        </div>
        <div className="absolute right-0 top-1/2 z-10 -translate-y-1/2">
          <Button
            ref={buttonRef}
            variant="outline"
            onClick={(e) => onAnalysisClick(e, item)}
            className="invisible cursor-pointer gap-1 rounded-md px-2 py-1 text-xs hover:bg-gray-50 group-hover:visible md:flex"
          >
            Analyse
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  });

  const LandingPageCell = memo(function LandingPageCell({
    value,
    item,
    onUpdatePreferredUrl,
  }: {
    value: string | string[];
    item: TData;
    onUpdatePreferredUrl: (
      item: TData,
      newPreferredUrl: string | undefined,
    ) => void;
  }) {
    const pages = value
      ? Array.isArray(value)
        ? value
        : value
            .toString()
            .split(",")
            .map((p: string) => p.trim())
            .filter(Boolean)
      : [];

    const getLastUrlSegments = useCallback((url: string) => {
      if (url === "—") return "—";
      try {
        const segments = url.split("/").filter(Boolean);
        const lastSegments = segments.slice(-2);
        return lastSegments.join("/");
      } catch (e) {
        return url;
      }
    }, []);

    const mainPage = useMemo(
      () =>
        item.preferred_url && pages.includes(item.preferred_url)
          ? item.preferred_url
          : pages[0] || "—",
      [item.preferred_url, pages],
    );

    if (pages.length <= 1) {
      return (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 shrink-0 p-0"
            disabled
          >
            <Link2Off className="h-4 w-4 text-gray-300" />
          </Button>
          <div
            className="block max-w-[250px] overflow-hidden text-right"
            style={{ direction: "rtl" }}
          >
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <a
                    href={mainPage === "—" ? "#" : mainPage}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      "block truncate hover:underline",
                      item.preferred_url === mainPage
                        ? "font-medium text-primary"
                        : "text-primary",
                    )}
                    onClick={(e) => mainPage === "—" && e.preventDefault()}
                  >
                    {getLastUrlSegments(mainPage)}
                  </a>
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  align="center"
                  className="max-w-[400px] rounded-md border border-gray-300 bg-white p-2 text-black"
                >
                  <p className="text-xs">{mainPage}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      );
    }

    const handlePreferredUrlUpdate = useCallback(
      async (e: React.MouseEvent, page: string, isPreferred: boolean) => {
        e.preventDefault();
        e.stopPropagation();
        const newPreferredUrl = isPreferred ? undefined : page;
        await onUpdatePreferredUrl(item, newPreferredUrl);
      },
      [item, onUpdatePreferredUrl],
    );

    return (
      <div className="flex items-center gap-2">
        <Dialog>
          <DialogTrigger asChild>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="relative h-6 w-6 shrink-0 p-0"
                  >
                    <Link2
                      className={cn(
                        "h-4 w-4",
                        item.preferred_url
                          ? "text-primary"
                          : "text-gray-400 hover:text-primary",
                      )}
                    />
                    <span className="absolute -left-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-gray-200 text-[10px] font-medium text-gray-700">
                      {pages.length - 1}
                    </span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent
                  side="left"
                  align="center"
                  className="max-w-fit rounded-md border border-gray-300 bg-white p-2 text-black"
                >
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium">
                      Landingssider ({pages.length})
                    </p>
                    <ul className="list-inside list-disc space-y-1">
                      {pages.map((page: string, index: number) => {
                        const isPreferred = page === item.preferred_url;
                        return (
                          <li
                            key={index}
                            className={cn(
                              "text-xs text-gray-500",
                              isPreferred && "font-medium text-primary",
                            )}
                          >
                            <a
                              href={page}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:underline"
                            >
                              {page}
                            </a>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Administrer landingsside</DialogTitle>
              <DialogDescription>
                Vælg hvilken landingsside der skal vises som standard for dette
                søgeord.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 py-4">
              {pages.map((page: string, index: number) => {
                const isPreferred = page === item.preferred_url;
                return (
                  <div
                    key={index}
                    className={cn(
                      "flex items-center justify-between gap-4 rounded-lg border p-2",
                      isPreferred && "border-primary bg-primary/5",
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Link2
                        className={cn(
                          "h-4 w-4 shrink-0",
                          isPreferred ? "text-primary" : "text-gray-400",
                        )}
                      />
                      <a
                        href={page}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {page}
                      </a>
                    </div>
                    <Button
                      variant={isPreferred ? "default" : "outline"}
                      size="sm"
                      onClick={(e) =>
                        handlePreferredUrlUpdate(e, page, isPreferred)
                      }
                    >
                      {isPreferred ? "Fjern standard" : "Sæt som standard"}
                    </Button>
                  </div>
                );
              })}
            </div>
          </DialogContent>
        </Dialog>
        <div
          className="max-w-[300px] overflow-hidden text-right"
          style={{ direction: "rtl" }}
        >
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <a
                  href={mainPage}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "block truncate hover:underline",
                    item.preferred_url === mainPage
                      ? "font-medium text-primary"
                      : "text-primary",
                  )}
                >
                  {getLastUrlSegments(mainPage)}
                </a>
              </TooltipTrigger>
              <TooltipContent
                side="top"
                align="center"
                className="max-w-[400px] rounded-md border border-gray-300 bg-white p-2 text-black"
              >
                <p className="text-xs">{mainPage}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    );
  });

  const ComparativeValueCell = memo(function ComparativeValueCell({
    current,
    previous,
    formatFn = (val: number) => val.toLocaleString("da-DK"),
    reverseComparison = false,
  }: {
    current: number | undefined;
    previous: number | undefined;
    formatFn?: (val: number) => string;
    reverseComparison?: boolean;
  }) {
    if (current === undefined) return <div className="flex justify-end">—</div>;

    if (reverseComparison && current >= 100) {
      return (
        <div className="flex flex-col items-end">
          <span className="font-normal">Ikke i top 100</span>
          {previous !== undefined && previous < 100 && (
            <span className="flex items-center gap-1 text-xs text-red-500">
              <ArrowDown className="h-3 w-3" />
              Ikke i top 100
            </span>
          )}
        </div>
      );
    }

    const change = previous !== undefined ? current - previous : undefined;
    const displayChange =
      reverseComparison && change !== undefined ? -change : change;

    const getChangeDisplay = () => {
      if (
        displayChange === undefined ||
        (displayChange === 0 && previous === undefined)
      )
        return (
          <span className="inline-flex items-center whitespace-nowrap px-1.5 py-0.5 text-xs text-gray-500">
            —
          </span>
        );

      if (displayChange === 0)
        return (
          <span className="inline-flex items-center whitespace-nowrap px-1.5 py-0.5 text-xs text-gray-500">
            —
          </span>
        );

      const isPositive = reverseComparison
        ? displayChange < 0
        : displayChange > 0;
      const Icon = isPositive ? ArrowUp : ArrowDown;
      const colorClass = isPositive ? "text-green-500" : "text-red-500";
      const bgColorClass = isPositive ? "bg-green-50" : "bg-red-50";
      const absChange = Math.abs(displayChange);

      return (
        <span
          className={cn(
            "inline-flex items-center gap-0.5 whitespace-nowrap rounded-sm px-1.5 py-0.5 text-xs",
            colorClass,
            bgColorClass,
          )}
        >
          <Icon className="h-3 w-3 shrink-0" />
          <span className="tabular-nums">{formatFn(absChange)}</span>
        </span>
      );
    };

    // If there's no comparison period, just show the current value right-aligned
    if (previous === undefined) {
      const hasComparisonPeriod = selectedDateRanges?.length > 1;
      if (!hasComparisonPeriod) {
        return (
          <div className="text-right">
            <span className="font-normal tabular-nums">
              {formatFn(current)}
            </span>
          </div>
        );
      }
      return (
        <div className="flex items-center justify-between gap-4">
          <div className="w-[50%] text-right">
            <span className="font-normal tabular-nums">
              {formatFn(current)}
            </span>
          </div>
          {hasComparisonPeriod && (
            <div className="flex w-[50%] min-w-[45px] justify-end">
              <span className="inline-flex items-center whitespace-nowrap px-1.5 py-0.5 text-xs text-gray-500">
                —
              </span>
            </div>
          )}
        </div>
      );
    }

    // Only show split layout when there's a comparison period
    return (
      <div className="flex items-center justify-between gap-4">
        <div className="w-[50%] text-right">
          <span className="font-normal tabular-nums">{formatFn(current)}</span>
        </div>
        <div className="flex w-[50%] min-w-[45px] justify-end">
          {getChangeDisplay()}
        </div>
      </div>
    );
  });

  // Update the renderCell function to use the memoized components
  const renderCell = useCallback(
    (row: any, accessorKey: string) => {
      const value = row.getValue(accessorKey);
      const item = row.original as TData;

      if (accessorKey === "position") {
        // For new keywords, we need to access position data directly as it might not be in date_range_0 structure
        const currentPosition =
          item.date_range_0?.latest_stats?.[0]?.position ||
          (Array.isArray(item.latest_stats) && item.latest_stats.length > 0
            ? item.latest_stats[0]?.position
            : undefined);
        const previousPosition = item.date_range_1?.latest_stats?.[0]?.position;

        if (
          currentPosition === undefined ||
          currentPosition === null ||
          isNaN(Number(currentPosition))
        ) {
          return <div className="flex justify-end">—</div>;
        }

        return (
          <div className="text-right">
            <ComparativeValueCell
              current={Number(currentPosition)}
              previous={
                previousPosition !== undefined
                  ? Number(previousPosition)
                  : undefined
              }
              formatFn={(val) => Math.round(val).toString()}
              reverseComparison={true}
            />
          </div>
        );
      }

      if (accessorKey === "clicks" || accessorKey === "impressions") {
        // For new keywords, we need to access data directly as it might not be in date_range_0 structure
        const currentValue =
          item.date_range_0?.overall_stats?.[accessorKey] ||
          (item.overall_stats ? item.overall_stats[accessorKey] : undefined);
        const previousValue = item.date_range_1?.overall_stats?.[accessorKey];
        const hasComparison = !!item.date_range_1;

        if (
          currentValue === undefined ||
          currentValue === null ||
          isNaN(Number(currentValue))
        ) {
          return (
            <div
              className={cn(
                "text-right",
                hasComparison && "flex items-center justify-between gap-4",
              )}
            >
              {hasComparison ? (
                <>
                  <div className="w-[50%] text-right">—</div>
                  <div className="w-[50%] min-w-[45px] text-right"></div>
                </>
              ) : (
                "—"
              )}
            </div>
          );
        }

        return (
          <div className="text-right">
            <ComparativeValueCell
              current={Number(currentValue)}
              previous={
                previousValue !== undefined ? Number(previousValue) : undefined
              }
            />
          </div>
        );
      }

      if (accessorKey === "landing_page") {
        return (
          <LandingPageCell
            value={value}
            item={item}
            onUpdatePreferredUrl={updatePreferredUrl}
          />
        );
      }

      if (accessorKey === "title") {
        return (
          <TitleCell
            value={value}
            item={item}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onToggleStar={handleToggleStar}
            onAnalysisClick={handleAnalysisClick}
          />
        );
      }

      return value || "—";
    },
    [
      handleDelete,
      handleEdit,
      handleToggleStar,
      handleAnalysisClick,
      updatePreferredUrl,
    ],
  );

  // Add enhanced columns with comparison data accessors
  const enhancedColumnDefs = useMemo(() => {
    // Add accessors for comparison data
    const extendedColumns = [...keywordColumns];

    // Add invisible columns for comparison sorting
    extendedColumns.push({
      id: positionChangeAccessorKey,
      accessorFn: (row: any) => {
        // Safely handle position data for new keywords
        const currentPosition =
          row.date_range_0?.latest_stats?.[0]?.position ||
          (Array.isArray(row.latest_stats) && row.latest_stats.length > 0
            ? row.latest_stats[0]?.position
            : undefined);
        const previousPosition = row.date_range_1?.latest_stats?.[0]?.position;

        if (
          currentPosition === undefined ||
          currentPosition === null ||
          previousPosition === undefined ||
          previousPosition === null
        ) {
          return null; // No valid comparison possible
        }

        // For position, a decrease in number is an improvement (higher ranking)
        // Positive change means position improved (e.g., from 10 to 5)
        return Number(previousPosition) - Number(currentPosition);
      },
      cell: () => null, // Hidden column, no cell renderer needed
      header: () => null,
      enableHiding: true,
    });

    extendedColumns.push({
      id: clicksChangeAccessorKey,
      accessorFn: (row: any) => {
        // Safely handle clicks data for new keywords
        const currentClicks =
          row.date_range_0?.overall_stats?.clicks ||
          (row.overall_stats ? row.overall_stats.clicks : undefined);
        const previousClicks = row.date_range_1?.overall_stats?.clicks;

        if (
          currentClicks === undefined ||
          currentClicks === null ||
          previousClicks === undefined ||
          previousClicks === null
        ) {
          return null; // No valid comparison possible
        }

        // For clicks, an increase is an improvement
        return Number(currentClicks) - Number(previousClicks);
      },
      cell: () => null, // Hidden column, no cell renderer needed
      header: () => null,
      enableHiding: true,
    });

    extendedColumns.push({
      id: impressionsChangeAccessorKey,
      accessorFn: (row: any) => {
        // Safely handle impressions data for new keywords
        const currentImpressions =
          row.date_range_0?.overall_stats?.impressions ||
          (row.overall_stats ? row.overall_stats.impressions : undefined);
        const previousImpressions =
          row.date_range_1?.overall_stats?.impressions;

        if (
          currentImpressions === undefined ||
          currentImpressions === null ||
          previousImpressions === undefined ||
          previousImpressions === null
        ) {
          return null; // No valid comparison possible
        }

        // For impressions, an increase is an improvement
        return Number(currentImpressions) - Number(previousImpressions);
      },
      cell: () => null, // Hidden column, no cell renderer needed
      header: () => null,
      enableHiding: true,
    });

    return extendedColumns;
  }, []);

  // Function to handle comparison sort button click
  const handleComparisonSort = useCallback(
    (columnId: string) => {
      // Map main column ID to comparison column ID
      let comparisonColumnId: string;

      switch (columnId) {
        case "position":
          comparisonColumnId = positionChangeAccessorKey;
          break;
        case "clicks":
          comparisonColumnId = clicksChangeAccessorKey;
          break;
        case "impressions":
          comparisonColumnId = impressionsChangeAccessorKey;
          break;
        default:
          return; // No comparison column available
      }

      // Toggle comparison sorting on/off
      if (activeComparisonColumn === comparisonColumnId) {
        // If already sorting by this column, toggle direction
        const isCurrentlyAsc = sorting.some(
          (sort) => sort.id === comparisonColumnId && !sort.desc,
        );

        setSorting([{ id: comparisonColumnId, desc: isCurrentlyAsc }]);
      } else {
        // Start sorting by this column (default to desc - largest changes first)
        setActiveComparisonColumn(comparisonColumnId);
        setSorting([{ id: comparisonColumnId, desc: true }]);
        setIsComparisonSorting(true);
      }
    },
    [activeComparisonColumn, sorting],
  );

  const updatedColumns = enhancedColumnDefs.map((column) => {
    // Skip hidden comparison columns in the UI
    if (
      column.id === positionChangeAccessorKey ||
      column.id === clicksChangeAccessorKey ||
      column.id === impressionsChangeAccessorKey
    ) {
      return {
        ...column,
        enableHiding: true,
        size: 0,
      };
    }

    const isNumeric = ["position", "clicks", "impressions"].includes(
      (column as { accessorKey?: string }).accessorKey || "",
    );
    const accessorKey = (column as any).accessorKey;

    // If it's a numeric column with comparison data, add the SortableColumnHeader
    if (isNumeric && accessorKey) {
      return {
        ...column,
        meta: {
          ...column.meta,
          className: cn(column.meta?.className, isNumeric && "text-right"),
        },
        header: (props: any) => {
          const hasComparison = props.column
            .getFacetedRowModel()
            .rows.some((row: any) => !!row.original.date_range_1);

          // Get column title and description based on accessorKey
          let title = "";
          let description = "";

          // Map accessorKey to title and description
          switch (accessorKey) {
            case "position":
              title = "Position";
              description = "Den aktuelle position i søgeresultaterne";
              break;
            case "clicks":
              title = "Kliks";
              description = "Antallet af kliks på søgeresultater";
              break;
            case "impressions":
              title = "Eksponeringer";
              description = "Antallet af gange søgeresultater blev vist";
              break;
            default:
              title =
                accessorKey.charAt(0).toUpperCase() + accessorKey.slice(1);
              description = "";
          }

          return (
            <SortableColumnHeader
              column={props.column}
              title={title}
              description={description}
              hasComparison={hasComparison}
              align="right"
              onComparisonSort={() => handleComparisonSort(accessorKey)}
            />
          );
        },
        cell: ({ row }: any) => {
          return renderCell(row, accessorKey);
        },
      };
    }

    return {
      ...column,
      meta: {
        ...column.meta,
        className: cn(column.meta?.className, isNumeric && "text-right"),
      },
      cell: ({ row }: any) => {
        if (!accessorKey) {
          return null;
        }
        return renderCell(row, accessorKey);
      },
    };
  }) as ColumnDef<TData>[];

  // Add ResizeHandle component
  const ResizeHandle = ({
    onMouseDown,
  }: {
    onMouseDown: (e: React.MouseEvent) => void;
  }) => (
    <div
      onMouseDown={onMouseDown}
      className="absolute -right-px top-0 h-full w-0"
    />
  );

  // Update table configuration
  const table = useReactTable({
    data: localData,
    columns: updatedColumns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: (newSorting) => {
      // Check if sorting has changed to a main column
      if (Array.isArray(newSorting) && newSorting.length > 0) {
        const mainSortKey = newSorting[0].id;

        // Validate that the column exists
        const columnExists = updatedColumns.some((col) => {
          const colDef = col as { accessorKey?: string };
          return colDef.accessorKey === mainSortKey;
        });

        if (!columnExists) {
          return;
        }

        // If sorting by a main column (not comparison), reset comparison state
        if (
          mainSortKey !== positionChangeAccessorKey &&
          mainSortKey !== clicksChangeAccessorKey &&
          mainSortKey !== impressionsChangeAccessorKey
        ) {
          setIsComparisonSorting(false);
          setActiveComparisonColumn(null);
        }
      }

      setSorting(newSorting);
    },
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      sorting,
      columnFilters,
      columnSizing,
      columnVisibility: {
        [positionChangeAccessorKey]: false,
        [clicksChangeAccessorKey]: false,
        [impressionsChangeAccessorKey]: false,
      },
    },
    onColumnSizingChange: setColumnSizing,
    columnResizeMode: "onChange" as ColumnResizeMode,
    enableColumnResizing: false,
    defaultColumn: {
      minSize: 80,
      maxSize: 1000,
      size: 150,
    },
    initialState: {
      pagination: {
        pageSize: pSize,
      },
      columnSizing: {
        position: 100,
        clicks: 100,
        impressions: 120,
      },
      columnVisibility: {
        [positionChangeAccessorKey]: false,
        [clicksChangeAccessorKey]: false,
        [impressionsChangeAccessorKey]: false,
      },
    },
    sortingFns: {
      myCustomSorting,
      number,
      currency: myCustomSorting,
      competition: myCustomSorting,
      myCustomCompareSorting,
    },
  });

  // Update filtered data whenever table data changes
  useEffect(() => {
    const filteredData = table
      .getFilteredRowModel()
      .rows.map((row) => row.original) as TData[];
    onFilteredDataChange?.(filteredData);
  }, [table.getFilteredRowModel().rows, onFilteredDataChange]);

  const currentShownPages = table.getRowModel().rows?.length;
  const currentPageIndex = table.getState().pagination.pageIndex;
  const pageCount = table.getPageCount();

  return (
    <div className={cn(className)}>
      <div className="flex justify-between pb-4">
        {!disableSearch && (
          <div className="relative md:min-w-[360px]">
            <Input
              placeholder="Søg..."
              value={
                (table.getColumn("title")?.getFilterValue() as string) ?? ""
              }
              onChange={(event) =>
                table.getColumn("title")?.setFilterValue(event.target.value)
              }
              className="bg-white pl-8"
            />
            <Search className="absolute left-3 top-1/2 h-3 w-3 -translate-y-1/2" />
          </div>
        )}
      </div>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Er du sikker?</DialogTitle>
            <DialogDescription>
              Denne handling kan ikke fortrydes. Dette vil permanent slette
              søgeordet og alle tilhørende data.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex justify-end gap-4">
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={isDeleting}
            >
              Annuller
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Sletter..." : "Slet søgeord"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {selectedKeyword && (
        <KeywordAnalysis
          title={selectedKeyword.title}
          isOpen={showAnalysisDialog}
          onClose={() => setShowAnalysisDialog(false)}
          keyword={selectedKeyword}
        />
      )}

      {selectedKeywordForEdit && (
        <EditKeywordModal
          keyword={selectedKeywordForEdit as any}
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedKeywordForEdit(null);
          }}
          onSave={handleKeywordUpdate as any}
        />
      )}

      <div
        className={cn(
          "rounded-xl border bg-white shadow-sm",
          disableBorder && "border-0 shadow-none",
        )}
      >
        <div className="relative">
          <Table
            className={cn(
              "overflow-hidden rounded-t-xl [&_tr:last-child_td]:border-b-0",
              "relative",
              "[&_td]:transition-none [&_th]:transition-none",
              table.getState().columnSizingInfo.isResizingColumn &&
                "select-none [&_*]:pointer-events-none",
            )}
          >
            <TableHeader className="z-50 bg-[#FAFAFA]">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="z-50 bg-[#FAFAFA]">
                  {headerGroup.headers.map((header, index) => (
                    <TableHead
                      key={header.id}
                      className={cn(
                        header.column.columnDef.meta?.className,
                        "relative border-x border-gray-200 text-primary first:border-l-0 last:border-r-0",
                        index === 0 && "rounded-tl-xl",
                        index === headerGroup.headers.length - 1 &&
                          "rounded-tr-xl",
                      )}
                      style={{ width: header.getSize() }}
                    >
                      {header.isPlaceholder ? null : (
                        <div className="relative flex w-full items-center">
                          <div className="flex-1">
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )}
                          </div>
                          {header.column.getCanResize() && (
                            <ResizeHandle
                              onMouseDown={header.getResizeHandler()}
                            />
                          )}
                        </div>
                      )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                    className="group cursor-default text-left hover:bg-gray-50"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        className={cn(
                          "h-[52.45px] max-h-[37px] border-x border-gray-200 first:border-l-0 last:border-r-0",
                          cell.column.columnDef.meta?.className,
                        )}
                        style={{ width: cell.column.getSize() }}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center"
                  >
                    Ingen resultater
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          {table.getState().columnSizingInfo.isResizingColumn && (
            <div className="absolute inset-0 cursor-col-resize bg-primary/5" />
          )}
        </div>
      </div>

      {hasPagination && (
        <div className="flex items-center justify-between py-4">
          <p className="hidden whitespace-nowrap text-sm font-medium text-black/60 lg:flex lg:items-center lg:gap-1">
            <span>Viser</span>
            <span className="tabular-nums">{currentShownPages}</span>
            <span>ud af</span>
            <span className="tabular-nums">{localData.length}</span>
            <span>søgeord</span>
          </p>
          <Pagination className="justify-end">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  size="sm"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                />
              </PaginationItem>

              {currentPageIndex > 2 && (
                <PaginationItem>
                  <PaginationEllipsis onClick={() => table.firstPage()} />
                </PaginationItem>
              )}

              {Array.from({ length: pageCount }).map((_, index) => {
                if (
                  index === 0 ||
                  index === pageCount - 1 ||
                  (index >= currentPageIndex - 1 &&
                    index <= currentPageIndex + 1)
                ) {
                  return (
                    <PaginationItem key={index}>
                      <PaginationLink
                        onClick={() => table.setPageIndex(index)}
                        isActive={currentPageIndex === index}
                      >
                        {index + 1}
                      </PaginationLink>
                    </PaginationItem>
                  );
                }
                return null;
              })}

              {currentPageIndex < pageCount - 2 && (
                <PaginationItem>
                  <PaginationEllipsis onClick={() => table.lastPage()} />
                </PaginationItem>
              )}

              <PaginationItem>
                <PaginationNext
                  size="sm"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
}) as <TData extends Keyword>(props: DataTableProps<TData, any>) => JSX.Element;

export default KeywordTable;
