"use client";

import { useEffect, useState } from "react";
import { usePendingKeywordStore, useOptimisticStore } from "../store";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Card } from "@/modules/core/components/ui/card";
import { Badge } from "@/modules/core/components/ui/badge";
import { Button } from "@/modules/core/components/ui/button";
import { cn } from "@/modules/core/lib/utils";
import { getDomain } from "../actions/ranker-domain.actions";

// Define a type for jobs
interface Job {
  id: string;
  domain: string | null | undefined;
  pendingKeywords: number[] | null | undefined;
  keywordStatus: any | null | undefined;
  state: "pending" | "completed" | "error";
  createdAt: Date;
  finishedAt: Date | null;
}

type DomainCache = {
  [id: string]: { name: string; url: string } | null;
};

// Jobs component to display pending keywords
function Jobs({
  jobs,
  domainsCache,
}: {
  jobs: Job[];
  domainsCache: DomainCache;
}) {
  return (
    <div className="fixed bottom-4 left-4 z-50 flex flex-col gap-2">
      {jobs.map((job) => {
        const status = job.state;
        const keywordsCount = job.pendingKeywords?.length || 0;
        const domainId = job.domain || "";
        const domainInfo = domainId ? domainsCache[domainId] : null;

        return (
          <Card
            key={job.id}
            className={cn(
              "flex w-80 flex-col shadow-lg transition-colors duration-200",
              status === "pending"
                ? "border-blue-200 bg-blue-50"
                : status === "completed"
                  ? "border-green-200 bg-green-50"
                  : "border-red-200 bg-red-50",
            )}
          >
            <div className="p-3">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0">
                  {status === "pending" && (
                    <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                  )}
                  {status === "completed" && (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  )}
                  {status === "error" && (
                    <XCircle className="h-5 w-5 text-red-600" />
                  )}
                </div>

                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    {status === "pending" && "Behandler søgeord..."}
                    {status === "completed" && "Søgeord behandlet"}
                    {status === "error" && "Fejl i behandling af søgeord"}
                  </p>
                  <p className="text-xs text-gray-600">
                    {keywordsCount}{" "}
                    {keywordsCount === 1 ? "søgeord" : "søgeord"}
                    {domainInfo ? (
                      <> til {domainInfo.name || domainInfo.url}</>
                    ) : domainId ? (
                      <> til domæne ID: {domainId}</>
                    ) : null}
                  </p>
                </div>

                {status !== "pending" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 flex-shrink-0 rounded-full p-0"
                    onClick={() =>
                      usePendingKeywordStore.getState().removeJob(job.id)
                    }
                  >
                    <span className="sr-only">Luk</span>
                    <XCircle className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {status === "pending" && (
                <p className="mt-2 text-xs italic text-gray-500">
                  Dette kan tage et øjeblik. Søgeordene bliver tilføjet og
                  opdateret automatisk.
                </p>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

export default function PendingKeywordProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [domainsCache, setDomainsCache] = useState<DomainCache>({});
  const revalidateJobs = usePendingKeywordStore(
    (state) => state.revalidateJobs,
  );
  const jobs = usePendingKeywordStore((state) => state.jobs) || [];
  const update = usePendingKeywordStore((state) => state.update);
  const cleanUpJobs = usePendingKeywordStore((state) => state.cleanUpJobs);
  const changeOptimisticStoreUpdate = useOptimisticStore(
    (state) => state.changeUpdate,
  );

  const pendingJobs = jobs.filter((job) => job.state === "pending");
  const hasPendingJobs = pendingJobs.length > 0;

  // Fetch domain information for jobs
  useEffect(() => {
    const fetchDomainInfo = async () => {
      // Get all domain IDs that exist and haven't been cached yet
      const domainIds = jobs
        .map((job) => job.domain)
        .filter((domainId): domainId is string => {
          return (
            !!domainId &&
            typeof domainId === "string" &&
            !domainsCache[domainId]
          );
        });

      if (domainIds.length === 0) return;

      const uniqueDomainIds = [...new Set(domainIds)];

      const newCacheEntries: DomainCache = {};

      await Promise.all(
        uniqueDomainIds.map(async (domainId) => {
          try {
            const domainInfo = await getDomain(domainId);
            if (domainInfo && "display_name" in domainInfo) {
              newCacheEntries[domainId] = {
                name: domainInfo.display_name || "",
                url: domainInfo.url || "",
              };
            } else {
              newCacheEntries[domainId] = null;
            }
          } catch (err) {
            console.error(`Error fetching domain info for ${domainId}:`, err);
            newCacheEntries[domainId] = null;
          }
        }),
      );

      setDomainsCache((prev) => ({ ...prev, ...newCacheEntries }));
    };

    fetchDomainInfo();
  }, [jobs, domainsCache]);

  // Effect to check for pending keywords every few seconds
  useEffect(() => {
    if (!pendingJobs.length) return;

    const interval = setInterval(async () => {
      await revalidateJobs();
    }, 2500);

    return () => clearInterval(interval);
  }, [jobs, pendingJobs.length, revalidateJobs]);

  // Initialize on first render
  useEffect(() => {
    if (!isInitialized) {
      revalidateJobs();
      cleanUpJobs();
      setIsInitialized(true);
    }
  }, [cleanUpJobs, isInitialized, revalidateJobs]);

  // Update optimistic store when we get updates
  useEffect(() => {
    if (update?.timestamp) {
      changeOptimisticStoreUpdate(new Date());
    }
  }, [update?.timestamp, changeOptimisticStoreUpdate]);

  return (
    <>
      {children}
      {jobs.length > 0 && <Jobs jobs={jobs} domainsCache={domainsCache} />}
    </>
  );
}
