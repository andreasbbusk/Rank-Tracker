import { ensureDatabase } from "../core/database";
import { getCurrentTenantId } from "../core/tenant";
import { RankTrackerKeywordModel } from "../models/keyword.model";
import { RankTrackerTagModel } from "../models/tag.model";
import { MockTag } from "../types";
import { normalizeTagName } from "../utils/normalizers";

export async function listTags(domainId: string) {
  const tenantId = await getCurrentTenantId();
  await ensureDatabase(tenantId);

  const keywordTagIds = (await RankTrackerKeywordModel.distinct("tagIds", {
    tenantId,
    domainId: String(domainId),
  })) as number[];

  if (!keywordTagIds.length) {
    return { results: [] };
  }

  const results = (await RankTrackerTagModel.find({
    tenantId,
    domainId: String(domainId),
    id: { $in: keywordTagIds },
  })
    .sort({ name_lower: 1 })
    .lean()) as unknown as MockTag[];

  return {
    results: results.map((tag) => ({ id: tag.id, name: tag.name })),
  };
}

export async function updateTag(tagId: string, name: string) {
  const tenantId = await getCurrentTenantId();
  await ensureDatabase(tenantId);
  const normalizedName = normalizeTagName(name);
  if (!normalizedName) {
    return false;
  }

  const id = Number(tagId);
  const tag = (await RankTrackerTagModel.findOne({
    tenantId,
    id,
  }).lean()) as unknown as MockTag | null;

  if (!tag) {
    return false;
  }

  const duplicate = await RankTrackerTagModel.exists({
    tenantId,
    id: { $ne: id },
    domainId: tag.domainId,
    name_lower: normalizedName.toLowerCase(),
  });

  if (duplicate) {
    return false;
  }

  await RankTrackerTagModel.updateOne(
    { tenantId, id },
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
  const tenantId = await getCurrentTenantId();
  await ensureDatabase(tenantId);
  const id = Number(tagId);

  const tag = await RankTrackerTagModel.exists({ tenantId, id });
  if (!tag) return false;

  const now = new Date().toISOString();
  await Promise.all([
    RankTrackerTagModel.deleteOne({ tenantId, id }),
    RankTrackerKeywordModel.updateMany(
      { tenantId, tagIds: id },
      {
        $pull: { tagIds: id },
        $set: { updated_at: now },
      },
    ),
  ]);
  return true;
}
