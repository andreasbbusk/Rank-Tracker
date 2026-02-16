import { useCallback, useEffect, useMemo } from "react";
import { useReportStore } from "../store/report.store";
import {
  createKeywordReport,
  updateKeywordReport,
  deleteKeywordReport,
  duplicateKeywordReport,
} from "../actions/report.actions";
import {
  sortReportsByDate,
  filterReportsByStatus,
  filterReportsByType,
  getReportsStatistics,
  getLatestReportForDomain,
  generateUniqueReportName,
} from "../utils/report-utils";
import {
  KeywordReport,
  CreateReportPayload,
  DomainWithAnalytics,
} from "../types";
import { DEFAULT_REPORT_SETTINGS } from "../constants/reports.constants";

interface UseReportsResult {
  // State
  reports: KeywordReport[];
  isLoading: boolean;

  // Statistics
  statistics: ReturnType<typeof getReportsStatistics>;

  // Actions
  createReport: (
    payload: CreateReportPayload,
    domain: DomainWithAnalytics,
  ) => Promise<KeywordReport | null>;
  updateReport: (report: KeywordReport) => Promise<KeywordReport | null>;
  deleteReport: (reportId: string) => Promise<boolean>;
  duplicateReport: (
    reportId: string,
    newName?: string,
  ) => Promise<KeywordReport | null>;

  // Getters
  getReport: (reportId: string) => KeywordReport | undefined;
  getReportsByDomain: (domainId: string) => KeywordReport[];
  getLatestReport: (domainId: string) => KeywordReport | null;

  // Filters
  getReportsByStatus: (status: KeywordReport["status"]) => KeywordReport[];
  getReportsByType: (type: KeywordReport["type"]) => KeywordReport[];
  getSortedReports: () => KeywordReport[];

  // Utilities
  generateUniqueName: (baseName: string, domainId?: string) => string;
  canCreateMoreReports: (domainId: string) => boolean;

  // Cleanup
  clearAllReports: () => void;
  cleanupOldReports: () => void;
}

export const useReports = (): UseReportsResult => {
  const {
    reports,
    isLoading,
    addReport,
    updateReport: updateReportInStore,
    deleteReport: deleteReportFromStore,
    getReport: getReportFromStore,
    getReportsByDomain: getReportsByDomainFromStore,
    setLoading,
    clearReports,
  } = useReportStore();

  // Statistics
  const statistics = useMemo(() => getReportsStatistics(reports), [reports]);

  // Create a new report
  const createReport = useCallback(
    async (
      payload: CreateReportPayload,
      domain: DomainWithAnalytics,
    ): Promise<KeywordReport | null> => {
      try {
        setLoading(true);

        // Check if we can create more reports for this domain
        const domainReports = getReportsByDomainFromStore(domain.id || "");
        if (
          domainReports.length >= DEFAULT_REPORT_SETTINGS.MAX_REPORTS_PER_DOMAIN
        ) {
          console.warn("Maximum number of reports reached for this domain");
          return null;
        }

        // Generate unique name if needed
        const uniqueName = generateUniqueName(payload.name, domain.id);
        const payloadWithUniqueName = { ...payload, name: uniqueName };

        const newReport = await createKeywordReport(
          payloadWithUniqueName,
          domain,
        );
        addReport(newReport);
        return newReport;
      } catch (error) {
        console.error("Error creating report:", error);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [addReport, setLoading, getReportsByDomainFromStore],
  );

  // Update an existing report
  const updateReport = useCallback(
    async (report: KeywordReport): Promise<KeywordReport | null> => {
      try {
        setLoading(true);
        const updatedReport = await updateKeywordReport(report);
        updateReportInStore(updatedReport);
        return updatedReport;
      } catch (error) {
        console.error("Error updating report:", error);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [updateReportInStore, setLoading],
  );

  // Delete a report
  const deleteReport = useCallback(
    async (reportId: string): Promise<boolean> => {
      try {
        setLoading(true);
        const success = await deleteKeywordReport(reportId);
        if (success) {
          deleteReportFromStore(reportId);
        }
        return success;
      } catch (error) {
        console.error("Error deleting report:", error);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [deleteReportFromStore, setLoading],
  );

  // Duplicate a report
  const duplicateReport = useCallback(
    async (
      reportId: string,
      newName?: string,
    ): Promise<KeywordReport | null> => {
      try {
        const originalReport = getReportFromStore(reportId);
        if (!originalReport) {
          console.error("Report not found for duplication:", reportId);
          return null;
        }

        setLoading(true);

        // Generate unique name for the duplicate
        const baseName = newName || `${originalReport.name} (Kopi)`;
        const uniqueName = generateUniqueName(
          baseName,
          originalReport.domain.id,
        );

        const duplicatedReport = await duplicateKeywordReport(
          originalReport,
          uniqueName,
        );
        addReport(duplicatedReport);
        return duplicatedReport;
      } catch (error) {
        console.error("Error duplicating report:", error);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [getReportFromStore, addReport, setLoading],
  );

  // Get report by ID
  const getReport = useCallback(
    (reportId: string) => getReportFromStore(reportId),
    [getReportFromStore],
  );

  // Get reports by domain
  const getReportsByDomain = useCallback(
    (domainId: string) => getReportsByDomainFromStore(domainId),
    [getReportsByDomainFromStore],
  );

  // Get latest report for domain
  const getLatestReport = useCallback(
    (domainId: string) => getLatestReportForDomain(reports, domainId),
    [reports],
  );

  // Filter reports by status
  const getReportsByStatus = useCallback(
    (status: KeywordReport["status"]) => filterReportsByStatus(reports, status),
    [reports],
  );

  // Filter reports by type
  const getReportsByType = useCallback(
    (type: KeywordReport["type"]) => filterReportsByType(reports, type),
    [reports],
  );

  // Get sorted reports (newest first)
  const getSortedReports = useCallback(
    () => sortReportsByDate(reports),
    [reports],
  );

  // Generate unique report name
  const generateUniqueName = useCallback(
    (baseName: string, domainId?: string) => {
      const relevantReports = domainId
        ? getReportsByDomainFromStore(domainId)
        : reports;
      return generateUniqueReportName(relevantReports, baseName);
    },
    [reports, getReportsByDomainFromStore],
  );

  // Check if more reports can be created for a domain
  const canCreateMoreReports = useCallback(
    (domainId: string) => {
      const domainReports = getReportsByDomainFromStore(domainId);
      return (
        domainReports.length < DEFAULT_REPORT_SETTINGS.MAX_REPORTS_PER_DOMAIN
      );
    },
    [getReportsByDomainFromStore],
  );

  // Clear all reports
  const clearAllReports = useCallback(() => {
    clearReports();
  }, [clearReports]);

  // Clean up old reports (older than AUTO_CLEANUP_DAYS)
  const cleanupOldReports = useCallback(() => {
    const cutoffDate = new Date();
    cutoffDate.setDate(
      cutoffDate.getDate() - DEFAULT_REPORT_SETTINGS.AUTO_CLEANUP_DAYS,
    );

    const reportsToKeep = reports.filter((report) => {
      const reportDate = new Date(report.createdAt);
      return reportDate >= cutoffDate;
    });

    // This would need to be implemented in the store if we want to batch update
    console.log(
      `Would clean up ${reports.length - reportsToKeep.length} old reports`,
    );
  }, [reports]);

  // Auto-cleanup on mount (optional)
  useEffect(() => {
    // Uncomment if you want automatic cleanup on component mount
    // cleanupOldReports();
  }, []);

  return {
    // State
    reports,
    isLoading,

    // Statistics
    statistics,

    // Actions
    createReport,
    updateReport,
    deleteReport,
    duplicateReport,

    // Getters
    getReport,
    getReportsByDomain,
    getLatestReport,

    // Filters
    getReportsByStatus,
    getReportsByType,
    getSortedReports,

    // Utilities
    generateUniqueName,
    canCreateMoreReports,

    // Cleanup
    clearAllReports,
    cleanupOldReports,
  };
};
