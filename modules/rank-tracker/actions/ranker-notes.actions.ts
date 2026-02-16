"use server";

import {
  deleteNote as deleteNoteRecord,
  getNote as getNoteRecord,
  listNotes as listNotesForDomain,
  updateNote as updateNoteRecord,
} from "../db/services/note.service";

/**
 * Henter alle noter for et domæne (server-side)
 * @param domainId - ID på domænet
 */
export async function listNotes(domainId: string) {
  try {
    return await listNotesForDomain(domainId);
  } catch (error) {
    console.error("Fejl ved hentning af noter:", error);
    return [];
  }
}

/**
 * Henter en specifik note (server-side)
 * @param noteId - ID på noten
 */
export async function getKeywordNote(noteId: string) {
  try {
    return await getNoteRecord(noteId);
  } catch (error) {
    console.error("Fejl ved hentning af note:", error);
    return null;
  }
}

/**
 * Opdaterer et keyword-note forhold (server-side)
 * @param noteId - ID på note-relationen
 * @param description - Beskrivelse der skal opdateres
 */
export async function updateKeywordNote(noteId: string, description: string) {
  try {
    return await updateNoteRecord(noteId, description);
  } catch (error) {
    console.error("Fejl ved opdatering af note:", error);
    return {
      error: true,
      message: error instanceof Error ? error.message : "Ukendt fejl",
    };
  }
}

/**
 * Sletter et keyword-note forhold (server-side)
 * @param noteId - ID på note-relationen
 */
export async function deleteKeywordNote(noteId: string) {
  try {
    return await deleteNoteRecord(noteId);
  } catch (error) {
    console.error("Fejl ved sletning af note:", error);
    return {
      error: true,
      message: error instanceof Error ? error.message : "Ukendt fejl",
    };
  }
}
