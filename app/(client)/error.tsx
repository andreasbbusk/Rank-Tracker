"use client"; // Error components must be Client Components

import { Button } from "@/modules/core/components/ui/button";
import { RefreshCcw } from "lucide-react";
import { useEffect } from "react";
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[calc(100svh-61px)] flex-col items-center justify-center gap-4">
      <h2 className="text-lg font-medium">Der gik noget galt!</h2>
      <Button
        onClick={
          // Attempt to recover by trying to re-render the segment
          () => window.location.reload()
        }
      >
        <RefreshCcw className="mr-2 h-4 w-4" />
        Prøv igen
      </Button>
    </div>
  );
}
