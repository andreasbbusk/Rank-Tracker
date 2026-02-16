import { Schema } from "mongoose";

export const DailyStatSchema = new Schema(
  {
    created_at: { type: String, required: true },
    page: { type: String, required: true },
    position: { type: Number, required: true },
    clicks: { type: Number, required: true },
    impressions: { type: Number, required: true },
  },
  { _id: false },
);

export const KeywordRangeSchema = new Schema(
  {
    position: { type: Number, required: true },
    clicks: { type: Number, required: true },
    impressions: { type: Number, required: true },
    landing_page: { type: String, required: true },
    daily_stats: { type: [DailyStatSchema], default: [] },
  },
  { _id: false },
);

export const LocationSchema = new Schema(
  {
    id: { type: Number, required: true },
    team: { type: Number, required: true },
    country: { type: String, required: true },
    device: { type: String, required: true },
    lang_const: { type: String, required: true },
    geo_const: { type: String, required: true },
  },
  { _id: false },
);

export const KeywordNoteSchema = new Schema(
  {
    id: { type: Number, required: true },
    description: { type: String, required: true },
    created_at: { type: String, required: true },
    updated_at: { type: String, required: true },
  },
  { _id: false },
);

export const GSCRecordSchema = new Schema(
  {
    query: { type: String, required: true },
    clicks: { type: Number, required: true },
    impressions: { type: Number, required: true },
    ctr: { type: Number, required: true },
    position: { type: Number, required: true },
  },
  { _id: false },
);
