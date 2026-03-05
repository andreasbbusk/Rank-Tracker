"use client";

import { useState, useEffect, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/modules/core/components/ui/dialog";
import { Button } from "@/modules/core/components/ui/button";
import { Badge } from "@/modules/core/components/ui/badge";
import { Input } from "@/modules/core/components/ui/input";
import { Separator } from "@/modules/core/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/modules/core/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/modules/core/components/ui/select";
import {
  Plus,
  Search,
  FileText,
  Calendar,
  MoreVertical,
  Copy,
  Trash2,
  ExternalLink,
  Filter,
  Loader2,
  Share,
} from "lucide-react";
import { toast } from "sonner";
import { useReports } from "../hooks/useReports";
import { useReportStore } from "../store/report.store";
import { deleteKeywordReport } from "../actions/report.actions";
import { CreateReportModal } from "./create-report-modal";
import { DomainWithAnalytics, KeywordReport } from "../types";
import {
  formatReportDate,
  getReportAge,
  sortReportsByDate,
} from "../utils/report-utils";
import { REPORT_STATUSES, REPORT_TYPES } from "../constants/reports.constants";
import { toEmbedAwarePath } from "../utils/embed-path";

interface ReportsModalProps {
  isOpen: boolean;
  onClose: () => void;
  domains?: DomainWithAnalytics[];
  selectedDomainId?: string;
}

type FilterType =
  | "all"
  | "ready"
  | "generating"
  | "error"
  | "one-time"
  | "recurring";

export const ReportsModal = ({
  isOpen,
  onClose,
  domains = [],
  selectedDomainId,
}: ReportsModalProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const {
    reports,
    isLoading,
    statistics,
    duplicateReport,
    getReportsByDomain,
    getSortedReports,
    getReportsByStatus,
    getReportsByType,
  } = useReports();

  const { deleteReport: deleteReportFromStore } = useReportStore();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [selectedDomainFilter, setSelectedDomainFilter] =
    useState<string>("all");
  const [isDuplicating, setIsDuplicating] = useState<string | null>(null);
  const [isGeneratingLink, setIsGeneratingLink] = useState<string | null>(null);
  const [optimisticallyDeleted, setOptimisticallyDeleted] = useState<
    Set<string>
  >(new Set());

  // Filter and sort reports
  const filteredReports = useMemo(() => {
    let filtered = reports;

    // Filter out optimistically deleted reports
    filtered = filtered.filter(
      (report) => !optimisticallyDeleted.has(report.id),
    );

    // Apply domain filter
    if (selectedDomainFilter !== "all") {
      filtered = getReportsByDomain(selectedDomainFilter).filter(
        (report) => !optimisticallyDeleted.has(report.id),
      );
    }

    // Apply status/type filter
    if (filterType !== "all") {
      if (["ready", "generating", "error"].includes(filterType)) {
        filtered = getReportsByStatus(
          filterType as KeywordReport["status"],
        ).filter((report) => !optimisticallyDeleted.has(report.id));
      } else if (["one-time", "recurring"].includes(filterType)) {
        filtered = getReportsByType(filterType as KeywordReport["type"]).filter(
          (report) => !optimisticallyDeleted.has(report.id),
        );
      }
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (report) =>
          report.name.toLowerCase().includes(query) ||
          report.domain.display_name.toLowerCase().includes(query),
      );
    }

    return sortReportsByDate(filtered);
  }, [
    reports,
    optimisticallyDeleted,
    selectedDomainFilter,
    filterType,
    searchQuery,
    getReportsByDomain,
    getReportsByStatus,
    getReportsByType,
  ]);

  // Set initial domain filter if specified
  useEffect(() => {
    if (selectedDomainId && selectedDomainId !== selectedDomainFilter) {
      setSelectedDomainFilter(selectedDomainId);
    }
  }, [selectedDomainId, selectedDomainFilter]);

  const handleCreateReport = () => {
    setIsCreateModalOpen(true);
  };

  const handleViewReport = (reportId: string) => {
    router.push(toEmbedAwarePath(pathname, `/report/${reportId}`));
    onClose();
  };

  const handleDuplicateReport = async (reportId: string) => {
    setIsDuplicating(reportId);
    try {
      const duplicatedReport = await duplicateReport(reportId);
      if (duplicatedReport) {
        toast.success("Rapport dupliceret", {
          description: `"${duplicatedReport.name}" er oprettet`,
        });
      } else {
        toast.error("Fejl ved duplicering af rapport");
      }
    } catch (error) {
      console.error("Error duplicating report:", error);
      toast.error("Fejl ved duplicering af rapport");
    } finally {
      setIsDuplicating(null);
    }
  };

  const handleDeleteReport = async (reportId: string, reportName: string) => {
    if (
      !confirm(`Er du sikker på at du vil slette rapporten "${reportName}"?`)
    ) {
      return;
    }

    // Optimistically remove from UI
    setOptimisticallyDeleted((prev) => new Set([...prev, reportId]));

    // Show immediate success feedback
    toast.success("Rapport slettet", {
      description: `"${reportName}" er blevet slettet`,
    });

    try {
      const success = await deleteKeywordReport(reportId);
      if (success) {
        // Remove from store after successful API call
        deleteReportFromStore(reportId);
      } else {
        // Revert optimistic update on failure
        setOptimisticallyDeleted((prev) => {
          const newSet = new Set(prev);
          newSet.delete(reportId);
          return newSet;
        });
        toast.error("Fejl ved sletning af rapport");
      }
    } catch (error) {
      console.error("Error deleting report:", error);
      // Revert optimistic update on error
      setOptimisticallyDeleted((prev) => {
        const newSet = new Set(prev);
        newSet.delete(reportId);
        return newSet;
      });
      toast.error("Fejl ved sletning af rapport");
    }
  };

  const handleGenerateShareableLink = async (
    reportId: string,
    reportName: string,
  ) => {
    setIsGeneratingLink(reportId);
    try {
      // Generate shareable link - this would typically call an API endpoint
      // For now, we'll create a public link structure
      const shareableUrl = `${window.location.origin}/shared/report/${reportId}`;

      // Copy to clipboard
      await navigator.clipboard.writeText(shareableUrl);

      toast.success("Delbart link kopieret", {
        description:
          "Linket er kopieret til udklipsholderen og kan deles uden login",
      });
    } catch (error) {
      console.error("Error generating shareable link:", error);
      toast.error("Fejl ved oprettelse af delbart link");
    } finally {
      setIsGeneratingLink(null);
    }
  };

  const getStatusConfig = (status: KeywordReport["status"]) => {
    return (
      REPORT_STATUSES.find((s) => s.value === status) || REPORT_STATUSES[0]
    );
  };

  const getTypeConfig = (type: KeywordReport["type"]) => {
    return REPORT_TYPES.find((t) => t.value === type) || REPORT_TYPES[0];
  };

  const handleClose = () => {
    if (isDuplicating || isGeneratingLink) return;
    setSearchQuery("");
    setFilterType("all");
    setSelectedDomainFilter(selectedDomainId || "all");
    setOptimisticallyDeleted(new Set());
    onClose();
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="flex max-h-[90vh] max-w-4xl flex-col overflow-hidden">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="text-xl font-semibold">
              Rapporter
            </DialogTitle>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <span>Total: {statistics.total}</span>
              {statistics.error > 0 && (
                <span className="text-red-600">Fejl: {statistics.error}</span>
              )}
            </div>
          </DialogHeader>

          <Separator />

          {/* Filters */}
          <div className="flex flex-shrink-0 items-center gap-4 pb-4">
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-muted-foreground" />
              <Input
                placeholder="Søg rapporter..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {domains.length > 0 && (
              <Select
                value={selectedDomainFilter}
                onValueChange={setSelectedDomainFilter}
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Vælg domæne" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle domæner</SelectItem>
                  {domains.map((domain) => (
                    <SelectItem key={domain.id} value={domain.id || ""}>
                      {domain.display_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button onClick={handleCreateReport} className="gap-2">
              <Plus className="h-4 w-4" />
              Opret rapport
            </Button>
          </div>

          {/* Reports List */}
          <div className="no-scrollbar flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : filteredReports.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <FileText className="mx-auto mb-4 h-12 w-12 opacity-50" />
                <h3 className="mb-2 text-lg font-medium">
                  {searchQuery ||
                  filterType !== "all" ||
                  selectedDomainFilter !== "all"
                    ? "Ingen rapporter fundet"
                    : "Ingen rapporter endnu"}
                </h3>
                <p className="mb-4 text-sm">
                  {searchQuery ||
                  filterType !== "all" ||
                  selectedDomainFilter !== "all"
                    ? "Prøv at justere dine søgekriterier"
                    : "Opret din første rapport for at komme i gang"}
                </p>
                {!searchQuery &&
                  filterType === "all" &&
                  selectedDomainFilter === "all" && (
                    <Button
                      onClick={handleCreateReport}
                      variant="outline"
                      className="gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Opret rapport
                    </Button>
                  )}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredReports.map((report) => {
                  const statusConfig = getStatusConfig(report.status);
                  const typeConfig = getTypeConfig(report.type);

                  return (
                    <div
                      key={report.id}
                      className="rounded-lg border p-4 transition-colors hover:bg-muted/50"
                    >
                      <div className="flex items-start justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="mb-2 flex items-center gap-3">
                            <h3
                              className="cursor-pointer truncate font-medium hover:text-primary"
                              onClick={() => handleViewReport(report.id)}
                            >
                              {report.name}
                            </h3>
                            <Badge variant="outline" className="text-xs">
                              {typeConfig.label}
                            </Badge>
                          </div>

                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>{report.domain.display_name}</span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {getReportAge(report.createdAt)}
                            </span>
                          </div>
                        </div>

                        <div className="ml-4 flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewReport(report.id)}
                            className="gap-2"
                          >
                            <ExternalLink className="h-4 w-4" />
                            Se rapport
                          </Button>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                disabled={
                                  isDuplicating === report.id ||
                                  isGeneratingLink === report.id
                                }
                              >
                                {isDuplicating === report.id ||
                                isGeneratingLink === report.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <MoreVertical className="h-4 w-4" />
                                )}
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => handleViewReport(report.id)}
                              >
                                <ExternalLink className="mr-2 h-4 w-4" />
                                Åbn rapport
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDuplicateReport(report.id)}
                                disabled={isDuplicating === report.id}
                              >
                                <Copy className="mr-2 h-4 w-4" />
                                Dupliker rapport
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  handleGenerateShareableLink(
                                    report.id,
                                    report.name,
                                  )
                                }
                                disabled={isGeneratingLink === report.id}
                              >
                                <Share className="mr-2 h-4 w-4" />
                                Kopier delbart link
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() =>
                                  handleDeleteReport(report.id, report.name)
                                }
                                className="text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Slet
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <CreateReportModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        domains={domains}
      />
    </>
  );
};
