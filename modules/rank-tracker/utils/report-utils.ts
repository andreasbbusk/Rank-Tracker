import { KeywordReport } from "../types";

// Generate a new UUID for reports
export const generateReportId = (): string => {
  return crypto.randomUUID();
};

// Validate if a string is a valid UUID
export const isValidUUID = (uuid: string): boolean => {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

// Format report creation date for display
export const formatReportDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString("da-DK", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// Sort reports by creation date (newest first)
export const sortReportsByDate = (
  reports: KeywordReport[],
): KeywordReport[] => {
  return [...reports].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
};

// Filter reports by status
export const filterReportsByStatus = (
  reports: KeywordReport[],
  status: KeywordReport["status"],
): KeywordReport[] => {
  return reports.filter((report) => report.status === status);
};

// Filter reports by type
export const filterReportsByType = (
  reports: KeywordReport[],
  type: KeywordReport["type"],
): KeywordReport[] => {
  return reports.filter((report) => report.type === type);
};

// Get report summary statistics
export const getReportsStatistics = (reports: KeywordReport[]) => {
  const total = reports.length;
  const ready = reports.filter((r) => r.status === "ready").length;
  const generating = reports.filter((r) => r.status === "generating").length;
  const error = reports.filter((r) => r.status === "error").length;
  const oneTime = reports.filter((r) => r.type === "one-time").length;
  const recurring = reports.filter((r) => r.type === "recurring").length;

  return {
    total,
    ready,
    generating,
    error,
    oneTime,
    recurring,
  };
};

// Check if report name is unique within a domain's reports
export const isReportNameUnique = (
  reports: KeywordReport[],
  name: string,
  excludeId?: string,
): boolean => {
  return !reports.some(
    (report) =>
      report.name.toLowerCase() === name.toLowerCase() &&
      report.id !== excludeId,
  );
};

// Generate a unique report name if the provided name already exists
export const generateUniqueReportName = (
  reports: KeywordReport[],
  baseName: string,
): string => {
  if (isReportNameUnique(reports, baseName)) {
    return baseName;
  }

  let counter = 1;
  let newName = `${baseName} (${counter})`;

  while (!isReportNameUnique(reports, newName)) {
    counter++;
    newName = `${baseName} (${counter})`;
  }

  return newName;
};

// Get the latest report for a domain
export const getLatestReportForDomain = (
  reports: KeywordReport[],
  domainId: string,
): KeywordReport | null => {
  const domainReports = reports.filter(
    (report) => report.domain.id === domainId,
  );
  if (domainReports.length === 0) return null;

  return sortReportsByDate(domainReports)[0];
};

export const getReportAge = (createdAt: string): string => {
  const now = new Date();
  const created = new Date(createdAt);
  const diffMs = now.getTime() - created.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffDays > 0) {
    return `${diffDays} dag${diffDays > 1 ? "e" : ""} siden`;
  } else if (diffHours > 0) {
    return `${diffHours} time${diffHours > 1 ? "r" : ""} siden`;
  } else if (diffMinutes > 0) {
    return `${diffMinutes} minut${diffMinutes > 1 ? "ter" : ""} siden`;
  } else {
    return "Lige nu";
  }
};
