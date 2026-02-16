"use server";

import {
  getDashboardView,
  getDomainKeywordsView,
  getDomainsView,
  getKeywordModalView,
} from "../db/services/view.service";
import { DomainView } from "../types/index";

interface DateRange {
  start_date: string;
  end_date: string;
}

export async function createDashboardView(
  domainId: string,
  dateRanges?: DateRange[],
) {
  try {
    return await getDashboardView({ domainId, dateRanges });
  } catch (error) {
    console.error(error);
    return { records: [] };
  }
}

export async function createDomainsView(
  dateRanges?: DateRange[],
): Promise<DomainView[] | null> {
  try {
    const records = await getDomainsView(dateRanges);
    return records as DomainView[];
  } catch (error) {
    console.error(error);
    return null;
  }
}

export async function createDomainKeywordsView({
  domainId,
  dateRanges,
  limit = 9999,
  page = 1,
}: {
  domainId: string;
  dateRanges?: DateRange[];
  limit?: number;
  page?: number;
}) {
  try {
    const response = await getDomainKeywordsView({
      domainId,
      dateRanges,
    });

    if (limit && response.records.length > limit) {
      const start = Math.max((page - 1) * limit, 0);
      const paginated = response.records.slice(start, start + limit);
      return {
        ...response,
        count: response.records.length,
        records: paginated,
      };
    }

    return response;
  } catch (error) {
    console.error(error);
    return {
      count: 0,
      next: null,
      previous: null,
      records: [],
    };
  }
}

export async function createKeywordModalView(
  keywordId: string,
  dateRanges?: DateRange[],
) {
  try {
    void dateRanges;
    return await getKeywordModalView({ keywordId });
  } catch (error) {
    console.error(error);
    return null;
  }
}
