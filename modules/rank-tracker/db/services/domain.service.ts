import { ensureDatabase, getNextCounter } from "../core/database";
import { RankTrackerDomainModel } from "../models/domain.model";
import { RankTrackerGSCSiteModel } from "../models/gsc-site.model";
import { RankTrackerKeywordModel } from "../models/keyword.model";
import { RankTrackerTagModel } from "../models/tag.model";
import { MockDomain } from "../types";
import { normalizeDomain, normalizeSiteUrl } from "../utils/normalizers";

export async function listDomains() {
  await ensureDatabase();

  const domains = (await RankTrackerDomainModel.find({})
    .sort({ created_at: -1, id: 1 })
    .lean()) as unknown as MockDomain[];

  return domains.map((domain) => ({
    id: domain.id,
    team: domain.team,
    url: domain.url,
    display_name: domain.display_name,
    created_at: domain.created_at,
    updated_at: domain.updated_at,
  }));
}

export async function getDomainById(id: string) {
  await ensureDatabase();
  const domain = (await RankTrackerDomainModel.findOne({
    id: String(id),
  }).lean()) as unknown as MockDomain | null;

  if (!domain) {
    return null;
  }

  return {
    id: domain.id,
    team: domain.team,
    url: domain.url,
    display_name: domain.display_name,
    created_at: domain.created_at,
    updated_at: domain.updated_at,
  };
}

export async function createDomain({
  url,
  display_name,
}: {
  url: string;
  display_name: string;
}) {
  await ensureDatabase();

  const normalizedUrl = normalizeDomain(url);
  const normalizedDisplayName = display_name.trim().toLowerCase();

  const duplicateDisplayName = await RankTrackerDomainModel.exists({
    display_name_lower: normalizedDisplayName,
  });

  if (duplicateDisplayName) {
    return {
      error: true,
      message: "Visningsnavnet findes allerede",
    };
  }

  const now = new Date().toISOString();
  const id = String(await getNextCounter("nextDomainId"));

  const domain: MockDomain = {
    id,
    team: "1",
    url: normalizedUrl,
    display_name: display_name.trim(),
    created_at: now,
    updated_at: now,
  };

  await RankTrackerDomainModel.create({
    ...domain,
    display_name_lower: domain.display_name.toLowerCase(),
  });

  const siteUrl = normalizeSiteUrl(domain.url);
  await RankTrackerGSCSiteModel.updateOne(
    { siteUrl },
    {
      $setOnInsert: {
        siteUrl,
        records: [
          {
            query: `${display_name.toLowerCase()} priser`,
            clicks: 37,
            impressions: 620,
            ctr: 0.0597,
            position: 12.4,
          },
          {
            query: `${display_name.toLowerCase()} anmeldelser`,
            clicks: 28,
            impressions: 410,
            ctr: 0.0683,
            position: 10.9,
          },
          {
            query: `${display_name.toLowerCase()} tilbud`,
            clicks: 19,
            impressions: 355,
            ctr: 0.0535,
            position: 14.1,
          },
        ],
      },
    },
    { upsert: true },
  );

  return domain;
}

export async function updateDomain({
  id,
  url,
  display_name,
}: {
  id: string;
  url: string;
  display_name: string;
}) {
  await ensureDatabase();

  const domain = (await RankTrackerDomainModel.findOne({
    id: String(id),
  }).lean()) as unknown as MockDomain | null;

  if (!domain) {
    return { error: true, message: "Domæne ikke fundet" };
  }

  const normalizedDisplayName = display_name.trim().toLowerCase();
  const duplicateDisplayName = await RankTrackerDomainModel.exists({
    id: { $ne: String(id) },
    display_name_lower: normalizedDisplayName,
  });

  if (duplicateDisplayName) {
    return { error: true, message: "Visningsnavnet findes allerede" };
  }

  const updated_at = new Date().toISOString();
  const nextDomain = {
    ...domain,
    url: normalizeDomain(url),
    display_name: display_name.trim(),
    updated_at,
  };

  await RankTrackerDomainModel.updateOne(
    { id: String(id) },
    {
      $set: {
        url: nextDomain.url,
        display_name: nextDomain.display_name,
        display_name_lower: nextDomain.display_name.toLowerCase(),
        updated_at: nextDomain.updated_at,
      },
    },
  );

  return nextDomain;
}

export async function deleteDomain(id: string) {
  await ensureDatabase();

  const domain = (await RankTrackerDomainModel.findOne({
    id: String(id),
  }).lean()) as unknown as MockDomain | null;

  if (!domain) {
    return false;
  }

  await Promise.all([
    RankTrackerDomainModel.deleteOne({ id: String(id) }),
    RankTrackerKeywordModel.deleteMany({ domainId: String(id) }),
    RankTrackerTagModel.deleteMany({ domainId: String(id) }),
  ]);

  const hasSiblingWithSameUrl = await RankTrackerDomainModel.exists({
    id: { $ne: String(id) },
    url: normalizeDomain(domain.url),
  });

  if (!hasSiblingWithSameUrl) {
    await RankTrackerGSCSiteModel.deleteOne({
      siteUrl: normalizeSiteUrl(domain.url),
    });
  }

  return true;
}
