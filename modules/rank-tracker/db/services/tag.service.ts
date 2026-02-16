import {
  ensureDatabase,
  SHARED_SEED_TENANT_ID,
} from "../core/database";
import { getCurrentTenantId } from "../core/tenant";
import { getNonSeededPruneAfterDate } from "../core/retention";
import { RankTrackerKeywordModel } from "../models/keyword.model";
import { RankTrackerTagModel } from "../models/tag.model";
import { normalizeTagName } from "../utils/normalizers";
import { getKeywordsForDomain, getTagsByIds } from "./common.service";
import {
  getTenantOverlayState,
  markDeletedSeedTag,
  mergeTenantAndSeedDocuments,
} from "./overlay-utils.service";

export async function listTags(domainId: string) {
  const tenantId = await getCurrentTenantId();
  await ensureDatabase(tenantId);

  const keywords = await getKeywordsForDomain(String(domainId));
  const keywordTagIds = Array.from(
    new Set(keywords.flatMap((keyword) => keyword.tagIds || [])),
  );

  if (!keywordTagIds.length) {
    return { results: [] };
  }

  const tags = await getTagsByIds(keywordTagIds, tenantId);
  const sorted = tags
    .map((tag) => ({ id: tag.id, name: tag.name, nameLower: tag.name.toLowerCase() }))
    .sort((left, right) => left.nameLower.localeCompare(right.nameLower));

  return {
    results: sorted.map((tag) => ({ id: tag.id, name: tag.name })),
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
  const [overlayState, tenantTag, seedTag] = await Promise.all([
    getTenantOverlayState(tenantId),
    RankTrackerTagModel.findOne({ tenantId, id })
      .select({
        _id: 0,
        tenantId: 1,
        id: 1,
        domainId: 1,
        name: 1,
        name_lower: 1,
        created_at: 1,
      })
      .lean(),
    RankTrackerTagModel.findOne({ tenantId: SHARED_SEED_TENANT_ID, id })
      .select({
        _id: 0,
        tenantId: 1,
        id: 1,
        domainId: 1,
        name: 1,
        name_lower: 1,
        created_at: 1,
      })
      .lean(),
  ]);

  const isDeleted =
    overlayState.deletedTagIds.has(id) ||
    overlayState.deletedDomainIds.has(
      String(tenantTag?.domainId || seedTag?.domainId || ""),
    );
  const tag = tenantTag || (!isDeleted ? seedTag : null);

  if (!tag) {
    return false;
  }

  const duplicateCandidates = await RankTrackerTagModel.find({
    tenantId: { $in: [tenantId, SHARED_SEED_TENANT_ID] },
    id: { $ne: id },
    domainId: tag.domainId,
    name_lower: normalizedName.toLowerCase(),
  })
    .select({ _id: 0, tenantId: 1, id: 1, domainId: 1 })
    .lean();

  const duplicates = mergeTenantAndSeedDocuments(
    tenantId,
    duplicateCandidates as Array<{
      tenantId: string;
      id: number;
      domainId: string;
    }>,
    (candidate) => String(candidate.id),
    (candidate, candidateId) =>
      overlayState.deletedTagIds.has(Number(candidateId)) ||
      overlayState.deletedDomainIds.has(candidate.domainId),
  );

  if (duplicates.length > 0) {
    return false;
  }

  if (!tenantTag) {
    const pruneAfter = getNonSeededPruneAfterDate();
    await RankTrackerTagModel.updateOne(
      { tenantId, id },
      {
        $setOnInsert: {
          tenantId,
          id: tag.id,
          domainId: tag.domainId,
          name: tag.name,
          name_lower: tag.name_lower,
          created_at: tag.created_at,
          isSeeded: false,
          pruneAfter,
        },
      },
      { upsert: true },
    );
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

  const [overlayState, tenantTag, seedTag] = await Promise.all([
    getTenantOverlayState(tenantId),
    RankTrackerTagModel.findOne({ tenantId, id })
      .select({ _id: 0, id: 1, domainId: 1 })
      .lean(),
    RankTrackerTagModel.findOne({
      tenantId: SHARED_SEED_TENANT_ID,
      id,
    })
      .select({ _id: 0, id: 1, domainId: 1 })
      .lean(),
  ]);

  const domainId = String(tenantTag?.domainId || seedTag?.domainId || "");
  const isDeleted =
    overlayState.deletedTagIds.has(id) ||
    (domainId ? overlayState.deletedDomainIds.has(domainId) : false);
  const visibleTag = tenantTag || (!isDeleted ? seedTag : null);

  if (!visibleTag) {
    return false;
  }

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
    seedTag ? markDeletedSeedTag(tenantId, id) : Promise.resolve(),
  ]);
  return true;
}
