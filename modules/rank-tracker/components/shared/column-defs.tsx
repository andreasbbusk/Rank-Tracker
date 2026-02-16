"use client";

import {
  Domain,
  Keyword,
  DomainWithAnalytics,
} from "@/modules/rank-tracker/types";
import { ColumnDef, SortingFn } from "@tanstack/react-table";
import { TableHeader } from "./table-header";
import { cn } from "@/modules/core/lib/utils";
import { Diff } from "lucide-react";
import { Button } from "@/modules/core/components/ui/button";
import { useState, useMemo, useCallback } from "react";

// Custom sorting functions
const isInvalidValue = (value: any): boolean => {
  return value === "-" || value === "—";
};

const isInvalidPosition = (value: any): boolean => {
  return value === "-" || value === "—";
};

const numericSort: SortingFn<any> = (rowA, rowB, columnId) => {
  const a = rowA.getValue(columnId);
  const b = rowB.getValue(columnId);

  // Always put invalid values at the bottom
  const isInvalidA = isInvalidValue(a);
  const isInvalidB = isInvalidValue(b);

  if (isInvalidA && isInvalidB) return 0;
  if (isInvalidA) return 1;
  if (isInvalidB) return -1;

  // Convert to numbers and sort
  const aNum = typeof a === "number" ? a : Number(a);
  const bNum = typeof b === "number" ? b : Number(b);
  return aNum - bNum;
};

const alphaSort: SortingFn<any> = (rowA, rowB, columnId) => {
  const a = rowA.getValue(columnId);
  const b = rowB.getValue(columnId);

  // Always put invalid values at the bottom
  if (
    (a === undefined || a === null || a === "-" || a === "") &&
    (b === undefined || b === null || b === "-" || b === "")
  )
    return 0;
  if (a === undefined || a === null || a === "-" || a === "") return 1;
  if (b === undefined || b === null || b === "-" || b === "") return -1;

  const aStr = String(a || "").toLowerCase();
  const bStr = String(b || "").toLowerCase();
  return aStr.localeCompare(bStr, "da");
};

const starredSort: SortingFn<any> = (rowA, rowB, columnId) => {
  // First sort by star status
  const aStarred = rowA.original.star_keyword || false;
  const bStarred = rowB.original.star_keyword || false;

  // If star status is different, starred items always come first
  if (aStarred !== bStarred) {
    return aStarred ? -1 : 1;
  }

  // If both are starred or both are not starred, sort by title
  const aTitle = rowA.getValue(columnId);
  const bTitle = rowB.getValue(columnId);

  // Handle undefined/null values - always put them at the bottom
  if (
    (aTitle === undefined || aTitle === null) &&
    (bTitle === undefined || bTitle === null)
  )
    return 0;
  if (aTitle === undefined || aTitle === null) return 1;
  if (bTitle === undefined || bTitle === null) return -1;

  return String(aTitle || "")
    .toLowerCase()
    .localeCompare(String(bTitle || "").toLowerCase(), "da");
};

const compareSort: SortingFn<any> = (rowA, rowB, columnId) => {
  const aData = rowA.original;
  const bData = rowB.original;

  let aCurrent, aPrevious, bCurrent, bPrevious;

  switch (columnId) {
    case "position":
      aCurrent = aData.date_range_0?.latest_stats?.[0]?.position;
      aPrevious = aData.date_range_1?.latest_stats?.[0]?.position;
      bCurrent = bData.date_range_0?.latest_stats?.[0]?.position;
      bPrevious = bData.date_range_1?.latest_stats?.[0]?.position;
      break;
    case "clicks":
    case "impressions":
      aCurrent = aData.date_range_0?.overall_stats?.[columnId];
      aPrevious = aData.date_range_1?.overall_stats?.[columnId];
      bCurrent = bData.date_range_0?.overall_stats?.[columnId];
      bPrevious = bData.date_range_1?.overall_stats?.[columnId];
      break;
    default:
      return 0; // Unsupported column
  }

  // Check if we have valid data for comparison
  const aHasValidData =
    aCurrent !== undefined &&
    aCurrent !== null &&
    aPrevious !== undefined &&
    aPrevious !== null;

  const bHasValidData =
    bCurrent !== undefined &&
    bCurrent !== null &&
    bPrevious !== undefined &&
    bPrevious !== null;

  // Handle cases where data is missing
  if (!aHasValidData && !bHasValidData) return 0;
  if (!aHasValidData) return 1; // Push rows with missing data to the bottom
  if (!bHasValidData) return -1;

  // Convert to numbers for proper comparison
  const aCurrentNum = Number(aCurrent);
  const aPreviousNum = Number(aPrevious);
  const bCurrentNum = Number(bCurrent);
  const bPreviousNum = Number(bPrevious);

  // Calculate the change values
  let aChange, bChange;

  if (columnId === "position") {
    // For position, a decrease in number is an improvement
    aChange = aPreviousNum - aCurrentNum;
    bChange = bPreviousNum - bCurrentNum;
  } else {
    // For clicks/impressions, an increase in number is an improvement
    aChange = aCurrentNum - aPreviousNum;
    bChange = bCurrentNum - bPreviousNum;
  }

  // Check for unchanged values and sort them lowest
  const aUnchanged = aChange === 0;
  const bUnchanged = bChange === 0;

  // If one is unchanged and the other isn't, sort the unchanged one lower
  if (aUnchanged && !bUnchanged) return 1;
  if (!aUnchanged && bUnchanged) return -1;

  // If both are changed or both unchanged, sort by the magnitude of change
  return bChange - aChange;
};

const compareRangeSort: SortingFn<any> = (rowA, rowB, columnId) => {
  const aData = rowA.original;
  const bData = rowB.original;

  // Get both current and previous values based on column type
  let aCurrent, aPrevious, bCurrent, bPrevious;

  switch (columnId) {
    case "position":
      aCurrent = aData.date_range_0?.latest_stats?.[0]?.position;
      aPrevious = aData.date_range_1?.latest_stats?.[0]?.position;
      bCurrent = bData.date_range_0?.latest_stats?.[0]?.position;
      bPrevious = bData.date_range_1?.latest_stats?.[0]?.position;
      break;
    case "clicks":
    case "impressions":
      aCurrent = aData.date_range_0?.overall_stats?.[columnId];
      aPrevious = aData.date_range_1?.overall_stats?.[columnId];
      bCurrent = bData.date_range_0?.overall_stats?.[columnId];
      bPrevious = bData.date_range_1?.overall_stats?.[columnId];
      break;
    default:
      return 0; // Unsupported column
  }

  // Check if we have valid data for comparison
  const aHasValidData =
    aCurrent !== undefined &&
    aCurrent !== null &&
    aPrevious !== undefined &&
    aPrevious !== null;

  const bHasValidData =
    bCurrent !== undefined &&
    bCurrent !== null &&
    bPrevious !== undefined &&
    bPrevious !== null;

  // Handle cases where data is missing
  if (!aHasValidData && !bHasValidData) return 0;
  if (!aHasValidData) return 1; // Push rows with missing data to the bottom
  if (!bHasValidData) return -1;

  // Convert to numbers for proper comparison
  const aCurrentNum = Number(aCurrent);
  const aPreviousNum = Number(aPrevious);
  const bCurrentNum = Number(bCurrent);
  const bPreviousNum = Number(bPrevious);

  // Calculate the change values
  let aChange, bChange;

  if (columnId === "position") {
    // For position, a decrease in number is an improvement
    aChange = aPreviousNum - aCurrentNum;
    bChange = bPreviousNum - bCurrentNum;
  } else {
    // For clicks/impressions, an increase in number is an improvement
    aChange = aCurrentNum - aPreviousNum;
    bChange = bCurrentNum - bPreviousNum;
  }

  // Check for unchanged values and sort them lowest
  const aUnchanged = aChange === 0;
  const bUnchanged = bChange === 0;

  // If one is unchanged and the other isn't, sort the unchanged one lower
  if (aUnchanged && !bUnchanged) return 1;
  if (!aUnchanged && bUnchanged) return -1;

  // First sort by positive vs negative (positive changes first)
  if (aChange > 0 && bChange < 0) {
    return -1; // A has positive change, B has negative change, A comes first
  }

  if (aChange < 0 && bChange > 0) {
    return 1; // B has positive change, A has negative change, B comes first
  }

  // If both changes are in the same direction (both positive or both negative)
  // Sort by the magnitude of the change (larger absolute changes first)
  return Math.abs(bChange) - Math.abs(aChange);
};

// Add this component at the top of the file
const MetricCell = ({
  current,
  previous,
  reverseColors = false,
  showDashForNull = true,
}: {
  current: number | null | undefined;
  previous: number | null | undefined;
  reverseColors?: boolean;
  showDashForNull?: boolean;
}) => {
  // If no current value, show nothing or dash based on showDashForNull
  if (current === null || current === undefined)
    return <span>{showDashForNull ? "—" : ""}</span>;

  // If no previous value, only show current value
  if (previous === null || previous === undefined)
    return <span>{current}</span>;

  const change = current - previous;

  return (
    <div className="flex items-center justify-end gap-1">
      <span>{current}</span>
      <span
        className={cn(
          "text-xs",
          change === 0
            ? "text-gray-400"
            : reverseColors
              ? change < 0
                ? "text-green-600"
                : "text-red-600"
              : change > 0
                ? "text-green-600"
                : "text-red-600",
        )}
      >
        {change === 0 ? (
          ""
        ) : (
          <>
            {(reverseColors ? change < 0 : change > 0) ? "↑" : "↓"}
            {Math.abs(change)}
          </>
        )}
      </span>
    </div>
  );
};

const conditionalSort: SortingFn<Keyword> = (rowA, rowB, columnId) => {
  const hasComparisonA = !!rowA.original.date_range_1;
  const hasComparisonB = !!rowB.original.date_range_1;

  // If neither row has comparison data, use standard numeric sort
  if (!hasComparisonA && !hasComparisonB) {
    return numericSort(rowA, rowB, columnId);
  }

  // If only one row has comparison data, put the one with comparison data first
  if (hasComparisonA && !hasComparisonB) return -1;
  if (!hasComparisonA && hasComparisonB) return 1;

  // If both have comparison data, use compareSort
  return compareSort(rowA, rowB, columnId);
};

// Add this new component before the keywordColumns definition
const SubColumnsCell = ({
  mainValue,
  compareValue,
  showDiffButton = true,
  onDiffClick,
}: {
  mainValue: React.ReactNode;
  compareValue?: React.ReactNode;
  showDiffButton?: boolean;
  onDiffClick?: () => void;
}) => {
  return (
    <div className="flex items-center justify-end gap-4">
      <div className="flex-1 text-right">{mainValue}</div>
      <div className="flex items-center gap-2">
        {showDiffButton && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDiffClick?.();
            }}
            className="h-4 w-4 text-primary hover:text-gray-700"
          >
            <Diff className="h-4 w-4" />
          </button>
        )}
        <div className="min-w-[60px] text-right">{compareValue || "—"}</div>
      </div>
    </div>
  );
};

// Rename MetricCell to ComparativeValueCell for consistency
const ComparativeValueCell = MetricCell;

// Add a generic SortableColumnHeader component
export const SortableColumnHeader = ({
  column,
  title,
  description,
  hasComparison,
  align = "right",
  onComparisonSort,
  isComparisonSorting = false,
}: {
  column: any;
  title: string;
  description: string;
  hasComparison: boolean;
  align?: "left" | "right" | "center";
  onComparisonSort?: () => void;
  isComparisonSorting?: boolean;
}) => {
  const [localComparisonSorting, setLocalComparisonSorting] = useState(false);

  // Use prop value or local state
  const effectiveComparisonSorting =
    isComparisonSorting || localComparisonSorting;

  // Handle main column sorting
  const handleMainSort = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      column.toggleSorting(column.getIsSorted() === "asc");
    },
    [column],
  );

  // Handle range sorting (+/- button)
  const handleComparisonSort = useCallback(
    (e: React.MouseEvent) => {
      setLocalComparisonSorting((prev) => !prev);

      // Call the provided callback to handle the actual sorting
      if (onComparisonSort) {
        onComparisonSort();
      }
    },
    [onComparisonSort],
  );

  // If there's no comparison data, just show the regular header
  if (!hasComparison) {
    return (
      <TableHeader
        column={column}
        title={title}
        description={description}
        align={align}
      />
    );
  }

  // Otherwise show the split header with +/- button
  return (
    <div
      className="flex items-center justify-between gap-8"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Main sort header */}
      <div
        className="flex-1 text-right"
        onClick={(e) => {
          e.stopPropagation();
          handleMainSort(e);
        }}
      >
        <TableHeader
          column={column}
          title={title}
          description={description}
          align={align}
        />
      </div>

      {/* Comparison sort button container */}
      <div
        className="min-w-[45px] pl-2 text-right"
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
        }}
      >
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-8 w-8 p-0 text-sm font-medium hover:bg-gray-100",
            effectiveComparisonSorting
              ? "bg-gray-100 text-gray-900"
              : "text-primary",
          )}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            handleComparisonSort(e);
          }}
          title={
            effectiveComparisonSorting
              ? `Sorterer efter ændring i ${title.toLowerCase()}`
              : `Klik for at sortere efter ændring i ${title.toLowerCase()}`
          }
        >
          <span className="flex h-full w-full items-center justify-center">
            +/-
          </span>
        </Button>
      </div>
    </div>
  );
};

export const keywordColumns: ColumnDef<Keyword>[] = [
  {
    accessorKey: "title",
    sortingFn: starredSort,
    header: ({ column }) => (
      <TableHeader
        column={column}
        title="Søgeord"
        description="Søgeordet og dets tilknyttede tags"
        align="left"
      />
    ),
    meta: {
      className: "w-[120px] px-4",
    },
  },
  {
    accessorKey: "landing_page",
    sortingFn: alphaSort,
    header: ({ column }) => (
      <TableHeader
        column={column}
        title="Landing page"
        description="Den side som søgeordet rangerer med i søgeresultaterne"
        align="left"
      />
    ),
    accessorFn: (row: Keyword) => row.latest_stats?.[0]?.page || "",
    meta: {
      className: "xl:w-[150px] px-4",
    },
  },
  {
    accessorKey: "position",
    sortingFn: (rowA, rowB, columnId) => {
      const a = rowA.original.date_range_0?.latest_stats?.[0]?.position;
      const b = rowB.original.date_range_0?.latest_stats?.[0]?.position;

      // Always put invalid values at the bottom
      const isInvalidA = isInvalidPosition(a) || a === undefined || a === null;
      const isInvalidB = isInvalidPosition(b) || b === undefined || b === null;

      if (isInvalidA && isInvalidB) return 0;
      if (isInvalidA) return 1;
      if (isInvalidB) return -1;

      const aNum = typeof a === "number" ? a : Number(a);
      const bNum = typeof b === "number" ? b : Number(b);

      // For position, lower is better
      return aNum - bNum;
    },
    header: ({ column }) => {
      const hasComparison = column
        .getFacetedRowModel()
        .rows.some((row) => !!row.original.date_range_1);

      return (
        <SortableColumnHeader
          column={column}
          title="Position"
          description="Den aktuelle position i søgeresultaterne"
          hasComparison={hasComparison}
        />
      );
    },
    cell: ({ row }) => {
      const current = row.original.date_range_0?.latest_stats?.[0]?.position;
      const previous = row.original.date_range_1?.latest_stats?.[0]?.position;
      const hasComparison = !!row.original.date_range_1;

      if (!hasComparison) {
        return (
          <div className="text-right tabular-nums">
            {isInvalidPosition(current) ? "—" : current}
          </div>
        );
      }

      return (
        <div className="flex items-center justify-between gap-8">
          <div className="flex-1 text-right tabular-nums">
            {isInvalidPosition(current) ? "—" : current}
          </div>
          <div className="min-w-[60px] text-right">
            <ComparativeValueCell
              current={current !== null ? Number(current) : undefined}
              previous={previous !== null ? Number(previous) : undefined}
              showDashForNull={hasComparison}
              reverseColors={true}
            />
          </div>
        </div>
      );
    },
    meta: {
      className: "px-6 text-right tabular-nums",
    },
  },
  {
    accessorKey: "clicks",
    sortingFn: (rowA, rowB, columnId) => {
      const a = rowA.original.date_range_0?.overall_stats?.clicks;
      const b = rowB.original.date_range_0?.overall_stats?.clicks;

      // Always put invalid values at the bottom
      const isInvalidA = isInvalidValue(a) || a === undefined || a === null;
      const isInvalidB = isInvalidValue(b) || b === undefined || b === null;

      if (isInvalidA && isInvalidB) return 0;
      if (isInvalidA) return 1;
      if (isInvalidB) return -1;

      // Convert to numbers and ensure proper comparison
      const aNum = typeof a === "number" ? a : Number(a);
      const bNum = typeof b === "number" ? b : Number(b);

      // For clicks, higher is better, so sort in descending order
      return bNum - aNum;
    },
    header: ({ column }) => {
      const hasComparison = column
        .getFacetedRowModel()
        .rows.some((row) => !!row.original.date_range_1);

      return (
        <SortableColumnHeader
          column={column}
          title="Kliks"
          description="Antallet af kliks på søgeresultater"
          hasComparison={hasComparison}
        />
      );
    },
    cell: ({ row }) => {
      const current = row.original.date_range_0?.overall_stats?.clicks ?? null;
      const previous = row.original.date_range_1?.overall_stats?.clicks ?? null;
      const hasComparison = !!row.original.date_range_1;

      if (!hasComparison) {
        return <div className="text-right tabular-nums">{current ?? ""}</div>;
      }

      return (
        <div className="flex items-center justify-between gap-8">
          <div className="flex-1 text-right tabular-nums">{current ?? ""}</div>
          <div className="min-w-[60px] text-right">
            <ComparativeValueCell
              current={current !== null ? Number(current) : undefined}
              previous={previous !== null ? Number(previous) : undefined}
              showDashForNull={hasComparison}
            />
          </div>
        </div>
      );
    },
    meta: {
      className: "px-4 text-right tabular-nums",
    },
  },
  {
    accessorKey: "impressions",
    sortingFn: (rowA, rowB, columnId) => {
      const a = rowA.original.date_range_0?.overall_stats?.impressions;
      const b = rowB.original.date_range_0?.overall_stats?.impressions;

      // Always put invalid values at the bottom
      const isInvalidA = isInvalidValue(a) || a === undefined || a === null;
      const isInvalidB = isInvalidValue(b) || b === undefined || b === null;

      if (isInvalidA && isInvalidB) return 0;
      if (isInvalidA) return 1;
      if (isInvalidB) return -1;

      // Convert to numbers and ensure proper comparison
      const aNum = typeof a === "number" ? a : Number(a);
      const bNum = typeof b === "number" ? b : Number(b);

      // For impressions, higher is better, so sort in descending order
      return bNum - aNum;
    },
    header: ({ column }) => {
      const hasComparison = column
        .getFacetedRowModel()
        .rows.some((row) => !!row.original.date_range_1);

      return (
        <SortableColumnHeader
          column={column}
          title="Eksponeringer"
          description="Antallet af gange søgeresultater blev vist"
          hasComparison={hasComparison}
        />
      );
    },
    cell: ({ row }) => {
      const current =
        row.original.date_range_0?.overall_stats?.impressions ?? null;
      const previous =
        row.original.date_range_1?.overall_stats?.impressions ?? null;
      const hasComparison = !!row.original.date_range_1;

      if (!hasComparison) {
        return <div className="text-right tabular-nums">{current ?? ""}</div>;
      }

      return (
        <div className="flex items-center justify-between gap-8">
          <div className="flex-1 text-right tabular-nums">{current ?? ""}</div>
          <div className="min-w-[60px] text-right">
            <ComparativeValueCell
              current={current !== null ? Number(current) : undefined}
              previous={previous !== null ? Number(previous) : undefined}
              showDashForNull={hasComparison}
            />
          </div>
        </div>
      );
    },
    meta: {
      className: "px-4 text-right tabular-nums",
    },
  },
  /* Kommenteret ud midlertidigt
  {
    accessorKey: 'search_volume',
    sortingFn: (rowA, rowB, columnId) => {
      const a = rowA.original.search_volume?.avg_searches;
      const b = rowB.original.search_volume?.avg_searches;

      // Always put invalid values at the bottom
      const isInvalidA = isInvalidValue(a);
      const isInvalidB = isInvalidValue(b);

      if (isInvalidA && isInvalidB) return 0;
      if (isInvalidA) return 1;
      if (isInvalidB) return -1;

      const aNum = typeof a === 'number' ? a : Number(a);
      const bNum = typeof b === 'number' ? b : Number(b);
      return aNum - bNum;
    },
    header: ({ column }) => (
      <TableHeader
        column={column}
        title="Månedlig søgevolumen"
        description="Det gennemsnitlige antal månedlige søgninger på søgeordet"
        align="right"
      />
    ),
    accessorFn: (row: Keyword) => {
      const volume = row.search_volume?.avg_searches;
      if (volume === null || volume === undefined) return '';
      return Number(volume) || 0;
    },
    meta: {
      className: 'w-[120px] px-4 text-right tabular-nums',
    },
  },
  */
];

export const domainColumns: ColumnDef<DomainWithAnalytics>[] = [
  {
    accessorKey: "display_name",
    sortingFn: alphaSort,
    header: ({ column }) => (
      <TableHeader
        column={column}
        title="Domæne"
        description="Domænet og dets URL"
        align="left"
      />
    ),
    meta: {
      className: "w-[200px] xl:w-[150px] px-4",
    },
  },
  {
    accessorKey: "keywords_count",
    sortingFn: numericSort,
    header: ({ column }) => (
      <TableHeader
        column={column}
        title="Antal søgeord"
        description="Antallet af søgeord tilknyttet domænet"
        align="right"
      />
    ),
    accessorFn: (row: DomainWithAnalytics) => {
      const count = row.keywords_count;
      if (count === null || count === undefined) return "—";
      return Number(count) || 0;
    },
    meta: {
      className: "w-[120px] xl:w-[100px] px-4 text-right tabular-nums",
    },
  },
  {
    accessorKey: "avg_position",
    sortingFn: (rowA, rowB, columnId) => {
      const hasComparisonA = !!rowA.original.date_range_1;
      const hasComparisonB = !!rowB.original.date_range_1;

      // If neither has comparison data, use standard numeric sort
      if (!hasComparisonA && !hasComparisonB) {
        return numericSort(rowA, rowB, columnId);
      }

      // If only one has comparison data, prioritize it
      if (hasComparisonA && !hasComparisonB) return -1;
      if (!hasComparisonA && hasComparisonB) return 1;

      // Normal sort on avg_position
      const a = rowA.original.avg_position;
      const b = rowB.original.avg_position;

      // Handle invalid values
      if (a === undefined || a === null) return 1;
      if (b === undefined || b === null) return -1;
      if (a === undefined || a === null || b === undefined || b === null)
        return 0;

      // For position, lower is better
      return Number(a) - Number(b);
    },
    header: ({ column }) => {
      const hasComparison = column
        .getFacetedRowModel()
        .rows.some((row) => !!row.original.date_range_1);

      return (
        <SortableColumnHeader
          column={column}
          title="Gns. position"
          description="Den gennemsnitlige position for alle søgeord"
          hasComparison={hasComparison}
          onComparisonSort={() => {
            column.toggleSorting(column.getIsSorted() === "asc");
          }}
        />
      );
    },
    accessorFn: (row: DomainWithAnalytics) => {
      const position = row.avg_position;
      if (position === null || position === undefined) return "—";
      return Number(position) || 0;
    },
    meta: {
      className: "w-[120px] sm:w-[100px] px-4 text-right tabular-nums",
    },
  },
  {
    accessorKey: "clicks",
    sortingFn: (rowA, rowB, columnId) => {
      const hasComparisonA = !!rowA.original.date_range_1;
      const hasComparisonB = !!rowB.original.date_range_1;

      // If neither has comparison data, use standard numeric sort
      if (!hasComparisonA && !hasComparisonB) {
        return numericSort(rowA, rowB, columnId);
      }

      // If only one has comparison data, prioritize it
      if (hasComparisonA && !hasComparisonB) return -1;
      if (!hasComparisonA && hasComparisonB) return 1;

      // Normal sort on clicks
      const a = rowA.original.clicks;
      const b = rowB.original.clicks;

      // Handle invalid values
      if (a === undefined || a === null) return 1;
      if (b === undefined || b === null) return -1;
      if (a === undefined || a === null || b === undefined || b === null)
        return 0;

      // For clicks, higher is better, so sort in descending order
      return Number(b) - Number(a);
    },
    header: ({ column }) => {
      const hasComparison = column
        .getFacetedRowModel()
        .rows.some((row) => !!row.original.date_range_1);

      return (
        <SortableColumnHeader
          column={column}
          title="Kliks"
          description="Antallet af kliks på søgeresultater"
          hasComparison={hasComparison}
          onComparisonSort={() => {
            column.toggleSorting(column.getIsSorted() === "asc");
          }}
        />
      );
    },
    accessorFn: (row: DomainWithAnalytics) => {
      const clicks = row.clicks;
      if (clicks === null || clicks === undefined) return "—";
      return Number(clicks) || 0;
    },
    meta: {
      className: "w-[100px] sm:w-[80px] px-4 text-right tabular-nums",
    },
  },
  {
    accessorKey: "impressions",
    sortingFn: (rowA, rowB, columnId) => {
      const hasComparisonA = !!rowA.original.date_range_1;
      const hasComparisonB = !!rowB.original.date_range_1;

      // If neither has comparison data, use standard numeric sort
      if (!hasComparisonA && !hasComparisonB) {
        return numericSort(rowA, rowB, columnId);
      }

      // If only one has comparison data, prioritize it
      if (hasComparisonA && !hasComparisonB) return -1;
      if (!hasComparisonA && hasComparisonB) return 1;

      // Normal sort on impressions
      const a = rowA.original.impressions;
      const b = rowB.original.impressions;

      // Handle invalid values
      if (a === undefined || a === null) return 1;
      if (b === undefined || b === null) return -1;
      if (a === undefined || a === null || b === undefined || b === null)
        return 0;

      // For impressions, higher is better, so sort in descending order
      return Number(b) - Number(a);
    },
    header: ({ column }) => {
      const hasComparison = column
        .getFacetedRowModel()
        .rows.some((row) => !!row.original.date_range_1);

      return (
        <SortableColumnHeader
          column={column}
          title="Eksponeringer"
          description="Antallet af gange søgeresultater blev vist"
          hasComparison={hasComparison}
          onComparisonSort={() => {
            column.toggleSorting(column.getIsSorted() === "asc");
          }}
        />
      );
    },
    accessorFn: (row: DomainWithAnalytics) => {
      const impressions = row.impressions;
      if (impressions === null || impressions === undefined) return "—";
      return Number(impressions) || 0;
    },
    meta: {
      className: "w-[100px] sm:w-[80px] px-4 text-right tabular-nums",
    },
  },
  {
    accessorKey: "top_3_keywords",
    sortingFn: numericSort,
    header: ({ column }) => (
      <TableHeader
        column={column}
        title="Søgeord i top 3"
        description="Antallet af søgeord der rangerer i top 3"
        align="right"
      />
    ),
    accessorFn: (row: DomainWithAnalytics) => {
      const count = row.top_3_keywords;
      if (count === null || count === undefined) return "—";
      return Number(count) || 0;
    },
    meta: {
      className: "w-[120px] sm:w-[100px] px-4 text-right tabular-nums",
    },
  },
];
