import {
  MockDailyStat,
  MockGSCRecord,
  MockKeyword,
  MockKeywordRange,
  MockTag,
} from "../types";
import { seededNoise, toDateString } from "./normalizers";

function buildDailyStats({
  seed,
  days,
  basePosition,
  baseClicks,
  baseImpressions,
  landingPage,
  offsetDays,
}: {
  seed: number;
  days: number;
  basePosition: number;
  baseClicks: number;
  baseImpressions: number;
  landingPage: string;
  offsetDays: number;
}): MockDailyStat[] {
  const today = new Date();
  const stats: MockDailyStat[] = [];

  for (let i = 0; i < days; i += 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - offsetDays - (days - 1 - i));

    const wave = Math.sin((i + seed) / 4);
    const jitter = seededNoise(seed, i);

    const position = Math.max(
      1,
      Number((basePosition + wave * 0.8 + jitter * 0.4).toFixed(1)),
    );

    const clicks = Math.max(
      0,
      Math.round(baseClicks * (1 + wave * 0.18 + jitter * 0.12)),
    );

    const impressions = Math.max(
      clicks + 5,
      Math.round(baseImpressions * (1 + wave * 0.14 + jitter * 0.08)),
    );

    stats.push({
      created_at: toDateString(date),
      page: landingPage,
      position,
      clicks,
      impressions,
    });
  }

  return stats;
}

function summarizeRange(range: MockKeywordRange): {
  position: number;
  clicks: number;
  impressions: number;
} {
  const totalClicks = range.daily_stats.reduce(
    (acc, item) => acc + item.clicks,
    0,
  );
  const totalImpressions = range.daily_stats.reduce(
    (acc, item) => acc + item.impressions,
    0,
  );
  const avgPosition =
    range.daily_stats.reduce((acc, item) => acc + item.position, 0) /
    Math.max(range.daily_stats.length, 1);

  return {
    position: Number(avgPosition.toFixed(1)),
    clicks: totalClicks,
    impressions: totalImpressions,
  };
}

export function buildRange({
  seed,
  basePosition,
  baseClicks,
  baseImpressions,
  landingPage,
  offsetDays,
}: {
  seed: number;
  basePosition: number;
  baseClicks: number;
  baseImpressions: number;
  landingPage: string;
  offsetDays: number;
}): MockKeywordRange {
  const daily_stats = buildDailyStats({
    seed,
    days: 30,
    basePosition,
    baseClicks,
    baseImpressions,
    landingPage,
    offsetDays,
  });

  const summary = summarizeRange({
    position: basePosition,
    clicks: baseClicks,
    impressions: baseImpressions,
    landing_page: landingPage,
    daily_stats,
  });

  return {
    position: summary.position,
    clicks: summary.clicks,
    impressions: summary.impressions,
    landing_page: landingPage,
    daily_stats,
  };
}

export function keywordToApi(keyword: MockKeyword, tags: MockTag[]) {
  const currentCtr =
    keyword.current.impressions > 0
      ? keyword.current.clicks / keyword.current.impressions
      : 0;

  return {
    id: String(keyword.id),
    domain: keyword.domainId,
    title: keyword.title,
    star_keyword: keyword.star_keyword,
    location: keyword.location,
    tags: tags.map((tag) => ({ name: tag.name })),
    notes: keyword.notes,
    latest_fetch: keyword.latest_fetch,
    created_at: keyword.created_at,
    updated_at: keyword.updated_at,
    preferred_url: keyword.preferred_url,
    search_volume: {
      avg_searches: keyword.search_volume,
      month: toDateString(new Date()).slice(0, 7),
    },
    landing_page: keyword.current.landing_page,
    ranking: keyword.current.position,
    clicks: keyword.current.clicks,
    impressions: keyword.current.impressions,
    latest_stats: [
      {
        position: keyword.current.position,
        page: keyword.current.landing_page,
        clicks: keyword.current.clicks,
        impressions: keyword.current.impressions,
        date: toDateString(new Date()),
      },
    ],
    overall_stats: {
      clicks: keyword.current.clicks,
      impressions: keyword.current.impressions,
      position: keyword.current.position,
      ctr: currentCtr,
    },
    date_range_0: {
      latest_stats: keyword.current.daily_stats.map((stat) => ({
        position: stat.position,
        page: stat.page,
        date: stat.created_at,
        clicks: stat.clicks,
        impressions: stat.impressions,
      })),
      overall_stats: {
        clicks: keyword.current.clicks,
        impressions: keyword.current.impressions,
        position: keyword.current.position,
        ctr: currentCtr,
      },
    },
    date_range_1: {
      latest_stats: keyword.previous.daily_stats.map((stat) => ({
        position: stat.position,
        page: stat.page,
        date: stat.created_at,
        clicks: stat.clicks,
        impressions: stat.impressions,
      })),
      overall_stats: {
        clicks: keyword.previous.clicks,
        impressions: keyword.previous.impressions,
        position: keyword.previous.position,
        ctr:
          keyword.previous.impressions > 0
            ? keyword.previous.clicks / keyword.previous.impressions
            : 0,
      },
    },
    daily_stats_range_0: keyword.current.daily_stats,
    daily_stats_range_1: keyword.previous.daily_stats,
  };
}

export function keywordToViewRecord(
  keyword: MockKeyword,
  tags: MockTag[],
  rangeId: 0 | 1,
) {
  const range = rangeId === 0 ? keyword.current : keyword.previous;
  const ctr = range.impressions > 0 ? range.clicks / range.impressions : 0;

  return {
    dateRange: `date_range_${rangeId}`,
    id: keyword.id,
    domain: Number(keyword.domainId),
    title: keyword.title,
    star_keyword: keyword.star_keyword,
    location: keyword.location,
    tags: tags.map((tag) => tag.name),
    notes: keyword.notes,
    latest_fetch: keyword.latest_fetch,
    created_at: keyword.created_at,
    updated_at: keyword.updated_at,
    preferred_url: keyword.preferred_url,
    search_volume: {
      avg_searches: keyword.search_volume,
      month: toDateString(new Date()).slice(0, 7),
    },
    clicks: range.clicks,
    impressions: range.impressions,
    position: range.position,
    landing_page: range.landing_page,
    latest_stats: [
      {
        position: range.position,
        page: range.landing_page,
        date: toDateString(new Date()),
        clicks: range.clicks,
        impressions: range.impressions,
      },
    ],
    overall_stats: {
      clicks: range.clicks,
      impressions: range.impressions,
      position: range.position,
      ctr,
    },
    daily_stats_range_0: keyword.current.daily_stats,
    daily_stats_range_1: keyword.previous.daily_stats,
  };
}

export function aggregateDomainRange(keywords: MockKeyword[], rangeId: 0 | 1) {
  const selected = keywords.map((keyword) =>
    rangeId === 0 ? keyword.current : keyword.previous,
  );

  const total_keywords = keywords.length;
  const clicks = selected.reduce((acc, item) => acc + item.clicks, 0);
  const impressions = selected.reduce((acc, item) => acc + item.impressions, 0);
  const avgPositionRaw =
    selected.reduce((acc, item) => acc + item.position, 0) /
    Math.max(selected.length, 1);
  const position = Number(avgPositionRaw.toFixed(1));

  const range_stats = [
    {
      range: "0-3",
      keyword_counts: selected.filter((item) => item.position <= 3).length,
    },
    {
      range: "3-10",
      keyword_counts: selected.filter(
        (item) => item.position > 3 && item.position <= 10,
      ).length,
    },
    {
      range: "10-20",
      keyword_counts: selected.filter(
        (item) => item.position > 10 && item.position <= 20,
      ).length,
    },
    {
      range: "20+",
      keyword_counts: selected.filter((item) => item.position > 20).length,
    },
  ];

  return {
    total_keywords,
    overall_stats: {
      position,
      clicks,
      impressions,
    },
    range_stats,
  };
}

export function aggregateDomainGraph(keywords: MockKeyword[], rangeId: 0 | 1) {
  const byDate = new Map<
    string,
    {
      clicks: number;
      impressions: number;
      positionTotal: number;
      count: number;
    }
  >();

  for (const keyword of keywords) {
    const source =
      rangeId === 0
        ? keyword.current.daily_stats
        : keyword.previous.daily_stats;
    for (const stat of source) {
      const existing = byDate.get(stat.created_at) || {
        clicks: 0,
        impressions: 0,
        positionTotal: 0,
        count: 0,
      };

      existing.clicks += stat.clicks;
      existing.impressions += stat.impressions;
      existing.positionTotal += stat.position;
      existing.count += 1;

      byDate.set(stat.created_at, existing);
    }
  }

  return Array.from(byDate.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([created_at, data]) => ({
      created_at,
      position: Number(
        (data.positionTotal / Math.max(data.count, 1)).toFixed(1),
      ),
      clicks: data.clicks,
      impressions: data.impressions,
    }));
}

export function buildKeywordLibrary({
  base,
  modifiers,
  intents,
}: {
  base: string[];
  modifiers: string[];
  intents: string[];
}): string[] {
  const keywords = new Set<string>();

  for (const term of base) {
    keywords.add(term);

    for (const modifier of modifiers) {
      keywords.add(`${modifier} ${term}`.trim());
    }

    for (const intent of intents) {
      keywords.add(`${intent} ${term}`.trim());
      for (const modifier of modifiers) {
        keywords.add(`${intent} ${modifier} ${term}`.trim());
      }
    }
  }

  return Array.from(keywords).slice(0, 120);
}

export function gscRecordsFromKeywords(
  keywords: MockKeyword[],
): MockGSCRecord[] {
  return keywords
    .map((keyword) => {
      const ctr =
        keyword.current.impressions > 0
          ? keyword.current.clicks / keyword.current.impressions
          : 0;

      return {
        query: keyword.title,
        clicks: keyword.current.clicks,
        impressions: keyword.current.impressions,
        ctr: Number(ctr.toFixed(4)),
        position: keyword.current.position,
      };
    })
    .sort((a, b) => b.clicks - a.clicks);
}
