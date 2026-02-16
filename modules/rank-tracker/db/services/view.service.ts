import { ensureDatabase } from "../core/database";
import { getCurrentTenantId } from "../core/tenant";
import { RankTrackerDomainModel } from "../models/domain.model";
import { RankTrackerKeywordModel } from "../models/keyword.model";
import { DateRange, MockDomain, MockKeyword, MockTag } from "../types";
import {
  aggregateDomainGraph,
  aggregateDomainRange,
  keywordToViewRecord,
} from "../utils/analytics";
import { getTagsByIds } from "./common.service";

type DomainAggregationRow = {
  _id: string;
  total_keywords: number;
  clicks0: number;
  impressions0: number;
  position0: number;
  range0_0_3: number;
  range0_3_10: number;
  range0_10_20: number;
  range0_20_plus: number;
  clicks1: number;
  impressions1: number;
  position1: number;
  range1_0_3: number;
  range1_3_10: number;
  range1_10_20: number;
  range1_20_plus: number;
};

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

export async function getDomainsView(dateRanges?: DateRange[]) {
  const tenantId = await getCurrentTenantId();
  await ensureDatabase(tenantId);
  const includeComparison = Boolean(dateRanges && dateRanges.length > 1);

  const [domains, aggregatedKeywords] = await Promise.all([
    RankTrackerDomainModel.find({ tenantId })
      .select({
        _id: 0,
        id: 1,
        team: 1,
        display_name: 1,
        url: 1,
      })
      .lean(),
    RankTrackerKeywordModel.aggregate<DomainAggregationRow>([
      {
        $match: {
          tenantId,
        },
      },
      {
        $group: {
          _id: "$domainId",
          total_keywords: { $sum: 1 },
          clicks0: { $sum: { $ifNull: ["$current.clicks", 0] } },
          impressions0: { $sum: { $ifNull: ["$current.impressions", 0] } },
          position0: { $avg: { $ifNull: ["$current.position", 0] } },
          range0_0_3: {
            $sum: {
              $cond: [{ $lte: ["$current.position", 3] }, 1, 0],
            },
          },
          range0_3_10: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $gt: ["$current.position", 3] },
                    { $lte: ["$current.position", 10] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          range0_10_20: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $gt: ["$current.position", 10] },
                    { $lte: ["$current.position", 20] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          range0_20_plus: {
            $sum: {
              $cond: [{ $gt: ["$current.position", 20] }, 1, 0],
            },
          },
          clicks1: { $sum: { $ifNull: ["$previous.clicks", 0] } },
          impressions1: { $sum: { $ifNull: ["$previous.impressions", 0] } },
          position1: { $avg: { $ifNull: ["$previous.position", 0] } },
          range1_0_3: {
            $sum: {
              $cond: [{ $lte: ["$previous.position", 3] }, 1, 0],
            },
          },
          range1_3_10: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $gt: ["$previous.position", 3] },
                    { $lte: ["$previous.position", 10] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          range1_10_20: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $gt: ["$previous.position", 10] },
                    { $lte: ["$previous.position", 20] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          range1_20_plus: {
            $sum: {
              $cond: [{ $gt: ["$previous.position", 20] }, 1, 0],
            },
          },
        },
      },
    ]),
  ]);
  const aggregateByDomainId = new Map(
    aggregatedKeywords.map((row) => [row._id, row]),
  );

  const records: any[] = [];
  const now = new Date().toISOString();

  for (const domain of domains as unknown as MockDomain[]) {
    const stats = aggregateByDomainId.get(domain.id);

    records.push({
      id: domain.id,
      team: domain.team,
      dateRange: "date_range_0",
      display_name: domain.display_name,
      url: domain.url,
      latest_fetch: now,
      rank: 0,
      total_keywords: stats?.total_keywords ?? 0,
      range_stats: buildRangeStats(
        stats
          ? {
              range_0_3: stats.range0_0_3,
              range_3_10: stats.range0_3_10,
              range_10_20: stats.range0_10_20,
              range_20_plus: stats.range0_20_plus,
            }
          : undefined,
      ),
      overall_stats: {
        position: Number((stats?.position0 ?? 0).toFixed(1)),
        clicks: stats?.clicks0 ?? 0,
        impressions: stats?.impressions0 ?? 0,
      },
    });

    if (includeComparison) {
      records.push({
        id: domain.id,
        team: domain.team,
        dateRange: "date_range_1",
        display_name: domain.display_name,
        url: domain.url,
        latest_fetch: now,
        rank: 0,
        total_keywords: stats?.total_keywords ?? 0,
        range_stats: buildRangeStats(
          stats
            ? {
                range_0_3: stats.range1_0_3,
                range_3_10: stats.range1_3_10,
                range_10_20: stats.range1_10_20,
                range_20_plus: stats.range1_20_plus,
              }
            : undefined,
        ),
        overall_stats: {
          position: Number((stats?.position1 ?? 0).toFixed(1)),
          clicks: stats?.clicks1 ?? 0,
          impressions: stats?.impressions1 ?? 0,
        },
      });
    }
  }

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

  const [totalKeywords, domainKeywords] = await Promise.all([
    RankTrackerKeywordModel.countDocuments({
      tenantId,
      domainId: String(domainId),
    }),
    RankTrackerKeywordModel.find({
      tenantId,
      domainId: String(domainId),
    })
      .sort({ created_at: -1, id: 1 })
      .skip(skip)
      .limit(safeLimit)
      .lean(),
  ]);

  const tagIds = Array.from(
    new Set(
      (domainKeywords as unknown as MockKeyword[]).flatMap(
        (keyword) => keyword.tagIds,
      ),
    ),
  );
  const tags = await getTagsByIds(tagIds, tenantId);
  const tagsById = new Map(tags.map((tag) => [tag.id, tag]));

  const records: any[] = [];
  for (const keyword of domainKeywords as unknown as MockKeyword[]) {
    const keywordTags = keyword.tagIds
      .map((id) => tagsById.get(id))
      .filter((tag): tag is MockTag => Boolean(tag));

    records.push(keywordToViewRecord(keyword, keywordTags, 0));
    if (includeComparison) {
      records.push(keywordToViewRecord(keyword, keywordTags, 1));
    }
  }

  return {
    count: totalKeywords * (includeComparison ? 2 : 1),
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

  const keywords = (await RankTrackerKeywordModel.find({
    tenantId,
    domainId: String(domainId),
  })
    .select({
      _id: 0,
      domainId: 1,
      current: 1,
      previous: 1,
    })
    .lean()) as unknown as MockKeyword[];

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
  const keyword = (await RankTrackerKeywordModel.findOne({
    tenantId,
    id: Number(keywordId),
  })
    .select({
      _id: 0,
      id: 1,
      domainId: 1,
      title: 1,
      star_keyword: 1,
      "current.daily_stats": 1,
      "previous.daily_stats": 1,
    })
    .lean()) as unknown as MockKeyword | null;

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
