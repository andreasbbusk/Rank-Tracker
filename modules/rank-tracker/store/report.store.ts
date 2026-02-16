import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { KeywordReport } from "../types";

interface ReportStore {
  reports: KeywordReport[];
  isLoading: boolean;
  addReport: (report: KeywordReport) => void;
  updateReport: (report: KeywordReport) => void;
  deleteReport: (reportId: string) => void;
  getReport: (reportId: string) => KeywordReport | undefined;
  getReportsByDomain: (domainId: string) => KeywordReport[];
  setLoading: (loading: boolean) => void;
  clearReports: () => void;
}

export const useReportStore = create<ReportStore>()(
  persist(
    (set, get) => ({
      reports: [],
      isLoading: false,
      addReport: (report) =>
        set((state) => ({
          reports: [report, ...state.reports],
        })),
      updateReport: (updatedReport) =>
        set((state) => ({
          reports: state.reports.map((report) =>
            report.id === updatedReport.id ? updatedReport : report,
          ),
        })),
      deleteReport: (reportId) =>
        set((state) => ({
          reports: state.reports.filter((report) => report.id !== reportId),
        })),
      getReport: (reportId) => {
        return get().reports.find((report) => report.id === reportId);
      },
      getReportsByDomain: (domainId) => {
        return get().reports.filter((report) => report.domain.id === domainId);
      },
      setLoading: (loading) => set({ isLoading: loading }),
      clearReports: () => set({ reports: [] }),
    }),
    {
      name: "rank-tracker-reports",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ reports: state.reports }),
    },
  ),
);
