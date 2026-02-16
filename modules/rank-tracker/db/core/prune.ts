import "server-only";

import { connectToDatabase } from "../config/connection";
import { RankTrackerDomainModel } from "../models/domain.model";
import { RankTrackerGSCSiteModel } from "../models/gsc-site.model";
import { RankTrackerKeywordModel } from "../models/keyword.model";
import { RankTrackerReportModel } from "../models/report.model";
import { RankTrackerTagModel } from "../models/tag.model";

type PruneSummary = {
  timestamp: string;
  domains: number;
  keywords: number;
  tags: number;
  reports: number;
  gscSites: number;
};

export async function pruneExpiredNonSeededData(): Promise<PruneSummary> {
  await connectToDatabase();

  const now = new Date();

  const [domainsResult, keywordsResult, tagsResult, reportsResult, gscResult] =
    await Promise.all([
      RankTrackerDomainModel.deleteMany({
        isSeeded: false,
        pruneAfter: { $lte: now },
      }),
      RankTrackerKeywordModel.deleteMany({
        isSeeded: false,
        pruneAfter: { $lte: now },
      }),
      RankTrackerTagModel.deleteMany({
        isSeeded: false,
        pruneAfter: { $lte: now },
      }),
      RankTrackerReportModel.deleteMany({
        isSeeded: false,
        pruneAfter: { $lte: now },
      }),
      RankTrackerGSCSiteModel.deleteMany({
        isSeeded: false,
        pruneAfter: { $lte: now },
      }),
    ]);

  return {
    timestamp: now.toISOString(),
    domains: domainsResult.deletedCount ?? 0,
    keywords: keywordsResult.deletedCount ?? 0,
    tags: tagsResult.deletedCount ?? 0,
    reports: reportsResult.deletedCount ?? 0,
    gscSites: gscResult.deletedCount ?? 0,
  };
}
