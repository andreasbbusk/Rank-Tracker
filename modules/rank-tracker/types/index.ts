import { DailyStats } from "./types";

export type Domain = {
  id?: string;
  display_name: string;
  url: string;
  team?: string;
  created_at?: string;
  updated_at?: string;
};

export type CreateDomainPayload = {
  url: string;
  display_name: string;
  team: string;
  id: string;
};

export type UpdateDomainPayload = {
  id: string;
  team?: string;
  url: string;
  display_name: string;
  created_at?: string;
};

export type DomainResponse = {
  success: boolean;
  domain?: Domain;
  error?: string;
  message?: string;
};

export type DomainListResponse = {
  count: number;
  next: string | null;
  previous: string | null;
  results: Domain[];
  total_pages?: number;
};

export type DomainColumns = {
  display_name: string;
  keywords_count?: number;
  avg_position?: number;
  clicks?: number;
  impressions?: number;
  top_3_keywords?: number;
};

export type GetDomainResponse = {
  id: number;
  team: number;
  url: string;
  display_name: string;
  created_at: string;
};

export interface KeywordDateRange {
  dateRange: string;
  id: string;
  domain: number;
  title: string;
  star_keyword: boolean;
  location: {
    id: number;
    team: number;
    country: string;
    device: string;
    lang_const: string;
    geo_const: string;
  };
  tags: string[];
  latest_fetch: string | null;
  created_at: string;
  updated_at: string;
  latest_stats?: Array<{
    created_at: string;
    page: string;
    position: number;
  }>;
  overall_stats: {
    clicks: number;
    impressions: number;
  };
  search_volume: {
    avg_searches: number;
    month: string;
  };
}

export interface Keyword {
  id: string;
  domain: string;
  title: string;
  star_keyword: boolean;
  location: {
    id: number;
    team: number;
    country: string;
    device: string;
    lang_const: string;
    geo_const: string;
  };
  tags: Array<{ name: string } | string>;
  notes?: Array<{
    id: number;
    description: string;
    created_at?: string;
    updated_at?: string;
  }>;
  latest_fetch?: string | null;
  created_at: string;
  updated_at: string;
  search_volume?: {
    avg_searches: number;
    month: string;
  };
  landing_page?: string;
  ranking?: number;
  clicks?: number;
  impressions?: number;
  latest_stats?: Array<{
    position: number;
    page: string;
    date?: string;
    clicks?: number;
    impressions?: number;
  }>;
  overall_stats?: {
    clicks: number;
    impressions: number;
    position?: number;
    ctr?: number;
  };
  date_range_0: KeywordDateRange;
  date_range_1: KeywordDateRange;
  preferred_url?: string;
  daily_stats_range_0?: DailyStats[];
  daily_stats_range_1?: DailyStats[];
  dateRange?: string;
}

export type KeywordView = {
  dateRange: string;
  id: number;
  domain: number;
  title: string;
  star_keyword: boolean;
  location: {
    id: number;
    team: number;
    country: string;
    device: string;
    lang_const: string;
    geo_const: string;
  };
  tags: string[];
  latest_fetch: string | null;
  created_at: string;
  updated_at: string;
  search_volume: {
    avg_searches: number;
    month: string;
  };
  clicks: number;
  impressions: number;
  position: number;
  landing_page: string;
};

export interface OverallStats {
  position: number;
  clicks: number;
  impressions: number;
}

export interface DomainView {
  dateRange: string;
  total_keywords: number;
  display_name: string;
  url: string;
  latest_fetch: string;
  rank: number;
  range_stats: RangeStats[];
  overall_stats: OverallStats;
}

export interface DomainWithAnalytics extends Domain {
  keywords_count?: number;
  avg_position?: number;
  clicks?: number;
  impressions?: number;
  top_3_keywords?: number;
  keywords?: Keyword[];
  subRows?: any[];
  gscData?: any;
  gsc_url?: string;
  date_range_0?: DomainView;
  date_range_1?: DomainView;
}

export type RangeStats = {
  range: string;
  keyword_counts: number;
  clicks?: number;
  impressions?: number;
};

export type GraphStats = {
  created_at: string;
  position: number;
  clicks: number;
  impressions: number;
};

export type DashboardRecord = {
  dateRange: string;
  total_keywords: number;
  latest_fetch: string;
  range_stats: RangeStats[];
  overall_stats: {
    position: number;
    clicks: number;
    impressions: number;
  };
  graph_stats: GraphStats[];
};

export type DashboardResponse = {
  records: DashboardRecord[];
};

export type DashboardMetrics = {
  avgPosition: number;
  avgPositionChange: number;
  totalKeywords: number;
  keywordsChange: number;
  avgCTR: number;
  ctrChange: number;
  totalClicks: number;
  clicksChange: number;
  totalImpressions: number;
  impressionsChange: number;
  topPositionKeywords: number;
  midPositionKeywords: number;
  lowPositionKeywords: number;
};

// Report Content Block Types
export interface ReportContentBlock {
  id: string;
  type:
    | "text"
    | "conclusion"
    | "graph"
    | "metrics"
    | "highlight"
    | "scorecards"
    | "dashboard-graph"
    | "top-keywords"
    | "graph-clicks"
    | "graph-impressions"
    | "graph-position"
    | "graph-ctr"
    | "card-keywords"
    | "card-position"
    | "card-clicks"
    | "card-impressions"
    | "card-ctr"
    | "card-top-positions";
  content: any;
  position: number;
  editable: boolean;
  size?: "full" | "half" | "third" | "quarter";
}

// Report Metrics Structure
export interface ReportMetrics {
  totalKeywords: number;
  avgPosition: number;
  totalClicks: number;
  totalImpressions: number;
  avgCTR: number;
  topRankingKeywords: number;
  improvementOpportunities: number;
  dateRange: { from: string; to: string };
}

// Main Report Interface
export interface KeywordReport {
  id: string;
  name: string;
  domain: DomainWithAnalytics;
  type: "one-time" | "recurring";
  status: "generating" | "ready" | "error";
  metrics: ReportMetrics;
  contentBlocks: ReportContentBlock[];
  layout?: {
    [key: string]: Array<{
      i: string;
      x: number;
      y: number;
      w: number;
      h: number;
      minW?: number;
      minH?: number;
      maxW?: number;
      maxH?: number;
    }>;
  };
  createdAt: string;
  updatedAt: string;
  generatedBy: string;
}

// Creation Payload
export interface CreateReportPayload {
  name: string;
  domainId: string;
  type: "one-time" | "recurring";
  dateRange?: {
    from: Date;
    to: Date;
  };
  frequency?: "daily" | "weekly" | "monthly";
}
