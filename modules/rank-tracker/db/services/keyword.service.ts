import {
  ensureDatabase,
  getNextCounter,
  reserveCounterRange,
  SHARED_SEED_TENANT_ID,
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
import {
  getTenantOverlayState,
  markDeletedSeedKeyword,
  mergeTenantAndSeedDocuments,
} from "./overlay-utils.service";

type KeywordDoc = MockKeyword & {
  tenantId: string;
  title_lower?: string;
};

function toKeyword(doc: KeywordDoc): MockKeyword {
  return {
    id: doc.id,
    domainId: doc.domainId,
    title: doc.title,
    title_lower: doc.title_lower,
    star_keyword: doc.star_keyword,
    location: doc.location,
    tagIds: doc.tagIds,
    notes: doc.notes,
    latest_fetch: doc.latest_fetch,
    created_at: doc.created_at,
    updated_at: doc.updated_at,
    preferred_url: doc.preferred_url,
    search_volume: doc.search_volume,
    current: doc.current,
    previous: doc.previous,
    status: doc.status,
    statusChecksRemaining: doc.statusChecksRemaining,
  };
}

function isKeywordHidden(
  overlayState: Awaited<ReturnType<typeof getTenantOverlayState>>,
  keyword: { domainId: string },
  keywordId: number,
): boolean {
  return (
    overlayState.deletedDomainIds.has(keyword.domainId) ||
    overlayState.deletedKeywordIds.has(keywordId)
  );
}

async function getMergedKeywordDocs(
  tenantId: string,
  options?: { domainId?: string; keywordIds?: number[] },
): Promise<KeywordDoc[]> {
  const filter: Record<string, unknown> = {
    tenantId: { $in: [tenantId, SHARED_SEED_TENANT_ID] },
  };

  if (options?.domainId !== undefined) {
    filter.domainId = String(options.domainId);
  }
  if (options?.keywordIds && options.keywordIds.length > 0) {
    filter.id = { $in: options.keywordIds.map((value) => Number(value)) };
  }

  const [overlayState, keywords] = await Promise.all([
    getTenantOverlayState(tenantId),
    RankTrackerKeywordModel.find(filter)
      .select({
        _id: 0,
        tenantId: 1,
        id: 1,
        domainId: 1,
        title: 1,
        title_lower: 1,
        star_keyword: 1,
        location: 1,
        tagIds: 1,
        notes: 1,
        latest_fetch: 1,
        created_at: 1,
        updated_at: 1,
        preferred_url: 1,
        search_volume: 1,
        current: 1,
        previous: 1,
        status: 1,
        statusChecksRemaining: 1,
      })
      .lean(),
  ]);

  return mergeTenantAndSeedDocuments(
    tenantId,
    keywords as KeywordDoc[],
    (keyword) => String(keyword.id),
    (keyword, keywordId) =>
      isKeywordHidden(overlayState, keyword, Number(keywordId)),
  );
}

async function getKeywordVersions(tenantId: string, keywordId: number) {
  const [overlayState, tenantKeyword, seedKeyword] = await Promise.all([
    getTenantOverlayState(tenantId),
    RankTrackerKeywordModel.findOne({ tenantId, id: keywordId })
      .select({
        _id: 0,
        tenantId: 1,
        id: 1,
        domainId: 1,
        title: 1,
        title_lower: 1,
        star_keyword: 1,
        location: 1,
        tagIds: 1,
        notes: 1,
        latest_fetch: 1,
        created_at: 1,
        updated_at: 1,
        preferred_url: 1,
        search_volume: 1,
        current: 1,
        previous: 1,
        status: 1,
        statusChecksRemaining: 1,
      })
      .lean(),
    RankTrackerKeywordModel.findOne({
      tenantId: SHARED_SEED_TENANT_ID,
      id: keywordId,
    })
      .select({
        _id: 0,
        tenantId: 1,
        id: 1,
        domainId: 1,
        title: 1,
        title_lower: 1,
        star_keyword: 1,
        location: 1,
        tagIds: 1,
        notes: 1,
        latest_fetch: 1,
        created_at: 1,
        updated_at: 1,
        preferred_url: 1,
        search_volume: 1,
        current: 1,
        previous: 1,
        status: 1,
        statusChecksRemaining: 1,
      })
      .lean(),
  ]);

  const visibleKeyword =
    tenantKeyword ||
    (seedKeyword && !isKeywordHidden(overlayState, seedKeyword, keywordId)
      ? seedKeyword
      : null);

  return {
    overlayState,
    tenantKeyword: tenantKeyword as KeywordDoc | null,
    seedKeyword: seedKeyword as KeywordDoc | null,
    visibleKeyword: visibleKeyword as KeywordDoc | null,
  };
}

async function ensureTenantKeywordClone(
  tenantId: string,
  seedKeyword: KeywordDoc,
): Promise<void> {
  const pruneAfter = getNonSeededPruneAfterDate();
  const keyword = toKeyword(seedKeyword);

  await RankTrackerKeywordModel.updateOne(
    { tenantId, id: keyword.id },
    {
      $setOnInsert: {
        tenantId,
        isSeeded: false,
        pruneAfter,
        ...keyword,
        title_lower: seedKeyword.title_lower || seedKeyword.title.toLowerCase(),
      },
    },
    { upsert: true },
  );
}

async function hasDuplicateKeywordTitle({
  tenantId,
  domainId,
  titleLower,
  excludeId,
}: {
  tenantId: string;
  domainId: string;
  titleLower: string;
  excludeId?: number;
}): Promise<boolean> {
  const [overlayState, duplicateCandidates] = await Promise.all([
    getTenantOverlayState(tenantId),
    RankTrackerKeywordModel.find({
      tenantId: { $in: [tenantId, SHARED_SEED_TENANT_ID] },
      domainId,
      title_lower: titleLower,
      ...(typeof excludeId === "number" ? { id: { $ne: excludeId } } : {}),
    })
      .select({ _id: 0, tenantId: 1, id: 1, domainId: 1 })
      .lean(),
  ]);

  const duplicates = mergeTenantAndSeedDocuments(
    tenantId,
    duplicateCandidates as Array<{ tenantId: string; id: number; domainId: string }>,
    (keyword) => String(keyword.id),
    (keyword, id) =>
      isKeywordHidden(overlayState, keyword, Number(id)),
  );

  return duplicates.length > 0;
}

export async function listKeywords(domainId?: string) {
  const tenantId = await getCurrentTenantId();
  await ensureDatabase(tenantId);

  const keywords = await getMergedKeywordDocs(tenantId, {
    domainId: domainId ? String(domainId) : undefined,
  });

  const sortedKeywords = keywords.sort((left, right) => {
    if (left.created_at === right.created_at) {
      return left.id - right.id;
    }
    return left.created_at > right.created_at ? -1 : 1;
  });

  const tagIds = Array.from(
    new Set(sortedKeywords.flatMap((keyword) => keyword.tagIds)),
  );
  const tags = await getTagsByIds(tagIds, tenantId);
  const tagsById = new Map(tags.map((tag) => [tag.id, tag]));

  return sortedKeywords.map((keyword) =>
    keywordToApi(
      toKeyword(keyword),
      keyword.tagIds
        .map((id) => tagsById.get(id))
        .filter((tag): tag is MockTag => Boolean(tag)),
    ),
  );
}

export async function countKeywords(domainId?: string) {
  const tenantId = await getCurrentTenantId();
  await ensureDatabase(tenantId);

  const keywords = await getMergedKeywordDocs(tenantId, {
    domainId: domainId ? String(domainId) : undefined,
  });
  return keywords.length;
}

export async function getKeywordById(id: string) {
  const tenantId = await getCurrentTenantId();
  await ensureDatabase(tenantId);

  const keywordId = Number(id);
  const [keyword] = await getMergedKeywordDocs(tenantId, { keywordIds: [keywordId] });

  if (!keyword || keyword.id !== keywordId) {
    return null;
  }

  const tags = await getTagsByIds(keyword.tagIds || [], tenantId);
  return keywordToApi(toKeyword(keyword), tags);
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

  const existingKeywords = await getMergedKeywordDocs(tenantId, { domainId });
  const existingTitles = new Set(
    existingKeywords.map((keyword) =>
      (keyword.title_lower || keyword.title).toLowerCase(),
    ),
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
  const keywordId = Number(id);

  const { tenantKeyword, seedKeyword, visibleKeyword } = await getKeywordVersions(
    tenantId,
    keywordId,
  );

  if (!visibleKeyword) {
    return { error: true, message: "Søgeord ikke fundet" };
  }

  if (!tenantKeyword && seedKeyword) {
    await ensureTenantKeywordClone(tenantId, seedKeyword);
  }

  const nextKeyword: MockKeyword = { ...toKeyword(visibleKeyword) };

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
    nextKeyword.title.toLowerCase() !== visibleKeyword.title.toLowerCase()
  ) {
    const duplicate = await hasDuplicateKeywordTitle({
      tenantId,
      domainId: nextKeyword.domainId,
      titleLower: nextKeyword.title.toLowerCase(),
      excludeId: nextKeyword.id,
    });

    if (duplicate) {
      return { error: true, message: "Søgeord findes allerede" };
    }
  }

  await RankTrackerKeywordModel.updateOne(
    { tenantId, id: keywordId },
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

  const keywordId = Number(id);
  const { visibleKeyword, seedKeyword } = await getKeywordVersions(
    tenantId,
    keywordId,
  );

  if (!visibleKeyword) {
    return false;
  }

  await Promise.all([
    RankTrackerKeywordModel.deleteOne({ tenantId, id: keywordId }),
    seedKeyword ? markDeletedSeedKeyword(tenantId, keywordId) : Promise.resolve(),
  ]);

  return true;
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
  const keywordId = Number(id);

  const { tenantKeyword, seedKeyword, visibleKeyword } = await getKeywordVersions(
    tenantId,
    keywordId,
  );

  if (!visibleKeyword) return null;

  if (!tenantKeyword && seedKeyword) {
    await ensureTenantKeywordClone(tenantId, seedKeyword);
  }

  const nextLocation = {
    ...visibleKeyword.location,
    country: location.country,
    device: location.device,
    lang_const: location.lang_const,
    geo_const: location.geo_const,
  };

  await RankTrackerKeywordModel.updateOne(
    { tenantId, id: keywordId },
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
  const locationId = Number(id);

  const [overlayState, keywordCandidates] = await Promise.all([
    getTenantOverlayState(tenantId),
    RankTrackerKeywordModel.find({
      tenantId: { $in: [tenantId, SHARED_SEED_TENANT_ID] },
      $or: [{ "location.id": locationId }, { id: locationId }],
    })
      .select({
        _id: 0,
        tenantId: 1,
        id: 1,
        domainId: 1,
        title: 1,
        title_lower: 1,
        star_keyword: 1,
        location: 1,
        tagIds: 1,
        notes: 1,
        latest_fetch: 1,
        created_at: 1,
        updated_at: 1,
        preferred_url: 1,
        search_volume: 1,
        current: 1,
        previous: 1,
        status: 1,
        statusChecksRemaining: 1,
      })
      .lean(),
  ]);

  const keywords = mergeTenantAndSeedDocuments(
    tenantId,
    keywordCandidates as KeywordDoc[],
    (keyword) => String(keyword.id),
    (keyword, keywordId) =>
      isKeywordHidden(overlayState, keyword, Number(keywordId)),
  );

  const keyword =
    keywords.find((item) => item.location.id === locationId) ||
    keywords.find((item) => item.id === locationId);

  if (!keyword) return false;

  if (keyword.tenantId !== tenantId) {
    await ensureTenantKeywordClone(tenantId, keyword);
  }

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

  const uniqueKeywordIds = Array.from(new Set(keywordList.map((id) => Number(id))));
  const keywords = await getMergedKeywordDocs(tenantId, {
    keywordIds: uniqueKeywordIds,
  });

  const byId = new Map(keywords.map((keyword) => [keyword.id, keyword]));
  const now = new Date().toISOString();
  const updates: Array<{
    id: number;
    status: string;
    statusChecksRemaining: number;
    latest_fetch: string | null;
  }> = [];

  const statuses = keywordList.map((id) => {
    const keyword = byId.get(Number(id));
    if (!keyword) {
      return {
        latest_fetch: null,
        status: "error" as const,
      };
    }

    let status = keyword.status;
    let statusChecksRemaining = keyword.statusChecksRemaining;
    let latest_fetch = keyword.latest_fetch;

    if (status === "pending" && keyword.tenantId === tenantId) {
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

  const keywords = await getMergedKeywordDocs(tenantId, {
    domainId: String(domainId),
  });

  return keywords
    .sort((left, right) => left.id - right.id)
    .map((keyword) => keyword.title);
}
