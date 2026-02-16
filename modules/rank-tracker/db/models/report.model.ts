import mongoose, { Schema } from "mongoose";

const ReportSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    domainId: { type: String, required: true, index: true },
    reportData: { type: Schema.Types.Mixed, required: true },
    createdAt: { type: String, required: true },
    updatedAt: { type: String, required: true },
  },
  { versionKey: false },
);

export const RankTrackerReportModel =
  mongoose.models.RankTrackerReport ||
  mongoose.model("RankTrackerReport", ReportSchema);
