import mongoose, { Schema } from "mongoose";

const DomainSchema = new Schema(
  {
    tenantId: { type: String, required: true, index: true },
    id: { type: String, required: true, index: true },
    team: { type: String, required: true },
    url: { type: String, required: true },
    display_name: { type: String, required: true },
    display_name_lower: { type: String, required: true },
    created_at: { type: String, required: true },
    updated_at: { type: String, required: true },
  },
  { versionKey: false },
);

DomainSchema.index({ tenantId: 1, id: 1 }, { unique: true });
DomainSchema.index({ tenantId: 1, display_name_lower: 1 });
DomainSchema.index({ tenantId: 1, created_at: -1, id: 1 });
DomainSchema.index({ tenantId: 1, url: 1 });

export const RankTrackerDomainModel =
  mongoose.models.RankTrackerDomain ||
  mongoose.model("RankTrackerDomain", DomainSchema);
