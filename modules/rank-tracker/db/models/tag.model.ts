import mongoose, { Schema } from "mongoose";

const TagSchema = new Schema(
  {
    tenantId: { type: String, required: true, index: true },
    id: { type: Number, required: true, index: true },
    domainId: { type: String, required: true },
    name: { type: String, required: true },
    name_lower: { type: String, required: true },
    created_at: { type: String, required: true },
  },
  { versionKey: false },
);

TagSchema.index({ tenantId: 1, id: 1 }, { unique: true });
TagSchema.index({ tenantId: 1, domainId: 1, name_lower: 1 }, { unique: true });

export const RankTrackerTagModel =
  mongoose.models.RankTrackerTag || mongoose.model("RankTrackerTag", TagSchema);
