"use client";

import {
  getProperties,
  type GoogleSearchConsoleProperties,
} from "@/modules/analytics/actions/g-search-console.actions";
import { Button } from "@/modules/core/components/ui/button";
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
import { Input } from "@/modules/core/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/modules/core/components/ui/popover";
import { cn } from "@/modules/core/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Check, ChevronsUpDown, Loader2 } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";
import { createDomain } from "../../actions/ranker-domain.actions";
import { getGSCKeywords } from "../../actions/ranker-keyword.actions";
import { Domain } from "../../types";
import { AddKeywordDialogWithProvider } from "../keywords/add-keyword";

const formSchema = z.object({
  url: z.string().min(1, { message: "Domæne er påkrævet" }),
  name: z.string().min(1, { message: "Visningsnavn er påkrævet" }),
});

const useGSCProperties = () => {
  const [properties, setProperties] =
    useState<GoogleSearchConsoleProperties | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<any>(null);
  const [hasFetched, setHasFetched] = useState(false);

  const fetchProperties = async () => {
    if (typeof window === "undefined" || hasFetched) return;
    setIsLoading(true);

    try {
      const result = await getProperties();

      if (result?.error) {
        setError(result.error);
      } else if (!result?.accounts || result.accounts.length === 0) {
        setError("No GSC accounts found");
      } else {
        setProperties(result);
        setError(null);
      }
      setHasFetched(true);
    } catch (error) {
      setError(error);
      toast("Fejl ved hentning af GSC domæner", {
        description: "Der opstod en fejl. Prøv igen senere.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const refetch = () => {
    setHasFetched(false);
    fetchProperties();
  };

  return { properties, isLoading, error, fetchProperties, refetch };
};

export function AddDomainDialog({
  isOpen,
  onOpenChange,
  editDomain,
  onSave,
  onDomainCreated,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  editDomain?: Domain;
  onSave?: (domain: Domain) => void;
  onDomainCreated?: (domain: Domain) => void;
}) {
  const [open, setOpen] = useState(isOpen);
  const [showKeywordDialog, setShowKeywordDialog] = useState(false);
  const [newDomainId, setNewDomainId] = useState<number | null>(null);
  const [newDomain, setNewDomain] = useState<Domain | null>(null);
  const { properties, isLoading, error, fetchProperties } = useGSCProperties();
  const [comboboxOpen, setComboboxOpen] = useState(false);
  const [gscData, setGscData] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      url: editDomain?.url || "",
      name: editDomain?.display_name || "",
    },
  });

  useEffect(() => {
    setOpen(isOpen);
    if (editDomain) {
      form.reset({
        url: editDomain.url,
        name: editDomain.display_name,
      });
    }
  }, [isOpen, editDomain, form]);

  // Only fetch properties on first open of combobox
  useEffect(() => {
    if (comboboxOpen && !properties) {
      fetchProperties();
    }
  }, [comboboxOpen, properties]);

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setIsSubmitting(true);
      if (editDomain && onSave) {
        onSave({
          ...editDomain,
          url: editDomain.url,
          display_name: values.name,
        });
        toast("", {
          description: "Domænet blev opdateret.",
        });
      } else {
        const result = await createDomain({
          url: values.url,
          display_name: values.name,
        });

        const hasError = !result || ("error" in result && result.error);
        const errorMessage =
          result && "message" in result ? result.message : undefined;

        if (hasError || !("id" in result) || !result.id) {
          form.setError("name", {
            type: "manual",
            message: errorMessage || "Visningsnavnet findes allerede",
          });
          return;
        }

        const newDomain = {
          id: result.id,
          url: values.url,
          display_name: result.display_name || values.name,
          team: result.team,
        };

        // Fetch GSC data for the new domain
        let formattedUrl = values.url;
        if (!formattedUrl.startsWith("http")) {
          formattedUrl = `sc-domain:${formattedUrl.replace(/^www\./, "")}`;
        }

        try {
          const gscKeywordsData = await getGSCKeywords(formattedUrl);
          setGscData(gscKeywordsData);
        } catch (error) {
          console.error("Error fetching GSC data:", error);
        }

        setNewDomainId(Number(result.id));
        setNewDomain(newDomain);
        onDomainCreated?.(newDomain);

        toast("Domænet blev oprettet.", {
          description: "Nu kan du tilføje søgeord til dit domæne.",
        });

        setShowKeywordDialog(true);
        form.reset();
        onOpenChange(false);
      }
    } catch (error) {
      console.error("Fejl ved oprettelse af domæne:", error);
      toast("Fejl ved oprettelse af domæne.", {
        description: "Der opstod en fejl. Prøv igen senere.",
        icon: <AlertCircle className="h-5 w-5" />,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGSCDomainSelect = (value: string) => {
    // Set the URL directly from the GSC property
    form.setValue("url", value);

    // Format the display name: clean the URL first, then format
    const displayName = value
      .replace("sc-domain:", "")
      .replace(/^https?:\/\//, "") // Remove http:// or https://
      .replace(/^www\./, "") // Remove www.
      .split(".")[0] // Get the first part before any dots
      .replace(/-/g, " ") // Replace dashes with spaces
      .replace(/\s+/g, " ") // Replace multiple spaces with single space
      .trim(); // Remove leading/trailing spaces

    const capitalizedName =
      displayName.charAt(0).toUpperCase() + displayName.slice(1).toLowerCase();

    form.setValue("name", capitalizedName);
    setComboboxOpen(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    onOpenChange(newOpen);
    if (!newOpen) {
      form.reset();
    }
  };

  const handleKeywordsAdded = async () => {
    try {
      if (newDomain) {
        // Capture domain before cleanup
        const domainToPass = { ...newDomain };

        // Clean up state
        setNewDomainId(null);
        setNewDomain(null);
        setGscData(null);
        setShowKeywordDialog(false);

        // Trigger navigation last
        onDomainCreated?.(domainToPass);
      }
    } catch (error) {
      console.error("Error in keywords process:", error);
      toast("Der opstod en fejl under oprettelse af søgeord", {
        description: "Prøv venligst igen senere.",
      });
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="p-0 sm:max-w-[800px]">
          <DialogHeader className="rounded-t-lg bg-[#FAFAFA] p-6">
            <DialogTitle className="text-base font-medium">
              {editDomain ? "Rediger domæne" : "Tilføj domæne"}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-6">
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(handleSubmit)}
                className="p-6 pt-0"
              >
                <div className="grid gap-8">
                  <FormField
                    control={form.control}
                    name="url"
                    render={({ field }) => (
                      <FormItem className="grid grid-cols-2 gap-2">
                        <FormLabel className="text-sm font-medium">
                          Domæne
                        </FormLabel>
                        <div className="col-span-3">
                          {editDomain ? (
                            <div className="flex h-[36px] items-center gap-2 rounded-md border border-input bg-gray-100 px-3">
                              <Image
                                src="/images/icons/google-search-console.svg"
                                alt="Google Search Console"
                                width={16}
                                height={16}
                                className="shrink-0"
                              />
                              <span>{editDomain.url}</span>
                            </div>
                          ) : (
                            <Popover
                              open={comboboxOpen}
                              onOpenChange={setComboboxOpen}
                            >
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={comboboxOpen}
                                    className="h-[36px] w-full justify-between"
                                  >
                                    {field.value ? (
                                      <div className="flex items-center gap-2">
                                        <Image
                                          src="/images/icons/google-search-console.svg"
                                          alt="Google Search Console"
                                          width={16}
                                          height={16}
                                          className="shrink-0"
                                        />
                                        <span>{field.value}</span>
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-2 text-muted-foreground">
                                        <Image
                                          src="/images/icons/google-search-console.svg"
                                          alt="Google Search Console"
                                          width={16}
                                          height={16}
                                          className="shrink-0"
                                        />
                                        <span>
                                          Vælg Google Search Console domæne
                                        </span>
                                      </div>
                                    )}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent
                                className="w-[--radix-popover-trigger-width] p-0"
                                align="start"
                                sideOffset={4}
                              >
                                <Command className="w-full">
                                  <CommandInput
                                    placeholder="Søg efter domæne..."
                                    className="h-9"
                                  />
                                  <CommandEmpty>
                                    Ingen GSC domæner fundet
                                  </CommandEmpty>
                                  <CommandGroup>
                                    {isLoading ? (
                                      <div className="flex items-center justify-center py-4">
                                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                      </div>
                                    ) : error ? (
                                      <div className="p-4 text-center text-sm text-muted-foreground">
                                        Der opstod en fejl ved hentning af
                                        domæner
                                      </div>
                                    ) : !properties?.accounts?.length ? (
                                      <div className="p-4 text-center text-sm text-muted-foreground">
                                        Ingen GSC domæner fundet
                                      </div>
                                    ) : (
                                      properties.accounts.map((account) => (
                                        <CommandItem
                                          key={account.property}
                                          value={account.property}
                                          onSelect={handleGSCDomainSelect}
                                        >
                                          {account.property}
                                          <Check
                                            className={cn(
                                              "ml-auto h-4 w-4",
                                              field.value === account.property
                                                ? "opacity-100"
                                                : "opacity-0",
                                            )}
                                          />
                                        </CommandItem>
                                      ))
                                    )}
                                  </CommandGroup>
                                </Command>
                              </PopoverContent>
                            </Popover>
                          )}
                        </div>
                        <FormMessage className="col-span-2" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem className="grid grid-cols-2 gap-2">
                        <FormLabel className="text-sm font-medium">
                          Visningsnavn
                        </FormLabel>
                        <div className="col-span-3">
                          <FormControl>
                            <Input
                              {...field}
                              className="col-span-3 h-[36px] text-sm text-primary"
                              placeholder="Indtast det navn, der skal vises i oversigten..."
                            />
                          </FormControl>
                        </div>
                        <FormMessage className="col-span-2" />
                      </FormItem>
                    )}
                  />
                </div>
                <DialogFooter className="mt-12 flex justify-between gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setOpen(false);
                      onOpenChange(false);
                    }}
                    className="w-full"
                    aria-label="Annuller tilføjelse af domæne"
                    disabled={isSubmitting}
                  >
                    Annuller
                  </Button>
                  <Button
                    type="submit"
                    className="w-full"
                    aria-label={editDomain ? "Gem ændringer" : "Gem nyt domæne"}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    {editDomain ? "Gem ændringer" : "Gem domæne"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </div>
        </DialogContent>
      </Dialog>

      <AddKeywordDialogWithProvider
        isOpen={showKeywordDialog}
        onOpenChange={(open) => {
          if (!open) {
            handleKeywordsAdded();
          }
        }}
        defaultDomainId={newDomainId}
        currentDomain={newDomain}
        gscData={gscData}
      />
    </>
  );
}
