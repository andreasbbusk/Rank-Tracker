"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";

const PendingKeywordProvider = dynamic(
  () => import("./pending-keyword-provider"),
  { ssr: false },
);

export function ClientPendingKeywordWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<div>{children}</div>}>
      <PendingKeywordProvider>{children}</PendingKeywordProvider>
    </Suspense>
  );
}
