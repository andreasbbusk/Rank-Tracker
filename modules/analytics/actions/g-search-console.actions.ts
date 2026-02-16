"use server";

import {
  getGSCProperties,
  runGSCReport,
} from "@/modules/rank-tracker/db/services/gsc.service";

export type GoogleSearchConsoleProperties = {
  error?: string;
  accounts: {
    property: string;
  }[];
};

export async function getProperties(
  _tokens?: unknown,
): Promise<GoogleSearchConsoleProperties | null> {
  try {
    return await getGSCProperties();
  } catch (error) {
    console.log(error);
    return null;
  }
}

export async function runReport({
  date_ranges,
  search_type,
  aggregation_type,
  filter_bys,
  limit,
  page,
  dimensions,
  site_url,
}: {
  date_ranges: { start_date: string; end_date: string }[];
  search_type: string;
  aggregation_type: string;
  filter_bys: any[];
  limit?: number;
  page?: number;
  dimensions: string[];
  site_url: string;
}) {
  try {
    void date_ranges;
    void search_type;
    void aggregation_type;
    void filter_bys;
    void page;
    void dimensions;

    return await runGSCReport({
      site_url,
      limit,
    });
  } catch (error) {
    console.log(error);
    return {
      records: [],
      count: 0,
      next: null,
      previous: null,
    };
  }
}
