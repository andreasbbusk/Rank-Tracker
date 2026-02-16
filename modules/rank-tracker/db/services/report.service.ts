import { connectToDatabase } from "../config/connection";
import { RankTrackerReportModel } from "../models/report.model";
import { KeywordReport } from "../../types";

export async function persistReport(report: KeywordReport): Promise<void> {
  await connectToDatabase();
  await RankTrackerReportModel.updateOne(
    { id: report.id },
    {
      $set: {
        id: report.id,
        domainId: String(report.domain.id || ""),
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
  await connectToDatabase();
  const doc = await RankTrackerReportModel.findOne({ id: reportId })
    .select({ _id: 0, reportData: 1 })
    .lean();
  return (doc?.reportData as KeywordReport) || null;
}

export async function deleteReportById(reportId: string): Promise<boolean> {
  await connectToDatabase();
  const result = await RankTrackerReportModel.deleteOne({ id: reportId });
  return result.deletedCount > 0;
}

export async function listReportsByDomainId(
  domainId: string,
): Promise<KeywordReport[]> {
  await connectToDatabase();
  const docs = await RankTrackerReportModel.find({
    domainId: String(domainId),
  })
    .select({ _id: 0, reportData: 1 })
    .sort({ updatedAt: -1 })
    .lean();

  return docs
    .map((doc) => doc.reportData as KeywordReport)
    .filter((report): report is KeywordReport => Boolean(report));
}
