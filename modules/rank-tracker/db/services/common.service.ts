import { RankTrackerDomainModel } from "../models/domain.model";
import { RankTrackerKeywordModel } from "../models/keyword.model";
import { RankTrackerTagModel } from "../models/tag.model";
import { MockDomain, MockKeyword, MockLocation, MockTag } from "../types";
import { buildRange } from "../utils/analytics";
import {
  hashString,
  normalizeSiteUrl,
  normalizeTagName,
  slugify,
} from "../utils/normalizers";
import { reserveCounterRange } from "../core/database";

export async function getTagsByIds(tagIds: number[]): Promise<MockTag[]> {
  if (!tagIds.length) {
    return [];
  }

  const tags = (await RankTrackerTagModel.find({
    id: { $in: tagIds },
  })
    .select({ _id: 0, id: 1, domainId: 1, name: 1, name_lower: 1, created_at: 1 })
    .lean()) as unknown as MockTag[];

  const byId = new Map(tags.map((tag) => [tag.id, tag]));
  return tagIds
    .map((id) => byId.get(id))
    .filter((tag): tag is MockTag => Boolean(tag));
}

export async function ensureDomainTagsInMongo(
  domainId: string,
  names: string[],
): Promise<number[]> {
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
  const existing = (await RankTrackerTagModel.find({
    domainId,
    name_lower: { $in: lowered },
  }).lean()) as unknown as MockTag[];

  const existingMap = new Map(
    existing.map((tag) => [tag.name.toLowerCase(), tag]),
  );
  const ids: number[] = [];
  const missing = cleaned.filter((name) => !existingMap.has(name.toLowerCase()));
  const reservedIds = await reserveCounterRange("nextTagId", missing.length);
  const reservedByLower = new Map(
    missing.map((name, index) => [name.toLowerCase(), reservedIds[index]]),
  );

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
      { domainId, name_lower: lower },
      {
        $setOnInsert: {
          id: tagId,
          domainId,
          name,
          name_lower: lower,
          created_at: new Date().toISOString(),
        },
      },
      { upsert: true, new: true },
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
): Promise<string | null> {
  const domain = (await RankTrackerDomainModel.findOne({
    id: domainId,
  })
    .select({ _id: 0, url: 1 })
    .lean()) as unknown as MockDomain | null;

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
  return (await RankTrackerKeywordModel.find({
    domainId: String(domainId),
  }).lean()) as unknown as MockKeyword[];
}
