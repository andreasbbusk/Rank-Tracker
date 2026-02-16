"use server";

import {
  deleteTag as deleteTagRecord,
  listTags as listTagsForDomain,
  updateTag as updateTagRecord,
} from "../db/services/tag.service";

/**
 * Henter alle tags for et domæne (server-side)
 * @param domainId - ID på domænet
 */
export async function listTags(domainId: string) {
  try {
    return await listTagsForDomain(domainId);
  } catch (error) {
    console.error("Fejl ved hentning af tags:", error);
    return { results: [] };
  }
}

/**
 * Opdaterer et keyword-tag forhold (server-side)
 * @param tagId - ID på tag-relationen
 * @param data - Data der skal opdateres
 */
export async function updateKeywordTag(tagId: string, name: string) {
  try {
    return await updateTagRecord(tagId, name);
  } catch (error) {
    console.error("Fejl ved opdatering af tag:", error);
    return false;
  }
}

/**
 * Sletter et keyword-tag forhold (server-side)
 * @param tagId - ID på tag-relationen
 */
export async function deleteKeywordTag(tagId: string) {
  try {
    return await deleteTagRecord(tagId);
  } catch (error) {
    console.error("Fejl ved sletning af tag:", error);
    return false;
  }
}
