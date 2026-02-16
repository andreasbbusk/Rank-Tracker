import {
  ensureDatabase,
  SHARED_SEED_TENANT_ID,
} from "../core/database";
import { getCurrentTenantId } from "../core/tenant";
import { RankTrackerDomainModel } from "../models/domain.model";
import { RankTrackerGSCSiteModel } from "../models/gsc-site.model";
import { MockGSCRecord } from "../types";
import {
  hashString,
  normalizeDomain,
  normalizeSiteUrl,
  seededNoise,
} from "../utils/normalizers";
import {
  getTenantOverlayState,
  mergeTenantAndSeedDocuments,
} from "./overlay-utils.service";

type DomainDoc = {
  tenantId: string;
  id: string;
  url: string;
};

type GSCDoc = {
  tenantId: string;
  siteUrl: string;
  records: MockGSCRecord[];
};

function buildSiteUrlCandidates(rawSiteUrl: string): string[] {
  const normalizedSiteUrl = normalizeSiteUrl(rawSiteUrl);
  const normalizedDomain = normalizeDomain(rawSiteUrl);

  return Array.from(
    new Set([
      normalizedSiteUrl,
      normalizeSiteUrl(normalizedDomain),
      `sc-domain:${normalizedDomain}`,
      normalizedDomain,
      `https://${normalizedDomain}`,
      `http://${normalizedDomain}`,
      `https://www.${normalizedDomain}`,
      `http://www.${normalizedDomain}`,
    ]),
  ).map((siteUrl) => normalizeSiteUrl(siteUrl));
}

async function getVisibleDomainSiteUrls(tenantId: string): Promise<Set<string>> {
  const [overlayState, domains] = await Promise.all([
    getTenantOverlayState(tenantId),
    RankTrackerDomainModel.find({
      tenantId: { $in: [tenantId, SHARED_SEED_TENANT_ID] },
    })
      .select({ _id: 0, tenantId: 1, id: 1, url: 1 })
      .lean(),
  ]);

  const mergedDomains = mergeTenantAndSeedDocuments(
    tenantId,
    domains as DomainDoc[],
    (domain) => domain.id,
    (_, id) => overlayState.deletedDomainIds.has(id),
  );

  return new Set(mergedDomains.map((domain) => normalizeSiteUrl(domain.url)));
}

async function getMergedGSCBySiteUrls(
  tenantId: string,
  siteUrls: string[],
): Promise<Map<string, MockGSCRecord[]>> {
  if (!siteUrls.length) {
    return new Map<string, MockGSCRecord[]>();
  }

  const docs = await RankTrackerGSCSiteModel.find({
    tenantId: { $in: [tenantId, SHARED_SEED_TENANT_ID] },
    siteUrl: { $in: siteUrls },
  })
    .select({ _id: 0, tenantId: 1, siteUrl: 1, records: 1 })
    .lean();

  const merged = mergeTenantAndSeedDocuments(
    tenantId,
    docs as GSCDoc[],
    (doc) => doc.siteUrl,
    () => false,
  );

  return new Map(
    merged.map((doc) => [doc.siteUrl, (doc.records || []) as MockGSCRecord[]]),
  );
}

export async function getGSCKeywords(siteUrl: string) {
  const tenantId = await getCurrentTenantId();
  await ensureDatabase(tenantId);

  const visibleSiteUrls = await getVisibleDomainSiteUrls(tenantId);
  const candidates = buildSiteUrlCandidates(siteUrl).filter((candidate) =>
    visibleSiteUrls.has(candidate),
  );

  if (!candidates.length) {
    return {
      success: true,
      records: [],
    };
  }

  const bySiteUrl = await getMergedGSCBySiteUrls(tenantId, candidates);

  for (const candidate of candidates) {
    const records = bySiteUrl.get(candidate);
    if (records) {
      return {
        success: true,
        records,
      };
    }
  }

  return {
    success: true,
    records: [],
  };
}

export async function getGSCKeywordsBySiteUrls(siteUrls: string[]) {
  const tenantId = await getCurrentTenantId();
  await ensureDatabase(tenantId);

  const normalized = Array.from(
    new Set(siteUrls.map((siteUrl) => normalizeSiteUrl(siteUrl))),
  );

  if (!normalized.length) {
    return new Map<string, { success: true; records: MockGSCRecord[] }>();
  }

  const visibleSiteUrls = await getVisibleDomainSiteUrls(tenantId);
  const allowed = normalized.filter((siteUrl) => visibleSiteUrls.has(siteUrl));
  const bySiteUrl = await getMergedGSCBySiteUrls(tenantId, allowed);

  return new Map(
    normalized.map((siteUrl) => [
      siteUrl,
      {
        success: true as const,
        records: bySiteUrl.get(siteUrl) || [],
      },
    ]),
  );
}

export async function getKeywordInsights({
  domain,
  keywords,
}: {
  domain: string;
  keywords?: string[];
}) {
  const tenantId = await getCurrentTenantId();
  await ensureDatabase(tenantId);

  const visibleSiteUrls = await getVisibleDomainSiteUrls(tenantId);
  const requestedCandidates = buildSiteUrlCandidates(domain).filter((candidate) =>
    visibleSiteUrls.has(candidate),
  );

  const candidateSiteUrls = requestedCandidates.length
    ? requestedCandidates
    : Array.from(visibleSiteUrls);
  const bySiteUrl = await getMergedGSCBySiteUrls(tenantId, candidateSiteUrls);

  let source: MockGSCRecord[] = [];

  for (const candidate of requestedCandidates) {
    const records = bySiteUrl.get(candidate);
    if (records && records.length) {
      source = records;
      break;
    }
  }

  if (!source.length) {
    for (const records of bySiteUrl.values()) {
      if (records.length) {
        source = records;
        break;
      }
    }
  }

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
  const tenantId = await getCurrentTenantId();
  await ensureDatabase(tenantId);

  const suggestedProperties = [
    "sc-domain:coffeecircle.dk",
    "sc-domain:fjordfitness.com",
    "sc-domain:cleanbeautyhub.dk",
  ];

  const visibleSiteUrls = await getVisibleDomainSiteUrls(tenantId);
  const existingProperties = Array.from(visibleSiteUrls);

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
