"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import {
  createKeywords as createKeywordsRecord,
  createSingleKeyword as createSingleKeywordRecord,
  deleteKeyword as deleteKeywordRecord,
  deleteKeywordLocation as deleteKeywordLocationRecord,
  getKeywordById,
  getKeywordStatus as getKeywordStatusRecord,
  listKeywords as listKeywordsRecord,
  updateKeyword as updateKeywordRecord,
  updateKeywordLocation as updateKeywordLocationRecord,
} from "../db/services/keyword.service";
import { getLocations as getLocationsRecord } from "../db/services/location.service";
import { getGSCKeywords as getGSCKeywordsRecord } from "../db/services/gsc.service";
import { Keyword } from "../types";

export async function createKeyword({
  title,
  domain,
  star_keyword,
  location,
  tags,
}: Partial<Keyword>) {
  try {
    const tagNames = (tags || []).map((tag) =>
      typeof tag === "string" ? tag : tag.name,
    );

    const result = await createSingleKeywordRecord({
      title: title || "",
      domain: String(domain || ""),
      star_keyword,
      location,
      tags: tagNames,
    });

    revalidateTag("domain-keywords-view");
    revalidateTag("rank-tracker-keywords");
    revalidateTag("rank-tracker-domains");
    revalidatePath("/");

    return { ...result, cacheKey: "keywordCreate" };
  } catch (error) {
    console.error(error);
    return { error: true, message: "Kunne ikke oprette søgeord." };
  }
}

/**
 * createKeywords - Creates multiple keywords and returns their IDs for tracking
 * @param options - Options for creating multiple keywords
 * @returns Object with success status and keyword IDs
 */
export async function createKeywords({
  domain,
  keywords,
  location,
  star_keyword,
  tags,
}: {
  domain: number;
  keywords: string[];
  location?: { country: string; device: string };
  star_keyword?: boolean;
  tags?: string[];
}): Promise<
  | {
      success: boolean;
      cacheKey?: string;
      error?: boolean;
      keywords?: number[];
      message?: string;
    }
  | undefined
> {
  // Filter out empty keywords
  const filteredKeywords = keywords.filter((keyword) => keyword.trim() !== "");

  if (filteredKeywords.length === 0) {
    return {
      success: false,
      error: true,
      message: "Ingen gyldige søgeord angivet",
    };
  }

  try {
    const keywordList = await createKeywordsRecord({
      domain,
      keywords: filteredKeywords,
      location,
      star_keyword,
      tags,
    });

    if (!keywordList.length) {
      return {
        error: true,
        success: false,
        message: "Fejl ved oprettelse af søgeord",
      };
    }

    // Cache invalidation to mirror old behavior
    revalidateTag("domain-keywords-view");
    revalidateTag("rank-tracker-keywords");
    revalidateTag("rank-tracker-domains");
    revalidatePath("/");

    return {
      success: true,
      cacheKey: "keywordsCreate",
      keywords: keywordList,
      message: "Søgeord tilføjet",
    };
  } catch (error) {
    console.error("Error creating keywords:", error);
    return {
      error: true,
      success: false,
      message: "Fejl ved oprettelse af søgeord",
    };
  }
}

export async function getKeyword(id: string): Promise<Keyword | undefined> {
  try {
    const result = await getKeywordById(id);
    return result as unknown as Keyword | undefined;
  } catch (error) {
    console.error(error);
    return undefined;
  }
}

/**
 * deleteKeyword - Deletes a keyword with optimistic UI update support
 * @param id - Keyword ID to delete
 * @returns Object with success/error information
 */
export async function deleteKeyword(id: string) {
  try {
    const success = await deleteKeywordRecord(id);

    if (!success) {
      return {
        error: true,
        message: "Søgeord ikke fundet",
      };
    }

    revalidateTag("domain-keywords-view");
    revalidateTag("rank-tracker-keywords");
    revalidateTag("rank-tracker-domains");
    revalidatePath("/");

    return { success: true, id };
  } catch (error) {
    console.error("Delete keyword error:", error);
    return {
      error: true,
      message: error instanceof Error ? error.message : "Network error",
    };
  }
}

/**
 * updateKeyword - Updates a keyword with optimistic UI update support
 * @param options - Update payload including ID and fields to update
 * @returns Response from the server or error information
 */
export async function updateKeyword({
  id,
  title,
  domain,
  star_keyword,
  location,
  tags,
  notes,
  preferred_url,
}: Partial<Keyword> & { id: string }) {
  try {
    const result = await updateKeywordRecord({
      id,
      title,
      domain,
      star_keyword,
      location,
      tags,
      notes,
      preferred_url,
    });

    if ((result as any)?.error) {
      return result;
    }

    revalidateTag("domain-keywords-view");
    revalidateTag("rank-tracker-keywords");
    revalidateTag("rank-tracker-domains");
    revalidatePath("/");

    return { success: true, ...(result as object) };
  } catch (error) {
    console.error("Update error:", error);
    return {
      error: true,
      message:
        error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

export async function getKeywordList() {
  try {
    const results = await listKeywordsRecord();

    return {
      count: results.length,
      next: null,
      previous: null,
      results,
    };
  } catch (error) {
    console.error("Error fetching keywords:", error);
    return { count: 0, next: null, previous: null, results: [] };
  }
}

export async function getKeywordStats() {
  try {
    const results = await listKeywordsRecord();
    return results.slice(0, 20);
  } catch (error) {
    console.error(error);
    return [];
  }
}

export async function getLocations() {
  try {
    return await getLocationsRecord();
  } catch (error) {
    console.error(error);
    return [];
  }
}

export async function updateKeywordLocation(
  id: string,
  location: {
    country: string;
    device: string;
    lang_const: string;
    geo_const: string;
  },
) {
  try {
    const result = await updateKeywordLocationRecord(id, location);

    if (!result) {
      throw new Error("Failed to update location");
    }

    revalidateTag("domain-keywords-view");
    revalidatePath("/");
    return result;
  } catch (error) {
    console.error("Update location error:", error);
    return null;
  }
}

export async function deleteKeywordLocation(id: string) {
  try {
    const success = await deleteKeywordLocationRecord(id);

    if (!success) {
      throw new Error("Failed to delete location");
    }

    revalidateTag("domain-keywords-view");
    revalidatePath("/");
    return true;
  } catch (error) {
    console.error("Delete location error:", error);
    return false;
  }
}

export async function getGSCKeywords(siteUrl: string) {
  try {
    return await getGSCKeywordsRecord(siteUrl);
  } catch (error) {
    console.error("Error fetching GSC keywords:", error);
    return {
      records: [],
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * getKeywordStatus - Checks the processing status of newly added keywords
 * @param keyword_list - Array of keyword IDs to check status for
 * @returns Status information including whether all keywords have been processed
 */
export async function getKeywordStatus(keyword_list: number[]): Promise<{
  keywords_status?: {
    latest_fetch?: string | null;
    status?: "processed" | "pending" | "error";
  }[];
  status?: boolean;
  error?: string | null;
} | null> {
  try {
    const data = await getKeywordStatusRecord(keyword_list);

    // Only revalidate and cache when status is true (all keywords are processed)
    if (data?.status) {
      revalidateTag("domain-keywords-view");
      revalidateTag("rank-tracker-keywords");
      revalidateTag("rank-tracker-domains");
      revalidatePath("/");
    }

    return data;
  } catch (error) {
    console.error("Error checking keyword status:", error);
    return null;
  }
}
