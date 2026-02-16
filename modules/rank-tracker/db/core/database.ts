import { connectToDatabase } from "../config/connection";
import { getCurrentTenantId } from "./tenant";
import { RankTrackerDomainModel } from "../models/domain.model";
import { RankTrackerGSCSiteModel } from "../models/gsc-site.model";
import { RankTrackerKeywordModel } from "../models/keyword.model";
import { RankTrackerMetaModel } from "../models/meta.model";
import { RankTrackerReportModel } from "../models/report.model";
import { RankTrackerTagModel } from "../models/tag.model";
import { buildSeedDatabase, SEED_VERSION } from "../seed/seed-database";

const DB_NAMESPACE = "rank-tracker-main";
const TENANT_ACTIVITY_TOUCH_INTERVAL_MS = 5 * 60 * 1000;

const initPromises = new Map<string, Promise<void>>();
const tenantLastTouchedAt = new Map<string, number>();
let indexSyncPromise: Promise<void> | null = null;

async function ensureMultiTenantIndexes() {
  if (!indexSyncPromise) {
    indexSyncPromise = (async () => {
      const useCreateIndexes = process.env.NODE_ENV === "production";

      await Promise.all([
        useCreateIndexes
          ? RankTrackerDomainModel.createIndexes()
          : RankTrackerDomainModel.syncIndexes(),
        useCreateIndexes
          ? RankTrackerTagModel.createIndexes()
          : RankTrackerTagModel.syncIndexes(),
        useCreateIndexes
          ? RankTrackerKeywordModel.createIndexes()
          : RankTrackerKeywordModel.syncIndexes(),
        useCreateIndexes
          ? RankTrackerGSCSiteModel.createIndexes()
          : RankTrackerGSCSiteModel.syncIndexes(),
        useCreateIndexes
          ? RankTrackerReportModel.createIndexes()
          : RankTrackerReportModel.syncIndexes(),
        useCreateIndexes
          ? RankTrackerMetaModel.createIndexes()
          : RankTrackerMetaModel.syncIndexes(),
      ]);
    })().catch((error) => {
      indexSyncPromise = null;
      throw error;
    });
  }

  await indexSyncPromise;
}

async function resolveTenantId(tenantId?: string): Promise<string> {
  if (tenantId && tenantId.trim()) {
    return tenantId.trim();
  }

  return getCurrentTenantId();
}

async function touchTenantActivity(
  tenantId: string,
  force = false,
): Promise<void> {
  const now = Date.now();
  const lastTouchedAt = tenantLastTouchedAt.get(tenantId);

  if (
    !force &&
    typeof lastTouchedAt === "number" &&
    now - lastTouchedAt < TENANT_ACTIVITY_TOUCH_INTERVAL_MS
  ) {
    return;
  }

  tenantLastTouchedAt.set(tenantId, now);

  await RankTrackerMetaModel.updateOne(
    { tenantId, key: DB_NAMESPACE },
    {
      $set: { lastActiveAt: new Date(now) },
      $setOnInsert: { tenantId, key: DB_NAMESPACE },
    },
    { upsert: true },
  );
}

export async function ensureDatabase(tenantId?: string) {
  const activeTenantId = await resolveTenantId(tenantId);

  if (!initPromises.has(activeTenantId)) {
    const tenantInitPromise = (async () => {
      await connectToDatabase();
      await ensureMultiTenantIndexes();

      const meta = await RankTrackerMetaModel.findOne({
        tenantId: activeTenantId,
        key: DB_NAMESPACE,
      }).lean();

      if (meta?.seed_version === SEED_VERSION) {
        await touchTenantActivity(activeTenantId);
        return;
      }

      const seed = buildSeedDatabase();

      await Promise.all([
        RankTrackerDomainModel.deleteMany({ tenantId: activeTenantId }),
        RankTrackerTagModel.deleteMany({ tenantId: activeTenantId }),
        RankTrackerKeywordModel.deleteMany({ tenantId: activeTenantId }),
        RankTrackerGSCSiteModel.deleteMany({ tenantId: activeTenantId }),
        RankTrackerReportModel.deleteMany({ tenantId: activeTenantId }),
      ]);

      if (seed.domains.length) {
        await RankTrackerDomainModel.insertMany(
          seed.domains.map((domain) => ({
            tenantId: activeTenantId,
            isSeeded: true,
            pruneAfter: null,
            ...domain,
            display_name_lower: domain.display_name.trim().toLowerCase(),
          })),
        );
      }

      if (seed.tags.length) {
        await RankTrackerTagModel.insertMany(
          seed.tags.map((tag) => ({
            tenantId: activeTenantId,
            isSeeded: true,
            pruneAfter: null,
            ...tag,
            name_lower: tag.name.trim().toLowerCase(),
          })),
        );
      }

      if (seed.keywords.length) {
        await RankTrackerKeywordModel.insertMany(
          seed.keywords.map((keyword) => ({
            tenantId: activeTenantId,
            isSeeded: true,
            pruneAfter: null,
            ...keyword,
            title_lower: keyword.title.trim().toLowerCase(),
          })),
        );
      }

      const gscEntries = Object.entries(seed.gscBySiteUrl).map(
        ([siteUrl, records]) => ({
          tenantId: activeTenantId,
          isSeeded: true,
          pruneAfter: null,
          siteUrl,
          records,
        }),
      );

      if (gscEntries.length) {
        await RankTrackerGSCSiteModel.insertMany(gscEntries);
      }

      await RankTrackerMetaModel.updateOne(
        { tenantId: activeTenantId, key: DB_NAMESPACE },
        {
          $set: {
            tenantId: activeTenantId,
            key: DB_NAMESPACE,
            lastActiveAt: new Date(),
            ...seed.meta,
          },
        },
        { upsert: true },
      );
    })().catch((error) => {
      initPromises.delete(activeTenantId);
      throw error;
    });

    initPromises.set(activeTenantId, tenantInitPromise);
  }

  await initPromises.get(activeTenantId);
  void touchTenantActivity(activeTenantId).catch((error) => {
    console.error("Failed to update tenant activity", error);
  });
}

type CounterField =
  | "nextDomainId"
  | "nextKeywordId"
  | "nextTagId"
  | "nextNoteId";

function buildCounterRange(start: number, count: number): number[] {
  return Array.from({ length: count }, (_, index) => start + index);
}

export async function reserveCounterRange(
  field: CounterField,
  count: number,
  tenantId?: string,
): Promise<number[]> {
  const activeTenantId = await resolveTenantId(tenantId);
  await ensureDatabase(activeTenantId);

  if (count <= 0) {
    return [];
  }

  const current = await RankTrackerMetaModel.findOneAndUpdate(
    { tenantId: activeTenantId, key: DB_NAMESPACE },
    {
      $inc: { [field]: count },
      $set: { lastActiveAt: new Date() },
      $setOnInsert: {
        tenantId: activeTenantId,
        key: DB_NAMESPACE,
      },
    },
    { new: false, upsert: true, setDefaultsOnInsert: true },
  ).lean();

  const value = current?.[field];
  if (typeof value === "number") {
    return buildCounterRange(value, count);
  }

  const fallback = await RankTrackerMetaModel.findOne({
    tenantId: activeTenantId,
    key: DB_NAMESPACE,
  }).lean();
  const fallbackValue = fallback?.[field];
  if (typeof fallbackValue === "number") {
    return buildCounterRange(Math.max(1, fallbackValue - count), count);
  }

  return buildCounterRange(1, count);
}

export async function getNextCounter(
  field: CounterField,
  tenantId?: string,
): Promise<number> {
  const [next] = await reserveCounterRange(field, 1, tenantId);
  return next ?? 1;
}

export async function resetDatabase(tenantId?: string): Promise<void> {
  const activeTenantId = await resolveTenantId(tenantId);

  await connectToDatabase();
  await ensureMultiTenantIndexes();

  await Promise.all([
    RankTrackerDomainModel.deleteMany({ tenantId: activeTenantId }),
    RankTrackerTagModel.deleteMany({ tenantId: activeTenantId }),
    RankTrackerKeywordModel.deleteMany({ tenantId: activeTenantId }),
    RankTrackerGSCSiteModel.deleteMany({ tenantId: activeTenantId }),
    RankTrackerReportModel.deleteMany({ tenantId: activeTenantId }),
    RankTrackerMetaModel.deleteMany({
      tenantId: activeTenantId,
      key: DB_NAMESPACE,
    }),
  ]);

  initPromises.delete(activeTenantId);
  tenantLastTouchedAt.delete(activeTenantId);
  await ensureDatabase(activeTenantId);
}

export function clearTenantInitializationCache(tenantId: string) {
  initPromises.delete(tenantId);
  tenantLastTouchedAt.delete(tenantId);
}
