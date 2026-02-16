"use client";

import { Check, ChevronsUpDown, Loader2, Plus, Trash2 } from "lucide-react";
import { useCallback, useState } from "react";

import { Button } from "@/modules/core/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/modules/core/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/modules/core/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/modules/core/components/ui/tooltip";
import { cn } from "@/modules/core/lib/utils";
import { toast } from "sonner";

interface Tag {
  id?: string | number;
  name: string;
}

interface KeywordTagSelectorProps {
  availableTags: Tag[];
  selectedTags: string[];
  onTagSelect: (tagName: string) => void;
  onAddNewTag?: (tagName: string) => void;
  isLoading: boolean;
  className?: string;
}

export function KeywordTagSelector({
  availableTags,
  selectedTags,
  onTagSelect,
  onAddNewTag,
  isLoading,
  className,
}: KeywordTagSelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  const handleTagSelect = useCallback(
    (tagName: string) => {
      onTagSelect(tagName);
    },
    [onTagSelect],
  );

  // Check if tag exists in available tags
  const doesTagExist = availableTags?.some(
    (t) => t.name.toLowerCase() === searchValue.toLowerCase(),
  );

  // Clear all selected tags
  const handleClearTags = useCallback(() => {
    selectedTags.forEach((tag) => onTagSelect(tag));
    toast.success("Tags nulstillet");
  }, [selectedTags, onTagSelect]);

  // Handle adding a new tag
  const handleAddNewTag = useCallback(() => {
    if (!searchValue.trim() || doesTagExist) return;

    const newTagName = searchValue.trim();

    if (onAddNewTag) {
      onAddNewTag(newTagName);
    } else {
      // Fall back to just selecting the tag if creation isn't supported
      onTagSelect(newTagName);
    }

    toast.success(`Tag "${newTagName}" oprettet`);
    setSearchValue("");
  }, [searchValue, doesTagExist, onAddNewTag, onTagSelect]);

  return (
    <Popover modal open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={isLoading}
          className={cn(
            "w-full justify-between overflow-hidden py-[6px]",
            selectedTags && selectedTags.length > 0
              ? "h-auto min-h-[36px] pl-1"
              : "h-[36px]",
            className,
          )}
        >
          <div className="flex flex-wrap justify-start gap-1">
            {!isLoading ? (
              <span className="flex flex-wrap gap-1">
                {selectedTags?.length
                  ? selectedTags.map((val, i) => (
                      <div
                        key={i}
                        className="rounded-xl border px-1 py-0.5 text-xs font-medium"
                      >
                        {val}
                      </div>
                    ))
                  : "Vælg tags..."}
              </span>
            ) : (
              <span className="text-sm text-black/60">Indlæser tags...</span>
            )}
          </div>
          {(!selectedTags || selectedTags.length === 0) && (
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[250px] p-0">
        {isLoading ? (
          <div className="flex h-full items-center justify-center py-6 text-sm text-black/60">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Indlæser tags...
          </div>
        ) : (
          <Command>
            <div className="relative">
              <CommandInput
                value={searchValue}
                onValueChange={(v) => setSearchValue(v)}
                onKeyDown={(e) => {
                  if (
                    e.key === "Enter" &&
                    e.shiftKey &&
                    searchValue &&
                    !doesTagExist
                  ) {
                    e.preventDefault();
                    handleAddNewTag();
                  }
                }}
                placeholder="Søg efter tag..."
                className="pr-[58px]"
              />
              <div className="absolute right-2 top-1/2 flex -translate-y-1/2 gap-1">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={"outline"}
                        size={"icon"}
                        className="h-7 w-7"
                        onClick={handleAddNewTag}
                        disabled={!searchValue.trim() || doesTagExist}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="flex flex-col justify-center gap-2 border bg-background text-foreground">
                      <p className="text-black/60">
                        Opret tag:{" "}
                        <span className="font-medium text-black">
                          {searchValue}
                        </span>
                      </p>
                      <kbd className="pointer-events-none inline-flex h-5 w-max select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                        Shift + Enter
                      </kbd>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={"outline"}
                        size={"icon"}
                        className="h-7 w-7"
                        onClick={handleClearTags}
                        disabled={selectedTags.length === 0}
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="flex flex-col justify-center gap-2 border bg-background text-foreground">
                      Ryd valgte tags
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
            <CommandEmpty className="flex flex-col items-center gap-2 py-3">
              {searchValue.trim() && !doesTagExist ? (
                <>
                  <p className="text-center text-sm text-black/60">
                    Opret tag:{" "}
                    <span className="font-medium text-black">
                      {searchValue}
                    </span>
                  </p>
                  <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                    Shift + Enter
                  </kbd>
                </>
              ) : (
                <p className="text-center text-sm text-black/60">
                  Ingen tags fundet
                </p>
              )}
            </CommandEmpty>
            <CommandGroup>
              <CommandList>
                {availableTags?.map((tag) => (
                  <CommandItem
                    key={tag.name}
                    value={tag.name}
                    onSelect={() => handleTagSelect(tag.name)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 min-w-4 max-w-4",
                        selectedTags?.includes(tag.name)
                          ? "opacity-100"
                          : "opacity-0",
                      )}
                    />
                    <div className="truncate">{tag.name}</div>
                  </CommandItem>
                ))}
              </CommandList>
            </CommandGroup>
          </Command>
        )}
      </PopoverContent>
    </Popover>
  );
}
