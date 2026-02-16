import {
  ensureDatabase,
  getNextCounter,
  SHARED_SEED_TENANT_ID,
} from "../core/database";
import { getCurrentTenantId } from "../core/tenant";
import { getNonSeededPruneAfterDate } from "../core/retention";
import { RankTrackerDomainModel } from "../models/domain.model";
import { RankTrackerGSCSiteModel } from "../models/gsc-site.model";
import { RankTrackerKeywordModel } from "../models/keyword.model";
import { RankTrackerTagModel } from "../models/tag.model";
import { MockDomain } from "../types";
import { normalizeDomain, normalizeSiteUrl } from "../utils/normalizers";
import {
  getTenantOverlayState,
  markDeletedSeedDomain,
  mergeTenantAndSeedDocuments,
} from "./overlay-utils.service";

type DomainDoc = MockDomain & {
  tenantId: string;
  display_name_lower?: string;
};

function toDomain(domain: DomainDoc): MockDomain {
  return {
    id: domain.id,
    team: domain.team,
    url: domain.url,
    display_name: domain.display_name,
    created_at: domain.created_at,
    updated_at: domain.updated_at,
  };
}

async function getMergedDomainsInternal(tenantId: string): Promise<MockDomain[]> {
  const [overlayState, domains] = await Promise.all([
    getTenantOverlayState(tenantId),
    RankTrackerDomainModel.find({
      tenantId: { $in: [tenantId, SHARED_SEED_TENANT_ID] },
    })
      .select({
        _id: 0,
        tenantId: 1,
        id: 1,
        team: 1,
        url: 1,
        display_name: 1,
        created_at: 1,
        updated_at: 1,
        display_name_lower: 1,
      })
      .lean(),
  ]);

  const merged = mergeTenantAndSeedDocuments(
    tenantId,
    domains as DomainDoc[],
    (domain) => domain.id,
    (_, id) => overlayState.deletedDomainIds.has(id),
  );

  return merged
    .map(toDomain)
    .sort((left, right) => {
      if (left.created_at === right.created_at) {
        return left.id.localeCompare(right.id);
      }
      return left.created_at > right.created_at ? -1 : 1;
    });
}

export async function listDomains() {
  const tenantId = await getCurrentTenantId();
  await ensureDatabase(tenantId);
  return getMergedDomainsInternal(tenantId);
}

export async function countDomains() {
  const tenantId = await getCurrentTenantId();
  await ensureDatabase(tenantId);
  const domains = await getMergedDomainsInternal(tenantId);
  return domains.length;
}

export async function getDomainById(id: string) {
  const tenantId = await getCurrentTenantId();
  await ensureDatabase(tenantId);

  const domainId = String(id);
  const [overlayState, domains] = await Promise.all([
    getTenantOverlayState(tenantId),
    RankTrackerDomainModel.find({
      tenantId: { $in: [tenantId, SHARED_SEED_TENANT_ID] },
      id: domainId,
    })
      .select({
        _id: 0,
        tenantId: 1,
        id: 1,
        team: 1,
        url: 1,
        display_name: 1,
        created_at: 1,
        updated_at: 1,
      })
      .lean(),
  ]);

  if (overlayState.deletedDomainIds.has(domainId)) {
    return null;
  }

  const [domain] = mergeTenantAndSeedDocuments(
    tenantId,
    domains as DomainDoc[],
    (item) => item.id,
    () => false,
  );

  return domain ? toDomain(domain) : null;
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

  const [overlayState, duplicateCandidates] = await Promise.all([
    getTenantOverlayState(tenantId),
    RankTrackerDomainModel.find({
      tenantId: { $in: [tenantId, SHARED_SEED_TENANT_ID] },
      display_name_lower: normalizedDisplayName,
    })
      .select({ _id: 0, tenantId: 1, id: 1, display_name: 1 })
      .lean(),
  ]);

  const duplicates = mergeTenantAndSeedDocuments(
    tenantId,
    duplicateCandidates as Array<
      Pick<DomainDoc, "tenantId" | "id" | "display_name">
    >,
    (domain) => domain.id,
    (_, domainId) => overlayState.deletedDomainIds.has(domainId),
  );

  if (duplicates.length > 0) {
    return {
      error: true,
      message: "Visningsnavnet findes allerede",
    };
  }

  const now = new Date().toISOString();
  const pruneAfter = getNonSeededPruneAfterDate();
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
    isSeeded: false,
    pruneAfter,
    ...domain,
    display_name_lower: domain.display_name.toLowerCase(),
  });

  const siteUrl = normalizeSiteUrl(domain.url);
  await RankTrackerGSCSiteModel.updateOne(
    { tenantId, siteUrl },
    {
      $setOnInsert: {
        tenantId,
        isSeeded: false,
        pruneAfter,
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

  const domainId = String(id);

  const [overlayState, tenantDomain, seedDomain] = await Promise.all([
    getTenantOverlayState(tenantId),
    RankTrackerDomainModel.findOne({
      tenantId,
      id: domainId,
    })
      .select({
        _id: 0,
        tenantId: 1,
        id: 1,
        team: 1,
        url: 1,
        display_name: 1,
        display_name_lower: 1,
        created_at: 1,
        updated_at: 1,
      })
      .lean(),
    RankTrackerDomainModel.findOne({
      tenantId: SHARED_SEED_TENANT_ID,
      id: domainId,
    })
      .select({
        _id: 0,
        tenantId: 1,
        id: 1,
        team: 1,
        url: 1,
        display_name: 1,
        display_name_lower: 1,
        created_at: 1,
        updated_at: 1,
      })
      .lean(),
  ]);

  const sourceDomain =
    tenantDomain || (overlayState.deletedDomainIds.has(domainId) ? null : seedDomain);

  if (!sourceDomain) {
    return { error: true, message: "Domæne ikke fundet" };
  }

  const normalizedDisplayName = display_name.trim().toLowerCase();
  const duplicateCandidates = await RankTrackerDomainModel.find({
    tenantId: { $in: [tenantId, SHARED_SEED_TENANT_ID] },
    id: { $ne: domainId },
    display_name_lower: normalizedDisplayName,
  })
    .select({ _id: 0, tenantId: 1, id: 1 })
    .lean();

  const duplicates = mergeTenantAndSeedDocuments(
    tenantId,
    duplicateCandidates as Array<{ tenantId: string; id: string }>,
    (domain) => domain.id,
    (_, candidateId) => overlayState.deletedDomainIds.has(candidateId),
  );

  if (duplicates.length > 0) {
    return { error: true, message: "Visningsnavnet findes allerede" };
  }

  const updated_at = new Date().toISOString();
  const nextDomain: MockDomain = {
    id: sourceDomain.id,
    team: sourceDomain.team,
    url: normalizeDomain(url),
    display_name: display_name.trim(),
    created_at: sourceDomain.created_at,
    updated_at,
  };

  if (!tenantDomain) {
    const pruneAfter = getNonSeededPruneAfterDate();
    await RankTrackerDomainModel.updateOne(
      { tenantId, id: domainId },
      {
        $setOnInsert: {
          tenantId,
          isSeeded: false,
          pruneAfter,
          id: sourceDomain.id,
          team: sourceDomain.team,
          url: sourceDomain.url,
          display_name: sourceDomain.display_name,
          display_name_lower: sourceDomain.display_name.toLowerCase(),
          created_at: sourceDomain.created_at,
          updated_at: sourceDomain.updated_at,
        },
      },
      { upsert: true },
    );
  }

  await RankTrackerDomainModel.updateOne(
    { tenantId, id: domainId },
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

  const domainId = String(id);
  const [overlayState, tenantDomain, seedDomain] = await Promise.all([
    getTenantOverlayState(tenantId),
    RankTrackerDomainModel.findOne({ tenantId, id: domainId })
      .select({ _id: 0, id: 1, url: 1 })
      .lean(),
    RankTrackerDomainModel.findOne({
      tenantId: SHARED_SEED_TENANT_ID,
      id: domainId,
    })
      .select({ _id: 0, id: 1, url: 1 })
      .lean(),
  ]);

  const isSeedDeleted = overlayState.deletedDomainIds.has(domainId);
  const visibleDomain = tenantDomain || (!isSeedDeleted ? seedDomain : null);

  if (!visibleDomain) {
    return false;
  }

  const deletingSeedBackedDomain = Boolean(seedDomain);

  await Promise.all([
    RankTrackerDomainModel.deleteOne({ tenantId, id: domainId }),
    RankTrackerKeywordModel.deleteMany({ tenantId, domainId }),
    RankTrackerTagModel.deleteMany({ tenantId, domainId }),
    deletingSeedBackedDomain
      ? markDeletedSeedDomain(tenantId, domainId)
      : Promise.resolve(),
  ]);

  const siblingCandidates = await RankTrackerDomainModel.find({
    tenantId: { $in: [tenantId, SHARED_SEED_TENANT_ID] },
    id: { $ne: domainId },
    url: normalizeDomain(visibleDomain.url),
  })
    .select({ _id: 0, tenantId: 1, id: 1 })
    .lean();

  const siblings = mergeTenantAndSeedDocuments(
    tenantId,
    siblingCandidates as Array<{ tenantId: string; id: string }>,
    (domain) => domain.id,
    (_, candidateId) => overlayState.deletedDomainIds.has(candidateId),
  );

  if (!siblings.length) {
    await RankTrackerGSCSiteModel.deleteOne({
      tenantId,
      siteUrl: normalizeSiteUrl(visibleDomain.url),
    });
  }

  return true;
}
