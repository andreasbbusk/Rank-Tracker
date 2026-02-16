import { getDateRanges } from "@/modules/analytics/utils/helpers/getDateRanges";
import { createDomainsView } from "@/modules/rank-tracker/actions/ranker-views.actions";
import { DomainTable } from "@/modules/rank-tracker/components/domain/domain-table";
import { TableSkeleton } from "@/modules/rank-tracker/components/keywords/tables/table-skeleton";
import RankerActionBar from "@/modules/rank-tracker/components/ranker-action-bar";
import { domainColumns } from "@/modules/rank-tracker/constants";
import { DomainWithAnalytics } from "@/modules/rank-tracker/types/index";
import { processDomains } from "@/modules/rank-tracker/utils/proces-domains";
import { ColumnDef } from "@tanstack/react-table";
import { Suspense } from "react";

type PageProps = {
  searchParams: Promise<{
    range?: string;
    rangeCompare?: string;
  }>;
};

export default async function Page({ searchParams }: PageProps) {
  const sp = await searchParams;

  const key = `${sp?.range}-${sp?.rangeCompare}`;

  return (
    <Suspense
      key={key}
      fallback={
        <>
          <div className="pointer-events-none select-none opacity-50">
            <RankerActionBar isLoading={true} />
          </div>
          <div className="mx-auto mb-16 max-w-9xl px-7">
            <TableSkeleton rows={10} showSearch={true} />
          </div>
        </>
      }
    >
      <Content searchParams={sp} />
    </Suspense>
  );
}

async function Content({
  searchParams,
}: {
  searchParams: Awaited<PageProps["searchParams"]>;
}) {
  const { dateRanges } = getDateRanges({ searchParams });
  const domains = await createDomainsView(dateRanges);

  const processedDomains = await processDomains(domains, true);

  const gscDataMap = processedDomains.reduce(
    (acc, domain) => {
      if (domain.gscData && domain.gsc_url) {
        acc[domain.gsc_url] = domain.gscData;
      }
      return acc;
    },
    {} as { [key: string]: any },
  );

  return (
    <>
      <RankerActionBar
        isLoading={false}
        domains={processedDomains}
        selectedDateRanges={dateRanges.map((range) => ({
          from: new Date(range.start_date),
          to: new Date(range.end_date),
        }))}
      />
      <div className="mx-auto mb-16 max-w-9xl px-7">
        <DomainTable
          columns={domainColumns as ColumnDef<DomainWithAnalytics>[]}
          data={processedDomains || []}
          pSize={10}
          sortColumn="display_name"
          gscData={gscDataMap}
        />
      </div>
    </>
  );
}
