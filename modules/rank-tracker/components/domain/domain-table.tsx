"use client";

import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  ArrowDown,
  ArrowUp,
  ChevronRight,
  MoreVertical,
  Search,
  Loader2,
} from "lucide-react";
import { useCallback, useMemo, useState, type ReactElement } from "react";

import { Button } from "@/modules/core/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { cn } from "@/modules/core/lib/utils";
import {
  myCustomCompareSorting,
  myCustomSorting,
  number,
} from "@/modules/core/utils/sorters";
import { DomainWithAnalytics } from "@/modules/rank-tracker/types/index";
import useDomainTable from "../../hooks/use-domain-table";
import { AddKeywordDialogWithProvider } from "../keywords/add-keyword";
import { AddDomainDialog } from "./add-domain";

// ComparativeValueCell component for domain table
const ComparativeValueCell = ({
  current,
  previous,
  formatFn = (val: number) => val.toLocaleString("da-DK"),
  reverseComparison = false,
}: {
  current: number | undefined;
  previous: number | undefined;
  formatFn?: (val: number) => string;
  reverseComparison?: boolean;
}) => {
  if (current === undefined) return <div className="flex justify-end">—</div>;

  // If no previous value, only show a dash for comparison
  if (previous === undefined)
    return <span className="text-xs text-gray-500">—</span>;

  const change = current - previous;
  const displayChange = reverseComparison ? -change : change;

  // Handle the case where the change is 0 (no change)
  if (change === 0) {
    return <span className="text-xs text-gray-500">—</span>;
  }

  // Show as positive/negative with correct color
  const isPositive = reverseComparison ? change < 0 : change > 0;
  const Icon = isPositive ? ArrowUp : ArrowDown;
  const colorClass = isPositive ? "text-green-500" : "text-red-500";
  const bgColorClass = isPositive ? "bg-green-50" : "bg-red-50";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 whitespace-nowrap rounded-sm px-1.5 py-0.5 text-xs",
        colorClass,
        bgColorClass,
      )}
    >
      <Icon className="h-3 w-3 shrink-0" />
      <span className="tabular-nums">{formatFn(Math.abs(displayChange))}</span>
    </span>
  );
};

interface DataTableProps<TData extends Record<string, any>, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  className?: string;
  pSize?: number;
  sortColumn?: string;
  disableSearch?: boolean;
  hasPagination?: boolean;
  disableBorder?: boolean;
  gscData?: any;
}

export function DomainTable<TData extends DomainWithAnalytics>({
  columns,
  data,
  className,
  pSize = 5,
  disableSearch = false,
  hasPagination = true,
  disableBorder = false,
  gscData,
}: DataTableProps<TData, any>): ReactElement {
  const [sorting, setSorting] = useState<SortingState>([
    {
      id: "display_name",
      desc: false,
    },
  ]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [isComparisonSorting, setIsComparisonSorting] = useState<
    Record<string, boolean>
  >({});
  const {
    handleDelete,
    handleUpdateItem,
    confirmDelete,
    handleEdit,
    handleKeywordNavigation,
    handleAddKeywords,
    handleDomainCreated,
    editDomain,
    isEditModalOpen,
    showDeleteDialog,
    isDeleting,
    showKeywordDialog,
    selectedDomainForKeywords,
    showProgressModal,
    setIsEditModalOpen,
    setShowDeleteDialog,
    setShowKeywordDialog,
    setSelectedDomainForKeywords,
    setShowProgressModal,
    isPending,
    navigatingDomainId,
  } = useDomainTable();

  const renderCell = (row: any, accessorKey: string) => {
    const value = row.getValue(accessorKey);
    const domain = row.original as DomainWithAnalytics;

    switch (accessorKey) {
      case "avg_position":
        const currentPosition = value ? Number(value) : 0;
        const previousPosition =
          domain.date_range_1?.overall_stats.position ?? undefined;

        if (currentPosition === 0 && !previousPosition) {
          return <div className="text-right tabular-nums">—</div>;
        }

        const hasComparison = !!domain.date_range_1;

        if (!hasComparison) {
          return (
            <div className="text-right tabular-nums">
              {currentPosition.toFixed(1)}
            </div>
          );
        }

        return (
          <div className="flex items-center justify-between gap-6">
            <div className="flex-1 text-right tabular-nums">
              {currentPosition.toFixed(1)}
            </div>
            <div className="min-w-[60px] text-right">
              <ComparativeValueCell
                current={currentPosition}
                previous={previousPosition}
                formatFn={(val) => val.toFixed(1)}
                reverseComparison={true}
              />
            </div>
          </div>
        );

      case "clicks":
      case "impressions":
        const currentValue = value ? Number(value) : 0;
        const previousValue =
          domain.date_range_1?.overall_stats[accessorKey] ?? undefined;

        if (currentValue === 0 && !previousValue) {
          return <div className="text-right tabular-nums">—</div>;
        }

        const hasMetricComparison = !!domain.date_range_1;

        if (!hasMetricComparison) {
          return (
            <div className="text-right tabular-nums">
              {Math.round(currentValue)}
            </div>
          );
        }

        return (
          <div className="flex items-center justify-between gap-6">
            <div className="flex-1 text-right tabular-nums">
              {Math.round(currentValue)}
            </div>
            <div className="min-w-[60px] text-right">
              <ComparativeValueCell
                current={currentValue}
                previous={previousValue}
                formatFn={(val) => Math.round(val).toString()}
              />
            </div>
          </div>
        );

      case "keywords_count":
      case "top_3_keywords":
        const currentCount = value ? Number(value) : 0;
        return (
          <div className="flex flex-col">
            <div className="text-right tabular-nums">
              {Math.round(currentCount)}
            </div>
          </div>
        );

      case "display_name":
        return (
          <div
            className="group flex items-center gap-2"
            onClick={(e) => e.stopPropagation()}
            data-interactive="true"
          >
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6 border">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-[180px]">
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEdit(domain);
                  }}
                >
                  Rediger domæne
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(domain.id || "");
                  }}
                  className="text-destructive"
                >
                  Slet domæne
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <div className="flex max-w-[200px] flex-col">
              <div className="flex items-center gap-2">
                <span className="font-medium">{value}</span>
              </div>
              <span
                className="max-w-[200px] truncate text-xs text-gray-500"
                title={domain.url}
              >
                {domain.url}
              </span>
            </div>
            {domain.keywords_count === 0 ? (
              <Button
                variant="outline"
                className="ml-auto flex cursor-pointer items-center text-xs opacity-0 transition-opacity group-hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation();
                  handleAddKeywords(domain, e);
                }}
                data-interactive="true"
              >
                Tilføj søgeord
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            ) : (
              <Button
                variant="outline"
                className="ml-auto flex cursor-pointer items-center text-xs opacity-0 transition-opacity group-hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation();
                  handleKeywordNavigation(domain.id || "");
                }}
                disabled={navigatingDomainId === domain.id}
                data-interactive="true"
              >
                {navigatingDomainId === domain.id ? (
                  <>
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                    Indlæser...
                  </>
                ) : (
                  <>
                    Domæne
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </>
                )}
              </Button>
            )}
          </div>
        );

      default:
        return value || 0;
    }
  };

  // Customize column sorting based on comparison state
  const customizeColumnSorting = useCallback(() => {
    return columns.map((column) => {
      const accessorKey = (column as any).accessorKey as string;

      // If we're in comparison sorting mode for this column, use the compareRangeSort function
      if (isComparisonSorting[accessorKey]) {
        return {
          ...column,
          sortingFn: (rowA: any, rowB: any) => {
            const hasComparisonA = !!rowA.original.date_range_1;
            const hasComparisonB = !!rowB.original.date_range_1;

            // If no comparison data is available, fall back to normal sorting
            if (!hasComparisonA && !hasComparisonB) {
              return (column as any).sortingFn(rowA, rowB, accessorKey);
            }

            // Apply comparison sorting
            if (accessorKey === "avg_position") {
              // For position, we need to reverse the comparison
              const aValue = rowA.original.avg_position;
              const bValue = rowB.original.avg_position;
              const aPrevious =
                rowA.original.date_range_1?.overall_stats.position;
              const bPrevious =
                rowB.original.date_range_1?.overall_stats.position;

              // Skip invalid values
              if (aValue === undefined || aPrevious === undefined) return 1;
              if (bValue === undefined || bPrevious === undefined) return -1;

              // Compare the percentage change
              const aChange = aPrevious - aValue; // Positive is improvement for position
              const bChange = bPrevious - bValue;

              // For position, a decrease in number is an improvement
              return bChange - aChange;
            }

            // For clicks and impressions
            const aValue = rowA.original[accessorKey];
            const bValue = rowB.original[accessorKey];
            const aPrevious =
              rowA.original.date_range_1?.overall_stats[accessorKey];
            const bPrevious =
              rowB.original.date_range_1?.overall_stats[accessorKey];

            // Skip invalid values
            if (aValue === undefined || aPrevious === undefined) return 1;
            if (bValue === undefined || bPrevious === undefined) return -1;

            // Compare percentage change for clicks/impressions
            const aChange = aValue - aPrevious; // Positive is improvement
            const bChange = bValue - bPrevious;

            // For clicks/impressions, higher is better
            return bChange - aChange;
          },
          meta: {
            ...column.meta,
            isComparisonSorting: isComparisonSorting[accessorKey],
          },
        };
      }

      return column;
    });
  }, [columns, isComparisonSorting]);

  const updatedColumns = useMemo(() => {
    const customizedColumns = customizeColumnSorting();

    return customizedColumns.map((column) => ({
      ...column,
      cell: ({ row }: any) => {
        const accessorKey = (column as any).accessorKey as string | undefined;
        if (!accessorKey) {
          console.error("Missing accessorKey for column:", column);
          return null;
        }
        return renderCell(row, accessorKey);
      },
    }));
  }, [customizeColumnSorting, renderCell]);

  const table = useReactTable({
    data: data,
    columns: updatedColumns as ColumnDef<DomainWithAnalytics>[],
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    enableExpanding: true,
    getSubRows: (row) => row.subRows,
    state: {
      sorting,
      columnFilters,
    },
    initialState: {
      pagination: {
        pageSize: pSize,
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

  const currentShownPages = table.getRowModel().rows?.length;
  const currentPageIndex = table.getState().pagination.pageIndex;
  const pageCount = table.getPageCount();

  return (
    <div className={cn(className)}>
      <div className="flex justify-between pb-4">
        <AddDomainDialog
          isOpen={isEditModalOpen}
          onOpenChange={setIsEditModalOpen}
          editDomain={editDomain}
          onSave={handleUpdateItem}
          onDomainCreated={handleDomainCreated}
        />

        {showKeywordDialog && selectedDomainForKeywords && (
          <AddKeywordDialogWithProvider
            isOpen={showKeywordDialog}
            onOpenChange={(open) => {
              setShowKeywordDialog(open);
              if (!open) {
                setSelectedDomainForKeywords(null);
              }
            }}
            defaultDomainId={
              selectedDomainForKeywords?.id
                ? Number(selectedDomainForKeywords.id)
                : undefined
            }
            currentDomain={selectedDomainForKeywords}
            gscData={
              selectedDomainForKeywords
                ? gscData?.[
                    `sc-domain:${selectedDomainForKeywords.url.replace(/^www\./, "")}`
                  ] || gscData?.[selectedDomainForKeywords.url]
                : undefined
            }
          />
        )}

        {!disableSearch && (
          <div className="relative">
            <Input
              placeholder="Søg..."
              value={
                (table.getColumn("display_name")?.getFilterValue() as string) ??
                ""
              }
              onChange={(event) =>
                table
                  .getColumn("display_name")
                  ?.setFilterValue(event.target.value)
              }
              className="bg-white pl-8 sm:w-96"
            />
            <Search className="absolute left-3 top-1/2 h-3 w-3 -translate-y-1/2" />
          </div>
        )}
      </div>
      <>
        <div
          className={cn(
            "rounded-xl border bg-white shadow-sm",
            disableBorder && "border-0 shadow-none",
          )}
        >
          <Table className="overflow-hidden rounded-t-xl">
            <TableHeader className="z-50 bg-[#FAFAFA]">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="z-50 bg-[#FAFAFA]">
                  {headerGroup.headers.map((header, index) => (
                    <TableHead
                      key={header.id}
                      className={cn(
                        header.column.columnDef.meta?.className,
                        "border-x border-gray-200 text-left text-primary first:border-l-0 last:border-r-0",
                        index === 0 && "rounded-tl-xl",
                        index === headerGroup.headers.length - 1 &&
                          "rounded-tr-xl",
                      )}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
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
                    className={cn(
                      "group cursor-pointer text-left hover:bg-gray-50",
                      navigatingDomainId ===
                        (row.original as DomainWithAnalytics).id &&
                        "pointer-events-none opacity-70",
                    )}
                    onClick={(e) => {
                      // Check if the click is on a button, dropdown, or other interactive element
                      const target = e.target as HTMLElement;
                      const isInteractiveElement =
                        target.closest("button") ||
                        target.closest('[role="menuitem"]') ||
                        target.closest('[data-interactive="true"]');

                      // Don't navigate if clicked on an interactive element
                      if (isInteractiveElement) {
                        return;
                      }

                      const domain = row.original as DomainWithAnalytics;
                      if (
                        domain.id &&
                        domain.keywords_count &&
                        domain.keywords_count > 0
                      ) {
                        handleKeywordNavigation(domain.id);
                      }
                    }}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        className={cn(
                          "h-[52.45px] max-h-[37px] border-x border-gray-200 first:border-l-0 last:border-r-0",
                          cell.column.columnDef.meta?.className,
                        )}
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
        </div>

        {hasPagination && (
          <div className="flex items-center justify-between py-4">
            <p className="hidden whitespace-nowrap text-sm font-medium text-black/60 lg:flex lg:items-center lg:gap-1">
              <span>Viser</span>
              <span className="tabular-nums">{currentShownPages}</span>
              <span>ud af</span>
              <span className="tabular-nums">{data.length}</span>
              <span>domæner</span>
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
      </>
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Er du sikker?</DialogTitle>
            <DialogDescription>
              Dette sletter domænet og alle tilhørende søgeord i demoen.
              Handlingen kan ikke fortrydes enkeltvis, men du kan altid
              nulstille hele demo-datasættet fra toppen af siden.
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
              {isDeleting ? "Sletter..." : "Slet domæne"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={showProgressModal} onOpenChange={setShowProgressModal}>
        <DialogContent className="sm:max-w-[425px]" closeButton={false}>
          <DialogHeader>
            <DialogTitle>Opretter søgeord</DialogTitle>
            <DialogDescription>
              Vent venligst mens søgeordene bliver oprettet og tilføjet til
              systemet.
            </DialogDescription>
          </DialogHeader>
          <div>
            <div className="flex flex-col items-center justify-center space-y-4 py-4">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-sm text-gray-500">Behandler data...</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
