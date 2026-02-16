import mongoose, { Schema } from "mongoose";
import {
  KeywordNoteSchema,
  KeywordRangeSchema,
  LocationSchema,
} from "./core/schemas";

const KeywordSchema = new Schema(
  {
    tenantId: { type: String, required: true, index: true },
    id: { type: Number, required: true, index: true },
    domainId: { type: String, required: true },
    title: { type: String, required: true },
    title_lower: { type: String, required: true },
    isSeeded: { type: Boolean, required: true, default: false },
    pruneAfter: { type: Date, default: null },
    star_keyword: { type: Boolean, required: true, default: false },
    location: { type: LocationSchema, required: true },
    tagIds: { type: [Number], default: [] },
    notes: { type: [KeywordNoteSchema], default: [] },
    latest_fetch: { type: String, default: null },
    created_at: { type: String, required: true },
    updated_at: { type: String, required: true },
    preferred_url: { type: String, default: undefined },
    search_volume: { type: Number, required: true },
    current: { type: KeywordRangeSchema, required: true },
    previous: { type: KeywordRangeSchema, required: true },
    status: {
      type: String,
      enum: ["pending", "processed", "error"],
      required: true,
      default: "pending",
    },
    statusChecksRemaining: { type: Number, required: true, default: 0 },
  },
  { versionKey: false },
);

KeywordSchema.index({ tenantId: 1, id: 1 }, { unique: true });
KeywordSchema.index({ tenantId: 1, domainId: 1, title_lower: 1 }, { unique: true });
KeywordSchema.index({ tenantId: 1, domainId: 1, created_at: -1, id: 1 });
KeywordSchema.index({ tenantId: 1, domainId: 1, id: 1 });
KeywordSchema.index({ tenantId: 1, "notes.id": 1 });
KeywordSchema.index(
  { pruneAfter: 1 },
  {
    expireAfterSeconds: 0,
    partialFilterExpression: { isSeeded: false, pruneAfter: { $type: "date" } },
  },
);

export const RankTrackerKeywordModel =
  mongoose.models.RankTrackerKeyword ||
  mongoose.model("RankTrackerKeyword", KeywordSchema);
