import mongoose, { Schema } from "mongoose";

const MetaSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, index: true },
    seed_version: { type: Number, required: true, default: 0 },
    nextDomainId: { type: Number, required: true, default: 1 },
    nextKeywordId: { type: Number, required: true, default: 1 },
    nextTagId: { type: Number, required: true, default: 1 },
    nextNoteId: { type: Number, required: true, default: 1 },
  },
  { versionKey: false },
);

export const RankTrackerMetaModel =
  mongoose.models.RankTrackerMeta ||
  mongoose.model("RankTrackerMeta", MetaSchema);
