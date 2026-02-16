"use client";

import { persist } from "zustand/middleware";
import { createWithEqualityFn } from "zustand/traditional";
import {
  createKeywords,
  deleteKeyword,
  getKeywordStatus,
  updateKeyword,
} from "../actions/ranker-keyword.actions";
import { Keyword } from "../types";

// Define Job type for pending keywords
type Job = {
  id: string;
  domain: string | null | undefined;
  pendingKeywords: number[] | null | undefined;
  keywordStatus: any | null | undefined;
  state: "pending" | "completed" | "error";
  createdAt: Date;
  finishedAt: Date | null;
};

// Define the Filters type
type Filters = {
  starred: boolean | null;
  country: string | null;
  tags: Array<{ id: string | number; name: string }> | null;
  keywords: string[] | null;
  landing_pages: string[] | null;
  position: {
    value_one: number | null;
    operator: "EQUAL" | "GREATER THAN" | "LESS THAN" | "BETWEEN" | null;
    value_two: number | null;
  };
  clicks: {
    value_one: number | null;
    operator: "EQUAL" | "GREATER THAN" | "LESS THAN" | "BETWEEN" | null;
    value_two: number | null;
  };
  impressions: {
    value_one: number | null;
    operator: "EQUAL" | "GREATER THAN" | "LESS THAN" | "BETWEEN" | null;
    value_two: number | null;
  };
};

// Optimistic store for keywords
type OptimisticStore = {
  // Optimistic data to display before server confirmation
  optimisticKeywords: Keyword[] | null;
  setOptimisticKeywords: (optimisticKeywords: Keyword[] | null) => void;

  // Get filtered keywords based on current filters
  getFilteredOptimisticKeywords: (key: string) => Keyword[] | null | undefined;

  // Delete a keyword optimistically and then on the server
  deleteOptimisticKeyword: (keyword_id: string) => Promise<void>;

  // Update a keyword optimistically and then on the server
  updateOptimisticKeyword: (
    keyword: Keyword,
    domainId: string,
  ) => Promise<void>;

  // Track when data was last updated
  update: Date;
  changeUpdate: (update: Date) => void;

  // Filter state management
  filters: {
    [key: string]: Filters | null;
  };
  setFilters: (filters: Filters, key: string) => void;
  changeFilter: (
    filter: keyof Filters,
    value: Filters[keyof Filters],
    key: string,
  ) => void;
  resetFilter: (
    filter: keyof Filters,
    key: string,
    value?: string | number,
  ) => void;
  resetAllFilters: (key: string) => void;
};

export const useOptimisticStore = createWithEqualityFn<OptimisticStore>()(
  persist(
    (set, get) => ({
      // Data state
      update: new Date(),
      changeUpdate: (update) => set({ update }),

      optimisticKeywords: [],
      setOptimisticKeywords: (optimisticKeywords) =>
        set({ optimisticKeywords }),

      // Get filtered keywords based on current filters
      getFilteredOptimisticKeywords: (key) => {
        const keywords = get().optimisticKeywords;
        const filters = get().filters[key];

        if (!filters) return keywords ?? [];

        return (
          keywords?.filter((keyword) => {
            // Filter by starred status
            if (
              filters?.starred !== null &&
              filters?.starred &&
              filters?.starred !== keyword.star_keyword
            ) {
              return false;
            }

            // Filter by country
            if (
              filters?.country !== null &&
              filters?.country !== "All" &&
              filters?.country !== keyword.location?.country
            ) {
              return false;
            }

            // Filter by tags
            if (
              filters?.tags !== null &&
              Array.isArray(filters?.tags) &&
              filters?.tags.length > 0
            ) {
              const keywordTags = Array.isArray(keyword.tags)
                ? keyword.tags.map((tag) =>
                    typeof tag === "string" ? tag : tag.name,
                  )
                : [];

              const tagMatches = filters.tags.every((tag) =>
                keywordTags.includes(typeof tag === "string" ? tag : tag.name),
              );

              if (!tagMatches) return false;
            }

            // Filter by keyword title
            if (
              filters?.keywords !== null &&
              filters?.keywords.length > 0 &&
              !filters?.keywords.some((filterKeyword) =>
                keyword.title
                  .toLowerCase()
                  .includes(filterKeyword.toLowerCase()),
              )
            ) {
              return false;
            }

            // Filter by landing page
            if (
              filters?.landing_pages !== null &&
              Array.isArray(filters?.landing_pages) &&
              filters?.landing_pages?.length > 0
            ) {
              // Handle landing page filtering based on data structure
              const landingPage =
                keyword.landing_page ||
                (keyword.latest_stats?.length
                  ? keyword.latest_stats[0].page
                  : "");

              const pageMatches = filters.landing_pages.some((filterPage) =>
                landingPage.toLowerCase().includes(filterPage.toLowerCase()),
              );

              if (!pageMatches) return false;
            }

            // Helper functions to filter by metrics
            function getValue(metric: string): number {
              if (metric === "position" && keyword.ranking) {
                return Number(keyword.ranking);
              }
              if (metric === "clicks" && keyword.clicks) {
                return Number(keyword.clicks);
              }
              if (metric === "impressions" && keyword.impressions) {
                return Number(keyword.impressions);
              }
              if (keyword.overall_stats) {
                if (metric === "position" && keyword.overall_stats.position) {
                  return Number(keyword.overall_stats.position);
                }
                if (metric === "clicks" && keyword.overall_stats.clicks) {
                  return Number(keyword.overall_stats.clicks);
                }
                if (
                  metric === "impressions" &&
                  keyword.overall_stats.impressions
                ) {
                  return Number(keyword.overall_stats.impressions);
                }
              }
              return 0;
            }

            function filterMetric(
              metric: "position" | "impressions" | "clicks",
            ): boolean {
              if (
                filters?.[metric]?.value_one !== null &&
                filters?.[metric]?.operator !== null
              ) {
                const value = getValue(metric);

                if (filters?.[metric]?.operator === "EQUAL") {
                  if (value !== filters?.[metric]?.value_one) {
                    return false;
                  }
                }
                if (
                  filters?.[metric]?.operator === "BETWEEN" &&
                  filters?.[metric]?.value_two !== null
                ) {
                  if (
                    value < (filters?.[metric]?.value_one || 0) ||
                    value > (filters?.[metric]?.value_two || 0)
                  ) {
                    return false;
                  }
                }
                if (filters?.[metric]?.operator === "GREATER THAN") {
                  if (value <= (filters?.[metric]?.value_one || 0)) {
                    return false;
                  }
                }
                if (filters?.[metric]?.operator === "LESS THAN") {
                  if (value >= (filters?.[metric]?.value_one || 0)) {
                    return false;
                  }
                }
              }
              return true;
            }

            // Check all metrics and return false if any fail
            if (!filterMetric("position")) return false;
            if (!filterMetric("impressions")) return false;
            if (!filterMetric("clicks")) return false;

            return true;
          }) ?? null
        );
      },

      // Optimistically delete a keyword, then delete it on the server
      deleteOptimisticKeyword: async (keyword_id) => {
        // Optimistically update the UI
        set((state) => {
          const newOptimisticKeywords = state.optimisticKeywords?.filter(
            (keyword) => keyword.id !== keyword_id,
          );
          return { optimisticKeywords: newOptimisticKeywords };
        });

        // Actually delete the keyword on the server
        await deleteKeyword(keyword_id);
      },

      // Optimistically update a keyword, then update it on the server
      updateOptimisticKeyword: async (keyword, domainId) => {
        // Optimistically update the UI
        set((state) => {
          const newOptimisticKeywords = state.optimisticKeywords?.map((k) =>
            k.id === keyword.id ? keyword : k,
          );
          return { optimisticKeywords: newOptimisticKeywords };
        });

        // Format tags to match API expectations
        const formattedTags = Array.isArray(keyword.tags)
          ? keyword.tags.map((tag) => ({
              name: typeof tag === "string" ? tag : tag.name,
            }))
          : [];

        // Actually update the keyword on the server
        await updateKeyword({
          id: keyword.id,
          title: keyword.title,
          domain: domainId,
          star_keyword: keyword.star_keyword,
          location: keyword.location,
          tags: formattedTags,
        });
      },

      // Filter state
      filters: {},
      setFilters: (filters, key) =>
        set({ filters: { ...get().filters, [key]: filters } }),

      changeFilter: (filter, value, key) =>
        set((state) => ({
          filters: {
            ...state.filters,
            [key]: state.filters[key]
              ? {
                  ...state.filters[key]!,
                  [filter]: value,
                }
              : null,
          },
        })),

      resetFilter: (filter, key, value) => {
        const resettedFilter: Filters = {
          starred: null,
          country: null,
          tags: [],
          keywords: [],
          landing_pages: [],
          position: {
            value_one: null,
            operator: null,
            value_two: null,
          },
          impressions: {
            value_one: null,
            operator: null,
            value_two: null,
          },
          clicks: {
            value_one: null,
            operator: null,
            value_two: null,
          },
        };

        if (filter === "keywords" || filter === "landing_pages") {
          const existingFilter = get().filters[key];
          if (!existingFilter) return;

          const newFilter =
            existingFilter[filter]?.filter((f) => f !== value) ?? [];

          set((state) => ({
            filters: {
              ...state.filters,
              [key]: {
                ...state.filters[key]!,
                [filter]: newFilter,
              },
            },
          }));
          return;
        }

        if (filter === "tags") {
          const existingFilter = get().filters[key];
          if (!existingFilter) return;

          const newFilter =
            existingFilter[filter]?.filter(
              (f) => String(f.id) !== String(value),
            ) ?? [];

          set((state) => ({
            filters: {
              ...state.filters,
              [key]: {
                ...state.filters[key]!,
                [filter]: newFilter,
              },
            },
          }));
          return;
        }

        set((state) => ({
          filters: {
            ...state.filters,
            [key]: {
              ...state.filters[key]!,
              [filter]: resettedFilter[filter],
            },
          },
        }));
      },

      resetAllFilters: (key) =>
        set((state) => ({
          filters: {
            ...state.filters,
            [key]: {
              starred: null,
              country: null,
              tags: [],
              keywords: [],
              landing_pages: [],
              position: {
                value_one: null,
                operator: null,
                value_two: null,
              },
              impressions: {
                value_one: null,
                operator: null,
                value_two: null,
              },
              clicks: {
                value_one: null,
                operator: null,
                value_two: null,
              },
            },
          },
        })),
    }),
    {
      name: "rank-tracker-optimistic-store",
      partialize: ({ filters }) => ({ filters }),
    },
  ),
);

// Store for domains with optimistic updates
type OptimisticDomainStore = {
  optimisticDomains: any[] | null;
  setOptimisticDomains: (optimisticDomains: any[] | null) => void;
};

export const useOptimisticDomainStore =
  createWithEqualityFn<OptimisticDomainStore>()((set) => ({
    optimisticDomains: [],
    setOptimisticDomains: (optimisticDomains) => set({ optimisticDomains }),
  }));

// Store for pending keyword operations
type PendingKeywordStore = {
  jobs: Job[] | null | undefined;

  // Add a new job to track pending keywords
  addJob: (job: {
    domain: string | null | undefined;
    pendingKeywords: number[] | null | undefined;
    keywordStatus: any | null | undefined;
  }) => void;

  // Update job state
  updateJob: (id: string, newState: "pending" | "completed" | "error") => void;

  // Remove job
  removeJob: (id: string) => void;

  // Get job by ID
  getJob: (id: string) => Job | null;

  // Get job by domain
  getJobByDomain: (domain: string) => Job | null;

  // Check status of pending jobs
  revalidateJobs: () => Promise<void>;

  // Clean up old jobs
  cleanUpJobs: () => void;

  // Track when updates happen
  update: { timestamp: Date; domainId: string };
  changeUpdate: (update: { timestamp: Date; domainId: string }) => void;

  // Add multiple keywords and create a job
  addKeywords: (options: {
    keywords: string[];
    domain: number;
    star_keyword: boolean;
    location?: { country: string; device: string };
    tags?: string[];
  }) => Promise<{
    success: boolean;
    domain: string;
    keywords?: number[] | null;
    message?: string;
  }>;

  // Reset the store
  resetStore: () => void;
};

export const usePendingKeywordStore =
  createWithEqualityFn<PendingKeywordStore>()(
    persist(
      (set, get) => ({
        jobs: [],

        addJob: (job) => {
          const newId = crypto.randomUUID();
          const newJob = {
            ...job,
            state: "pending" as const,
            id: newId,
            createdAt: new Date(),
            finishedAt: null,
          };
          set((state) => ({
            jobs: [
              newJob,
              ...(state.jobs?.filter((job) => job.id !== newId) ?? []),
            ],
          }));
        },

        updateJob: (id, newState) => {
          set((storeState) => ({
            jobs: storeState.jobs?.map((job) =>
              job.id === id
                ? { ...job, state: newState, finishedAt: new Date() }
                : job,
            ),
          }));
        },

        removeJob: (id) => {
          set((state) => ({
            jobs: state.jobs?.filter((job) => job.id !== id),
          }));
        },

        getJob: (id) => {
          return get().jobs?.find((job) => job.id === id) ?? null;
        },

        getJobByDomain: (domain) => {
          return get().jobs?.find((job) => job.domain === domain) ?? null;
        },

        cleanUpJobs: () => {
          const jobs = get().jobs ?? [];

          const jobsFromLast24Hours = jobs.filter((job) => {
            const jobDate = new Date(job.createdAt);
            const now = new Date();
            const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            return jobDate >= oneDayAgo;
          });

          set({ jobs: jobsFromLast24Hours });
        },

        revalidateJobs: async () => {
          const jobs = get().jobs?.filter((job) => job.state === "pending");

          if (!jobs || jobs.length === 0) return;

          const updatedJobs = await Promise.all(
            jobs.map(async (job) => {
              if (!job.pendingKeywords || job.pendingKeywords.length === 0) {
                return {
                  ...job,
                  state: "completed" as const,
                  finishedAt: new Date(),
                };
              }

              try {
                // Use our new getKeywordStatus function
                const keywordStatus = await getKeywordStatus(
                  job.pendingKeywords,
                );

                // If all keywords are processed, mark the job as completed
                if (keywordStatus?.status && job.domain) {
                  set((state) => ({
                    update: {
                      timestamp: new Date(),
                      domainId: job.domain || "",
                    },
                  }));

                  // Dispatch a client-side event to force the keyword table to update
                  if (typeof window !== "undefined") {
                    console.log(
                      "Dispatching client-side keyword-table-update event for domain:",
                      job.domain,
                    );
                    const event = new CustomEvent("keyword-table-update", {
                      detail: {
                        domainId: job.domain,
                        timestamp: new Date().getTime(),
                        source: "keywordStatusComplete",
                      },
                    });
                    window.dispatchEvent(event);

                    // Also directly call the refresh function if it exists
                    const refreshFn = (window as any)[
                      `refreshKeywordTable_${job.domain}`
                    ];
                    if (typeof refreshFn === "function") {
                      console.log(
                        "Directly calling refresh function for domain:",
                        job.domain,
                      );
                      refreshFn();
                    }
                  }

                  return {
                    ...job,
                    keywordStatus,
                    state: "completed" as const,
                    finishedAt: new Date(),
                  };
                }

                // If there was an error, mark the job as error
                if (keywordStatus?.error) {
                  return {
                    ...job,
                    keywordStatus,
                    state: "error" as const,
                    finishedAt: new Date(),
                  };
                }

                // If the job is too old, mark it as error
                const isJobMoreThan15MinutesOld =
                  new Date().getTime() - new Date(job.createdAt).getTime() >
                  15 * 60 * 1000;

                if (isJobMoreThan15MinutesOld) {
                  return {
                    ...job,
                    state: "error" as const,
                    finishedAt: new Date(),
                  };
                }

                return job;
              } catch (error) {
                console.error("Error revalidating job:", error);
                return {
                  ...job,
                  state: "error" as const,
                  finishedAt: new Date(),
                };
              }
            }),
          );

          const updatedJobsIds = updatedJobs?.map((job) => job.id);

          set({
            jobs: [
              ...(updatedJobs ?? []),
              ...(get().jobs?.filter(
                (job) => !updatedJobsIds?.includes(job.id),
              ) ?? []),
            ],
          });
        },

        update: { timestamp: new Date(), domainId: "" },
        changeUpdate: (update) => set({ update }),

        // Function to add keywords and create a job to track them
        addKeywords: async (options) => {
          try {
            const result = await createKeywords(options);

            if (!result || result.error) {
              return {
                success: false,
                domain: options.domain.toString(),
                message: result?.message || "Fejl ved oprettelse af søgeord",
              };
            }

            // Get the list of keyword IDs from the result
            const keywordList = result.keywords || [];

            // Add a job to track these keywords
            const job = {
              domain: options.domain.toString(),
              pendingKeywords: keywordList,
              keywordStatus: null,
            };

            get().addJob(job);

            return {
              success: true,
              domain: options.domain.toString(),
              keywords: keywordList,
              message: result.message,
            };
          } catch (error) {
            console.error("Error adding keywords:", error);
            return {
              success: false,
              domain: options.domain.toString(),
              message:
                error instanceof Error
                  ? error.message
                  : "Fejl ved oprettelse af søgeord",
            };
          }
        },

        resetStore: () => {
          set({ jobs: [] });
        },
      }),
      {
        name: "rank-tracker-pending-keywords",
      },
    ),
  );
