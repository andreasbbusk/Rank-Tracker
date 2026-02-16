import mongoose, { Schema } from "mongoose";
import {
  KeywordNoteSchema,
  KeywordRangeSchema,
  LocationSchema,
} from "./core/schemas";

const KeywordSchema = new Schema(
  {
    id: { type: Number, required: true, unique: true, index: true },
    domainId: { type: String, required: true, index: true },
    title: { type: String, required: true },
    title_lower: { type: String, required: true, index: true },
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

KeywordSchema.index({ domainId: 1, title_lower: 1 }, { unique: true });

export const RankTrackerKeywordModel =
  mongoose.models.RankTrackerKeyword ||
  mongoose.model("RankTrackerKeyword", KeywordSchema);
