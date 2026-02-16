import { getDateRanges } from "@/modules/analytics/utils/helpers/getDateRanges";
import { cn } from "@/modules/core/lib/utils";
import { getDomain } from "@/modules/rank-tracker/actions/ranker-domain.actions";
import { getGSCKeywords } from "@/modules/rank-tracker/actions/ranker-keyword.actions";
import { listTags } from "@/modules/rank-tracker/actions/ranker-tags.actions";
import { createDomainKeywordsView } from "@/modules/rank-tracker/actions/ranker-views.actions";
import Dashboard from "@/modules/rank-tracker/components/keywords/dashboard";
import { KeywordFilter } from "@/modules/rank-tracker/components/keywords/keyword-filter";
import KeywordTableWrapper from "@/modules/rank-tracker/components/keywords/tables/keyword-table-wrapper";
import { TableSkeleton } from "@/modules/rank-tracker/components/keywords/tables/table-skeleton";
import { KeywordTabsTrigger } from "@/modules/rank-tracker/components/keywords/tabs-trigger";
import RankerActionBar from "@/modules/rank-tracker/components/ranker-action-bar";
import { ContentGapIntelligence } from "@/modules/rank-tracker/components/content-gap-intelligence";
import { Keyword } from "@/modules/rank-tracker/types/index";
import { Loader2, Brain } from "lucide-react";
import { redirect } from "next/navigation";
import { Suspense } from "react";

type Props = {
  searchParams: Promise<{
    domain?: string;
    tab?: string;
    range?: string;
    rangeCompare?: string;
    starred?: string;
    search?: string;
    tags?: string;
    landingPages?: string;
    country?: string;
    rankValue1?: string;
    rankValue2?: string;
    clicksType?: string;
    clicksValue1?: string;
    clicksValue2?: string;
    impressionsType?: string;
    impressionsValue1?: string;
    impressionsValue2?: string;
  }>;
};

export default async function Page({ searchParams }: Props) {
  const sp = await searchParams;

  const domainId = sp.domain;
  const currentTab = sp.tab || "keyword";
  const { dateRanges } = getDateRanges({ searchParams: sp });

  if (!domainId) {
    redirect("/");
  }

  const suspenseKey = `domain-${domainId}-tab-${currentTab}-range-${sp.range}-compare-${sp.rangeCompare}`;

  return (
    <Suspense key={suspenseKey} fallback={<Loading tab={currentTab} />}>
      <Content
        domainId={domainId}
        currentTab={currentTab}
        dateRanges={dateRanges}
      />
    </Suspense>
  );
}

async function Content({
  domainId,
  currentTab,
  dateRanges,
}: {
  domainId: string;
  currentTab: string;
  dateRanges: { start_date: string; end_date: string }[];
}) {
  const [domain, keywordsView, tagsResponse] = await Promise.all([
    getDomain(domainId),
    createDomainKeywordsView({ domainId, dateRanges }),
    listTags(domainId),
  ]);

  if (!domain) {
    redirect("/");
  }

  const tags = Array.isArray(tagsResponse)
    ? tagsResponse
    : tagsResponse?.results || [];

  let formattedUrl = domain.url || "";
  if (!formattedUrl?.startsWith("http")) {
    formattedUrl = `sc-domain:${formattedUrl.replace(/^www\./, "")}`;
  }

  const gscData = await getGSCKeywords(formattedUrl);

  const records =
    keywordsView?.records && Array.isArray(keywordsView.records)
      ? keywordsView.records
      : [];

  const domainKeywords = records.map((keyword: Keyword) => ({
    ...keyword,
    ranking: keyword.latest_stats?.[0]?.position ?? keyword.ranking,
    landing_page: keyword.latest_stats?.[0]?.page ?? keyword.landing_page,
  }));

  const selectedDateRanges = dateRanges.map((range) => ({
    from: new Date(range.start_date),
    to: new Date(range.end_date),
  }));

  return (
    <>
      <RankerActionBar
        keywords={domainKeywords}
        selectedDateRanges={selectedDateRanges}
        domain={domain}
        gscData={gscData}
      />
      <div className="mx-auto mb-16 max-w-9xl px-7">
        <h1 className="text-2xl font-medium">{domain.display_name}</h1>
        <p className="mb-8 text-sm text-black/60">{domain.url}</p>
        <div className="mb-6 flex items-center gap-2">
          <KeywordTabsTrigger />
          {currentTab !== "dashboard" &&
            currentTab !== "content-intelligence" && (
              <KeywordFilter initialTags={tags} />
            )}
        </div>
        {currentTab === "keyword" ? (
          <KeywordTableWrapper
            data={domainKeywords}
            domainId={domainId}
            className="w-full"
            pSize={20}
            sortColumn="keyword"
            disableBorder={false}
            hasPagination={true}
            selectedDateRanges={selectedDateRanges}
            gscData={gscData}
          />
        ) : currentTab === "content-intelligence" ? (
          <ContentGapIntelligence
            domains={[
              {
                ...domain,
                gsc_url: formattedUrl,
              },
            ]}
            isLoading={false}
          />
        ) : (
          <Dashboard domainId={domainId} dateRanges={dateRanges} />
        )}
      </div>
    </>
  );
}

function Loading({ tab }: { tab: string }) {
  return (
    <>
      <RankerActionBar isLoading />
      <div className="mx-auto mb-16 max-w-9xl px-7">
        <h1 className="text-2xl font-medium">Indlæser...</h1>
        <p className="mb-8 text-sm text-black/60">Indlæser...</p>
        <div className="flex items-center gap-2">
          <KeywordTabsTrigger />
        </div>
        {tab === "keyword" ? (
          <TableSkeleton rows={10} showSearch={true} />
        ) : tab === "content-intelligence" ? (
          <div className="space-y-6">
            <div className="rounded-lg border bg-white p-6">
              <div className="mb-4 flex items-center gap-2">
                <Brain className="h-5 w-5 text-purple-500" />
                <h3 className="text-lg font-medium">
                  Content Gap Intelligence
                </h3>
              </div>
              <div className="space-y-4">
                <div className="h-4 w-1/3 animate-pulse rounded bg-gray-200"></div>
                <div className="h-10 animate-pulse rounded bg-gray-200"></div>
                <div className="grid grid-cols-3 gap-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-8 animate-pulse rounded bg-gray-200"
                    ></div>
                  ))}
                </div>
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-20 animate-pulse rounded bg-gray-200"
                    ></div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-12">
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <div
                  key={index}
                  className="flex h-[86px] w-full items-center justify-center rounded-2xl border border-black/10 bg-white shadow-sm"
                >
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                </div>
              ))}
            </div>

            <LoadingSkeleton />
          </div>
        )}
      </div>
    </>
  );
}

function LoadingSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex h-[296px] items-center justify-center rounded-2xl border border-black/10 bg-white shadow-sm",
        className,
      )}
    >
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
    </div>
  );
}
