import { connectToDatabase } from "../config/connection";
import { getCurrentTenantId } from "../core/tenant";
import { getNonSeededPruneAfterDate } from "../core/retention";
import { RankTrackerReportModel } from "../models/report.model";
import { KeywordReport } from "../../types";

export async function persistReport(report: KeywordReport): Promise<void> {
  const tenantId = await getCurrentTenantId();
  const pruneAfter = getNonSeededPruneAfterDate();
  await connectToDatabase();
  await RankTrackerReportModel.updateOne(
    { tenantId, id: report.id },
    {
      $set: {
        tenantId,
        id: report.id,
        domainId: String(report.domain.id || ""),
        isSeeded: false,
        pruneAfter,
        reportData: report,
        createdAt: report.createdAt,
        updatedAt: report.updatedAt,
      },
    },
    { upsert: true },
  );
}

export async function getReportById(
  reportId: string,
): Promise<KeywordReport | null> {
  const tenantId = await getCurrentTenantId();
  await connectToDatabase();
  const doc = await RankTrackerReportModel.findOne({ tenantId, id: reportId })
    .select({ _id: 0, reportData: 1 })
    .lean();
  return (doc?.reportData as KeywordReport) || null;
}

export async function deleteReportById(reportId: string): Promise<boolean> {
  const tenantId = await getCurrentTenantId();
  await connectToDatabase();
  const result = await RankTrackerReportModel.deleteOne({ tenantId, id: reportId });
  return result.deletedCount > 0;
}

export async function listReportsByDomainId(
  domainId: string,
): Promise<KeywordReport[]> {
  const tenantId = await getCurrentTenantId();
  await connectToDatabase();
  const docs = await RankTrackerReportModel.find({
    tenantId,
    domainId: String(domainId),
  })
    .select({ _id: 0, reportData: 1 })
    .sort({ updatedAt: -1 })
    .lean();

  return docs
    .map((doc) => doc.reportData as KeywordReport)
    .filter((report): report is KeywordReport => Boolean(report));
}

export async function countReportsByDomainId(domainId: string): Promise<number> {
  const tenantId = await getCurrentTenantId();
  await connectToDatabase();
  return RankTrackerReportModel.countDocuments({
    tenantId,
    domainId: String(domainId),
  });
}
