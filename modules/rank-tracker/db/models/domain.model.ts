import mongoose, { Schema } from "mongoose";

const DomainSchema = new Schema(
  {
    tenantId: { type: String, required: true, index: true },
    id: { type: String, required: true, index: true },
    team: { type: String, required: true },
    url: { type: String, required: true },
    display_name: { type: String, required: true },
    display_name_lower: { type: String, required: true },
    isSeeded: { type: Boolean, required: true, default: false },
    pruneAfter: { type: Date, default: null },
    created_at: { type: String, required: true },
    updated_at: { type: String, required: true },
  },
  { versionKey: false },
);

DomainSchema.index({ tenantId: 1, id: 1 }, { unique: true });
DomainSchema.index({ tenantId: 1, display_name_lower: 1 });
DomainSchema.index({ tenantId: 1, created_at: -1, id: 1 });
DomainSchema.index({ tenantId: 1, url: 1 });
DomainSchema.index(
  { pruneAfter: 1 },
  {
    expireAfterSeconds: 0,
    partialFilterExpression: { isSeeded: false, pruneAfter: { $type: "date" } },
  },
);

export const RankTrackerDomainModel =
  mongoose.models.RankTrackerDomain ||
  mongoose.model("RankTrackerDomain", DomainSchema);
