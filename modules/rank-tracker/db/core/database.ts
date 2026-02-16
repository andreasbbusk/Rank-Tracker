import { connectToDatabase } from "../config/connection";
import { getCurrentTenantId } from "./tenant";
import { RankTrackerDomainModel } from "../models/domain.model";
import { RankTrackerGSCSiteModel } from "../models/gsc-site.model";
import { RankTrackerKeywordModel } from "../models/keyword.model";
import { RankTrackerMetaModel } from "../models/meta.model";
import { RankTrackerReportModel } from "../models/report.model";
import { RankTrackerTagModel } from "../models/tag.model";
import { buildSeedDatabase, SEED_VERSION } from "../seed/seed-database";

export const DB_NAMESPACE = "rank-tracker-main";
export const SHARED_SEED_TENANT_ID = "__shared-seed__";

const TENANT_ACTIVITY_TOUCH_INTERVAL_MS = 5 * 60 * 1000;

const initPromises = new Map<string, Promise<void>>();
const tenantLastTouchedAt = new Map<string, number>();
let indexSyncPromise: Promise<void> | null = null;
const DEFAULT_SEED_COUNTERS = (() => {
  const seedMeta = buildSeedDatabase().meta;
  return {
    nextDomainId: seedMeta.nextDomainId,
    nextKeywordId: seedMeta.nextKeywordId,
    nextTagId: seedMeta.nextTagId,
    nextNoteId: seedMeta.nextNoteId,
  };
})();

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

function getSeedCounterDefaults() {
  return {
    nextDomainId: DEFAULT_SEED_COUNTERS.nextDomainId,
    nextKeywordId: DEFAULT_SEED_COUNTERS.nextKeywordId,
    nextTagId: DEFAULT_SEED_COUNTERS.nextTagId,
    nextNoteId: DEFAULT_SEED_COUNTERS.nextNoteId,
  };
}

function hasOverlayArrays(meta: any): boolean {
  return (
    Array.isArray(meta?.deletedDomainIds) &&
    Array.isArray(meta?.deletedKeywordIds) &&
    Array.isArray(meta?.deletedTagIds)
  );
}

function hasCounterFields(meta: any): boolean {
  return (
    typeof meta?.nextDomainId === "number" &&
    typeof meta?.nextKeywordId === "number" &&
    typeof meta?.nextTagId === "number" &&
    typeof meta?.nextNoteId === "number"
  );
}

function getMetaPatch(meta: any, fallbackCounters: ReturnType<typeof getSeedCounterDefaults>) {
  const patch: Record<string, unknown> = {};

  if (!Array.isArray(meta?.deletedDomainIds)) {
    patch.deletedDomainIds = [];
  }
  if (!Array.isArray(meta?.deletedKeywordIds)) {
    patch.deletedKeywordIds = [];
  }
  if (!Array.isArray(meta?.deletedTagIds)) {
    patch.deletedTagIds = [];
  }

  if (typeof meta?.nextDomainId !== "number") {
    patch.nextDomainId = fallbackCounters.nextDomainId;
  }
  if (typeof meta?.nextKeywordId !== "number") {
    patch.nextKeywordId = fallbackCounters.nextKeywordId;
  }
  if (typeof meta?.nextTagId !== "number") {
    patch.nextTagId = fallbackCounters.nextTagId;
  }
  if (typeof meta?.nextNoteId !== "number") {
    patch.nextNoteId = fallbackCounters.nextNoteId;
  }

  return patch;
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
      $setOnInsert: {
        tenantId,
        key: DB_NAMESPACE,
        seed_version: SEED_VERSION,
        deletedDomainIds: [],
        deletedKeywordIds: [],
        deletedTagIds: [],
        ...getSeedCounterDefaults(),
      },
    },
    { upsert: true },
  );
}

async function clearTenantCollections(tenantId: string): Promise<void> {
  await Promise.all([
    RankTrackerDomainModel.deleteMany({ tenantId }),
    RankTrackerTagModel.deleteMany({ tenantId }),
    RankTrackerKeywordModel.deleteMany({ tenantId }),
    RankTrackerGSCSiteModel.deleteMany({ tenantId }),
    RankTrackerReportModel.deleteMany({ tenantId }),
  ]);
}

async function initializeSharedSeedTenant(): Promise<void> {
  const sharedMeta = await RankTrackerMetaModel.findOne({
    tenantId: SHARED_SEED_TENANT_ID,
    key: DB_NAMESPACE,
  }).lean();

  const seedCounters = getSeedCounterDefaults();

  if (
    sharedMeta?.seed_version === SEED_VERSION &&
    hasOverlayArrays(sharedMeta) &&
    hasCounterFields(sharedMeta)
  ) {
    await touchTenantActivity(SHARED_SEED_TENANT_ID);
    return;
  }

  const seed = buildSeedDatabase();

  await clearTenantCollections(SHARED_SEED_TENANT_ID);

  if (seed.domains.length) {
    await RankTrackerDomainModel.insertMany(
      seed.domains.map((domain) => ({
        tenantId: SHARED_SEED_TENANT_ID,
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
        tenantId: SHARED_SEED_TENANT_ID,
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
        tenantId: SHARED_SEED_TENANT_ID,
        isSeeded: true,
        pruneAfter: null,
        ...keyword,
        title_lower: keyword.title.trim().toLowerCase(),
      })),
    );
  }

  const gscEntries = Object.entries(seed.gscBySiteUrl).map(
    ([siteUrl, records]) => ({
      tenantId: SHARED_SEED_TENANT_ID,
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
    { tenantId: SHARED_SEED_TENANT_ID, key: DB_NAMESPACE },
    {
      $set: {
        tenantId: SHARED_SEED_TENANT_ID,
        key: DB_NAMESPACE,
        lastActiveAt: new Date(),
        deletedDomainIds: [],
        deletedKeywordIds: [],
        deletedTagIds: [],
        ...seed.meta,
      },
    },
    { upsert: true },
  );

  if (Object.keys(getMetaPatch(sharedMeta, seedCounters)).length > 0) {
    await RankTrackerMetaModel.updateOne(
      { tenantId: SHARED_SEED_TENANT_ID, key: DB_NAMESPACE },
      {
        $set: getMetaPatch(sharedMeta, seedCounters),
      },
    );
  }
}

async function initializeTenantOverlay(tenantId: string): Promise<void> {
  await ensureDatabase(SHARED_SEED_TENANT_ID);

  const [
    tenantMeta,
    sharedMeta,
    hasLegacySeededDomain,
    hasLegacySeededKeyword,
    hasLegacySeededTag,
    hasLegacySeededGSC,
  ] = await Promise.all([
    RankTrackerMetaModel.findOne({
      tenantId,
      key: DB_NAMESPACE,
    }).lean(),
    RankTrackerMetaModel.findOne({
      tenantId: SHARED_SEED_TENANT_ID,
      key: DB_NAMESPACE,
    }).lean(),
    RankTrackerDomainModel.exists({ tenantId, isSeeded: true }),
    RankTrackerKeywordModel.exists({ tenantId, isSeeded: true }),
    RankTrackerTagModel.exists({ tenantId, isSeeded: true }),
    RankTrackerGSCSiteModel.exists({ tenantId, isSeeded: true }),
  ]);

  const hasLegacySeededDocs = Boolean(
    hasLegacySeededDomain ||
      hasLegacySeededKeyword ||
      hasLegacySeededTag ||
      hasLegacySeededGSC,
  );

  const seedCounterDefaults = getSeedCounterDefaults();
  const counterDefaults = {
    nextDomainId:
      typeof sharedMeta?.nextDomainId === "number"
        ? sharedMeta.nextDomainId
        : seedCounterDefaults.nextDomainId,
    nextKeywordId:
      typeof sharedMeta?.nextKeywordId === "number"
        ? sharedMeta.nextKeywordId
        : seedCounterDefaults.nextKeywordId,
    nextTagId:
      typeof sharedMeta?.nextTagId === "number"
        ? sharedMeta.nextTagId
        : seedCounterDefaults.nextTagId,
    nextNoteId:
      typeof sharedMeta?.nextNoteId === "number"
        ? sharedMeta.nextNoteId
        : seedCounterDefaults.nextNoteId,
  };

  if (tenantMeta?.seed_version !== SEED_VERSION || hasLegacySeededDocs) {
    await clearTenantCollections(tenantId);

    await RankTrackerMetaModel.updateOne(
      { tenantId, key: DB_NAMESPACE },
      {
        $set: {
          tenantId,
          key: DB_NAMESPACE,
          seed_version: SEED_VERSION,
          lastActiveAt: new Date(),
          deletedDomainIds: [],
          deletedKeywordIds: [],
          deletedTagIds: [],
          ...counterDefaults,
        },
      },
      { upsert: true },
    );

    return;
  }

  const patch = getMetaPatch(tenantMeta, counterDefaults);
  if (Object.keys(patch).length > 0) {
    await RankTrackerMetaModel.updateOne(
      { tenantId, key: DB_NAMESPACE },
      { $set: patch },
    );
  }

  await touchTenantActivity(tenantId);
}

export async function ensureDatabase(tenantId?: string) {
  const activeTenantId = await resolveTenantId(tenantId);

  if (!initPromises.has(activeTenantId)) {
    const tenantInitPromise = (async () => {
      await connectToDatabase();
      await ensureMultiTenantIndexes();

      if (activeTenantId === SHARED_SEED_TENANT_ID) {
        await initializeSharedSeedTenant();
        return;
      }

      await initializeTenantOverlay(activeTenantId);
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

  const metaFilter = { tenantId: activeTenantId, key: DB_NAMESPACE };

  await RankTrackerMetaModel.updateOne(
    metaFilter,
    {
      $setOnInsert: {
        tenantId: activeTenantId,
        key: DB_NAMESPACE,
        seed_version: SEED_VERSION,
        deletedDomainIds: [],
        deletedKeywordIds: [],
        deletedTagIds: [],
        ...getSeedCounterDefaults(),
      },
    },
    { upsert: true },
  );

  const current = await RankTrackerMetaModel.findOneAndUpdate(
    metaFilter,
    {
      $inc: { [field]: count },
      $set: { lastActiveAt: new Date() },
    },
    { returnDocument: "before" },
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
