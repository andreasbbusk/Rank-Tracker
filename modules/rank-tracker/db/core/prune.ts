import "server-only";

import { connectToDatabase } from "../config/connection";
import { clearTenantInitializationCache } from "./database";
import { getTenantStaleCutoffDate } from "./retention";
import { RankTrackerDomainModel } from "../models/domain.model";
import { RankTrackerGSCSiteModel } from "../models/gsc-site.model";
import { RankTrackerKeywordModel } from "../models/keyword.model";
import { RankTrackerMetaModel } from "../models/meta.model";
import { RankTrackerReportModel } from "../models/report.model";
import { RankTrackerTagModel } from "../models/tag.model";

type PruneSummary = {
  timestamp: string;
  staleCutoff: string;
  tenants: number;
  domains: number;
  keywords: number;
  tags: number;
  reports: number;
  gscSites: number;
};

export async function pruneStaleTenants(): Promise<PruneSummary> {
  await connectToDatabase();

  const now = new Date();
  const staleCutoff = getTenantStaleCutoffDate(now);
  const staleMetas = await RankTrackerMetaModel.find(
    {
      key: "rank-tracker-main",
      $or: [{ lastActiveAt: { $lte: staleCutoff } }, { lastActiveAt: null }],
    },
    { tenantId: 1 },
  ).lean();

  const staleTenantIds = Array.from(
    new Set(
      staleMetas
        .map((meta) => meta.tenantId)
        .filter((tenantId): tenantId is string => Boolean(tenantId)),
    ),
  );

  if (!staleTenantIds.length) {
    return {
      timestamp: now.toISOString(),
      staleCutoff: staleCutoff.toISOString(),
      tenants: 0,
      domains: 0,
      keywords: 0,
      tags: 0,
      reports: 0,
      gscSites: 0,
    };
  }

  const [domainsResult, keywordsResult, tagsResult, reportsResult, gscResult] =
    await Promise.all([
      RankTrackerDomainModel.deleteMany({
        tenantId: { $in: staleTenantIds },
      }),
      RankTrackerKeywordModel.deleteMany({
        tenantId: { $in: staleTenantIds },
      }),
      RankTrackerTagModel.deleteMany({
        tenantId: { $in: staleTenantIds },
      }),
      RankTrackerReportModel.deleteMany({
        tenantId: { $in: staleTenantIds },
      }),
      RankTrackerGSCSiteModel.deleteMany({
        tenantId: { $in: staleTenantIds },
      }),
    ]);

  await RankTrackerMetaModel.deleteMany({
    tenantId: { $in: staleTenantIds },
  });

  for (const tenantId of staleTenantIds) {
    clearTenantInitializationCache(tenantId);
  }

  return {
    timestamp: now.toISOString(),
    staleCutoff: staleCutoff.toISOString(),
    tenants: staleTenantIds.length,
    domains: domainsResult.deletedCount ?? 0,
    keywords: keywordsResult.deletedCount ?? 0,
    tags: tagsResult.deletedCount ?? 0,
    reports: reportsResult.deletedCount ?? 0,
    gscSites: gscResult.deletedCount ?? 0,
  };
}
