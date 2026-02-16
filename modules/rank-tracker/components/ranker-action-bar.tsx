import RankerActionClient from "./ranker-action-client";
import {
  Keyword,
  Domain,
  DomainWithAnalytics,
} from "@/modules/rank-tracker/types/index";

interface DateRange {
  from: Date;
  to: Date;
}

type Props = {
  isLoading?: boolean;
  keywords?: Keyword[];
  domains?: DomainWithAnalytics[];
  selectedDateRanges?: DateRange[];
  domain?: Domain;
  gscData?: any;
};

export default async function RankerActionBar({
  isLoading,
  keywords = [],
  domains = [],
  selectedDateRanges = [],
  domain,
  gscData,
}: Props) {
  return (
    <RankerActionClient
      isLoading={isLoading}
      role="admin"
      session={null}
      team_id="demo-team"
      data={domain ? keywords : domains}
      selectedDateRanges={selectedDateRanges}
      domain={domain}
      gscData={gscData}
    />
  );
}
