import { ensureDatabase } from "../core/database";
import { RankTrackerDomainModel } from "../models/domain.model";
import { RankTrackerGSCSiteModel } from "../models/gsc-site.model";
import { MockGSCRecord } from "../types";
import {
  escapeRegex,
  hashString,
  normalizeDomain,
  normalizeSiteUrl,
  seededNoise,
} from "../utils/normalizers";

export async function getGSCKeywords(siteUrl: string) {
  await ensureDatabase();

  const normalized = normalizeSiteUrl(siteUrl);
  const fallbackDomain = normalizeDomain(siteUrl);

  const direct = await RankTrackerGSCSiteModel.findOne({
    siteUrl: normalized,
  }).lean();

  if (direct) {
    return {
      success: true,
      records: direct.records || [],
    };
  }

  const matched = await RankTrackerGSCSiteModel.findOne({
    siteUrl: { $regex: escapeRegex(fallbackDomain), $options: "i" },
  }).lean();

  if (matched) {
    return {
      success: true,
      records: matched.records || [],
    };
  }

  return {
    success: true,
    records: [],
  };
}

export async function getKeywordInsights({
  domain,
  keywords,
}: {
  domain: string;
  keywords?: string[];
}) {
  await ensureDatabase();
  const normalized = normalizeDomain(domain);

  let gscEntry = await RankTrackerGSCSiteModel.findOne({
    siteUrl: { $regex: escapeRegex(normalized), $options: "i" },
  }).lean();

  if (!gscEntry) {
    gscEntry = await RankTrackerGSCSiteModel.findOne({}).lean();
  }

  const source = (gscEntry?.records || []) as MockGSCRecord[];
  const keywordFilter =
    keywords && keywords.length > 0
      ? new Set(keywords.map((keyword) => keyword.toLowerCase()))
      : null;

  const filtered = source.filter((record) =>
    keywordFilter ? keywordFilter.has(record.query.toLowerCase()) : true,
  );

  const records = (filtered.length > 0 ? filtered : source).slice(0, 20);

  return {
    success: true,
    keyword_reports: records.map((record) => ({
      keyword: record.query,
      avg_month_search: Math.max(20, Math.round(record.impressions * 3.1)),
      competition:
        record.position <= 8
          ? 4
          : record.position <= 15
            ? 3
            : record.position <= 25
              ? 2
              : 1,
      competition_index:
        record.position <= 8 ? 88 : record.position <= 15 ? 64 : 42,
      three_month_change: Number(
        (seededNoise(hashString(record.query), 1) * 18).toFixed(1),
      ),
      yoy_change: Number(
        (seededNoise(hashString(record.query), 2) * 26).toFixed(1),
      ),
      low_top_of_page_bid: Math.round(
        (5 + Math.abs(seededNoise(hashString(record.query), 3) * 20)) *
          1_000_000,
      ),
      high_top_of_page_bid: Math.round(
        (25 + Math.abs(seededNoise(hashString(record.query), 4) * 40)) *
          1_000_000,
      ),
      monthly_search_volumes: [
        {
          avg_searches: Math.max(10, Math.round(record.impressions * 2.8)),
          month: "2025-10",
        },
        {
          avg_searches: Math.max(10, Math.round(record.impressions * 3.0)),
          month: "2025-11",
        },
        {
          avg_searches: Math.max(10, Math.round(record.impressions * 3.1)),
          month: "2025-12",
        },
      ],
      query: record.query,
      clicks: record.clicks,
      impressions: record.impressions,
      ctr: record.ctr,
      position: record.position,
    })),
    errors: [],
    original_name: domain,
  };
}

export async function getGSCProperties() {
  await ensureDatabase();

  const suggestedProperties = [
    "sc-domain:coffeecircle.dk",
    "sc-domain:fjordfitness.com",
    "sc-domain:cleanbeautyhub.dk",
  ];

  const domains = (await RankTrackerDomainModel.find(
    {},
    { url: 1 },
  ).lean()) as Array<{ url: string }>;
  const existingProperties = domains.map((domain) =>
    normalizeSiteUrl(domain.url),
  );

  const uniqueProperties = Array.from(
    new Set([...existingProperties, ...suggestedProperties]),
  );

  return {
    accounts: uniqueProperties.map((property) => ({
      property,
    })),
  };
}

export async function runGSCReport({
  site_url,
  limit,
}: {
  site_url: string;
  limit?: number;
}) {
  const data = await getGSCKeywords(site_url);
  const records = (data.records || []).slice(0, limit || 1000);

  return {
    records,
    count: records.length,
    next: null,
    previous: null,
  };
}
