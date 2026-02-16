import { KeywordReport } from "../types";

// Report status configurations
export const REPORT_STATUSES: Array<{
  value: KeywordReport["status"];
  label: string;
  color: string;
}> = [
  {
    value: "ready",
    label: "Klar",
    color: "text-green-600 bg-green-50",
  },
  {
    value: "generating",
    label: "Genererer",
    color: "text-blue-600 bg-blue-50",
  },
  {
    value: "error",
    label: "Fejl",
    color: "text-red-600 bg-red-50",
  },
];

// Report type configurations
export const REPORT_TYPES: Array<{
  value: KeywordReport["type"];
  label: string;
  description: string;
}> = [
  {
    value: "one-time",
    label: "Engangs rapport",
    description: "En enkelt rapport der genereres kun en gang",
  },
  {
    value: "recurring",
    label: "Tilbagevendende rapport",
    description: "Rapport der genereres automatisk med jævne mellemrum",
  },
];

// Local storage keys
export const STORAGE_KEYS = {
  REPORTS: "rank-tracker-reports",
  REPORT_PREFERENCES: "rank-tracker-report-preferences",
} as const;

// Report generation default settings
export const DEFAULT_REPORT_SETTINGS = {
  MAX_REPORTS_PER_DOMAIN: 50,
  DEFAULT_DATE_RANGE_DAYS: 30,
  AUTO_CLEANUP_DAYS: 90, // Reports older than 90 days can be auto-cleaned
  MAX_CONTENT_BLOCKS: 20,
} as const;

// Content block type configurations
export const CONTENT_BLOCK_TYPES = [
  { value: "text", label: "Tekst", editable: true },
  { value: "conclusion", label: "Konklusion", editable: true },
  { value: "graph", label: "Graf", editable: false },
  { value: "metrics", label: "Nøgletal", editable: false },
  { value: "highlight", label: "Højdepunkter", editable: true },
  { value: "scorecards", label: "Scorekort", editable: false },
  { value: "dashboard-graph", label: "Dashboard Graf", editable: false },
  { value: "top-keywords", label: "Top Søgeord", editable: false },
  { value: "graph-clicks", label: "Klik Graf", editable: false },
  { value: "graph-impressions", label: "Visninger Graf", editable: false },
  { value: "graph-position", label: "Position Graf", editable: false },
  { value: "graph-ctr", label: "CTR Graf", editable: false },
  { value: "card-keywords", label: "Søgeord Kort", editable: false },
  { value: "card-position", label: "Position Kort", editable: false },
  { value: "card-clicks", label: "Klik Kort", editable: false },
  { value: "card-impressions", label: "Visninger Kort", editable: false },
  { value: "card-ctr", label: "CTR Kort", editable: false },
  {
    value: "card-top-positions",
    label: "Top Positioner Kort",
    editable: false,
  },
] as const;

// Report layout configurations
export const LAYOUT_SIZES = [
  { value: "full", label: "Fuld bredde", gridCols: 12 },
  { value: "half", label: "Halv bredde", gridCols: 6 },
  { value: "third", label: "En tredjedel", gridCols: 4 },
  { value: "quarter", label: "En fjerdedel", gridCols: 3 },
] as const;

// Report validation rules
export const VALIDATION_RULES = {
  NAME_MIN_LENGTH: 3,
  NAME_MAX_LENGTH: 100,
  DESCRIPTION_MAX_LENGTH: 500,
} as const;

// Date format configurations
export const DATE_FORMATS = {
  DISPLAY: "da-DK",
  API: "YYYY-MM-DD",
  FULL: {
    year: "numeric" as const,
    month: "long" as const,
    day: "numeric" as const,
    hour: "2-digit" as const,
    minute: "2-digit" as const,
  },
  SHORT: {
    year: "numeric" as const,
    month: "short" as const,
    day: "numeric" as const,
  },
} as const;

// Performance metrics thresholds
export const PERFORMANCE_THRESHOLDS = {
  EXCELLENT_POSITION: 3,
  GOOD_POSITION: 10,
  POOR_POSITION: 20,
  HIGH_CTR: 0.05, // 5%
  MEDIUM_CTR: 0.02, // 2%
  LOW_CTR: 0.01, // 1%
} as const;
