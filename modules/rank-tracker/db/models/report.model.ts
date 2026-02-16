import mongoose, { Schema } from "mongoose";

const ReportSchema = new Schema(
  {
    tenantId: { type: String, required: true, index: true },
    id: { type: String, required: true, index: true },
    domainId: { type: String, required: true },
    isSeeded: { type: Boolean, required: true, default: false },
    pruneAfter: { type: Date, default: null },
    reportData: { type: Schema.Types.Mixed, required: true },
    createdAt: { type: String, required: true },
    updatedAt: { type: String, required: true },
  },
  { versionKey: false },
);

ReportSchema.index({ tenantId: 1, id: 1 }, { unique: true });
ReportSchema.index({ tenantId: 1, domainId: 1, updatedAt: -1 });
ReportSchema.index(
  { pruneAfter: 1 },
  {
    expireAfterSeconds: 0,
    partialFilterExpression: { isSeeded: false, pruneAfter: { $type: "date" } },
  },
);

export const RankTrackerReportModel =
  mongoose.models.RankTrackerReport ||
  mongoose.model("RankTrackerReport", ReportSchema);
