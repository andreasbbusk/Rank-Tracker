import { RangeStats } from "./index";

export interface Location {
  id: number;
  team: number;
  country: string;
  device: string;
  lang_const?: string;
  geo_const?: string;
}

export interface Tag {
  id?: number;
  name: string;
}

export interface KeywordStats {
  created_at: string;
  page: string;
  position: number;
  clicks?: number;
  impressions?: number;
}

export interface OverallStats {
  clicks: number;
  impressions: number;
  position?: number;
  ctr?: number;
}

export interface DateRangeStats {
  latest_stats?: KeywordStats[];
  overall_stats?: OverallStats;
}

export interface DailyStats {
  created_at: string;
  page: string;
  position: number;
  clicks: number;
  impressions: number;
}

export interface KeywordDateRange {
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
}

export interface AnalysisKeyword {
  id: number;
  domain: number;
  title: string;
  star_keyword: boolean;
  daily_stats_range_0: DailyStats[];
  daily_stats_range_1: DailyStats[];
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
  date_range_0?: KeywordDateRange;
  date_range_1?: KeywordDateRange;
  preferred_url?: string;
  daily_stats_range_0?: DailyStats[];
  daily_stats_range_1?: DailyStats[];
  dateRange?: string;
}

export type Domain = {
  id?: string;
  display_name: string;
  url: string;
  team?: string;
  created_at?: string;
  updated_at?: string;
};

export interface DomainView {
  dateRange: string;
  total_keywords: number;
  display_name: string;
  url: string;
  latest_fetch: string;
  rank: number;
  range_stats: RangeStats[];
  overall_stats: OverallStats;
  team: string;
  id: string;
}

export interface DomainWithAnalytics extends Domain {
  keywords_count?: number;
  avg_position?: number;
  clicks?: number;
  impressions?: number;
  top_3_keywords?: number;
  keywords?: Keyword[];
  subRows?: any[];
  date_range_0?: DomainView;
  date_range_1?: DomainView;
  gsc_url?: string;
  gscData?: any;
}
