import mongoose, { Schema } from "mongoose";

const MetaSchema = new Schema(
  {
    tenantId: { type: String, required: true, index: true },
    key: { type: String, required: true, index: true },
    lastActiveAt: { type: Date, default: null, index: true },
    seed_version: { type: Number, required: true, default: 0 },
    nextDomainId: { type: Number, required: true, default: 1 },
    nextKeywordId: { type: Number, required: true, default: 1 },
    nextTagId: { type: Number, required: true, default: 1 },
    nextNoteId: { type: Number, required: true, default: 1 },
  },
  { versionKey: false },
);

MetaSchema.index({ tenantId: 1, key: 1 }, { unique: true });

export const RankTrackerMetaModel =
  mongoose.models.RankTrackerMeta ||
  mongoose.model("RankTrackerMeta", MetaSchema);
