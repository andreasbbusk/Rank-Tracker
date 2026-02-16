import { ensureDatabase } from "../core/database";
import { getCurrentTenantId } from "../core/tenant";
import { RankTrackerKeywordModel } from "../models/keyword.model";
import { MockKeywordNote } from "../types";

export async function listNotes(domainId: string) {
  const tenantId = await getCurrentTenantId();
  await ensureDatabase(tenantId);

  const keywords = (await RankTrackerKeywordModel.find(
    { tenantId, domainId: String(domainId) },
    { id: 1, title: 1, notes: 1 },
  ).lean()) as Array<{ id: number; title: string; notes: MockKeywordNote[] }>;

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

  const keyword = (await RankTrackerKeywordModel.findOne(
    { tenantId, "notes.id": id },
    { id: 1, title: 1, notes: 1 },
  ).lean()) as {
    id: number;
    title: string;
    notes: MockKeywordNote[];
  } | null;

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

  const result = await RankTrackerKeywordModel.updateOne(
    { tenantId, "notes.id": id },
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

  const result = await RankTrackerKeywordModel.updateOne(
    { tenantId, "notes.id": id },
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
