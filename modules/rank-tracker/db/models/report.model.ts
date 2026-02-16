import mongoose, { Schema } from "mongoose";

const ReportSchema = new Schema(
  {
    tenantId: { type: String, required: true, index: true },
    id: { type: String, required: true, index: true },
    domainId: { type: String, required: true },
    reportData: { type: Schema.Types.Mixed, required: true },
    createdAt: { type: String, required: true },
    updatedAt: { type: String, required: true },
  },
  { versionKey: false },
);

ReportSchema.index({ tenantId: 1, id: 1 }, { unique: true });
ReportSchema.index({ tenantId: 1, domainId: 1, updatedAt: -1 });

export const RankTrackerReportModel =
  mongoose.models.RankTrackerReport ||
  mongoose.model("RankTrackerReport", ReportSchema);
