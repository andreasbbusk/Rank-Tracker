import { RankTrackerMetaModel } from "../models/meta.model";
import { DB_NAMESPACE } from "../core/database";

export type TenantOverlayState = {
  deletedDomainIds: Set<string>;
  deletedKeywordIds: Set<number>;
  deletedTagIds: Set<number>;
};

function toStringSet(values: unknown): Set<string> {
  if (!Array.isArray(values)) {
    return new Set<string>();
  }

  return new Set(
    values
      .map((value) => String(value || "").trim())
      .filter((value) => Boolean(value)),
  );
}

function toNumberSet(values: unknown): Set<number> {
  if (!Array.isArray(values)) {
    return new Set<number>();
  }

  return new Set(
    values
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value)),
  );
}

export async function getTenantOverlayState(
  tenantId: string,
): Promise<TenantOverlayState> {
  const meta = await RankTrackerMetaModel.findOne(
    { tenantId, key: DB_NAMESPACE },
    {
      _id: 0,
      deletedDomainIds: 1,
      deletedKeywordIds: 1,
      deletedTagIds: 1,
    },
  ).lean();

  return {
    deletedDomainIds: toStringSet(meta?.deletedDomainIds),
    deletedKeywordIds: toNumberSet(meta?.deletedKeywordIds),
    deletedTagIds: toNumberSet(meta?.deletedTagIds),
  };
}

export async function markDeletedSeedDomain(
  tenantId: string,
  domainId: string,
): Promise<void> {
  await RankTrackerMetaModel.updateOne(
    { tenantId, key: DB_NAMESPACE },
    {
      $addToSet: { deletedDomainIds: String(domainId) },
    },
    { upsert: false },
  );
}

export async function markDeletedSeedKeyword(
  tenantId: string,
  keywordId: number,
): Promise<void> {
  await RankTrackerMetaModel.updateOne(
    { tenantId, key: DB_NAMESPACE },
    {
      $addToSet: { deletedKeywordIds: Number(keywordId) },
    },
    { upsert: false },
  );
}

export async function markDeletedSeedTag(
  tenantId: string,
  tagId: number,
): Promise<void> {
  await RankTrackerMetaModel.updateOne(
    { tenantId, key: DB_NAMESPACE },
    {
      $addToSet: { deletedTagIds: Number(tagId) },
    },
    { upsert: false },
  );
}

export function mergeTenantAndSeedDocuments<T extends { tenantId: string }>(
  tenantId: string,
  documents: T[],
  getId: (document: T) => string,
  isDeleted: (document: T, id: string) => boolean,
): T[] {
  const tenantDocs = new Map<string, T>();
  const seedDocs = new Map<string, T>();

  for (const document of documents) {
    const id = getId(document);
    if (!id) {
      continue;
    }

    if (document.tenantId === tenantId) {
      tenantDocs.set(id, document);
      continue;
    }

    if (!seedDocs.has(id)) {
      seedDocs.set(id, document);
    }
  }

  const merged: T[] = [];

  for (const [id, document] of seedDocs) {
    if (tenantDocs.has(id) || isDeleted(document, id)) {
      continue;
    }
    merged.push(document);
  }

  for (const [id, document] of tenantDocs) {
    if (isDeleted(document, id)) {
      continue;
    }
    merged.push(document);
  }

  return merged;
}
