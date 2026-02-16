import {
  SidebarInset,
  SidebarProvider,
} from "@/modules/core/components/ui/sidebar";
import { Toaster } from "@/modules/core/components/ui/sonner";
import { getDomainList } from "@/modules/rank-tracker/actions/ranker-domain.actions";
import { ClientPendingKeywordWrapper } from "@/modules/rank-tracker/components/client-pending-keyword-wrapper";
import RankerConfigurationBar from "@/modules/rank-tracker/components/ranker-configuration-bar";
import type { Metadata } from "next";
import "../globals.css";

export const metadata: Metadata = {
  title: "Rank Tracker",
  description:
    "Portfolio-ready SEO rank tracking app with local seeded data, full CRUD flows, and report generation.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const domains = await getDomainList();

  return (
    <html lang="da">
      <head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1"
        />
      </head>
      <body className="min-h-screen bg-[#f5f5f5] text-primary">
        <SidebarProvider>
          <SidebarInset
            className="no-scrollbar h-[calc(100svh-16px)] overflow-auto"
            id="sidebar-inset"
          >
            <div className="min-h-screen bg-background">
              <ClientPendingKeywordWrapper>
                <RankerConfigurationBar domains={domains} />
                {children}
              </ClientPendingKeywordWrapper>
            </div>
          </SidebarInset>
        </SidebarProvider>
        <Toaster />
      </body>
    </html>
  );
}
