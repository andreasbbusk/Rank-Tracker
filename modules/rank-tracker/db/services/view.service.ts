import {
  ensureDatabase,
  SHARED_SEED_TENANT_ID,
} from "../core/database";
import { getCurrentTenantId } from "../core/tenant";
import { RankTrackerKeywordModel } from "../models/keyword.model";
import { DateRange, MockKeyword, MockTag } from "../types";
import {
  aggregateDomainGraph,
  aggregateDomainRange,
  keywordToViewRecord,
} from "../utils/analytics";
import { getTagsByIds, getKeywordsForDomain } from "./common.service";
import { listDomains } from "./domain.service";
import {
  getTenantOverlayState,
  mergeTenantAndSeedDocuments,
} from "./overlay-utils.service";

type KeywordDoc = MockKeyword & {
  tenantId: string;
  title_lower?: string;
};

function sortKeywordsForTable(left: MockKeyword, right: MockKeyword): number {
  if (left.created_at === right.created_at) {
    return left.id - right.id;
  }
  return left.created_at > right.created_at ? -1 : 1;
}

function buildRangeStats(
  stats:
    | {
        range_0_3: number;
        range_3_10: number;
        range_10_20: number;
        range_20_plus: number;
      }
    | undefined,
) {
  return [
    { range: "0-3", keyword_counts: stats?.range_0_3 ?? 0 },
    { range: "3-10", keyword_counts: stats?.range_3_10 ?? 0 },
    { range: "10-20", keyword_counts: stats?.range_10_20 ?? 0 },
    { range: "20+", keyword_counts: stats?.range_20_plus ?? 0 },
  ];
}

async function getMergedKeywordById(
  tenantId: string,
  keywordId: number,
): Promise<MockKeyword | null> {
  const [overlayState, keywordCandidates] = await Promise.all([
    getTenantOverlayState(tenantId),
    RankTrackerKeywordModel.find({
      tenantId: { $in: [tenantId, SHARED_SEED_TENANT_ID] },
      id: keywordId,
    })
      .select({
        _id: 0,
        tenantId: 1,
        id: 1,
        domainId: 1,
        title: 1,
        title_lower: 1,
        star_keyword: 1,
        location: 1,
        tagIds: 1,
        notes: 1,
        latest_fetch: 1,
        created_at: 1,
        updated_at: 1,
        preferred_url: 1,
        search_volume: 1,
        current: 1,
        previous: 1,
        status: 1,
        statusChecksRemaining: 1,
      })
      .lean(),
  ]);

  const [keyword] = mergeTenantAndSeedDocuments(
    tenantId,
    keywordCandidates as KeywordDoc[],
    (item) => String(item.id),
    (item, id) =>
      overlayState.deletedDomainIds.has(item.domainId) ||
      overlayState.deletedKeywordIds.has(Number(id)),
  );

  if (!keyword) {
    return null;
  }

  return {
    id: keyword.id,
    domainId: keyword.domainId,
    title: keyword.title,
    title_lower: keyword.title_lower,
    star_keyword: keyword.star_keyword,
    location: keyword.location,
    tagIds: keyword.tagIds,
    notes: keyword.notes,
    latest_fetch: keyword.latest_fetch,
    created_at: keyword.created_at,
    updated_at: keyword.updated_at,
    preferred_url: keyword.preferred_url,
    search_volume: keyword.search_volume,
    current: keyword.current,
    previous: keyword.previous,
    status: keyword.status,
    statusChecksRemaining: keyword.statusChecksRemaining,
  };
}

export async function getDomainsView(dateRanges?: DateRange[]) {
  const tenantId = await getCurrentTenantId();
  await ensureDatabase(tenantId);
  const includeComparison = Boolean(dateRanges && dateRanges.length > 1);

  const domains = await listDomains();
  const domainKeywords = await Promise.all(
    domains.map((domain) => getKeywordsForDomain(domain.id)),
  );

  const records: any[] = [];
  const now = new Date().toISOString();

  domains.forEach((domain, index) => {
    const keywords = domainKeywords[index] || [];
    const currentStats = aggregateDomainRange(keywords, 0);
    const previousStats = includeComparison
      ? aggregateDomainRange(keywords, 1)
      : null;

    records.push({
      id: domain.id,
      team: domain.team,
      dateRange: "date_range_0",
      display_name: domain.display_name,
      url: domain.url,
      latest_fetch: now,
      rank: 0,
      total_keywords: currentStats.total_keywords,
      range_stats: buildRangeStats({
        range_0_3: currentStats.range_stats[0]?.keyword_counts || 0,
        range_3_10: currentStats.range_stats[1]?.keyword_counts || 0,
        range_10_20: currentStats.range_stats[2]?.keyword_counts || 0,
        range_20_plus: currentStats.range_stats[3]?.keyword_counts || 0,
      }),
      overall_stats: currentStats.overall_stats,
    });

    if (includeComparison && previousStats) {
      records.push({
        id: domain.id,
        team: domain.team,
        dateRange: "date_range_1",
        display_name: domain.display_name,
        url: domain.url,
        latest_fetch: now,
        rank: 0,
        total_keywords: previousStats.total_keywords,
        range_stats: buildRangeStats({
          range_0_3: previousStats.range_stats[0]?.keyword_counts || 0,
          range_3_10: previousStats.range_stats[1]?.keyword_counts || 0,
          range_10_20: previousStats.range_stats[2]?.keyword_counts || 0,
          range_20_plus: previousStats.range_stats[3]?.keyword_counts || 0,
        }),
        overall_stats: previousStats.overall_stats,
      });
    }
  });

  return records;
}

export async function getDomainKeywordsView({
  domainId,
  dateRanges,
  limit = 50,
  page = 1,
}: {
  domainId: string;
  dateRanges?: DateRange[];
  limit?: number;
  page?: number;
}) {
  const tenantId = await getCurrentTenantId();
  await ensureDatabase(tenantId);
  const includeComparison = Boolean(dateRanges && dateRanges.length > 1);
  const safeLimit = Math.max(limit, 1);
  const safePage = Math.max(page, 1);
  const skip = (safePage - 1) * safeLimit;

  const allDomainKeywords = await getKeywordsForDomain(String(domainId));
  const sortedKeywords = allDomainKeywords.sort(sortKeywordsForTable);
  const domainKeywords = sortedKeywords.slice(skip, skip + safeLimit);

  const tagIds = Array.from(
    new Set(domainKeywords.flatMap((keyword) => keyword.tagIds)),
  );
  const tags = await getTagsByIds(tagIds, tenantId);
  const tagsById = new Map(tags.map((tag) => [tag.id, tag]));

  const records: any[] = [];
  for (const keyword of domainKeywords) {
    const keywordTags = keyword.tagIds
      .map((id) => tagsById.get(id))
      .filter((tag): tag is MockTag => Boolean(tag));
    const currentRecord = keywordToViewRecord(keyword, keywordTags, 0);
    const previousRecord = includeComparison
      ? keywordToViewRecord(keyword, keywordTags, 1)
      : null;

    records.push({
      ...currentRecord,
      id: String(currentRecord.id),
      dateRange: "date_range_0",
      date_range_0: {
        id: String(currentRecord.id),
        dateRange: "date_range_0",
        latest_stats: currentRecord.latest_stats,
        overall_stats: currentRecord.overall_stats,
        search_volume: currentRecord.search_volume,
      },
      date_range_1: previousRecord
        ? {
            id: String(previousRecord.id),
            dateRange: "date_range_1",
            latest_stats: previousRecord.latest_stats,
            overall_stats: previousRecord.overall_stats,
            search_volume: previousRecord.search_volume,
          }
        : undefined,
    });
  }

  return {
    count: sortedKeywords.length,
    next: null,
    previous: null,
    records,
  };
}

export async function getDashboardView({
  domainId,
  dateRanges,
}: {
  domainId: string;
  dateRanges?: DateRange[];
}) {
  const tenantId = await getCurrentTenantId();
  await ensureDatabase(tenantId);
  const includeComparison = Boolean(dateRanges && dateRanges.length > 1);

  const keywords = await getKeywordsForDomain(String(domainId));

  const records: any[] = [];

  const currentStats = aggregateDomainRange(keywords, 0);
  records.push({
    dateRange: "date_range_0",
    total_keywords: currentStats.total_keywords,
    latest_fetch: new Date().toISOString(),
    range_stats: currentStats.range_stats,
    overall_stats: currentStats.overall_stats,
    graph_stats: aggregateDomainGraph(keywords, 0),
  });

  if (includeComparison) {
    const previousStats = aggregateDomainRange(keywords, 1);
    records.push({
      dateRange: "date_range_1",
      total_keywords: previousStats.total_keywords,
      latest_fetch: new Date().toISOString(),
      range_stats: previousStats.range_stats,
      overall_stats: previousStats.overall_stats,
      graph_stats: aggregateDomainGraph(keywords, 1),
    });
  }

  return {
    records,
  };
}

export async function getKeywordModalView({
  keywordId,
}: {
  keywordId: string;
}) {
  const tenantId = await getCurrentTenantId();
  await ensureDatabase(tenantId);
  const keyword = await getMergedKeywordById(tenantId, Number(keywordId));

  if (!keyword) return null;

  return {
    result: {
      id: keyword.id,
      domain: Number(keyword.domainId),
      title: keyword.title,
      star_keyword: keyword.star_keyword,
      daily_stats_range_0: keyword.current.daily_stats,
      daily_stats_range_1: keyword.previous.daily_stats,
    },
  };
}
