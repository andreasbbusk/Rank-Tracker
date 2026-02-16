import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import ReportViewer from "@/modules/rank-tracker/components/report-viewer";

interface ReportPageProps {
  params: {
    reportId: string;
  };
}

// Report page now uses sidebar for actions instead of top action bar
export default function ReportPage({ params }: ReportPageProps) {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      }
    >
      <ReportViewer reportId={params.reportId} />
    </Suspense>
  );
}
