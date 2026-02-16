import {
  ensureDatabase,
  SHARED_SEED_TENANT_ID,
} from "../core/database";
import { getCurrentTenantId } from "../core/tenant";
import { getNonSeededPruneAfterDate } from "../core/retention";
import { RankTrackerKeywordModel } from "../models/keyword.model";
import { MockKeyword, MockKeywordNote } from "../types";
import { getKeywordsForDomain } from "./common.service";
import {
  getTenantOverlayState,
  mergeTenantAndSeedDocuments,
} from "./overlay-utils.service";

type KeywordDoc = MockKeyword & {
  tenantId: string;
  title_lower?: string;
};

function isHiddenKeyword(
  overlayState: Awaited<ReturnType<typeof getTenantOverlayState>>,
  keyword: { domainId: string },
  keywordId: number,
): boolean {
  return (
    overlayState.deletedDomainIds.has(keyword.domainId) ||
    overlayState.deletedKeywordIds.has(keywordId)
  );
}

async function findKeywordByNoteId(tenantId: string, noteId: number) {
  const [overlayState, keywordDocs] = await Promise.all([
    getTenantOverlayState(tenantId),
    RankTrackerKeywordModel.find(
      {
        tenantId: { $in: [tenantId, SHARED_SEED_TENANT_ID] },
        "notes.id": noteId,
      },
      {
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
      },
    ).lean(),
  ]);

  const keywords = mergeTenantAndSeedDocuments(
    tenantId,
    keywordDocs as KeywordDoc[],
    (keyword) => String(keyword.id),
    (keyword, id) => isHiddenKeyword(overlayState, keyword, Number(id)),
  );

  return keywords.find((keyword) =>
    keyword.notes.some((note) => note.id === noteId),
  );
}

async function ensureTenantKeywordClone(
  tenantId: string,
  seedKeyword: KeywordDoc,
): Promise<void> {
  const pruneAfter = getNonSeededPruneAfterDate();

  await RankTrackerKeywordModel.updateOne(
    { tenantId, id: seedKeyword.id },
    {
      $setOnInsert: {
        tenantId,
        isSeeded: false,
        pruneAfter,
        id: seedKeyword.id,
        domainId: seedKeyword.domainId,
        title: seedKeyword.title,
        title_lower: seedKeyword.title_lower || seedKeyword.title.toLowerCase(),
        star_keyword: seedKeyword.star_keyword,
        location: seedKeyword.location,
        tagIds: seedKeyword.tagIds,
        notes: seedKeyword.notes,
        latest_fetch: seedKeyword.latest_fetch,
        created_at: seedKeyword.created_at,
        updated_at: seedKeyword.updated_at,
        preferred_url: seedKeyword.preferred_url,
        search_volume: seedKeyword.search_volume,
        current: seedKeyword.current,
        previous: seedKeyword.previous,
        status: seedKeyword.status,
        statusChecksRemaining: seedKeyword.statusChecksRemaining,
      },
    },
    { upsert: true },
  );
}

export async function listNotes(domainId: string) {
  const tenantId = await getCurrentTenantId();
  await ensureDatabase(tenantId);

  const keywords = await getKeywordsForDomain(String(domainId));

  return keywords.flatMap((keyword) =>
    keyword.notes.map((note) => ({
      ...note,
      keyword: keyword.id,
      keyword_title: keyword.title,
    })),
  );
}

export async function getNote(noteId: string) {
  const tenantId = await getCurrentTenantId();
  await ensureDatabase(tenantId);
  const id = Number(noteId);

  const keyword = await findKeywordByNoteId(tenantId, id);

  if (!keyword) {
    return null;
  }

  const note = keyword.notes.find((item) => item.id === id);
  if (!note) {
    return null;
  }

  return {
    ...note,
    keyword: keyword.id,
    keyword_title: keyword.title,
  };
}

export async function updateNote(noteId: string, description: string) {
  const tenantId = await getCurrentTenantId();
  await ensureDatabase(tenantId);
  const id = Number(noteId);
  const now = new Date().toISOString();

  const keyword = await findKeywordByNoteId(tenantId, id);

  if (!keyword) {
    return { error: true, message: "Note ikke fundet" };
  }

  if (keyword.tenantId !== tenantId) {
    await ensureTenantKeywordClone(tenantId, keyword);
  }

  const result = await RankTrackerKeywordModel.updateOne(
    { tenantId, id: keyword.id, "notes.id": id },
    {
      $set: {
        "notes.$.description": description,
        "notes.$.updated_at": now,
        updated_at: now,
      },
    },
  );

  if (result.matchedCount === 0) {
    return { error: true, message: "Note ikke fundet" };
  }

  return { error: false, success: true };
}

export async function deleteNote(noteId: string) {
  const tenantId = await getCurrentTenantId();
  await ensureDatabase(tenantId);
  const id = Number(noteId);
  const now = new Date().toISOString();

  const keyword = await findKeywordByNoteId(tenantId, id);

  if (!keyword) {
    return { error: true, message: "Note ikke fundet" };
  }

  if (keyword.tenantId !== tenantId) {
    await ensureTenantKeywordClone(tenantId, keyword);
  }

  const result = await RankTrackerKeywordModel.updateOne(
    { tenantId, id: keyword.id, "notes.id": id },
    {
      $pull: { notes: { id } },
      $set: { updated_at: now },
    },
  );

  if (result.matchedCount === 0) {
    return { error: true, message: "Note ikke fundet" };
  }

  return { error: false, success: true };
}
