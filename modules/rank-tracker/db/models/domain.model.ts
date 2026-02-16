import mongoose, { Schema } from "mongoose";

const DomainSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    team: { type: String, required: true },
    url: { type: String, required: true },
    display_name: { type: String, required: true },
    display_name_lower: { type: String, required: true, index: true },
    created_at: { type: String, required: true },
    updated_at: { type: String, required: true },
  },
  { versionKey: false },
);

DomainSchema.index({ created_at: -1, id: 1 });
DomainSchema.index({ url: 1 });

export const RankTrackerDomainModel =
  mongoose.models.RankTrackerDomain ||
  mongoose.model("RankTrackerDomain", DomainSchema);
