import { ensureDatabase, getNextCounter } from "../core/database";
import { getCurrentTenantId } from "../core/tenant";
import { RankTrackerDomainModel } from "../models/domain.model";
import { RankTrackerGSCSiteModel } from "../models/gsc-site.model";
import { RankTrackerKeywordModel } from "../models/keyword.model";
import { RankTrackerTagModel } from "../models/tag.model";
import { MockDomain } from "../types";
import { normalizeDomain, normalizeSiteUrl } from "../utils/normalizers";

export async function listDomains() {
  const tenantId = await getCurrentTenantId();
  await ensureDatabase(tenantId);

  const domains = (await RankTrackerDomainModel.find({ tenantId })
    .sort({ created_at: -1, id: 1 })
    .select({
      _id: 0,
      id: 1,
      team: 1,
      url: 1,
      display_name: 1,
      created_at: 1,
      updated_at: 1,
    })
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

export async function countDomains() {
  const tenantId = await getCurrentTenantId();
  await ensureDatabase(tenantId);
  return RankTrackerDomainModel.countDocuments({ tenantId });
}

export async function getDomainById(id: string) {
  const tenantId = await getCurrentTenantId();
  await ensureDatabase(tenantId);
  const domain = (await RankTrackerDomainModel.findOne({
    tenantId,
    id: String(id),
  })
    .select({
      _id: 0,
      id: 1,
      team: 1,
      url: 1,
      display_name: 1,
      created_at: 1,
      updated_at: 1,
    })
    .lean()) as unknown as MockDomain | null;

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
  const tenantId = await getCurrentTenantId();
  await ensureDatabase(tenantId);

  const normalizedUrl = normalizeDomain(url);
  const normalizedDisplayName = display_name.trim().toLowerCase();

  const duplicateDisplayName = await RankTrackerDomainModel.exists({
    tenantId,
    display_name_lower: normalizedDisplayName,
  });

  if (duplicateDisplayName) {
    return {
      error: true,
      message: "Visningsnavnet findes allerede",
    };
  }

  const now = new Date().toISOString();
  const id = String(await getNextCounter("nextDomainId", tenantId));

  const domain: MockDomain = {
    id,
    team: "1",
    url: normalizedUrl,
    display_name: display_name.trim(),
    created_at: now,
    updated_at: now,
  };

  await RankTrackerDomainModel.create({
    tenantId,
    ...domain,
    display_name_lower: domain.display_name.toLowerCase(),
  });

  const siteUrl = normalizeSiteUrl(domain.url);
  await RankTrackerGSCSiteModel.updateOne(
    { tenantId, siteUrl },
    {
      $setOnInsert: {
        tenantId,
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
  const tenantId = await getCurrentTenantId();
  await ensureDatabase(tenantId);

  const domain = (await RankTrackerDomainModel.findOne({
    tenantId,
    id: String(id),
  })
    .select({
      _id: 0,
      id: 1,
      team: 1,
      url: 1,
      display_name: 1,
      created_at: 1,
      updated_at: 1,
    })
    .lean()) as unknown as MockDomain | null;

  if (!domain) {
    return { error: true, message: "Domæne ikke fundet" };
  }

  const normalizedDisplayName = display_name.trim().toLowerCase();
  const duplicateDisplayName = await RankTrackerDomainModel.exists({
    tenantId,
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
    { tenantId, id: String(id) },
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
  const tenantId = await getCurrentTenantId();
  await ensureDatabase(tenantId);

  const domain = (await RankTrackerDomainModel.findOne({
    tenantId,
    id: String(id),
  })
    .select({
      _id: 0,
      id: 1,
      url: 1,
    })
    .lean()) as unknown as Pick<MockDomain, "id" | "url"> | null;

  if (!domain) {
    return false;
  }

  await Promise.all([
    RankTrackerDomainModel.deleteOne({ tenantId, id: String(id) }),
    RankTrackerKeywordModel.deleteMany({ tenantId, domainId: String(id) }),
    RankTrackerTagModel.deleteMany({ tenantId, domainId: String(id) }),
  ]);

  const hasSiblingWithSameUrl = await RankTrackerDomainModel.exists({
    tenantId,
    id: { $ne: String(id) },
    url: normalizeDomain(domain.url),
  });

  if (!hasSiblingWithSameUrl) {
    await RankTrackerGSCSiteModel.deleteOne({
      tenantId,
      siteUrl: normalizeSiteUrl(domain.url),
    });
  }

  return true;
}
