"use client";

import { Button } from "@/modules/core/components/ui/button";
import { DateRange as PickerDateRange } from "@/modules/core/components/ui/date-range-picker";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/modules/core/components/ui/tooltip";
import {
  Domain,
  DomainWithAnalytics,
  Keyword,
} from "@/modules/rank-tracker/types/index";
import * as Lucide from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { AddDomainDialog } from "./domain/add-domain";
import { AddKeywordDialogWithProvider } from "./keywords/add-keyword";
import CSVExport from "./shared/csv-export";
import { CreateReportModal } from "./create-report-modal";
import { ReportsModal } from "./reports-modal";
import { toEmbedAwarePath } from "../utils/embed-path";

// Define a strict DateRange type for the CSV export
interface DateRange {
  from: Date;
  to: Date;
}

type DemoSession = {
  user?: {
    role?: string;
  };
} | null;

type Props = {
  isLoading?: boolean;
  role: "admin" | "staff" | "user" | undefined;
  session: DemoSession;
  team_id: string | undefined;
  data?: Keyword[] | DomainWithAnalytics[];
  selectedDateRanges?: PickerDateRange[];
  domain?: Domain;
  gscData?: any;
};

export default function RankerActionClient({
  isLoading,
  role,
  session,
  team_id,
  data = [],
  selectedDateRanges = [],
  domain,
  gscData,
}: Props) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [isAddDomainOpen, setIsAddDomainOpen] = useState(false);
  const [isAddKeywordOpen, setIsAddKeywordOpen] = useState(false);
  const [isCreateReportOpen, setIsCreateReportOpen] = useState(false);
  const [isReportsModalOpen, setIsReportsModalOpen] = useState(false);
  const domainId = searchParams.get("domain") && pathname.includes("domain");
  const currentTab = searchParams.get("tab") || "keyword";
  const isReportPage = pathname?.includes("/report/");

  void role;
  void session;
  void team_id;

  const isPinned = false;
  const isLoaded = true;
  const isPending = false;
  const toggle = () => {};

  return (
    <div className="mb-6 flex w-full xl:h-[57px]">
      <div className="flex w-full border-b border-b-black/10 pb-3 xl:h-[57px] xl:pb-0">
        <div className="h-full w-full">
          <div className="flex h-full items-center justify-between px-4 md:px-6">
            <div className="flex items-center gap-3">
              {isReportPage ? (
                // Report page CTAs
                <>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      window.history.back();
                    }}
                    className="gap-2"
                    disabled={!isLoaded || isLoading}
                  >
                    <Lucide.ArrowLeft className="h-4 w-4" />
                    Tilbage til Rank Tracker
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      // Trigger export from report viewer
                      const exportEvent = new CustomEvent("exportReport");
                      window.dispatchEvent(exportEvent);
                    }}
                    className="gap-2"
                    disabled={!isLoaded || isLoading}
                  >
                    <Lucide.Download className="h-4 w-4" />
                    Eksporter
                  </Button>
                  <Button
                    variant="default"
                    onClick={() => {
                      // This will be handled by the report viewer component
                      const editEvent = new CustomEvent("startReportEdit");
                      window.dispatchEvent(editEvent);
                    }}
                    className="gap-2"
                    disabled={!isLoaded || isLoading}
                  >
                    <Lucide.Edit className="h-4 w-4" />
                    Rediger
                  </Button>
                </>
              ) : (
                // Regular Rank Tracker CTAs
                <>
                  {domainId && (
                    <Button
                      variant="ghost"
                      onClick={async () => {
                        const params = new URLSearchParams(
                          searchParams.toString(),
                        );

                        // Remove domain-specific parameters
                        params.delete("domain");
                        params.delete("tab");

                        const nextPath = `/${params.toString() ? `?${params.toString()}` : ""}`;
                        const newUrl = toEmbedAwarePath(pathname, nextPath);

                        // Trigger a hard navigation to ensure the page is reloaded with the current date ranges
                        window.location.href = newUrl;
                      }}
                      className="gap-2"
                      disabled={!isLoaded || isLoading}
                    >
                      <Lucide.ArrowLeft className="h-4 w-4" />
                      Gå tilbage til domæner
                    </Button>
                  )}
                  {!domainId && (
                    <AddDomainDialog
                      isOpen={isAddDomainOpen}
                      onOpenChange={setIsAddDomainOpen}
                    />
                  )}
                  {domainId && (
                    <AddKeywordDialogWithProvider
                      isOpen={isAddKeywordOpen}
                      onOpenChange={setIsAddKeywordOpen}
                      gscData={gscData}
                      currentKeywords={
                        Array.isArray(data) &&
                        data.length > 0 &&
                        "title" in data[0]
                          ? (data as Keyword[])
                          : []
                      }
                    />
                  )}
                  <Button
                    variant="default"
                    onClick={() =>
                      domainId
                        ? setIsAddKeywordOpen(true)
                        : setIsAddDomainOpen(true)
                    }
                    className="gap-2"
                    disabled={
                      !isLoaded ||
                      isLoading ||
                      Boolean(domainId && currentTab === "dashboard")
                    }
                  >
                    <Lucide.Plus className="h-4 w-4" />
                    {domainId ? "Tilføj søgeord" : "Tilføj domæne"}
                  </Button>

                  {!domainId && (
                    <Button
                      variant="outline"
                      onClick={() => setIsReportsModalOpen(true)}
                      className="gap-2"
                      disabled={!isLoaded || isLoading}
                    >
                      <Lucide.FileText className="h-4 w-4" />
                      Rapporter
                    </Button>
                  )}
                </>
              )}
            </div>

            {!isReportPage && (
              <div className="flex items-center gap-3">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={"secondary"}
                        onClick={() => {
                          toggle();
                          if (!isPinned) {
                            toast(
                              "Rank Tracker er tilføjet til dine favoritter",
                            );
                          } else {
                            toast(
                              "Rank Tracker er fjernet fra dine favoritter",
                            );
                          }
                        }}
                        size={"icon"}
                        disabled={true}
                        className="border"
                      >
                        {isPending ? (
                          <Lucide.Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Lucide.Bookmark className="h-4 w-4 text-graytone" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="border border-[#E9E9E9] bg-white">
                      <p className="text-black">Tilføj til favoritter</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={() => {
                          toast(
                            "Download af screenshot er sat i gang. Find filen på din computer.",
                          );
                        }}
                        variant={"secondary"}
                        size={"icon"}
                        className="download-button border"
                        disabled={true}
                      >
                        <svg
                          width="14"
                          height="10"
                          viewBox="0 0 14 10"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M8.5 5.5C8.5 6.32843 7.82843 7 7 7C6.17157 7 5.5 6.32843 5.5 5.5C5.5 4.67157 6.17157 4 7 4C7.82843 4 8.5 4.67157 8.5 5.5Z"
                            fill="#6B7280"
                          />
                          <path
                            fillRule="evenodd"
                            clipRule="evenodd"
                            d="M1.5 2C0.671573 2 0 2.67157 0 3.5V8.5C0 9.32843 0.671573 10 1.5 10H12.5C13.3284 10 14 9.32843 14 8.5V3.5C14 2.67157 13.3284 2 12.5 2H11.6213C11.2235 2 10.842 1.84197 10.5607 1.56066L9.43934 0.43934C9.15804 0.158035 8.7765 0 8.37868 0H5.62132C5.2235 0 4.84197 0.158035 4.56066 0.439339L3.43934 1.56066C3.15804 1.84196 2.7765 2 2.37868 2H1.5ZM10 5.5C10 7.15685 8.65685 8.5 7 8.5C5.34315 8.5 4 7.15685 4 5.5C4 3.84315 5.34315 2.5 7 2.5C8.65685 2.5 10 3.84315 10 5.5Z"
                            fill="#6B7280"
                          />
                        </svg>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="border border-[#E9E9E9] bg-white">
                      <p className="text-black">Download screenshot af side</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <CSVExport
                  data={data}
                  type={domainId ? "keyword" : "domain"}
                  isDisabled={!isLoaded || isLoading}
                  selectedDateRanges={
                    (selectedDateRanges
                      ?.filter((range): range is Required<PickerDateRange> => {
                        return (
                          range?.from instanceof Date &&
                          range?.to instanceof Date
                        );
                      })
                      .map((range) => ({
                        from: range.from,
                        to: range.to,
                      })) || []) as DateRange[]
                  }
                  domain={domain}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <CreateReportModal
        isOpen={isCreateReportOpen}
        onClose={() => setIsCreateReportOpen(false)}
        domains={
          !domainId && Array.isArray(data)
            ? (data as DomainWithAnalytics[])
            : []
        }
      />

      <ReportsModal
        isOpen={isReportsModalOpen}
        onClose={() => setIsReportsModalOpen(false)}
        domains={
          !domainId && Array.isArray(data)
            ? (data as DomainWithAnalytics[])
            : []
        }
      />
    </div>
  );
}
