import mongoose, { Schema } from "mongoose";
import { GSCRecordSchema } from "./core/schemas";

const GSCSiteSchema = new Schema(
  {
    tenantId: { type: String, required: true, index: true },
    siteUrl: { type: String, required: true, index: true },
    isSeeded: { type: Boolean, required: true, default: false },
    pruneAfter: { type: Date, default: null },
    records: { type: [GSCRecordSchema], default: [] },
  },
  { versionKey: false },
);

GSCSiteSchema.index({ tenantId: 1, siteUrl: 1 }, { unique: true });
GSCSiteSchema.index(
  { pruneAfter: 1 },
  {
    expireAfterSeconds: 0,
    partialFilterExpression: { isSeeded: false, pruneAfter: { $type: "date" } },
  },
);

export const RankTrackerGSCSiteModel =
  mongoose.models.RankTrackerGSCSite ||
  mongoose.model("RankTrackerGSCSite", GSCSiteSchema);
