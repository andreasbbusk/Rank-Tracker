import { ensureDatabase } from "../core/database";
import { RankTrackerKeywordModel } from "../models/keyword.model";
import { RankTrackerTagModel } from "../models/tag.model";
import { MockTag } from "../types";
import { normalizeTagName } from "../utils/normalizers";

export async function listTags(domainId: string) {
  await ensureDatabase();

  const domainKeywords = (await RankTrackerKeywordModel.find(
    { domainId: String(domainId) },
    { tagIds: 1 },
  ).lean()) as Array<{ tagIds: number[] }>;

  const keywordTags = new Set(
    domainKeywords.flatMap((keyword) => keyword.tagIds),
  );

  const results = (await RankTrackerTagModel.find({
    domainId: String(domainId),
    id: { $in: Array.from(keywordTags) },
  })
    .sort({ name: 1 })
    .lean()) as unknown as MockTag[];

  return {
    results: results.map((tag) => ({ id: tag.id, name: tag.name })),
  };
}

export async function updateTag(tagId: string, name: string) {
  await ensureDatabase();
  const normalizedName = normalizeTagName(name);
  if (!normalizedName) {
    return false;
  }

  const id = Number(tagId);
  const tag = (await RankTrackerTagModel.findOne({
    id,
  }).lean()) as unknown as MockTag | null;

  if (!tag) {
    return false;
  }

  const duplicate = await RankTrackerTagModel.exists({
    id: { $ne: id },
    domainId: tag.domainId,
    name_lower: normalizedName.toLowerCase(),
  });

  if (duplicate) {
    return false;
  }

  await RankTrackerTagModel.updateOne(
    { id },
    {
      $set: {
        name: normalizedName,
        name_lower: normalizedName.toLowerCase(),
      },
    },
  );
  return true;
}

export async function deleteTag(tagId: string) {
  await ensureDatabase();
  const id = Number(tagId);

  const tag = await RankTrackerTagModel.exists({ id });
  if (!tag) return false;

  const now = new Date().toISOString();
  await Promise.all([
    RankTrackerTagModel.deleteOne({ id }),
    RankTrackerKeywordModel.updateMany(
      { tagIds: id },
      {
        $pull: { tagIds: id },
        $set: { updated_at: now },
      },
    ),
  ]);
  return true;
}
