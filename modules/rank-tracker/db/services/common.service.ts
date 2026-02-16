import { RankTrackerDomainModel } from "../models/domain.model";
import { RankTrackerKeywordModel } from "../models/keyword.model";
import { RankTrackerTagModel } from "../models/tag.model";
import { getCurrentTenantId } from "../core/tenant";
import { getNonSeededPruneAfterDate } from "../core/retention";
import { SHARED_SEED_TENANT_ID } from "../core/database";
import { MockDomain, MockKeyword, MockLocation, MockTag } from "../types";
import { buildRange } from "../utils/analytics";
import {
  hashString,
  normalizeSiteUrl,
  normalizeTagName,
  slugify,
} from "../utils/normalizers";
import { reserveCounterRange } from "../core/database";
import {
  getTenantOverlayState,
  mergeTenantAndSeedDocuments,
} from "./overlay-utils.service";

export async function getTagsByIds(
  tagIds: number[],
  tenantId?: string,
): Promise<MockTag[]> {
  if (!tagIds.length) {
    return [];
  }

  const activeTenantId = tenantId || (await getCurrentTenantId());
  const [overlayState, tags] = await Promise.all([
    getTenantOverlayState(activeTenantId),
    RankTrackerTagModel.find({
      tenantId: { $in: [activeTenantId, SHARED_SEED_TENANT_ID] },
      id: { $in: tagIds },
    })
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

  const merged = mergeTenantAndSeedDocuments(
    activeTenantId,
    tags as Array<MockTag & { tenantId: string }>,
    (tag) => String(tag.id),
    (tag, id) =>
      overlayState.deletedTagIds.has(Number(id)) ||
      overlayState.deletedDomainIds.has(tag.domainId),
  );

  const byId = new Map(
    merged.map((tag) => [
      tag.id,
      {
        id: tag.id,
        domainId: tag.domainId,
        name: tag.name,
        created_at: tag.created_at,
        name_lower: tag.name_lower,
      } as MockTag,
    ]),
  );
  return tagIds
    .map((id) => byId.get(id))
    .filter((tag): tag is MockTag => Boolean(tag));
}

export async function ensureDomainTagsInMongo(
  domainId: string,
  names: string[],
  tenantId?: string,
): Promise<number[]> {
  const activeTenantId = tenantId || (await getCurrentTenantId());
  const cleaned: string[] = [];
  const seen = new Set<string>();

  for (const rawName of names) {
    const name = normalizeTagName(rawName);
    const lower = name.toLowerCase();
    if (!name || seen.has(lower)) {
      continue;
    }
    seen.add(lower);
    cleaned.push(name);
  }

  if (!cleaned.length) {
    return [];
  }

  const lowered = cleaned.map((name) => name.toLowerCase());
  const [overlayState, existing] = await Promise.all([
    getTenantOverlayState(activeTenantId),
    RankTrackerTagModel.find({
      tenantId: { $in: [activeTenantId, SHARED_SEED_TENANT_ID] },
      domainId,
      name_lower: { $in: lowered },
    })
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

  const mergedExisting = mergeTenantAndSeedDocuments(
    activeTenantId,
    existing as Array<MockTag & { tenantId: string }>,
    (tag) => tag.name_lower || tag.name.toLowerCase(),
    (tag) =>
      overlayState.deletedTagIds.has(tag.id) ||
      overlayState.deletedDomainIds.has(tag.domainId),
  );
  const existingMap = new Map(
    mergedExisting.map((tag) => [tag.name.toLowerCase(), tag as MockTag]),
  );
  const ids: number[] = [];
  const missing = cleaned.filter((name) => !existingMap.has(name.toLowerCase()));
  const reservedIds = await reserveCounterRange(
    "nextTagId",
    missing.length,
    activeTenantId,
  );
  const reservedByLower = new Map(
    missing.map((name, index) => [name.toLowerCase(), reservedIds[index]]),
  );
  const pruneAfter = getNonSeededPruneAfterDate();

  for (const name of cleaned) {
    const lower = name.toLowerCase();
    const existingTag = existingMap.get(lower);
    if (existingTag) {
      ids.push(existingTag.id);
      continue;
    }

    const tagId = reservedByLower.get(lower);
    if (!tagId) {
      continue;
    }

    const doc = await RankTrackerTagModel.findOneAndUpdate(
      { tenantId: activeTenantId, domainId, name_lower: lower },
      {
        $setOnInsert: {
          tenantId: activeTenantId,
          id: tagId,
          domainId,
          name,
          name_lower: lower,
          isSeeded: false,
          pruneAfter,
          created_at: new Date().toISOString(),
        },
      },
      { upsert: true, returnDocument: "after" },
    )
      .lean() as unknown as MockTag | null;

    if (doc) {
      existingMap.set(lower, doc);
      ids.push(doc.id);
    } else {
      ids.push(tagId);
    }
  }

  return ids;
}

export async function getDomainSiteUrl(
  domainId: string,
  tenantId?: string,
): Promise<string | null> {
  const activeTenantId = tenantId || (await getCurrentTenantId());
  const [overlayState, domains] = await Promise.all([
    getTenantOverlayState(activeTenantId),
    RankTrackerDomainModel.find({
      tenantId: { $in: [activeTenantId, SHARED_SEED_TENANT_ID] },
      id: domainId,
    })
      .select({ _id: 0, tenantId: 1, id: 1, url: 1 })
      .lean(),
  ]);

  const [domain] = mergeTenantAndSeedDocuments(
    activeTenantId,
    domains as Array<MockDomain & { tenantId: string }>,
    (item) => item.id,
    (_, id) => overlayState.deletedDomainIds.has(id),
  );

  if (!domain) {
    return null;
  }

  return normalizeSiteUrl(domain.url);
}

export function buildNewKeywordRecord({
  title,
  domainId,
  keywordId,
  starKeyword,
  location,
  tagIds,
}: {
  title: string;
  domainId: string;
  keywordId: number;
  starKeyword: boolean;
  location?: { country?: string; device?: string };
  tagIds: number[];
}): MockKeyword {
  const now = new Date().toISOString();
  const seed = hashString(`${domainId}-${title}-${keywordId}`);
  const searchVolume = 80 + (seed % 1700);
  const basePosition = 6 + (seed % 35) / 2.5;
  const landingPage = `/insights/${slugify(title).slice(0, 32)}`;

  const current = buildRange({
    seed,
    basePosition,
    baseClicks: 3 + (seed % 8),
    baseImpressions: 35 + (seed % 130),
    landingPage,
    offsetDays: 1,
  });

  const previous = buildRange({
    seed: seed + 31,
    basePosition: basePosition + 0.8,
    baseClicks: 2 + (seed % 6),
    baseImpressions: 28 + (seed % 110),
    landingPage,
    offsetDays: 31,
  });

  const locationPayload: MockLocation = {
    id: keywordId,
    team: 1,
    country: location?.country || "DNK",
    device: location?.device || "desktop",
    lang_const: "1009",
    geo_const: "2208",
  };

  return {
    id: keywordId,
    domainId,
    title: title.trim(),
    star_keyword: starKeyword,
    location: locationPayload,
    tagIds,
    notes: [],
    latest_fetch: null,
    created_at: now,
    updated_at: now,
    preferred_url: undefined,
    search_volume: searchVolume,
    current,
    previous,
    status: "pending",
    statusChecksRemaining: 2,
  };
}

export async function getKeywordsForDomain(domainId: string) {
  const tenantId = await getCurrentTenantId();
  const [overlayState, keywords] = await Promise.all([
    getTenantOverlayState(tenantId),
    RankTrackerKeywordModel.find({
      tenantId: { $in: [tenantId, SHARED_SEED_TENANT_ID] },
      domainId: String(domainId),
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

  const merged = mergeTenantAndSeedDocuments(
    tenantId,
    keywords as Array<MockKeyword & { tenantId: string }>,
    (keyword) => String(keyword.id),
    (keyword, id) =>
      overlayState.deletedDomainIds.has(keyword.domainId) ||
      overlayState.deletedKeywordIds.has(Number(id)),
  );

  return merged.map((keyword) => ({
    id: keyword.id,
    domainId: keyword.domainId,
    title: keyword.title,
    title_lower: keyword.title_lower,
    star_keyword: keyword.star_keyword,
    location: keyword.location,
    tagIds: keyword.tagIds,
    notes: keyword.notes,
    latest_fetch: keyword.latest_fetch,
    created_at: keyword.created_at,
    updated_at: keyword.updated_at,
    preferred_url: keyword.preferred_url,
    search_volume: keyword.search_volume,
    current: keyword.current,
    previous: keyword.previous,
    status: keyword.status,
    statusChecksRemaining: keyword.statusChecksRemaining,
  }));
}
