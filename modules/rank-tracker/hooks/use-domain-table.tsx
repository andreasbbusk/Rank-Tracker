import { useRankTrackerStore } from "@/modules/rank-tracker/store/rank-tracker.store";
import { useQueryString } from "@/modules/core/hooks/useQueryString";
import { useState, useTransition, useEffect, useRef } from "react";
import { toast } from "sonner";
import { deleteDomain, updateDomain } from "../actions/ranker-domain.actions";
import { createDomainsView } from "../actions/ranker-views.actions";
import { Domain, DomainWithAnalytics } from "../types/index";

export default function useDomainTable() {
  const [domainList, setDomainList] = useState<DomainWithAnalytics[]>([]);
  const [editDomain, setEditDomain] = useState<Domain | undefined>();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string>();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showKeywordDialog, setShowKeywordDialog] = useState(false);
  const [selectedDomainForKeywords, setSelectedDomainForKeywords] =
    useState<Domain | null>(null);
  const { searchParams, router } = useQueryString();
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [navigatingDomainId, setNavigatingDomainId] = useState<string | null>(
    null,
  );
  const [lastNavigationTime, setLastNavigationTime] = useState<number>(0);
  const navigationTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [isPending, startTransition] = useTransition();

  const changeDomain = useRankTrackerStore((state) => state.changeProperty);

  const handleDelete = (id: string) => {
    setItemToDelete(id);
    setShowDeleteDialog(true);
  };

  const handleUpdateItem = async (updatedDomain: Domain) => {
    startTransition(async () => {
      const result = await updateDomain({
        id: updatedDomain.id || "",
        url: updatedDomain.url,
        display_name: updatedDomain.display_name,
      });

      if (!("error" in result) || !result.error) {
        setDomainList((prev) =>
          prev.map((domain) =>
            domain.id === updatedDomain.id
              ? { ...domain, ...updatedDomain }
              : domain,
          ),
        );
      } else {
        toast("Fejl ved opdatering af domæne.", {
          description: "Der opstod en fejl. Prøv igen senere.",
        });
      }
      setIsEditModalOpen(false);
      setEditDomain(undefined);
    });
  };

  const confirmDelete = async () => {
    startTransition(async () => {
      if (!itemToDelete) return;

      setIsDeleting(true);
      try {
        const result = await deleteDomain(itemToDelete);
        if (result?.success) {
          setDomainList((prev) =>
            prev.filter((domain) => domain.id !== itemToDelete),
          );
          setShowDeleteDialog(false);
        } else {
          toast("Fejl ved sletning af domæne.", {
            description: "Der opstod en fejl. Prøv igen senere.",
          });
        }
      } catch (error) {
        console.error("Fejl ved sletning af domæne:", error);
        toast("Fejl ved sletning af domæne.", {
          description: "Der opstod en fejl. Prøv igen senere.",
        });
      } finally {
        setIsDeleting(false);
        setItemToDelete(undefined);
      }
    });
  };

  const handleEdit = (domain: DomainWithAnalytics) => {
    setEditDomain({
      id: domain.id,
      url: domain.url,
      display_name: domain.display_name,
      team: domain.team,
    });
    setIsEditModalOpen(true);
  };

  // Initialize with any saved navigation state
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedDomainId = sessionStorage.getItem("currentNavigatingDomainId");
      if (savedDomainId) {
        setNavigatingDomainId(savedDomainId);

        // Clear the saved state after a delay
        navigationTimerRef.current = setTimeout(() => {
          sessionStorage.removeItem("currentNavigatingDomainId");
          setNavigatingDomainId(null);
        }, 1000);
      }
    }

    // Cleanup timer on component unmount
    return () => {
      if (navigationTimerRef.current) {
        clearTimeout(navigationTimerRef.current);
      }
    };
  }, []);

  const handleKeywordNavigation = async (domainId: string) => {
    // Implement navigation throttling - prevent navigation more than once per second
    const now = Date.now();
    if (now - lastNavigationTime < 1000) {
      console.log("Navigation throttled, too many requests");
      return;
    }

    // Prevent double navigation by checking if we're already navigating to this domain
    if (navigatingDomainId === domainId) {
      console.log("Already navigating to this domain, ignoring request");
      return;
    }

    // Clear any existing navigation timer
    if (navigationTimerRef.current) {
      clearTimeout(navigationTimerRef.current);
    }

    // Store navigation time
    setLastNavigationTime(now);

    // Set the specific domain ID that's loading
    setNavigatingDomainId(domainId);

    // Store in session storage to persist across navigation
    if (typeof window !== "undefined") {
      sessionStorage.setItem("currentNavigatingDomainId", domainId);

      // Also store the current state in localStorage
      changeDomain(domainId);
    }

    // Create navigation URL
    const navigationParams = new URLSearchParams();
    navigationParams.set("domain", domainId);

    // Always include tab=keyword in the initial navigation to prevent a second render
    navigationParams.set("tab", "keyword");

    // Add date ranges if they exist
    const range = searchParams.get("range");
    const rangeCompare = searchParams.get("rangeCompare");

    if (range) navigationParams.set("range", range);
    if (rangeCompare) navigationParams.set("rangeCompare", rangeCompare);

    const url = `/domain?${navigationParams.toString()}`;

    // Use the router for navigation when possible to maintain React context
    router.push(url);
  };

  const handleAddKeywords = async (domain: Domain, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setSelectedDomainForKeywords(domain);
      setShowKeywordDialog(true);
    } catch (error) {
      console.error("Error preparing to add keywords:", error);
      toast("Der opstod en fejl ved forberedelse af søgeord", {
        description: "Prøv venligst igen senere.",
      });
    }
  };

  const handleDomainCreated = async (domain: Domain) => {
    // Show progress modal
    setShowProgressModal(true);

    try {
      // Step 1: Validate keywords
      setIsProcessing(true);
      await new Promise((resolve) => setTimeout(resolve, 500));
      setIsProcessing(false);

      // Step 2: Create keywords
      setIsProcessing(true);
      await new Promise((resolve) => setTimeout(resolve, 500));
      setIsProcessing(false);

      // Step 3: Update view
      setIsProcessing(true);
      await createDomainsView();
      setIsProcessing(false);

      // Wait a brief moment to show completion
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Close progress modal and update the table
      setShowProgressModal(false);
    } catch (error) {
      console.error("Error in domain creation process:", error);
      setIsProcessing(false);
      toast("Der opstod en fejl under oprettelse af søgeord", {
        description: "Prøv venligst igen senere.",
      });
      setShowProgressModal(false);
    }
  };

  return {
    handleDelete,
    handleUpdateItem,
    confirmDelete,
    handleEdit,
    handleKeywordNavigation,
    handleAddKeywords,
    handleDomainCreated,
    domainList,
    editDomain,
    isEditModalOpen,
    showDeleteDialog,
    itemToDelete,
    isDeleting,
    showKeywordDialog,
    selectedDomainForKeywords,
    showProgressModal,
    isProcessing,
    setDomainList,
    setEditDomain,
    setIsEditModalOpen,
    setShowDeleteDialog,
    setItemToDelete,
    setIsDeleting,
    setShowKeywordDialog,
    setSelectedDomainForKeywords,
    setShowProgressModal,
    isPending,
    navigatingDomainId,
  };
}
