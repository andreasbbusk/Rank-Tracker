"use client";

import { Button } from "@/modules/core/components/ui/button";
import { Checkbox } from "@/modules/core/components/ui/checkbox";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/modules/core/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/modules/core/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/modules/core/components/ui/form";
import { Label } from "@/modules/core/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/modules/core/components/ui/popover";
import { Textarea } from "@/modules/core/components/ui/textarea";
import { cn } from "@/modules/core/lib/utils";
import { getKeyword } from "@/modules/rank-tracker/actions/ranker-keyword.actions";
import {
  geoLocations,
  isoCountries,
  languageCodes,
} from "@/modules/rank-tracker/constants/iso-countries";
import { Domain, Keyword } from "@/modules/rank-tracker/types";
import { createDomainsView } from "../../actions/ranker-views.actions";

import { GSCKeywordPopover } from "./gsc-keyword-popover";

import { zodResolver } from "@hookform/resolvers/zod";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Check, ChevronsUpDown, Globe, Loader2, Star, Tag } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

import { listTags } from "@/modules/rank-tracker/actions/ranker-tags.actions";
import { KeywordTagSelector } from "./keyword-tag-selector";
import { usePendingKeywordStore } from "../../store";

// Constants
const DEFAULT_COUNTRY = "DNK";
const DEFAULT_GEO_LOCATION = "2208"; // Denmark

// Form schema
const formSchema = z.object({
  keywords: z
    .string()
    .min(1, {
      message: "Mindst ét søgeord er påkrævet.",
    })
    .refine(
      (value) => {
        const keywords = value
          .split("\n")
          .map((k) => k.trim())
          .filter(Boolean);
        const uniqueKeywords = new Set(keywords);
        return keywords.length === uniqueKeywords.size;
      },
      {
        message:
          "Der er duplikerede søgeord i din indtastning. Fjern venligst duplikater.",
      },
    ),
  country: z.string().optional(),
  tags: z.array(z.string()).default([]),
  star_keyword: z.boolean().default(false),
  team: z.union([z.string(), z.number()]).default(""),
});

// Country to language code mapping
const countryToLangMap = {
  DNK: languageCodes.da, // Danish
  DEU: languageCodes.de, // German
  GBR: languageCodes.en, // English
  USA: languageCodes.en, // English
  SWE: languageCodes.sv, // Swedish
  NOR: languageCodes.no, // Norwegian
  FIN: languageCodes.fi, // Finnish
  FRA: languageCodes.fr, // French
  ESP: languageCodes.es, // Spanish
  ITA: languageCodes.it, // Italian
  POL: languageCodes.pl, // Polish
  PRT: languageCodes.pt, // Portuguese
  RUS: languageCodes.ru, // Russian
} as const;

type AddKeywordDialogProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: () => void;
  editKeyword?: Keyword;
  defaultDomainId?: number | null;
  currentDomain?: Domain | null;
  gscData?: any;
  currentKeywords?: Keyword[];
};

// Create a QueryClient instance with default configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0, // No caching - always refetch
      gcTime: 1000 * 60 * 5, // Cache is kept for 5 minutes
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      retry: 1, // Only retry once
    },
  },
});

// Create a wrapper component that provides the QueryClient
export function AddKeywordDialogWithProvider(props: AddKeywordDialogProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <AddKeywordDialog {...props} />
    </QueryClientProvider>
  );
}

export const AddKeywordDialog = ({
  isOpen,
  onOpenChange,
  onSave,
  editKeyword,
  defaultDomainId,
  currentDomain,
  gscData,
  currentKeywords = [],
}: AddKeywordDialogProps) => {
  const searchParams = useSearchParams();
  const domainId = defaultDomainId?.toString() || searchParams.get("domain");

  // Form and UI state
  const [lineCount, setLineCount] = useState(1);
  const [keywordCount, setKeywordCount] = useState(0);
  const [countryOpen, setCountryOpen] = useState(false);
  const [tagOpen, setTagOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [tagSearchQuery, setTagSearchQuery] = useState("");
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [currentTeam, setCurrentTeam] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingTags, setIsLoadingTags] = useState(false);

  // Refs
  const lineNumbersRef = useRef<HTMLOListElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Initialize form
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      keywords: "",
      country: DEFAULT_COUNTRY,
      tags: [],
      star_keyword: false,
      team: "",
    },
  });

  // Filtering tags based on search query
  const filteredTags = useMemo(
    () =>
      availableTags.filter((tag) =>
        tag.toLowerCase().includes(tagSearchQuery.toLowerCase()),
      ),
    [availableTags, tagSearchQuery],
  );

  // Load existing keyword data when editing
  useEffect(() => {
    const loadKeywordData = async () => {
      if (editKeyword?.id) {
        const keywordData = await getKeyword(editKeyword.id);
        if (keywordData) {
          form.reset({
            keywords: keywordData.title,
            country: keywordData.location?.country || DEFAULT_COUNTRY,
            tags:
              keywordData.tags?.map((tag) =>
                typeof tag === "string" ? tag : tag.name,
              ) || [],
            star_keyword: keywordData.star_keyword || false,
            team: currentTeam || "",
          });
          const lines = keywordData.title.split("\n");
          setLineCount(lines.length);
          setKeywordCount(lines.filter((line) => line.trim()).length);
        }
      }
    };

    if (isOpen && editKeyword) {
      loadKeywordData();
    } else if (!isOpen) {
      setKeywordCount(0);
    }
  }, [isOpen, editKeyword, form, currentTeam]);

  // Load tags
  useEffect(() => {
    const fetchTags = async () => {
      setIsLoadingTags(true);
      try {
        const domain = searchParams.get("domain");
        if (!domain) return;

        const tagsData = await listTags(domain);
        if (tagsData && Array.isArray(tagsData.results)) {
          setAvailableTags(
            tagsData.results.map((tag: { name: string }) => tag.name),
          );
        } else if (tagsData && Array.isArray(tagsData)) {
          setAvailableTags(
            tagsData.map((tag: { name: string } | string) =>
              typeof tag === "string" ? tag : tag.name,
            ),
          );
        }
      } catch (error) {
        console.error("Error loading tags:", error);
        toast.error("Der opstod en fejl ved indlæsning af tags");
      } finally {
        setIsLoadingTags(false);
      }
    };
    fetchTags();
  }, [searchParams]);

  // Handle form submission
  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!domainId) {
      toast("Fejl ved oprettelse af søgeord", {
        description: "Intet domæne valgt.",
      });
      return;
    }

    try {
      setIsSubmitting(true);

      const keywords = values.keywords
        .split("\n")
        .map((keyword) => keyword.trim())
        .filter(Boolean);

      if (keywords.length === 0) {
        toast("Mindst ét søgeord er påkrævet.");
        return;
      }

      // Step 1: Validate keywords
      const uniqueKeywords = new Set(keywords);
      if (uniqueKeywords.size !== keywords.length) {
        toast.error("Duplikerede søgeord fundet");
        return;
      }

      // Get geo location based on country code
      const selectedCountry = values.country || DEFAULT_COUNTRY;
      const countryName = isoCountries.find(
        (c) => c.code === selectedCountry,
      )?.name;

      const geoLocation =
        geoLocations.find((loc) => loc.text === countryName)?.value ||
        DEFAULT_GEO_LOCATION;

      // Get language code based on country
      const langCode =
        countryToLangMap[selectedCountry as keyof typeof countryToLangMap] ||
        "1009";

      // Common data for all keywords
      const commonData = {
        domain: parseInt(domainId),
        star_keyword: values.star_keyword,
        tags: values.tags,
      };

      let result;

      try {
        const pendingKeywordStore = usePendingKeywordStore.getState();
        result = await pendingKeywordStore.addKeywords({
          ...commonData,
          keywords,
          location: {
            country: selectedCountry,
            device: "desktop",
          },
        });

        if (!result?.success) {
          throw new Error(
            result?.message || "Der opstod en fejl ved oprettelse af søgeord",
          );
        }

        toast.success(
          keywords.length === 1
            ? "Søgeord oprettet"
            : `${keywords.length} søgeord oprettet`,
        );

        // Call onSave to trigger parent component update
        if (onSave) {
          onSave();
        }

        // Reset form and close dialog
        form.reset();
        onOpenChange(false);

        // Navigate to update view with new parameters
        const navigationParams = new URLSearchParams();
        navigationParams.set("domain", domainId);

        // Add current date ranges if they exist
        const range = searchParams.get("range");
        const rangeCompare = searchParams.get("rangeCompare");

        if (range) navigationParams.set("range", range);
        if (rangeCompare) navigationParams.set("rangeCompare", rangeCompare);

        // Add redirect parameter to trigger refresh
        navigationParams.set("redirect", "true");

        // Build URL and navigate - using a completely new URL instead of modifying the existing one
        const url = `/domain?${navigationParams.toString()}`;

        window.location.href = url;
      } catch (error) {
        console.error("Error during keyword creation or processing:", error);
        toast.error("Fejl ved oprettelse af søgeord", {
          description:
            error instanceof Error
              ? error.message
              : "Der opstod en fejl under oprettelse. Prøv igen senere.",
        });
      }
    } catch (error) {
      console.error("General error in form submission:", error);
      toast.error("Fejl ved oprettelse af søgeord", {
        description: "Der opstod en uventet fejl. Prøv igen senere.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle keyword changes
  const handleKeywordChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const lines = e.target.value.split("\n");
      setLineCount(lines.length);
      const validKeywords = lines.filter((line) => line.trim()).length;
      setKeywordCount(validKeywords);
    },
    [],
  );

  // Handle textarea key events
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const currentValue = form.getValues("keywords");
        form.setValue("keywords", currentValue + "\n");
        setLineCount((prev) => prev + 1);
      }
    },
    [form],
  );

  // Handle custom tag addition
  const handleAddCustomTag = useCallback(() => {
    if (tagSearchQuery && !availableTags.includes(tagSearchQuery)) {
      setAvailableTags((prev) => [...prev, tagSearchQuery]);
      const currentTags = form.getValues("tags");
      form.setValue("tags", [...currentTags, tagSearchQuery]);
      setTagSearchQuery("");
      setTagOpen(false);
    }
  }, [availableTags, form, tagSearchQuery]);

  // Handle tag removal
  const handleRemoveTag = useCallback(
    (tagToRemove: string) => {
      const currentTags = form.getValues("tags");
      form.setValue(
        "tags",
        currentTags.filter((tag) => tag !== tagToRemove),
      );
    },
    [form],
  );

  // Handle textarea scroll sync with line numbers
  const handleScroll = useCallback((e: React.UIEvent<HTMLTextAreaElement>) => {
    if (lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = e.currentTarget.scrollTop;
    }
  }, []);

  // Handle dialog open/close
  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (!newOpen) {
        // Check if we need to refresh data from successful keyword creation
        const needsUpdate =
          typeof window !== "undefined" &&
          (window as any).KEYWORD_TABLE_NEEDS_UPDATE === true;

        const domainId =
          typeof window !== "undefined"
            ? (window as any).KEYWORD_TABLE_UPDATE_DOMAIN
            : null;

        if (needsUpdate && domainId) {
          console.log(
            "Dialog closing after keyword creation, refreshing table for domain:",
            domainId,
          );

          // Try multiple refresh approaches to ensure UI updates
          try {
            // 1. Try to directly call the table's update function
            if ((window as any)[`refreshKeywordTable_${domainId}`]) {
              console.log("Calling direct refresh function");
              (window as any)[`refreshKeywordTable_${domainId}`]();
            }

            // 2. Trigger an event for all listeners
            const updateEvent = new CustomEvent("keyword-table-update", {
              detail: {
                domainId,
                timestamp: Date.now(),
                source: "dialog-close",
                forceRefresh: true,
              },
            });
            console.log("Dispatching keyword-table-update event");
            window.dispatchEvent(updateEvent);

            // 3. Force server-side revalidation
            createDomainsView().catch((error) => {
              console.error("Error refreshing domain view:", error);
            });

            // Reset flags after refresh attempt
            (window as any).KEYWORD_TABLE_NEEDS_UPDATE = false;
          } catch (e) {
            console.error("Error triggering table update from dialog close", e);
          }
        } else {
          // Standard cleanup even if no new keywords
          createDomainsView().catch((error) => {
            console.error("Error refreshing domain view:", error);
          });
        }

        // Reset form
        form.reset();
        setLineCount(1);
        setKeywordCount(0);
      }

      // Call the original onOpenChange handler
      onOpenChange(newOpen);
    },
    [form, onOpenChange],
  );

  // Handle GSC keyword selection
  const handleGSCKeywordSelect = useCallback(
    (keyword: string) => {
      const currentKeywords = form.getValues("keywords");
      const newKeywords = currentKeywords
        ? `${currentKeywords}\n${keyword}`
        : keyword;
      form.setValue("keywords", newKeywords);
      const lines = newKeywords.split("\n");
      setLineCount(lines.length);
      setKeywordCount(lines.filter((line) => line.trim()).length);
    },
    [form],
  );

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="p-0 sm:max-w-[900px]">
          <DialogHeader className="rounded-t-lg bg-[#FAFAFA] p-6">
            <DialogTitle className="font-medium">
              {editKeyword ? "Rediger søgeord" : "Tilføj søgeord"}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="p-6">
              <div className="grid grid-cols-2 gap-8 py-4">
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="keywords"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Søgeord</FormLabel>
                        <div className="relative h-[300px] overflow-hidden rounded-md border">
                          <div className="grid h-full w-full grid-cols-[40px_1fr]">
                            <div className="overflow-hidden bg-gray-50">
                              <ol
                                ref={lineNumbersRef}
                                className="h-full overflow-hidden py-3 text-center text-xs text-gray-400"
                              >
                                {Array.from(
                                  { length: Math.max(lineCount, 1) },
                                  (_, i) => (
                                    <li
                                      key={i}
                                      className="h-[21px] leading-[21px]"
                                    >
                                      {i + 1}
                                    </li>
                                  ),
                                )}
                              </ol>
                            </div>
                            <FormControl>
                              <Textarea
                                {...field}
                                ref={textareaRef}
                                onChange={(e) => {
                                  field.onChange(e);
                                  handleKeywordChange(e);
                                }}
                                onKeyDown={handleKeyDown}
                                onScroll={handleScroll}
                                className="h-full w-full resize-none overflow-auto border-0 border-l text-sm leading-[21px] focus-visible:ring-0"
                                placeholder="Indtast søgeord - et per linje"
                                style={{
                                  padding: "12px 16px",
                                }}
                              />
                            </FormControl>
                          </div>
                        </div>
                        <div className="mt-2 text-sm text-gray-500">
                          {keywordCount}{" "}
                          {keywordCount === 1
                            ? "søgeord tilføjet"
                            : "søgeord tilføjet"}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="flex max-h-[332px] flex-col justify-between space-y-2">
                  <div className="">
                    <Label>Google Search Console</Label>
                    <div className="mt-2">
                      <GSCKeywordPopover
                        gscData={gscData}
                        onKeywordSelect={handleGSCKeywordSelect}
                        currentKeywords={currentKeywords.map((k) => k.title)}
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Indstillinger for søgeord</Label>
                    <div className="space-y-4 rounded-lg border p-4">
                      <FormField
                        control={form.control}
                        name="country"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between gap-12">
                            <div className="flex items-center gap-4">
                              <Globe className="h-4 w-4 text-gray-500" />
                              <FormLabel>Land</FormLabel>
                            </div>

                            <Popover
                              open={countryOpen}
                              onOpenChange={setCountryOpen}
                              modal={true}
                            >
                              <PopoverTrigger asChild>
                                <FormControl className="max-w-[220px]">
                                  <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={countryOpen}
                                    className="mt-0 w-full justify-between"
                                  >
                                    {field.value
                                      ? isoCountries.find(
                                          (country) =>
                                            country.code === field.value,
                                        )?.name
                                      : "Vælg land..."}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-full p-0">
                                <Command>
                                  <CommandInput
                                    placeholder="Søg efter land..."
                                    className="h-9"
                                    value={searchQuery}
                                    onValueChange={setSearchQuery}
                                  />
                                  <CommandEmpty>
                                    Intet land fundet.
                                  </CommandEmpty>
                                  <CommandGroup className="max-h-[200px] overflow-auto">
                                    {isoCountries.map((country) => (
                                      <CommandItem
                                        key={country.code}
                                        value={country.code}
                                        onSelect={() => {
                                          form.setValue(
                                            "country",
                                            country.code,
                                          );
                                          setCountryOpen(false);
                                          setSearchQuery("");
                                        }}
                                      >
                                        {country.name}
                                        <Check
                                          className={cn(
                                            "ml-auto h-4 w-4",
                                            field.value === country.code
                                              ? "opacity-100"
                                              : "opacity-0",
                                          )}
                                        />
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </Command>
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="tags"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between gap-12">
                            <div className="flex items-center gap-4">
                              <Tag className="h-4 w-4 text-gray-500" />
                              <FormLabel>Tags</FormLabel>
                            </div>
                            <FormControl>
                              <KeywordTagSelector
                                availableTags={availableTags.map((tag) => ({
                                  name: tag,
                                }))}
                                selectedTags={field.value}
                                onTagSelect={(tagName) => {
                                  const currentTags = field.value;
                                  field.onChange(
                                    currentTags.includes(tagName)
                                      ? currentTags.filter((t) => t !== tagName)
                                      : [...currentTags, tagName],
                                  );
                                }}
                                onAddNewTag={(newTagName) => {
                                  if (
                                    newTagName &&
                                    !availableTags.includes(newTagName)
                                  ) {
                                    setAvailableTags((prev) => [
                                      ...prev,
                                      newTagName,
                                    ]);
                                    const currentTags = field.value;
                                    field.onChange([
                                      ...currentTags,
                                      newTagName,
                                    ]);
                                  }
                                }}
                                isLoading={isLoadingTags}
                                className="w-full max-w-[220px]"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="star_keyword"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between gap-8">
                            <div className="flex items-end gap-4">
                              <Star className="h-4 w-4 text-gray-500" />
                              <FormLabel>Marker som favorit</FormLabel>
                            </div>
                            <FormControl className="mt-0">
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                className="mt-0 h-5 w-5"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </div>
              </div>
              <DialogFooter className="mt-10 flex justify-between gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    onOpenChange(false);
                    form.reset();
                  }}
                  className="w-full"
                  disabled={isSubmitting}
                  aria-label="Annuller tilføjelse af søgeord"
                >
                  Annuller
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full"
                  aria-label="Gem søgeord"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Gemmer...
                    </>
                  ) : (
                    "Gem søgeord"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
};
