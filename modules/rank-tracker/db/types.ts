export type DateRange = {
  start_date: string;
  end_date: string;
};

export type MockDomain = {
  id: string;
  team: string;
  url: string;
  display_name: string;
  created_at: string;
  updated_at: string;
  display_name_lower?: string;
};

export type MockLocation = {
  id: number;
  team: number;
  country: string;
  device: string;
  lang_const: string;
  geo_const: string;
};

export type MockKeywordNote = {
  id: number;
  description: string;
  created_at: string;
  updated_at: string;
};

export type MockDailyStat = {
  created_at: string;
  page: string;
  position: number;
  clicks: number;
  impressions: number;
};

export type MockKeywordRange = {
  position: number;
  clicks: number;
  impressions: number;
  landing_page: string;
  daily_stats: MockDailyStat[];
};

export type MockKeyword = {
  id: number;
  domainId: string;
  title: string;
  title_lower?: string;
  star_keyword: boolean;
  location: MockLocation;
  tagIds: number[];
  notes: MockKeywordNote[];
  latest_fetch: string | null;
  created_at: string;
  updated_at: string;
  preferred_url?: string;
  search_volume: number;
  current: MockKeywordRange;
  previous: MockKeywordRange;
  status: "pending" | "processed" | "error";
  statusChecksRemaining: number;
};

export type MockTag = {
  id: number;
  domainId: string;
  name: string;
  name_lower?: string;
  created_at: string;
};

export type MockGSCRecord = {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

export type SeedMeta = {
  seed_version: number;
  nextDomainId: number;
  nextKeywordId: number;
  nextTagId: number;
  nextNoteId: number;
};

export type MockDatabase = {
  meta: SeedMeta;
  domains: MockDomain[];
  tags: MockTag[];
  keywords: MockKeyword[];
  gscBySiteUrl: Record<string, MockGSCRecord[]>;
};
