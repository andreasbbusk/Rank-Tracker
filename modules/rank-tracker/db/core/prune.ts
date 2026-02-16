import "server-only";

import { connectToDatabase } from "../config/connection";
import {
  clearTenantInitializationCache,
  DB_NAMESPACE,
  SHARED_SEED_TENANT_ID,
} from "./database";
import { RankTrackerDomainModel } from "../models/domain.model";
import { RankTrackerGSCSiteModel } from "../models/gsc-site.model";
import { RankTrackerKeywordModel } from "../models/keyword.model";
import { RankTrackerMetaModel } from "../models/meta.model";
import { RankTrackerReportModel } from "../models/report.model";
import { RankTrackerTagModel } from "../models/tag.model";

type PruneSummary = {
  timestamp: string;
  strategy: "full-non-seed";
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
  const nonSeedMetas = await RankTrackerMetaModel.find(
    {
      key: DB_NAMESPACE,
      tenantId: { $ne: SHARED_SEED_TENANT_ID },
    },
    { tenantId: 1 },
  ).lean();

  const nonSeedTenantIds = Array.from(
    new Set(
      nonSeedMetas
        .map((meta) => meta.tenantId)
        .filter((tenantId): tenantId is string => Boolean(tenantId)),
    ),
  );

  const nonSeedFilter = { tenantId: { $ne: SHARED_SEED_TENANT_ID } };

  const [domainsResult, keywordsResult, tagsResult, reportsResult, gscResult] =
    await Promise.all([
      RankTrackerDomainModel.deleteMany(nonSeedFilter),
      RankTrackerKeywordModel.deleteMany(nonSeedFilter),
      RankTrackerTagModel.deleteMany(nonSeedFilter),
      RankTrackerReportModel.deleteMany(nonSeedFilter),
      RankTrackerGSCSiteModel.deleteMany(nonSeedFilter),
    ]);

  await RankTrackerMetaModel.deleteMany(nonSeedFilter);

  for (const tenantId of nonSeedTenantIds) {
    clearTenantInitializationCache(tenantId);
  }

  return {
    timestamp: now.toISOString(),
    strategy: "full-non-seed",
    tenants: nonSeedTenantIds.length,
    domains: domainsResult.deletedCount ?? 0,
    keywords: keywordsResult.deletedCount ?? 0,
    tags: tagsResult.deletedCount ?? 0,
    reports: reportsResult.deletedCount ?? 0,
    gscSites: gscResult.deletedCount ?? 0,
  };
}
