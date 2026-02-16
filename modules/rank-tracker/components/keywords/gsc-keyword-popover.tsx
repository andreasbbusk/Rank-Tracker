"use client";

import { Button } from "@/modules/core/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/modules/core/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/modules/core/components/ui/command";
import { Checkbox } from "@/modules/core/components/ui/checkbox";
import { Loader2 } from "lucide-react";
import { cn } from "@/modules/core/lib/utils";
import Image from "next/image";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

interface GSCRecord {
  query: string;
  clicks: number;
}

interface GSCData {
  records: GSCRecord[];
}

interface GSCKeywordPopoverProps {
  gscData?: GSCData;
  onKeywordSelect: (keyword: string) => void;
  currentKeywords: string[];
}

export const GSCKeywordPopover = ({
  gscData,
  onKeywordSelect,
  currentKeywords,
}: GSCKeywordPopoverProps) => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(!gscData);
  const [selectedKeywords, setSelectedKeywords] = useState<Set<string>>(
    new Set(),
  );
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [isInitialRender, setIsInitialRender] = useState(true);

  const parentRef = useRef<HTMLDivElement | null>(null);

  // Create a Set of current keywords for O(1) lookup
  const currentKeywordsSet = useMemo(
    () => new Set(currentKeywords),
    [currentKeywords],
  );

  const uniqueRecords = useMemo(() => {
    if (!gscData?.records) return [];

    const byQuery = new Map<string, GSCRecord>();

    for (const record of gscData.records) {
      const query = (record.query || "").trim();
      if (!query) continue;

      const key = query.toLowerCase();
      const existing = byQuery.get(key);

      if (existing) {
        existing.clicks += record.clicks || 0;
        continue;
      }

      byQuery.set(key, {
        query,
        clicks: record.clicks || 0,
      });
    }

    return Array.from(byQuery.values());
  }, [gscData?.records]);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    setIsLoading(!gscData);
  }, [gscData]);

  // Memoize filtered records
  const filteredRecords = useMemo(() => {
    if (!uniqueRecords.length) return [];
    return uniqueRecords.filter(
      (record: any) =>
        record.query &&
        record.query.toLowerCase().includes(debouncedSearchTerm.toLowerCase()),
    );
  }, [uniqueRecords, debouncedSearchTerm]);

  // Virtual list setup
  const virtualizer = useVirtualizer({
    count: filteredRecords.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 40,
    overscan: 5,
  });

  const handleOpenChange = useCallback((newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen) {
      setIsInitialRender(true);
      // Reset after a short delay to switch to virtualization
      setTimeout(() => setIsInitialRender(false), 100);
    }
  }, []);

  const handleKeywordSelect = useCallback(
    (keyword: string) => {
      if (currentKeywordsSet.has(keyword)) return; // Prevent selection of existing keywords
      setSelectedKeywords((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(keyword)) {
          newSet.delete(keyword);
        } else {
          newSet.add(keyword);
        }
        return newSet;
      });
    },
    [currentKeywordsSet],
  );

  const renderItem = useCallback(
    (record: GSCRecord, style?: React.CSSProperties) => {
      const isExisting = currentKeywordsSet.has(record.query);
      return (
        <CommandItem
          key={record.query}
          value={record.query}
          onSelect={() => handleKeywordSelect(record.query)}
          className={cn(
            "flex w-full items-center justify-between gap-2 rounded-md px-2 py-2",
            isExisting ? "cursor-not-allowed opacity-50" : "hover:bg-gray-100",
          )}
          style={style}
          disabled={isExisting}
        >
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <Checkbox
              checked={isExisting || selectedKeywords.has(record.query)}
              className="h-4 w-4 flex-shrink-0 rounded-sm"
              onCheckedChange={() => handleKeywordSelect(record.query)}
              disabled={isExisting}
            />
            <span className="truncate text-sm">{record.query}</span>
          </div>
          <div className="flex-shrink-0 text-sm text-gray-500">
            {record.clicks} klik
          </div>
        </CommandItem>
      );
    },
    [currentKeywordsSet, handleKeywordSelect, selectedKeywords],
  );

  const handleAddSelected = useCallback(() => {
    selectedKeywords.forEach((keyword) => {
      onKeywordSelect(keyword);
    });
    setSelectedKeywords(new Set());
    setOpen(false);
  }, [selectedKeywords, onKeywordSelect]);

  return (
    <Popover open={open} onOpenChange={handleOpenChange} modal={true}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="flex h-10 w-full items-center justify-between gap-2 rounded-lg px-4 py-2"
          disabled={isLoading}
        >
          <div className="flex items-center gap-2">
            <Image
              src="/images/icons/google-search-console.svg"
              alt="Google Search Console"
              width={20}
              height={20}
            />
            <span className="text-sm font-normal">
              Hent søgeord fra Google Search Console
            </span>
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[410px] p-0" align="start" sideOffset={4}>
        <Command className="w-full">
          <div className="border-b border-gray-200 px-3 py-2">
            <CommandInput
              placeholder="Søg efter søgeord..."
              value={searchQuery}
              onValueChange={setSearchQuery}
              className="h-9"
            />
          </div>
          <div className="flex items-center gap-2 border-b border-gray-200 px-3 py-2">
            <span className="text-sm text-gray-500">Vælg top:</span>
            {[50, 100, 200].map((count) => (
              <Button
                key={count}
                variant="outline"
                size="sm"
                className="h-7"
                onClick={() => {
                  if (!uniqueRecords.length) return;
                  const sortedRecords = [...uniqueRecords]
                    .sort((a, b) => b.clicks - a.clicks)
                    .filter((record) => !currentKeywordsSet.has(record.query))
                    .slice(0, count);

                  const queries = sortedRecords.map((r) => r.query);
                  const allSelected = queries.every((query) =>
                    selectedKeywords.has(query),
                  );

                  setSelectedKeywords((prev) => {
                    const newSet = new Set(prev);
                    if (allSelected) {
                      // Deselect all if all are selected
                      queries.forEach((query) => newSet.delete(query));
                    } else {
                      // Select all that aren't selected
                      queries.forEach((query) => newSet.add(query));
                    }
                    return newSet;
                  });
                }}
              >
                {count}
              </Button>
            ))}
          </div>
          {isLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : !gscData?.records?.length ? (
            <div className="py-6 text-center text-sm text-gray-500">
              Ingen søgeord fundet i Google Search Console
            </div>
          ) : (
            <>
              <CommandGroup
                className="max-h-[300px] overflow-auto p-1"
                ref={parentRef as React.RefObject<HTMLDivElement>}
              >
                {filteredRecords.length === 0 ? (
                  <CommandEmpty>
                    Ingen søgeord matcher din søgning.
                  </CommandEmpty>
                ) : isInitialRender ? (
                  // Render first few items immediately
                  <>
                    {filteredRecords
                      .slice(0, 10)
                      .map((record) => renderItem(record))}
                  </>
                ) : (
                  // Switch to virtualization after initial render
                  <div
                    style={{
                      height: `${virtualizer.getTotalSize()}px`,
                      width: "100%",
                      position: "relative",
                    }}
                  >
                    {virtualizer.getVirtualItems().map((virtualRow) => {
                      const record = filteredRecords[virtualRow.index];
                      if (!record) return null;
                      return (
                        <div
                          key={virtualRow.key}
                          style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            width: "100%",
                            height: `${virtualRow.size}px`,
                            transform: `translateY(${virtualRow.start}px)`,
                          }}
                        >
                          {renderItem(record)}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CommandGroup>
              <div className="border-t border-gray-200 p-2">
                <Button
                  className="w-full"
                  disabled={selectedKeywords.size === 0}
                  onClick={handleAddSelected}
                >
                  {selectedKeywords.size > 0
                    ? `Tilføj ${selectedKeywords.size} søgeord`
                    : "Tilføj søgeord"}
                </Button>
              </div>
            </>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  );
};
