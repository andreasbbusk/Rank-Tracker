import { buttonVariants } from "@/modules/core/components/ui/button";
import { cn } from "@/modules/core/lib/utils";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex h-[calc(100svh-100px)] w-full items-center justify-center">
      <div className="flex flex-col items-center justify-center">
        <h1 className="text-2xl font-medium">404 - Side ikke fundet</h1>
        <Link href="/" className={cn(buttonVariants(), "mt-4")}>
          Gå til forsiden
        </Link>
      </div>
    </div>
  );
}
