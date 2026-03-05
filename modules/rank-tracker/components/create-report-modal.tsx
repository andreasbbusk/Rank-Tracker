"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, CalendarIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/modules/core/components/ui/dialog";
import { Button } from "@/modules/core/components/ui/button";
import { Input } from "@/modules/core/components/ui/input";
import { Label } from "@/modules/core/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/modules/core/components/ui/select";
import { Separator } from "@/modules/core/components/ui/separator";
import {
  RadioGroup,
  RadioGroupItem,
} from "@/modules/core/components/ui/radio-group";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/modules/core/components/ui/popover";
import { Calendar } from "@/modules/core/components/ui/calendar";
import { cn } from "@/modules/core/lib/utils";
import { DomainWithAnalytics, CreateReportPayload } from "../types";
import { createKeywordReport } from "../actions/report.actions";
import { useReportStore } from "../store/report.store";
import { toEmbedAwarePath } from "../utils/embed-path";

interface CreateReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  domains: DomainWithAnalytics[];
}

const formatDate = (date: Date, locale: string = "da-DK"): string => {
  return date.toLocaleDateString(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

export const CreateReportModal = ({
  isOpen,
  onClose,
  domains,
}: CreateReportModalProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const { addReport, setLoading } = useReportStore();

  const [formData, setFormData] = useState<CreateReportPayload>({
    name: "",
    domainId: "",
    type: "one-time",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  // Initialize date range with last 30 days as default
  const [dateRange, setDateRange] = useState<{
    from: Date;
    to: Date;
  }>({
    from: new Date(new Date().setDate(new Date().getDate() - 30)),
    to: new Date(new Date().setDate(new Date().getDate() - 1)),
  });

  const handleValidation = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Rapportnavn er påkrævet";
    }

    if (!formData.domainId) {
      newErrors.domainId = "Vælg et domæne";
    }

    if (formData.type === "recurring" && !formData.frequency) {
      newErrors.frequency = "Vælg frekvens for løbende rapport";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!handleValidation()) {
      return;
    }

    const selectedDomain = domains.find((d) => d.id === formData.domainId);
    if (!selectedDomain) {
      toast.error("Valgt domæne blev ikke fundet");
      return;
    }

    setIsSubmitting(true);
    setLoading(true);

    try {
      // Include date range for one-time reports
      const reportData = {
        ...formData,
        ...(formData.type === "one-time" && { dateRange }),
      };

      const report = await createKeywordReport(reportData, selectedDomain);
      addReport(report);

      toast.success("Rapport er oprettet succesfuldt");
      onClose();

      // Navigate to the report page
      router.push(toEmbedAwarePath(pathname, `/report/${report.id}`));
    } catch (error) {
      console.error("Failed to create report:", error);
      toast.error("Der opstod en fejl ved oprettelse af rapporten", {
        description:
          error instanceof Error
            ? error.message
            : "Prøv igen om et øjeblik.",
      });
    } finally {
      setIsSubmitting(false);
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (isSubmitting) return;

    setFormData({ name: "", domainId: "", type: "one-time" });
    setErrors({});
    setDateRange({
      from: new Date(new Date().setDate(new Date().getDate() - 30)),
      to: new Date(new Date().setDate(new Date().getDate() - 1)),
    });
    onClose();
  };

  const handleCalendarSelect = (
    value: { from?: Date; to?: Date } | undefined,
  ) => {
    if (!value) return;

    setDateRange({
      from: value.from ?? dateRange.from,
      to: value.to ?? dateRange.to,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            Opret ny rapport
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Konfigurer din søgeordsrapport med ønskede indstillinger.
          </DialogDescription>
        </DialogHeader>

        <Separator className="mb-2" />
        <div className="space-y-8">
          <div className="space-y-2">
            <Label htmlFor="report-name" className="text-sm font-medium">
              Rapportnavn
            </Label>
            <Input
              id="report-name"
              placeholder="Indtast rapportnavn"
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              className={cn("h-9", errors.name ? "border-red-500" : "")}
              disabled={isSubmitting}
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-500">{errors.name}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="domain-select" className="text-sm font-medium">
              Domæne
            </Label>
            <Select
              value={formData.domainId}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, domainId: value }))
              }
              disabled={isSubmitting}
            >
              <SelectTrigger
                className={cn("h-9", errors.domainId ? "border-red-500" : "")}
              >
                <SelectValue placeholder="Vælg et domæne" />
              </SelectTrigger>
              <SelectContent>
                {domains.map((domain) => (
                  <SelectItem
                    key={domain.id}
                    value={domain.id || ""}
                    className="py-2"
                  >
                    <div className="flex flex-col items-start">
                      <span className="font-medium">{domain.display_name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.domainId && (
              <p className="mt-1 text-sm text-red-500">{errors.domainId}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Rapporttype</Label>
            <RadioGroup
              value={formData.type}
              onValueChange={(value) =>
                setFormData((prev) => ({
                  ...prev,
                  type: value as "one-time" | "recurring",
                  frequency: undefined,
                }))
              }
              disabled={isSubmitting}
              className="grid grid-cols-2 gap-6"
            >
              <div className="flex items-center space-x-3">
                <RadioGroupItem
                  value="one-time"
                  id="one-time"
                  className="mt-0.5"
                />
                <Label
                  htmlFor="one-time"
                  className="font-normal leading-relaxed"
                >
                  Engangsrapport
                </Label>
              </div>
              <div className="flex items-center space-x-3">
                <RadioGroupItem
                  value="recurring"
                  id="recurring"
                  className="mt-0.5"
                />
                <Label
                  htmlFor="recurring"
                  className="font-normal leading-relaxed"
                >
                  Løbende
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Date Range Picker for One-time Reports */}
          {formData.type === "one-time" && (
            <div className="space-y-3">
              <Label className="text-sm font-medium">Dato</Label>
              <Popover
                open={isDatePickerOpen}
                onOpenChange={setIsDatePickerOpen}
              >
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "h-9 w-full justify-start text-left font-normal",
                      !dateRange.from &&
                        !dateRange.to &&
                        "text-muted-foreground",
                    )}
                    disabled={isSubmitting}
                  >
                    <CalendarIcon className="mr-3 h-4 w-4" />
                    {dateRange.from && dateRange.to
                      ? `${formatDate(dateRange.from)} - ${formatDate(dateRange.to)}`
                      : "Vælg datoperiode"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <div className="flex">
                    {/* Preset Date Range Options */}
                    <div className="w-48 border-r border-border/40 p-4">
                      <div className="space-y-4">
                        <div>
                          <h4 className="mb-2 text-sm font-medium">
                            Tidsperiode
                          </h4>
                          <div className="space-y-1">
                            <button
                              type="button"
                              onClick={() => {
                                const today = new Date();
                                setDateRange({ from: today, to: today });
                              }}
                              className="w-full rounded px-2 py-1 text-left text-sm hover:bg-muted"
                            >
                              I dag
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const today = new Date();
                                const weekStart = new Date(
                                  today.setDate(
                                    today.getDate() - today.getDay(),
                                  ),
                                );
                                const weekEnd = new Date();
                                setDateRange({ from: weekStart, to: weekEnd });
                              }}
                              className="w-full rounded px-2 py-1 text-left text-sm hover:bg-muted"
                            >
                              Denne uge
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const today = new Date();
                                const monthStart = new Date(
                                  today.getFullYear(),
                                  today.getMonth(),
                                  1,
                                );
                                const monthEnd = new Date();
                                setDateRange({
                                  from: monthStart,
                                  to: monthEnd,
                                });
                              }}
                              className="w-full rounded px-2 py-1 text-left text-sm hover:bg-muted"
                            >
                              Denne måned
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const today = new Date();
                                const yearStart = new Date(
                                  today.getFullYear(),
                                  0,
                                  1,
                                );
                                const yearEnd = new Date();
                                setDateRange({ from: yearStart, to: yearEnd });
                              }}
                              className="w-full rounded px-2 py-1 text-left text-sm hover:bg-muted"
                            >
                              Dette år
                            </button>
                          </div>
                        </div>

                        <div>
                          <h4 className="mb-2 text-sm font-medium">Seneste</h4>
                          <div className="space-y-1">
                            <button
                              type="button"
                              onClick={() => {
                                const today = new Date();
                                const from = new Date(
                                  today.setDate(today.getDate() - 7),
                                );
                                const to = new Date();
                                setDateRange({ from, to });
                              }}
                              className="w-full rounded px-2 py-1 text-left text-sm hover:bg-muted"
                            >
                              7 dage
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const today = new Date();
                                const from = new Date(
                                  today.setDate(today.getDate() - 30),
                                );
                                const to = new Date();
                                setDateRange({ from, to });
                              }}
                              className="w-full rounded px-2 py-1 text-left text-sm hover:bg-muted"
                            >
                              30 dage
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const today = new Date();
                                const from = new Date(
                                  today.setDate(today.getDate() - 90),
                                );
                                const to = new Date();
                                setDateRange({ from, to });
                              }}
                              className="w-full rounded px-2 py-1 text-left text-sm hover:bg-muted"
                            >
                              90 dage
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Calendar */}
                    <div className="p-4">
                      <Calendar
                        mode="range"
                        selected={dateRange}
                        onSelect={handleCalendarSelect}
                        numberOfMonths={2}
                        disabled={(date) => date > new Date()}
                        initialFocus
                      />
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          )}

          {/* Frequency Selection for Recurring Reports */}
          {formData.type === "recurring" && (
            <div className="space-y-3 border-t border-border/40 pt-2">
              <Label className="text-sm font-medium">Frekvens</Label>
              <Select
                value={formData.frequency}
                onValueChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    frequency: value as "daily" | "weekly" | "monthly",
                  }))
                }
                disabled={isSubmitting}
              >
                <SelectTrigger
                  className={cn(
                    "h-9",
                    errors.frequency ? "border-red-500" : "",
                  )}
                >
                  <SelectValue placeholder="Vælg frekvens" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Dagligt</SelectItem>
                  <SelectItem value="weekly">Ugentligt</SelectItem>
                  <SelectItem value="monthly">Månedligt</SelectItem>
                </SelectContent>
              </Select>
              {errors.frequency && (
                <p className="mt-1 text-sm text-red-500">{errors.frequency}</p>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-3 pt-8">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
            className="px-6 font-medium"
          >
            Annuller
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-6 font-medium"
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Opret rapport
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
