"use client";

import { Button } from "@/modules/core/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/modules/core/components/ui/dialog";
import { Input } from "@/modules/core/components/ui/input";
import { Label } from "@/modules/core/components/ui/label";
import { Textarea } from "@/modules/core/components/ui/textarea";
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
import { cn } from "@/modules/core/lib/utils";
import {
  updateKeyword,
  updateKeywordLocation,
} from "@/modules/rank-tracker/actions/ranker-keyword.actions";
import {
  deleteKeywordTagClient,
  listTagsClient,
  updateKeywordTagClient,
} from "@/modules/rank-tracker/actions/client.actions";
import { KeywordTagSelector } from "@/modules/rank-tracker/components/keywords/keyword-tag-selector";
import { NoteManager } from "@/modules/rank-tracker/components/keywords/note-manager";
import { isoCountries } from "@/modules/rank-tracker/constants/iso-countries";
import { Keyword } from "@/modules/rank-tracker/types";
import { Check, ChevronsUpDown, Loader2, Star } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

interface Note {
  id: number;
  description: string;
  created_at?: string;
  updated_at?: string;
}

interface EditKeywordModalProps {
  keyword: Keyword;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedKeyword: Keyword) => void;
}

export const EditKeywordModal = ({
  keyword,
  isOpen,
  onClose,
  onSave,
}: EditKeywordModalProps) => {
  const [country, setCountry] = useState(keyword.location?.country || "DNK");
  const [starKeyword, setStarKeyword] = useState(keyword.star_keyword);
  const [tags, setTags] = useState<string[]>(
    keyword.tags?.map((tag) => (typeof tag === "string" ? tag : tag.name)) ||
      [],
  );
  const [availableTags, setAvailableTags] = useState<
    { id?: string | number; name: string }[]
  >([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingTags, setLoadingTags] = useState(true);
  const [tagChanges, setTagChanges] = useState<{ [key: number]: string }>({});
  const [tagsToDelete, setTagsToDelete] = useState<number[]>([]);
  const [countrySearchQuery, setCountrySearchQuery] = useState("");
  const [countryOpen, setCountryOpen] = useState(false);
  const searchParams = useSearchParams();

  const domainId = useMemo(() => {
    return searchParams.get("domain") || "1";
  }, [searchParams]);

  const filteredCountries = useMemo(() => {
    if (!countrySearchQuery) return isoCountries;
    return isoCountries.filter((country) =>
      country.name.toLowerCase().includes(countrySearchQuery.toLowerCase()),
    );
  }, [countrySearchQuery]);

  // Initialize notes from keyword data
  useEffect(() => {
    if (
      keyword.notes &&
      Array.isArray(keyword.notes) &&
      keyword.notes.length > 0
    ) {
      const formattedNotes: Note[] = keyword.notes.map((note) => ({
        id:
          typeof note.id === "number" ? note.id : Number(note.id) || Date.now(),
        description: note.description || "",
        created_at: note.created_at,
        updated_at: note.updated_at,
      }));
      setNotes(formattedNotes);
    } else {
      setNotes([]);
    }
  }, [keyword]);

  // Track if any changes have been made
  const hasChanges = useMemo(() => {
    const originalTags =
      keyword.tags?.map((tag) => (typeof tag === "string" ? tag : tag.name)) ||
      [];
    const originalNotes = keyword.notes || [];

    const tagsChanged =
      JSON.stringify(originalTags.sort()) !==
        JSON.stringify([...tags].sort()) || tagsToDelete.length > 0;
    const countryChanged = country !== (keyword.location?.country || "DNK");
    const starChanged = starKeyword !== keyword.star_keyword;
    const hasTagEdits = Object.keys(tagChanges).length > 0;

    // Check if notes have changed
    const notesChanged =
      JSON.stringify(
        originalNotes.map((n) => ({ id: n.id, description: n.description })),
      ) !==
      JSON.stringify(
        notes.map((n) => ({ id: n.id, description: n.description })),
      );

    return (
      tagsChanged ||
      countryChanged ||
      starChanged ||
      hasTagEdits ||
      notesChanged
    );
  }, [country, starKeyword, tags, tagChanges, tagsToDelete, notes, keyword]);

  useEffect(() => {
    const loadTags = async () => {
      setLoadingTags(true);
      try {
        const tagsData = await listTagsClient(domainId);
        if (tagsData && tagsData.results) {
          setAvailableTags(tagsData.results);
        } else if (tagsData) {
          setAvailableTags(Array.isArray(tagsData) ? tagsData : []);
        }
      } catch (error) {
        console.error("Error loading tags:", error);
        toast.error("Der opstod en fejl ved indlæsning af tags");
      } finally {
        setLoadingTags(false);
      }
    };
    loadTags();
  }, [domainId]);

  const handleSave = async () => {
    setIsLoading(true);
    try {
      // First delete any removed tags
      for (const tagId of tagsToDelete) {
        const deleteResult = await deleteKeywordTagClient(String(tagId));
        if (!deleteResult) {
          throw new Error("Failed to delete tag");
        }
      }

      // Then update any renamed tags
      for (const [tagId, newName] of Object.entries(tagChanges)) {
        const result = await updateKeywordTagClient(tagId, newName);
        if (!result) {
          throw new Error("Failed to update tag");
        }
      }

      // Update location if country has changed
      if (country !== (keyword.location?.country || "DNK")) {
        const locationResult = await updateKeywordLocation(keyword.id, {
          country,
          device: keyword.location?.device || "desktop",
          lang_const: "da",
          geo_const: "DK",
        });

        if (!locationResult) {
          throw new Error("Failed to update location");
        }
      }

      // Create the updated keyword object
      const updatedKeywordData: Keyword = {
        ...keyword,
        domain: searchParams.get("domain") || "",
        star_keyword: starKeyword,
        tags:
          tags.length > 0
            ? tags
                .filter((tagName) => {
                  const foundTag = availableTags.find(
                    (t) => t.name === tagName,
                  );
                  const tagId = foundTag?.id ? Number(foundTag.id) : -1;
                  return !tagsToDelete.includes(tagId);
                })
                .map((tagName) => ({ name: tagName }))
            : [],
        notes: notes.map((note) => ({
          id: note.id,
          description: note.description,
        })),
        location: {
          id: keyword.location?.id || 0,
          team: keyword.location?.team || 0,
          country: country,
          device: keyword.location?.device || "desktop",
          lang_const: keyword.location?.lang_const || "1009",
          geo_const: keyword.location?.geo_const || "2208",
        },
      };

      // Finally update the keyword with all changes including notes
      const result = await updateKeyword(updatedKeywordData);

      if ("error" in result && result.error) {
        throw new Error(
          "message" in result ? result.message : "Failed to update keyword",
        );
      }

      toast.success("Søgeord blev opdateret");
      onSave(updatedKeywordData);
      onClose();
    } catch (error) {
      console.error("Error saving keyword:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Der opstod en fejl ved opdatering af søgeord";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTagSelect = (tagName: string) => {
    setTags((current) =>
      current.includes(tagName)
        ? current.filter((t) => t !== tagName)
        : [...current, tagName],
    );
  };

  const handleAddNewTag = async (newTagName: string) => {
    if (!newTagName || availableTags.some((t) => t.name === newTagName)) return;

    // Add to available tags first
    setAvailableTags((prev) => [...prev, { name: newTagName }]);

    // Then select it
    setTags((prev) => [...prev, newTagName]);
  };

  const handleNotesChange = (updatedNotes: Note[]) => {
    setNotes(updatedNotes);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="p-0 pb-6 sm:max-w-[650px]">
        <DialogHeader className="rounded-t-lg bg-gray-50/50 p-6">
          <DialogTitle className="font-medium">Rediger søgeord</DialogTitle>
        </DialogHeader>

        <div className="grid gap-6 px-6 py-4">
          <div className="space-y-3">
            <Label>Land</Label>
            <Popover open={countryOpen} onOpenChange={setCountryOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={countryOpen}
                  className="w-full justify-between"
                  disabled={isLoading}
                >
                  <span className="flex items-center gap-2">
                    {isoCountries.find((c) => c.code === country)?.name ||
                      "Vælg land"}
                  </span>
                  <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0" align="start">
                <Command>
                  <CommandInput
                    placeholder="Søg efter land..."
                    value={countrySearchQuery}
                    onValueChange={setCountrySearchQuery}
                  />
                  <CommandEmpty>Ingen lande fundet</CommandEmpty>
                  <CommandGroup className="max-h-[200px] overflow-auto">
                    {filteredCountries.map((c) => (
                      <CommandItem
                        key={c.code}
                        value={c.code}
                        onSelect={() => {
                          setCountry(c.code);
                          setCountryOpen(false);
                          setCountrySearchQuery("");
                        }}
                      >
                        <div className="flex flex-1 items-center gap-2">
                          <span
                            className={cn(
                              country === c.code && "font-medium text-primary",
                            )}
                          >
                            {c.name}
                          </span>
                        </div>
                        <Check
                          className={cn(
                            "ml-auto h-4 w-4",
                            country === c.code
                              ? "text-primary opacity-100"
                              : "opacity-0",
                          )}
                        />
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="mb-4 space-y-2">
            <Label htmlFor="tags">Tags</Label>
            <div className="w-full">
              <KeywordTagSelector
                availableTags={availableTags}
                selectedTags={tags}
                onTagSelect={handleTagSelect}
                onAddNewTag={handleAddNewTag}
                isLoading={loadingTags}
                className="w-full"
              />
            </div>
          </div>

          <div className="mb-4">
            <NoteManager
              notes={notes}
              onNotesChange={handleNotesChange}
              disabled={isLoading}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-0 hover:bg-transparent"
              onClick={() => setStarKeyword(!starKeyword)}
              disabled={isLoading}
            >
              <Star
                className={cn(
                  "h-4 w-4 cursor-pointer transition-colors hover:text-primary",
                  starKeyword ? "fill-primary text-primary" : "text-gray-400",
                )}
              />
            </Button>
            <Label
              className="cursor-pointer"
              onClick={() => setStarKeyword(!starKeyword)}
            >
              Marker som favorit
            </Label>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 px-6">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="w-full"
          >
            Annuller
          </Button>
          <Button
            onClick={handleSave}
            disabled={isLoading || !hasChanges}
            className={cn(
              "w-full",
              hasChanges && !isLoading && "bg-primary hover:bg-primary/90",
              !hasChanges &&
                "cursor-not-allowed bg-gray-100 text-gray-400 hover:bg-gray-100",
            )}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {hasChanges ? "Gem ændringer" : "Ingen ændringer"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
