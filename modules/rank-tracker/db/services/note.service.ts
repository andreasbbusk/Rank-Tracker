import { ensureDatabase } from "../core/database";
import { RankTrackerKeywordModel } from "../models/keyword.model";
import { MockKeywordNote } from "../types";

export async function listNotes(domainId: string) {
  await ensureDatabase();

  const keywords = (await RankTrackerKeywordModel.find(
    { domainId: String(domainId) },
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
  await ensureDatabase();
  const id = Number(noteId);

  const keyword = (await RankTrackerKeywordModel.findOne(
    { "notes.id": id },
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
  await ensureDatabase();
  const id = Number(noteId);
  const now = new Date().toISOString();

  const keyword = (await RankTrackerKeywordModel.findOne(
    { "notes.id": id },
    { id: 1, notes: 1 },
  ).lean()) as { id: number; notes: MockKeywordNote[] } | null;

  if (!keyword) {
    return { error: true, message: "Note ikke fundet" };
  }

  const notes = keyword.notes.map((note) =>
    note.id === id
      ? {
          ...note,
          description,
          updated_at: now,
        }
      : note,
  );

  await RankTrackerKeywordModel.updateOne(
    { id: keyword.id },
    {
      $set: {
        notes,
        updated_at: now,
      },
    },
  );

  return { error: false, success: true };
}

export async function deleteNote(noteId: string) {
  await ensureDatabase();
  const id = Number(noteId);
  const now = new Date().toISOString();

  const keyword = (await RankTrackerKeywordModel.findOne(
    { "notes.id": id },
    { id: 1, notes: 1 },
  ).lean()) as { id: number; notes: MockKeywordNote[] } | null;

  if (!keyword) {
    return { error: true, message: "Note ikke fundet" };
  }

  const notes = keyword.notes.filter((note) => note.id !== id);

  await RankTrackerKeywordModel.updateOne(
    { id: keyword.id },
    {
      $set: {
        notes,
        updated_at: now,
      },
    },
  );

  return { error: false, success: true };
}
