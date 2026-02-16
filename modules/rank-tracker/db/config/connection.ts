import "server-only";

import mongoose from "mongoose";

type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

declare global {
  // eslint-disable-next-line no-var
  var __rankTrackerMongooseCache__: MongooseCache | undefined;
}

const globalCache = globalThis as typeof globalThis & {
  __rankTrackerMongooseCache__?: MongooseCache;
};

const cache: MongooseCache = globalCache.__rankTrackerMongooseCache__ ?? {
  conn: null,
  promise: null,
};

if (!globalCache.__rankTrackerMongooseCache__) {
  globalCache.__rankTrackerMongooseCache__ = cache;
}

export async function connectToDatabase() {
  if (cache.conn) {
    return cache.conn;
  }

  if (!cache.promise) {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error("Missing MONGODB_URI environment variable");
    }

    cache.promise = mongoose.connect(mongoUri, {
      bufferCommands: false,
      dbName: process.env.MONGODB_DB_NAME || "rank_tracker_portfolio",
    });
  }

  cache.conn = await cache.promise;
  return cache.conn;
}
