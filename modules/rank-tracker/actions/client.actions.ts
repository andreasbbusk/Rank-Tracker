"use client";

import {
  listTags,
  updateKeywordTag,
  deleteKeywordTag,
} from "./ranker-tags.actions";

import {
  listNotes,
  getKeywordNote,
  updateKeywordNote,
  deleteKeywordNote,
} from "./ranker-notes.actions";

/**
 * Client-side wrapper for tags API calls
 */

/**
 * Henter alle tags for et domæne
 */
export async function listTagsClient(domainId: string) {
  try {
    const response = await listTags(domainId);
    if (!response) throw new Error("Fejl ved hentning af tags");
    return response;
  } catch (error) {
    console.error("Fejl ved hentning af tags:", error);
    throw error;
  }
}

/**
 * Opdaterer et keyword-tag forhold
 */
export async function updateKeywordTagClient(tagId: string, name: string) {
  try {
    const response = await updateKeywordTag(tagId, name);
    if (!response) throw new Error("Fejl ved opdatering af tag");
    return response;
  } catch (error) {
    console.error("Fejl ved opdatering af tag:", error);
    throw error;
  }
}

/**
 * Sletter et keyword-tag forhold
 */
export async function deleteKeywordTagClient(tagId: string) {
  try {
    const response = await deleteKeywordTag(tagId);
    if (!response) throw new Error("Fejl ved sletning af tag");
    return true;
  } catch (error) {
    console.error("Fejl ved sletning af tag:", error);
    throw error;
  }
}

/**
 * Client-side wrapper for notes API calls
 */

/**
 * Henter alle noter for et domæne
 */
export async function listNotesClient(domainId: string) {
  try {
    const response = await listNotes(domainId);
    if (!response) throw new Error("Fejl ved hentning af noter");
    return response;
  } catch (error) {
    console.error("Fejl ved hentning af noter:", error);
    throw error;
  }
}

/**
 * Henter en specifik note
 */
export async function getKeywordNoteClient(noteId: string) {
  try {
    const response = await getKeywordNote(noteId);
    if (!response) throw new Error("Fejl ved hentning af note");
    return response;
  } catch (error) {
    console.error("Fejl ved hentning af note:", error);
    throw error;
  }
}

/**
 * Opdaterer et keyword-note forhold
 */
export async function updateKeywordNoteClient(
  noteId: string,
  description: string,
) {
  try {
    const response = await updateKeywordNote(noteId, description);
    if (!response) throw new Error("Fejl ved opdatering af note");
    return response;
  } catch (error) {
    console.error("Fejl ved opdatering af note:", error);
    throw error;
  }
}

/**
 * Sletter et keyword-note forhold
 */
export async function deleteKeywordNoteClient(noteId: string) {
  try {
    const response = await deleteKeywordNote(noteId);
    if (!response) throw new Error("Fejl ved sletning af note");
    return true;
  } catch (error) {
    console.error("Fejl ved sletning af note:", error);
    throw error;
  }
}
