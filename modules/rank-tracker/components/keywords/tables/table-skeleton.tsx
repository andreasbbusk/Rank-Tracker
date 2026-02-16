import { Search } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/modules/core/components/ui/table";

interface TableSkeletonProps {
  rows?: number;
  showSearch?: boolean;
}

export function TableSkeleton({
  rows = 5,
  showSearch = true,
}: TableSkeletonProps) {
  return (
    <div className="w-full space-y-4 mt-8">
      {showSearch && (
        <div className="flex items-center justify-between pb-4">
          <div className="relative">
            <div className="h-9 w-96 animate-pulse rounded-md bg-gray-100" />
            <Search className="absolute left-3 top-1/2 h-3 w-3 -translate-y-1/2 text-gray-300" />
          </div>
        </div>
      )}
      <div className="rounded-xl border bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-white">
              <TableHead className="w-[300px]">
                <div className="h-4 w-48 animate-pulse rounded bg-gray-100" />
              </TableHead>
              <TableHead className="w-[120px]">
                <div className="h-4 w-16 animate-pulse rounded bg-gray-100" />
              </TableHead>
              <TableHead className="w-[120px]">
                <div className="h-4 w-16 animate-pulse rounded bg-gray-100" />
              </TableHead>
              <TableHead className="w-[120px]">
                <div className="h-4 w-16 animate-pulse rounded bg-gray-100" />
              </TableHead>
              <TableHead className="w-[120px]">
                <div className="h-4 w-16 animate-pulse rounded bg-gray-100" />
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: rows }).map((_, i) => (
              <TableRow key={i} className="group">
                <TableCell className="w-[300px]">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 animate-pulse rounded bg-gray-100" />
                    <div className="h-4 w-48 animate-pulse rounded bg-gray-100" />
                  </div>
                </TableCell>
                <TableCell className="w-[120px]">
                  <div className="h-4 w-16 animate-pulse rounded bg-gray-100" />
                </TableCell>
                <TableCell className="w-[120px]">
                  <div className="h-4 w-16 animate-pulse rounded bg-gray-100" />
                </TableCell>
                <TableCell className="w-[120px]">
                  <div className="h-4 w-16 animate-pulse rounded bg-gray-100" />
                </TableCell>
                <TableCell className="w-[120px]">
                  <div className="h-4 w-16 animate-pulse rounded bg-gray-100" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between py-4">
        <div className="h-4 w-48 animate-pulse rounded bg-gray-100" />
        <div className="flex items-center gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-8 w-8 animate-pulse rounded bg-gray-100"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
