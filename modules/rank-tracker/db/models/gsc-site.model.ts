import mongoose, { Schema } from "mongoose";
import { GSCRecordSchema } from "./core/schemas";

const GSCSiteSchema = new Schema(
  {
    siteUrl: { type: String, required: true, unique: true, index: true },
    records: { type: [GSCRecordSchema], default: [] },
  },
  { versionKey: false },
);

export const RankTrackerGSCSiteModel =
  mongoose.models.RankTrackerGSCSite ||
  mongoose.model("RankTrackerGSCSite", GSCSiteSchema);
