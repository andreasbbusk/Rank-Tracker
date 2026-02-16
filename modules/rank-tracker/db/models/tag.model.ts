import mongoose, { Schema } from "mongoose";

const TagSchema = new Schema(
  {
    id: { type: Number, required: true, unique: true, index: true },
    domainId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    name_lower: { type: String, required: true, index: true },
    created_at: { type: String, required: true },
  },
  { versionKey: false },
);

TagSchema.index({ domainId: 1, name_lower: 1 }, { unique: true });

export const RankTrackerTagModel =
  mongoose.models.RankTrackerTag || mongoose.model("RankTrackerTag", TagSchema);
