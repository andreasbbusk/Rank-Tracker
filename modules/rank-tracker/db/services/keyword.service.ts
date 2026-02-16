import {
  ensureDatabase,
  getNextCounter,
  reserveCounterRange,
} from "../core/database";
import { getCurrentTenantId } from "../core/tenant";
import { getNonSeededPruneAfterDate } from "../core/retention";
import { RankTrackerGSCSiteModel } from "../models/gsc-site.model";
import { RankTrackerKeywordModel } from "../models/keyword.model";
import { MockKeyword, MockKeywordNote, MockTag } from "../types";
import { keywordToApi } from "../utils/analytics";
import {
  getDomainSiteUrl,
  ensureDomainTagsInMongo,
  getTagsByIds,
  buildNewKeywordRecord,
} from "./common.service";
import { DEFAULT_LOCATION } from "../utils/normalizers";

export async function listKeywords(domainId?: string) {
  const tenantId = await getCurrentTenantId();
  await ensureDatabase(tenantId);
  const filter = domainId
    ? { tenantId, domainId: String(domainId) }
    : { tenantId };

  const keywords = (await RankTrackerKeywordModel.find(filter)
    .sort({ created_at: -1, id: 1 })
    .lean()) as unknown as MockKeyword[];

  const tagIds = Array.from(
    new Set(keywords.flatMap((keyword) => keyword.tagIds)),
  );
  const tags = await getTagsByIds(tagIds, tenantId);
  const tagsById = new Map(tags.map((tag) => [tag.id, tag]));

  return keywords.map((keyword) =>
    keywordToApi(
      keyword,
      keyword.tagIds
        .map((id) => tagsById.get(id))
        .filter((tag): tag is MockTag => Boolean(tag)),
    ),
  );
}

export async function countKeywords(domainId?: string) {
  const tenantId = await getCurrentTenantId();
  await ensureDatabase(tenantId);
  const filter = domainId
    ? { tenantId, domainId: String(domainId) }
    : { tenantId };
  return RankTrackerKeywordModel.countDocuments(filter);
}

export async function getKeywordById(id: string) {
  const tenantId = await getCurrentTenantId();
  await ensureDatabase(tenantId);
  const keyword = (await RankTrackerKeywordModel.findOne({
    tenantId,
    id: Number(id),
  }).lean()) as unknown as MockKeyword | null;

  if (!keyword) return null;

  const tags = await getTagsByIds(keyword.tagIds || [], tenantId);
  return keywordToApi(keyword, tags);
}

export async function createKeywords({
  domain,
  keywords,
  location,
  star_keyword,
  tags,
}: {
  domain: number;
  keywords: string[];
  location?: { country: string; device: string };
  star_keyword?: boolean;
  tags?: string[];
}) {
  const tenantId = await getCurrentTenantId();
  await ensureDatabase(tenantId);
  const domainId = String(domain);

  const existingKeywords = (await RankTrackerKeywordModel.find(
    { tenantId, domainId },
    { title_lower: 1, id: 1 },
  ).lean()) as Array<{ title_lower: string; id: number }>;

  const existingTitles = new Set(
    existingKeywords.map((keyword) => keyword.title_lower),
  );
  const incomingTitles = new Set<string>();
  const pendingTitles: string[] = [];

  for (const rawKeyword of keywords) {
    const title = rawKeyword.trim();
    if (!title) {
      continue;
    }

    const titleLower = title.toLowerCase();
    if (existingTitles.has(titleLower) || incomingTitles.has(titleLower)) {
      continue;
    }

    incomingTitles.add(titleLower);
    pendingTitles.push(title);
  }

  if (!pendingTitles.length) {
    return [];
  }

  const tagIds = await ensureDomainTagsInMongo(domainId, tags || [], tenantId);
  const siteUrl = await getDomainSiteUrl(domainId, tenantId);
  const pruneAfter = getNonSeededPruneAfterDate();
  const keywordIds = await reserveCounterRange(
    "nextKeywordId",
    pendingTitles.length,
    tenantId,
  );

  const createdKeywords = pendingTitles
    .map((title, index) => {
      const keywordId = keywordIds[index];
      if (!keywordId) {
        return null;
      }

      return buildNewKeywordRecord({
        title,
        domainId,
        keywordId,
        starKeyword: Boolean(star_keyword),
        location,
        tagIds,
      });
    })
    .filter((keyword): keyword is MockKeyword => Boolean(keyword));

  if (!createdKeywords.length) {
    return [];
  }

  await RankTrackerKeywordModel.insertMany(
    createdKeywords.map((keyword) => ({
      tenantId,
      isSeeded: false,
      pruneAfter,
      ...keyword,
      title_lower: keyword.title.toLowerCase(),
    })),
  );

  if (siteUrl) {
    await RankTrackerGSCSiteModel.updateOne(
      { tenantId, siteUrl },
      {
        $push: {
          records: {
            $each: createdKeywords.map((keyword) => {
              const clicks = Math.round(keyword.current.clicks * 0.8);
              const impressions = Math.round(keyword.current.impressions * 0.75);
              const ctr =
                impressions > 0 ? Number((clicks / impressions).toFixed(4)) : 0;

              return {
                query: keyword.title,
                clicks,
                impressions,
                ctr,
                position: Number((keyword.current.position + 1.2).toFixed(1)),
              };
            }),
            $position: 0,
          },
        },
        $setOnInsert: {
          tenantId,
          siteUrl,
          isSeeded: false,
          pruneAfter,
        },
      },
      { upsert: true },
    );
  }

  return createdKeywords.map((keyword) => keyword.id);
}

export async function createSingleKeyword({
  title,
  domain,
  star_keyword,
  location,
  tags,
}: {
  title: string;
  domain: string;
  star_keyword?: boolean;
  location?: { country: string; device: string };
  tags?: string[];
}) {
  const created = await createKeywords({
    domain: Number(domain),
    keywords: [title],
    location,
    star_keyword,
    tags,
  });

  if (!created.length) {
    return { error: true, message: "Kunne ikke oprette søgeord" };
  }

  const keyword = await getKeywordById(String(created[0]));
  return keyword;
}

export async function updateKeyword({
  id,
  title,
  domain,
  star_keyword,
  location,
  tags,
  notes,
  preferred_url,
}: {
  id: string;
  title?: string;
  domain?: string;
  star_keyword?: boolean;
  location?: {
    id?: number;
    team?: number;
    country: string;
    device: string;
    lang_const?: string;
    geo_const?: string;
  };
  tags?: Array<{ name: string } | string>;
  notes?: Array<{ id: number; description: string }>;
  preferred_url?: string;
}) {
  const tenantId = await getCurrentTenantId();
  await ensureDatabase(tenantId);
  const keyword = (await RankTrackerKeywordModel.findOne({
    tenantId,
    id: Number(id),
  }).lean()) as unknown as MockKeyword | null;

  if (!keyword) {
    return { error: true, message: "Søgeord ikke fundet" };
  }

  const nextKeyword: MockKeyword = { ...keyword };

  if (title !== undefined) {
    nextKeyword.title = title.trim() || nextKeyword.title;
  }
  if (domain !== undefined) {
    nextKeyword.domainId = String(domain);
  }
  if (star_keyword !== undefined) {
    nextKeyword.star_keyword = star_keyword;
  }
  if (preferred_url !== undefined) {
    nextKeyword.preferred_url = preferred_url;
  }

  if (location) {
    nextKeyword.location = {
      id: location.id || nextKeyword.location.id,
      team: location.team || nextKeyword.location.team,
      country: location.country,
      device: location.device,
      lang_const:
        location.lang_const || nextKeyword.location.lang_const || "1009",
      geo_const: location.geo_const || nextKeyword.location.geo_const || "2208",
    };
  }

  if (tags) {
    const tagNames = tags.map((tag) =>
      typeof tag === "string" ? tag : tag.name,
    );
    nextKeyword.tagIds = await ensureDomainTagsInMongo(
      nextKeyword.domainId,
      tagNames,
      tenantId,
    );
  }

  if (notes) {
    const now = new Date().toISOString();
    const nextNotes: MockKeywordNote[] = [];

    for (const note of notes) {
      const existing = nextKeyword.notes.find((item) => item.id === note.id);
      if (existing) {
        nextNotes.push({
          ...existing,
          description: note.description,
          updated_at: now,
        });
        continue;
      }

      const newId = note.id || (await getNextCounter("nextNoteId", tenantId));
      nextNotes.push({
        id: newId,
        description: note.description,
        created_at: now,
        updated_at: now,
      });
    }

    nextKeyword.notes = nextNotes;
  }

  nextKeyword.updated_at = new Date().toISOString();

  if (
    title !== undefined &&
    nextKeyword.title.toLowerCase() !== keyword.title.toLowerCase()
  ) {
    const duplicate = await RankTrackerKeywordModel.exists({
      tenantId,
      domainId: nextKeyword.domainId,
      title_lower: nextKeyword.title.toLowerCase(),
      id: { $ne: nextKeyword.id },
    });

    if (duplicate) {
      return { error: true, message: "Søgeord findes allerede" };
    }
  }

  await RankTrackerKeywordModel.updateOne(
    { tenantId, id: Number(id) },
    {
      $set: {
        ...nextKeyword,
        title_lower: nextKeyword.title.toLowerCase(),
      },
    },
  );

  const keywordTags = await getTagsByIds(nextKeyword.tagIds, tenantId);
  return keywordToApi(nextKeyword, keywordTags);
}

export async function deleteKeyword(id: string) {
  const tenantId = await getCurrentTenantId();
  await ensureDatabase(tenantId);
  const result = await RankTrackerKeywordModel.deleteOne({
    tenantId,
    id: Number(id),
  });
  return result.deletedCount > 0;
}

export async function updateKeywordLocation(
  id: string,
  location: {
    country: string;
    device: string;
    lang_const: string;
    geo_const: string;
  },
) {
  const tenantId = await getCurrentTenantId();
  await ensureDatabase(tenantId);
  const keyword = (await RankTrackerKeywordModel.findOne({
    tenantId,
    id: Number(id),
  }).lean()) as unknown as MockKeyword | null;

  if (!keyword) return null;

  const nextLocation = {
    ...keyword.location,
    country: location.country,
    device: location.device,
    lang_const: location.lang_const,
    geo_const: location.geo_const,
  };

  await RankTrackerKeywordModel.updateOne(
    { tenantId, id: Number(id) },
    {
      $set: {
        location: nextLocation,
        updated_at: new Date().toISOString(),
      },
    },
  );

  return nextLocation;
}

export async function deleteKeywordLocation(id: string) {
  const tenantId = await getCurrentTenantId();
  await ensureDatabase(tenantId);
  const keyword = (await RankTrackerKeywordModel.findOne({
    tenantId,
    $or: [{ "location.id": Number(id) }, { id: Number(id) }],
  }).lean()) as unknown as MockKeyword | null;

  if (!keyword) return false;

  await RankTrackerKeywordModel.updateOne(
    { tenantId, id: keyword.id },
    {
      $set: {
        location: {
          ...DEFAULT_LOCATION,
          id: keyword.location.id,
        },
        updated_at: new Date().toISOString(),
      },
    },
  );
  return true;
}

export async function getKeywordStatus(keywordList: number[]) {
  const tenantId = await getCurrentTenantId();
  await ensureDatabase(tenantId);

  const keywords = (await RankTrackerKeywordModel.find({
    tenantId,
    id: { $in: keywordList },
  }).lean()) as unknown as MockKeyword[];

  const byId = new Map(keywords.map((keyword) => [keyword.id, keyword]));
  const now = new Date().toISOString();
  const updates: Array<{
    id: number;
    status: string;
    statusChecksRemaining: number;
    latest_fetch: string | null;
  }> = [];

  const statuses = keywordList.map((id) => {
    const keyword = byId.get(id);
    if (!keyword) {
      return {
        latest_fetch: null,
        status: "error" as const,
      };
    }

    let status = keyword.status;
    let statusChecksRemaining = keyword.statusChecksRemaining;
    let latest_fetch = keyword.latest_fetch;

    if (status === "pending") {
      statusChecksRemaining -= 1;
      if (statusChecksRemaining <= 0) {
        status = "processed";
        latest_fetch = now;
      }
      updates.push({
        id: keyword.id,
        status,
        statusChecksRemaining,
        latest_fetch,
      });
    }

    return {
      latest_fetch,
      status: status as "processed" | "pending" | "error",
    };
  });

  if (updates.length > 0) {
    await RankTrackerKeywordModel.bulkWrite(
      updates.map((update) => ({
        updateOne: {
          filter: { tenantId, id: update.id },
          update: {
            $set: {
              status: update.status,
              statusChecksRemaining: update.statusChecksRemaining,
              latest_fetch: update.latest_fetch,
            },
          },
        },
      })),
    );
  }

  const allProcessed = statuses.every((item) => item.status === "processed");

  return {
    keywords_status: statuses,
    status: allProcessed,
    error: null,
  };
}

export async function getDomainKeywordTitles(domainId: string) {
  const tenantId = await getCurrentTenantId();
  await ensureDatabase(tenantId);

  const keywords = await RankTrackerKeywordModel.find(
    { tenantId, domainId: String(domainId) },
    { title: 1 },
  )
    .sort({ id: 1 })
    .lean();

  return keywords.map((keyword) => keyword.title);
}
