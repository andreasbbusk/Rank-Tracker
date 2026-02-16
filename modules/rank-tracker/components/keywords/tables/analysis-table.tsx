"use client";

import { Button } from "@/modules/core/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/modules/core/components/ui/dialog";
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
import { ArrowDown, ArrowUp, ArrowUpDown, Link2, Link2Off } from "lucide-react";
import { useMemo, useState } from "react";

// Sorteringstyper
type SortDirection = "asc" | "desc";
type SortField =
  | "dato"
  | "landing_page"
  | "position"
  | "klik"
  | "eksponeringer"
  | "ctr";

interface DailyStats {
  created_at: string;
  page: string;
  position: number;
  clicks: number;
  impressions: number;
}

interface AnalysisTableProps {
  data: DailyStats[];
  comparisonData?: DailyStats[];
  type: "position" | "performance";
  className?: string;
}

const AnalysisTable = ({
  data,
  comparisonData,
  type,
  className,
}: AnalysisTableProps) => {
  // Tilføj sorteringstilstand - initialize with a default sort
  const [sortField, setSortField] = useState<SortField>(
    type === "position" ? "position" : "klik",
  );
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [comparativeSort, setComparativeSort] = useState(false);

  const formatData = (rawData: DailyStats[]) => {
    if (!rawData) return [];

    return rawData
      .map((item: DailyStats) => ({
        dato: new Date(item.created_at).toLocaleDateString("da-DK"),
        position: Number(item.position?.toFixed(1)) || 0,
        klik: item.clicks || 0,
        eksponeringer: item.impressions || 0,
        ctr:
          item.impressions > 0
            ? ((item.clicks / item.impressions) * 100).toFixed(2)
            : "0.00",
        landing_page: item.page
          ? item.page
              .split(",")
              .map((p) => p.trim())
              .filter(Boolean)
          : ["-"],
        raw_date: new Date(item.created_at), // Tilføj rå dato til brug for sortering
      }))
      .sort(
        (a, b) =>
          new Date(b.raw_date).getTime() - new Date(a.raw_date).getTime(),
      );
  };

  const formatComparisonData = (rawData: DailyStats[]) => {
    if (!rawData) return [];

    return rawData
      .map((item: DailyStats) => ({
        dato: new Date(item.created_at).toLocaleDateString("da-DK"),
        position: Number(item.position?.toFixed(1)) || 0,
        klik: item.clicks || 0,
        eksponeringer: item.impressions || 0,
        ctr:
          item.impressions > 0
            ? ((item.clicks / item.impressions) * 100).toFixed(2)
            : "0.00",
        landing_page: item.page
          ? item.page
              .split(",")
              .map((p) => p.trim())
              .filter(Boolean)
          : ["-"],
        raw_date: new Date(item.created_at), // Tilføj rå dato til brug for sortering
      }))
      .sort(
        (a, b) =>
          new Date(b.raw_date).getTime() - new Date(a.raw_date).getTime(),
      );
  };

  const mainData = formatData(data);
  const comparisonFormattedData = comparisonData
    ? formatComparisonData(comparisonData)
    : [];

  // Sorteringsfunktioner
  const handleSort = (field: SortField) => {
    // Hvis vi klikker på samme felt og har sammenlignende sortering aktiveret, deaktiver sammenlignende sortering
    if (sortField === field && comparativeSort) {
      setComparativeSort(false);
      setSortDirection("asc"); // Begynd med ascending når vi skifter tilbage til normal sortering
      return;
    }

    // Hvis vi klikker på samme felt, skift retning
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      // Nyt felt, start med ascending
      setSortField(field);
      setSortDirection("asc");
      setComparativeSort(false);
    }
  };

  // Toggle sammenlignende sortering
  const toggleComparativeSort = (field: SortField) => {
    // Hvis samme felt og allerede i sammenlignende sortering, toggle sorteringsretning
    if (sortField === field && comparativeSort) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
      return;
    }

    // Start eller skift til sammenlignende sortering for dette felt
    setSortField(field);
    setComparativeSort(true);
    setSortDirection("desc"); // Standard er at vise største positive ændringer først
  };

  // Sortér data baseret på nuværende sorteringstilstand
  const sortedData = useMemo(() => {
    if (!sortField) return mainData;

    return [...mainData].sort((a, b) => {
      // Hvis vi bruger sammenlignende sortering
      if (comparativeSort && comparisonFormattedData.length > 0) {
        const aIndex = mainData.indexOf(a);
        const bIndex = mainData.indexOf(b);

        // Find tilsvarende sammenlignende data
        const compA = comparisonFormattedData[aIndex];
        const compB = comparisonFormattedData[bIndex];

        if (!compA || !compB) {
          // Hvis et af elementerne ikke har sammenligningsdata, sortér det sidst
          if (!compA) return 1;
          if (!compB) return -1;
          return 0;
        }

        // Beregn ændringen
        let aChange, bChange;

        // Konvertér til numre for sammenligning
        const aValue =
          typeof a[sortField] === "string"
            ? parseFloat(a[sortField] as string) || 0
            : (a[sortField] as number) || 0;
        const compAValue =
          typeof compA[sortField] === "string"
            ? parseFloat(compA[sortField] as string) || 0
            : (compA[sortField] as number) || 0;
        const bValue =
          typeof b[sortField] === "string"
            ? parseFloat(b[sortField] as string) || 0
            : (b[sortField] as number) || 0;
        const compBValue =
          typeof compB[sortField] === "string"
            ? parseFloat(compB[sortField] as string) || 0
            : (compB[sortField] as number) || 0;

        // Særlig håndtering af position (lavere er bedre)
        if (sortField === "position") {
          aChange = compAValue - aValue;
          bChange = compBValue - bValue;
        } else {
          // For alle andre felter (højere er bedre)
          aChange = aValue - compAValue;
          bChange = bValue - compBValue;
        }

        // Tjek for uændrede værdier og sortér dem lavest
        const aUnchanged = aChange === 0;
        const bUnchanged = bChange === 0;

        // Hvis en er uændret og en anden ikke er, sortér den uændrede værdi lavere
        if (aUnchanged && !bUnchanged) return 1;
        if (!aUnchanged && bUnchanged) return -1;

        // Ved desc: Sortér positive ændringer først (størst først), derefter negative ændringer (mindst først)
        // Ved asc: Sortér negative ændringer først (størst først), derefter positive ændringer (mindst først)
        const aIsPositive = aChange > 0;
        const bIsPositive = bChange > 0;

        if (sortDirection === "desc") {
          // Ved descending sortering: positive før negative
          if (aIsPositive && !bIsPositive) return -1; // A er positiv, B er negativ, A kommer først
          if (!aIsPositive && bIsPositive) return 1; // B er positiv, A er negativ, B kommer først

          // Hvis begge positive eller begge negative
          if (aIsPositive && bIsPositive) {
            // Begge positive: største værdi først
            return bChange - aChange;
          } else {
            // Begge negative: mindste negative værdi først (nærmere nul)
            return aChange - bChange;
          }
        } else {
          // Ved ascending sortering: negative før positive
          if (!aIsPositive && bIsPositive) return -1; // A er negativ, B er positiv, A kommer først
          if (aIsPositive && !bIsPositive) return 1; // B er negativ, A er positiv, B kommer først

          // Hvis begge positive eller begge negative
          if (aIsPositive && bIsPositive) {
            // Begge positive: mindste værdi først
            return aChange - bChange;
          } else {
            // Begge negative: største negative værdi først (længst fra nul)
            return bChange - aChange;
          }
        }
      }

      // Normal sortering
      const valA = a[sortField];
      const valB = b[sortField];

      // Håndtér strenge og numre forskelligt
      if (typeof valA === "string" && typeof valB === "string") {
        const comparison = valA.localeCompare(valB, "da");
        return sortDirection === "asc" ? comparison : -comparison;
      } else {
        // Nummerisk sammenligning
        const aNum = typeof valA === "number" ? valA : Number(valA) || 0;
        const bNum = typeof valB === "number" ? valB : Number(valB) || 0;

        // For position, lavere er bedre
        if (sortField === "position") {
          return sortDirection === "asc" ? aNum - bNum : bNum - aNum;
        }

        // For andre numeriske felter, højere er bedre
        return sortDirection === "asc" ? bNum - aNum : aNum - bNum;
      }
    });
  }, [
    mainData,
    sortField,
    sortDirection,
    comparativeSort,
    comparisonFormattedData,
  ]);

  // Sorteringsindikator komponent
  const SortIndicator = ({
    field,
    label,
    hasComparison = false,
    align = "left",
  }: {
    field: SortField;
    label: string;
    hasComparison?: boolean;
    align?: "left" | "right";
  }) => {
    const isActive = sortField === field;
    const isComparativeActive = isActive && comparativeSort;

    return (
      <div
        className={cn(
          "flex items-center",
          align === "right" ? "justify-between" : "justify-start",
        )}
      >
        <div
          className={cn(
            "flex cursor-pointer items-center gap-1",
            align === "right" ? "ml-auto" : "",
            isActive && !isComparativeActive ? "font-medium" : "",
          )}
          onClick={() => handleSort(field)}
        >
          <span>{label}</span>
          {isActive && !isComparativeActive && (
            <ArrowUpDown className="ml-1 h-4 w-4 text-primary" />
          )}
        </div>

        {hasComparison && (
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "ml-20 h-6 w-6 p-0",
              isComparativeActive ? "bg-gray-100" : "",
            )}
            onClick={() => toggleComparativeSort(field)}
            title={
              isComparativeActive
                ? `Sorterer efter ændring i ${label.toLowerCase()}`
                : `Klik for at sortere efter ændring i ${label.toLowerCase()}`
            }
          >
            <span
              className={cn(
                "text-xs font-medium",
                isComparativeActive ? "text-gray-900" : "text-primary",
              )}
            >
              +/-
            </span>
          </Button>
        )}
      </div>
    );
  };

  const getLastUrlSegments = (url: string) => {
    if (url === "-") return "-";
    try {
      const segments = url.split("/").filter(Boolean);
      const lastSegments = segments.slice(-2);
      return lastSegments.join("/");
    } catch (e) {
      return url;
    }
  };

  // Komparativ værdi-komponent
  const ComparativeValueCell = ({
    current,
    previous,
    reverseColors = false,
    showDashForNull = true,
    isCTR = false,
  }: {
    current: number | string | null | undefined;
    previous: number | string | null | undefined;
    reverseColors?: boolean;
    showDashForNull?: boolean;
    isCTR?: boolean;
  }) => {
    // Hvis der ikke er en aktuel værdi, vis intet eller en streg baseret på showDashForNull
    if (current === null || current === undefined)
      return <span>{showDashForNull ? "—" : ""}</span>;

    // Formatér værdien baseret på type
    const formatValue = (val: number | string): string => {
      if (isCTR && typeof val === "number") {
        return `${Math.round(val)}%`;
      } else if (typeof val === "number") {
        return val.toLocaleString("da-DK");
      }
      return val.toString();
    };

    // Særlig håndtering for positionsværdier >= 100
    if (reverseColors && typeof current === "number" && current >= 100) {
      return (
        <span className="text-gray-500">
          Ikke i top 100
          {previous !== undefined &&
            previous !== null &&
            typeof previous === "number" &&
            previous < 100 && (
              <span className="ml-1 flex items-center gap-1 text-xs text-red-500">
                <ArrowDown className="h-3 w-3" />
                Ud af top 100
              </span>
            )}
        </span>
      );
    }

    // Konvertér til numre for sammenligning
    const currentNum =
      typeof current === "string" ? parseFloat(current) : current;
    const previousNum =
      typeof previous === "string" ? parseFloat(previous) : previous;

    // Beregn ændringen
    const change =
      previousNum !== undefined && previousNum !== null
        ? currentNum - previousNum
        : undefined;
    const displayChange =
      reverseColors && change !== undefined ? -change : change;

    // Funktion til at generere ændringsdisplay
    if (
      displayChange === undefined ||
      (displayChange === 0 && previousNum === undefined)
    )
      return <span className="text-gray-500">—</span>;

    if (displayChange === 0) return <span className="text-gray-500">—</span>;

    const isPositive = reverseColors ? displayChange < 0 : displayChange > 0;
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
        <span className="tabular-nums">{formatValue(absChange)}</span>
      </span>
    );
  };

  // Komponent til at vise komparative værdier i to kolonner
  const SubColumnsCell = ({
    mainValue,
    compareValue,
  }: {
    mainValue: React.ReactNode;
    compareValue?: React.ReactNode;
  }) => {
    return (
      <div className="flex items-center justify-between gap-6">
        <div className="w-[45%] text-right tabular-nums">
          {typeof mainValue === "number"
            ? mainValue.toLocaleString("da-DK")
            : mainValue}
        </div>
        <div className="w-[55%] min-w-[45px]">
          {compareValue || <span className="text-gray-400">—</span>}
        </div>
      </div>
    );
  };

  const renderLandingPageCell = (pages: string[]) => {
    const mainPage = pages[0] || "-";

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
                    href={mainPage === "-" ? "#" : mainPage}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block truncate text-primary hover:underline"
                    onClick={(e) => mainPage === "-" && e.preventDefault()}
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
                    <Link2 className="h-4 shrink-0 text-gray-400 hover:text-primary" />
                    <span className="absolute -left-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-gray-200 text-[10px] font-medium text-gray-700">
                      {pages.length - 1}
                    </span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent
                  side="left"
                  align="center"
                  className="max-w-[400px] rounded-md border border-gray-300 bg-white p-2 text-black"
                >
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium">
                      Landingssider ({pages.length})
                    </p>
                    <ul className="list-inside list-disc space-y-1">
                      {pages.map((page: string, index: number) => (
                        <li key={index} className="text-xs text-gray-500">
                          <a
                            href={page}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline"
                          >
                            {page}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Landingssider</DialogTitle>
              <DialogDescription>
                Oversigt over alle landingssider for denne position.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 py-4">
              {pages.map((page: string, index: number) => (
                <div
                  key={index}
                  className="flex items-center justify-between gap-4 rounded-lg border p-2"
                >
                  <div className="flex items-center gap-2">
                    <Link2 className="h-4 shrink-0 text-gray-400" />
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
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>
        <div
          className="max-w-[250px] overflow-hidden text-right"
          style={{ direction: "rtl" }}
        >
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <a
                  href={mainPage}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block truncate text-primary hover:underline"
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
  };

  // Tjek om der er sammenligningsdata
  const hasComparisonData = comparisonFormattedData.length > 0;

  if (type === "position") {
    return (
      <div className={cn("rounded-xl border bg-white shadow-sm", className)}>
        <Table className="overflow-hidden rounded-t-xl">
          <TableHeader className="bg-gray-50/80">
            <TableRow className="hover:bg-gray-50/80">
              <TableHead className="w-[120px] border-r border-gray-200 px-4 py-3 text-left text-primary">
                <SortIndicator field="dato" label="Dato" align="left" />
              </TableHead>
              <TableHead className="w-[300px] border-r border-gray-200 px-4 py-3 text-left text-primary">
                <SortIndicator
                  field="landing_page"
                  label="Landing page"
                  align="left"
                />
              </TableHead>
              <TableHead className="w-[130px] border-r border-gray-200 px-4 py-3 text-right text-primary">
                <SortIndicator
                  field="position"
                  label="Position"
                  hasComparison={hasComparisonData}
                  align="right"
                />
              </TableHead>
              <TableHead className="w-[130px] border-r border-gray-200 px-4 py-3 text-right text-primary">
                <SortIndicator
                  field="klik"
                  label="Kliks"
                  hasComparison={hasComparisonData}
                  align="right"
                />
              </TableHead>
              <TableHead className="w-[150px] border-r border-gray-200 px-4 py-3 text-right text-primary">
                <SortIndicator
                  field="eksponeringer"
                  label="Eksponeringer"
                  hasComparison={hasComparisonData}
                  align="right"
                />
              </TableHead>
              <TableHead className="w-[130px] px-4 py-3 text-right text-primary">
                <SortIndicator
                  field="ctr"
                  label="CTR (%)"
                  hasComparison={hasComparisonData}
                  align="right"
                />
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedData.map((row, index) => {
              const comparisonRow = comparisonFormattedData[index];
              return (
                <TableRow
                  key={index}
                  className="group cursor-pointer hover:bg-gray-50/80"
                >
                  <TableCell className="border-r border-gray-100 px-4 py-3 text-left text-primary">
                    {row.dato}
                  </TableCell>
                  <TableCell className="max-w-[300px] truncate border-r border-gray-100 px-4 py-3 text-left text-primary">
                    {renderLandingPageCell(row.landing_page)}
                  </TableCell>
                  <TableCell className="border-r border-gray-100 px-4 py-3 text-right">
                    {hasComparisonData ? (
                      <SubColumnsCell
                        mainValue={row.position}
                        compareValue={
                          <ComparativeValueCell
                            current={row.position}
                            previous={comparisonRow?.position}
                            reverseColors={true}
                          />
                        }
                      />
                    ) : (
                      <div className="text-right tabular-nums">
                        {row.position}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="border-r border-gray-100 px-4 py-3 text-right">
                    {hasComparisonData ? (
                      <SubColumnsCell
                        mainValue={row.klik}
                        compareValue={
                          <ComparativeValueCell
                            current={row.klik}
                            previous={comparisonRow?.klik}
                          />
                        }
                      />
                    ) : (
                      <div className="text-right tabular-nums">{row.klik}</div>
                    )}
                  </TableCell>
                  <TableCell className="border-r border-gray-100 px-4 py-3 text-right">
                    {hasComparisonData ? (
                      <SubColumnsCell
                        mainValue={row.eksponeringer}
                        compareValue={
                          <ComparativeValueCell
                            current={row.eksponeringer}
                            previous={comparisonRow?.eksponeringer}
                          />
                        }
                      />
                    ) : (
                      <div className="text-right tabular-nums">
                        {row.eksponeringer}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-right">
                    {hasComparisonData ? (
                      <SubColumnsCell
                        mainValue={`${Math.round(parseFloat(row.ctr))}%`}
                        compareValue={
                          <ComparativeValueCell
                            current={parseFloat(row.ctr)}
                            previous={
                              comparisonRow
                                ? parseFloat(comparisonRow.ctr)
                                : undefined
                            }
                            isCTR={true}
                          />
                        }
                      />
                    ) : (
                      <div className="text-right tabular-nums">{`${Math.round(parseFloat(row.ctr))}%`}</div>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    );
  }

  return (
    <div className={cn("rounded-xl border bg-white shadow-sm", className)}>
      <Table className="overflow-hidden rounded-t-xl">
        <TableHeader className="bg-gray-50/80">
          <TableRow className="hover:bg-gray-50/80">
            <TableHead className="w-[120px] border-r border-gray-200 px-4 py-3 text-left text-primary">
              <SortIndicator field="dato" label="Dato" align="left" />
            </TableHead>
            <TableHead className="w-[300px] border-r border-gray-200 px-4 py-3 text-left text-primary">
              <SortIndicator
                field="landing_page"
                label="Landing page"
                align="left"
              />
            </TableHead>
            <TableHead className="w-[130px] border-r border-gray-200 px-4 py-3 text-right text-primary">
              <SortIndicator
                field="klik"
                label="Kliks"
                hasComparison={hasComparisonData}
                align="right"
              />
            </TableHead>
            <TableHead className="w-[150px] border-r border-gray-200 px-4 py-3 text-right text-primary">
              <SortIndicator
                field="eksponeringer"
                label="Eksponeringer"
                hasComparison={hasComparisonData}
                align="right"
              />
            </TableHead>
            <TableHead className="w-[130px] border-r border-gray-200 px-4 py-3 text-right text-primary">
              <SortIndicator
                field="ctr"
                label="CTR (%)"
                hasComparison={hasComparisonData}
                align="right"
              />
            </TableHead>
            <TableHead className="w-[130px] px-4 py-3 text-right text-primary">
              <SortIndicator
                field="position"
                label="Position"
                hasComparison={hasComparisonData}
                align="right"
              />
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedData.map((row, index) => {
            const comparisonRow = comparisonFormattedData[index];
            return (
              <TableRow
                key={index}
                className="group cursor-pointer hover:bg-gray-50/80"
              >
                <TableCell className="border-r border-gray-100 px-4 py-3 text-left text-primary">
                  {row.dato}
                </TableCell>
                <TableCell className="max-w-[300px] truncate border-r border-gray-100 px-4 py-3 text-left text-primary">
                  {renderLandingPageCell(row.landing_page)}
                </TableCell>
                <TableCell className="border-r border-gray-100 px-4 py-3 text-right">
                  {hasComparisonData ? (
                    <SubColumnsCell
                      mainValue={row.klik}
                      compareValue={
                        <ComparativeValueCell
                          current={row.klik}
                          previous={comparisonRow?.klik}
                        />
                      }
                    />
                  ) : (
                    <div className="text-right tabular-nums">{row.klik}</div>
                  )}
                </TableCell>
                <TableCell className="border-r border-gray-100 px-4 py-3 text-right">
                  {hasComparisonData ? (
                    <SubColumnsCell
                      mainValue={row.eksponeringer}
                      compareValue={
                        <ComparativeValueCell
                          current={row.eksponeringer}
                          previous={comparisonRow?.eksponeringer}
                        />
                      }
                    />
                  ) : (
                    <div className="text-right tabular-nums">
                      {row.eksponeringer}
                    </div>
                  )}
                </TableCell>
                <TableCell className="border-r border-gray-100 px-4 py-3 text-right">
                  {hasComparisonData ? (
                    <SubColumnsCell
                      mainValue={`${Math.round(parseFloat(row.ctr))}%`}
                      compareValue={
                        <ComparativeValueCell
                          current={parseFloat(row.ctr)}
                          previous={
                            comparisonRow
                              ? parseFloat(comparisonRow.ctr)
                              : undefined
                          }
                          isCTR={true}
                        />
                      }
                    />
                  ) : (
                    <div className="text-right tabular-nums">{`${Math.round(parseFloat(row.ctr))}%`}</div>
                  )}
                </TableCell>
                <TableCell className="px-4 py-3 text-right">
                  {hasComparisonData ? (
                    <SubColumnsCell
                      mainValue={row.position}
                      compareValue={
                        <ComparativeValueCell
                          current={row.position}
                          previous={comparisonRow?.position}
                          reverseColors={true}
                        />
                      }
                    />
                  ) : (
                    <div className="text-right tabular-nums">
                      {row.position}
                    </div>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};

export default AnalysisTable;
