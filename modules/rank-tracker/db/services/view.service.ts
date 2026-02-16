import { ensureDatabase } from "../core/database";
import { RankTrackerDomainModel } from "../models/domain.model";
import { RankTrackerKeywordModel } from "../models/keyword.model";
import { DateRange, MockDomain, MockKeyword, MockTag } from "../types";
import {
  aggregateDomainGraph,
  aggregateDomainRange,
  keywordToViewRecord,
} from "../utils/analytics";
import { getTagsByIds } from "./common.service";

export async function getDomainsView(dateRanges?: DateRange[]) {
  await ensureDatabase();
  const includeComparison = Boolean(dateRanges && dateRanges.length > 1);

  const [domains, keywords] = await Promise.all([
    RankTrackerDomainModel.find({}).lean(),
    RankTrackerKeywordModel.find({}).lean(),
  ]);

  const keywordMap = new Map<string, MockKeyword[]>();
  for (const keyword of keywords as unknown as MockKeyword[]) {
    const list = keywordMap.get(keyword.domainId) || [];
    list.push(keyword);
    keywordMap.set(keyword.domainId, list);
  }

  const records: any[] = [];
  for (const domain of domains as unknown as MockDomain[]) {
    const domainKeywords = keywordMap.get(domain.id) || [];

    const current = aggregateDomainRange(domainKeywords, 0);
    records.push({
      id: domain.id,
      team: domain.team,
      dateRange: "date_range_0",
      display_name: domain.display_name,
      url: domain.url,
      latest_fetch: new Date().toISOString(),
      rank: 0,
      total_keywords: current.total_keywords,
      range_stats: current.range_stats,
      overall_stats: current.overall_stats,
    });

    if (includeComparison) {
      const previous = aggregateDomainRange(domainKeywords, 1);
      records.push({
        id: domain.id,
        team: domain.team,
        dateRange: "date_range_1",
        display_name: domain.display_name,
        url: domain.url,
        latest_fetch: new Date().toISOString(),
        rank: 0,
        total_keywords: previous.total_keywords,
        range_stats: previous.range_stats,
        overall_stats: previous.overall_stats,
      });
    }
  }

  return records;
}

export async function getDomainKeywordsView({
  domainId,
  dateRanges,
}: {
  domainId: string;
  dateRanges?: DateRange[];
}) {
  await ensureDatabase();
  const includeComparison = Boolean(dateRanges && dateRanges.length > 1);

  const domainKeywords = (await RankTrackerKeywordModel.find({
    domainId: String(domainId),
  }).lean()) as unknown as MockKeyword[];

  const tagIds = Array.from(
    new Set(domainKeywords.flatMap((keyword) => keyword.tagIds)),
  );
  const tags = await getTagsByIds(tagIds);
  const tagsById = new Map(tags.map((tag) => [tag.id, tag]));

  const records: any[] = [];
  for (const keyword of domainKeywords) {
    const keywordTags = keyword.tagIds
      .map((id) => tagsById.get(id))
      .filter((tag): tag is MockTag => Boolean(tag));

    records.push(keywordToViewRecord(keyword, keywordTags, 0));
    if (includeComparison) {
      records.push(keywordToViewRecord(keyword, keywordTags, 1));
    }
  }

  return {
    count: records.length,
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
  await ensureDatabase();
  const includeComparison = Boolean(dateRanges && dateRanges.length > 1);

  const keywords = (await RankTrackerKeywordModel.find({
    domainId: String(domainId),
  }).lean()) as unknown as MockKeyword[];

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
  await ensureDatabase();
  const keyword = (await RankTrackerKeywordModel.findOne({
    id: Number(keywordId),
  }).lean()) as unknown as MockKeyword | null;

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
