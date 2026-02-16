import { connectToDatabase } from "../config/connection";
import { RankTrackerDomainModel } from "../models/domain.model";
import { RankTrackerGSCSiteModel } from "../models/gsc-site.model";
import { RankTrackerKeywordModel } from "../models/keyword.model";
import { RankTrackerMetaModel } from "../models/meta.model";
import { RankTrackerReportModel } from "../models/report.model";
import { RankTrackerTagModel } from "../models/tag.model";
import { buildSeedDatabase, SEED_VERSION } from "../seed/seed-database";

const DB_NAMESPACE = "rank-tracker-main";

let initPromise: Promise<void> | null = null;

export async function ensureDatabase() {
  if (!initPromise) {
    initPromise = (async () => {
      await connectToDatabase();

      const meta = await RankTrackerMetaModel.findOne({
        key: DB_NAMESPACE,
      }).lean();

      if (meta?.seed_version === SEED_VERSION) {
        return;
      }

      const seed = buildSeedDatabase();

      await Promise.all([
        RankTrackerDomainModel.deleteMany({}),
        RankTrackerTagModel.deleteMany({}),
        RankTrackerKeywordModel.deleteMany({}),
        RankTrackerGSCSiteModel.deleteMany({}),
        RankTrackerReportModel.deleteMany({}),
      ]);

      if (seed.domains.length) {
        await RankTrackerDomainModel.insertMany(
          seed.domains.map((domain) => ({
            ...domain,
            display_name_lower: domain.display_name.trim().toLowerCase(),
          })),
        );
      }

      if (seed.tags.length) {
        await RankTrackerTagModel.insertMany(
          seed.tags.map((tag) => ({
            ...tag,
            name_lower: tag.name.trim().toLowerCase(),
          })),
        );
      }

      if (seed.keywords.length) {
        await RankTrackerKeywordModel.insertMany(
          seed.keywords.map((keyword) => ({
            ...keyword,
            title_lower: keyword.title.trim().toLowerCase(),
          })),
        );
      }

      const gscEntries = Object.entries(seed.gscBySiteUrl).map(
        ([siteUrl, records]) => ({
          siteUrl,
          records,
        }),
      );

      if (gscEntries.length) {
        await RankTrackerGSCSiteModel.insertMany(gscEntries);
      }

      await RankTrackerMetaModel.updateOne(
        { key: DB_NAMESPACE },
        { $set: { key: DB_NAMESPACE, ...seed.meta } },
        { upsert: true },
      );
    })().catch((error) => {
      initPromise = null;
      throw error;
    });
  }

  await initPromise;
}

type CounterField =
  | "nextDomainId"
  | "nextKeywordId"
  | "nextTagId"
  | "nextNoteId";

export async function getNextCounter(field: CounterField): Promise<number> {
  await ensureDatabase();

  const current = await RankTrackerMetaModel.findOneAndUpdate(
    { key: DB_NAMESPACE },
    { $inc: { [field]: 1 } },
    { new: false, upsert: true, setDefaultsOnInsert: true },
  ).lean();

  const value = current?.[field];
  if (typeof value === "number") {
    return value;
  }

  const fallback = await RankTrackerMetaModel.findOne({
    key: DB_NAMESPACE,
  }).lean();
  const fallbackValue = fallback?.[field];
  return typeof fallbackValue === "number" ? fallbackValue : 1;
}

export async function resetDatabase(): Promise<void> {
  await connectToDatabase();
  await Promise.all([
    RankTrackerDomainModel.deleteMany({}),
    RankTrackerTagModel.deleteMany({}),
    RankTrackerKeywordModel.deleteMany({}),
    RankTrackerGSCSiteModel.deleteMany({}),
    RankTrackerReportModel.deleteMany({}),
    RankTrackerMetaModel.deleteMany({ key: DB_NAMESPACE }),
  ]);

  initPromise = null;
  await ensureDatabase();
}
