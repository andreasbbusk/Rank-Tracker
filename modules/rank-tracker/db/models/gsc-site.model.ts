import mongoose, { Schema } from "mongoose";
import { GSCRecordSchema } from "./core/schemas";

const GSCSiteSchema = new Schema(
  {
    tenantId: { type: String, required: true, index: true },
    siteUrl: { type: String, required: true, index: true },
    records: { type: [GSCRecordSchema], default: [] },
  },
  { versionKey: false },
);

GSCSiteSchema.index({ tenantId: 1, siteUrl: 1 }, { unique: true });

export const RankTrackerGSCSiteModel =
  mongoose.models.RankTrackerGSCSite ||
  mongoose.model("RankTrackerGSCSite", GSCSiteSchema);
