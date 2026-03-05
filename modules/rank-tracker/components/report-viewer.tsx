"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Edit,
  Save,
  Loader2,
  FileText,
  Download,
  Maximize2,
  Minimize2,
  GripVertical,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/modules/core/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/modules/core/components/ui/card";
import { Badge } from "@/modules/core/components/ui/badge";

import { KeywordReport, ReportContentBlock, ReportMetrics } from "../types";
import { useReportStore } from "../store/report.store";
import { updateKeywordReport } from "../actions/report.actions";
import ReportContentBlockComponent from "./report-content-block";
import AddBlockSection from "./add-block-section";
import { toEmbedAwarePath } from "../utils/embed-path";

interface ReportViewerProps {
  reportId: string;
}

// Flexible Block Layout Component
interface FlexibleBlockLayoutProps {
  blocks: ReportContentBlock[];
  isEditing: boolean;
  onUpdate: (blockId: string, content: any) => void;
  onDuplicate: (blockId: string) => void;
  onDelete: (blockId: string) => void;
  onSizeChange: (
    blockId: string,
    size: "full" | "half" | "third" | "quarter",
  ) => void;
}

const FlexibleBlockLayout = ({
  blocks,
  isEditing,
  onUpdate,
  onDuplicate,
  onDelete,
  onSizeChange,
}: FlexibleBlockLayoutProps) => {
  // Group blocks into rows based on their sizes
  const groupBlocksIntoRows = (blocks: ReportContentBlock[]) => {
    const rows: ReportContentBlock[][] = [];
    let currentRow: ReportContentBlock[] = [];
    let currentRowWidth = 0;

    blocks.forEach((block) => {
      const blockWidth = getBlockWidth(block.size);

      // If adding this block would exceed row width, start new row
      if (currentRowWidth + blockWidth > 12 && currentRow.length > 0) {
        rows.push(currentRow);
        currentRow = [];
        currentRowWidth = 0;
      }

      // Add block to current row
      currentRow.push(block);
      currentRowWidth += blockWidth;
    });

    // Add the last row if it has blocks
    if (currentRow.length > 0) {
      rows.push(currentRow);
    }

    return rows;
  };

  const getBlockWidth = (size?: string): number => {
    switch (size) {
      case "quarter":
        return 3;
      case "third":
        return 4;
      case "half":
        return 6;
      case "full":
      default:
        return 12;
    }
  };

  const rows = groupBlocksIntoRows(blocks);

  return (
    <div className="space-y-6">
      {rows.map((row, rowIndex) => (
        <div key={rowIndex} className="flex flex-wrap items-start gap-6">
          {row.map((block) => (
            <SortableBlock
              key={block.id}
              block={block}
              isEditing={isEditing}
              onUpdate={(content: any) => onUpdate(block.id, content)}
              onDuplicate={() => onDuplicate(block.id)}
              onDelete={() => onDelete(block.id)}
              onSizeChange={(size) => onSizeChange(block.id, size)}
            />
          ))}
        </div>
      ))}
    </div>
  );
};

// Sortable Block Wrapper Component
interface SortableBlockProps {
  block: ReportContentBlock;
  isEditing: boolean;
  onUpdate: (content: any) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onSizeChange?: (size: "full" | "half" | "third" | "quarter") => void;
}

const SortableBlock = ({
  block,
  isEditing,
  onUpdate,
  onDuplicate,
  onDelete,
  onSizeChange,
}: SortableBlockProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 1000 : "auto",
  };

  const getSizeClass = (size?: string) => {
    switch (size) {
      case "quarter":
        return "w-full lg:w-1/4";
      case "third":
        return "w-full lg:w-1/3";
      case "half":
        return "w-full lg:w-1/2";
      case "full":
      default:
        return "w-full";
    }
  };

  const sizeOptions = [
    { value: "quarter", label: "1/4", icon: "□" },
    { value: "third", label: "1/3", icon: "▯" },
    { value: "half", label: "1/2", icon: "▬" },
    { value: "full", label: "Full", icon: "█" },
  ] as const;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative overflow-hidden rounded-lg bg-white transition-all duration-200 ${getSizeClass(
        block.size,
      )} ${
        isEditing
          ? "border-2 border-dashed border-gray-300 p-4 hover:border-blue-400 hover:shadow-md"
          : ""
      } ${isDragging ? "opacity-75 shadow-lg" : ""}`}
      {...attributes}
    >
      {/* Drag Handle - only visible when editing */}
      {isEditing && (
        <div
          {...listeners}
          data-pdf-hide
          className="absolute left-2 top-2 z-20 cursor-grab rounded bg-gray-100 p-1 opacity-0 transition-opacity hover:bg-gray-200 active:cursor-grabbing group-hover:opacity-100"
          title="Træk for at flytte blok"
        >
          <GripVertical className="h-4 w-4 text-gray-400" />
        </div>
      )}

      {/* Size Controls - only visible when editing */}
      {isEditing && onSizeChange && (
        <div
          data-pdf-hide
          className="absolute bottom-2 right-2 z-20 flex gap-2 opacity-0 transition-opacity group-hover:opacity-100"
        >
          {/* Size selector */}
          <div className="flex rounded border bg-white shadow-lg">
            {sizeOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => onSizeChange(option.value)}
                className={`px-3 py-2 text-sm font-medium transition-colors first:rounded-l last:rounded-r ${
                  block.size === option.value ||
                  (!block.size && option.value === "full")
                    ? "bg-blue-500 text-white"
                    : "bg-white text-gray-700 hover:bg-gray-50"
                }`}
                title={`Størrelse: ${option.label}`}
              >
                {option.icon}
              </button>
            ))}
          </div>
        </div>
      )}

      <ReportContentBlockComponent
        block={block}
        isEditing={isEditing}
        onUpdate={onUpdate}
        onDuplicate={onDuplicate}
        onDelete={onDelete}
      />
    </div>
  );
};

const ReportViewer = ({ reportId }: ReportViewerProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const { reports, updateReport } = useReportStore();
  const [report, setReport] = useState<KeywordReport | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  useEffect(() => {
    const foundReport = reports.find((r) => r.id === reportId);
    if (foundReport) {
      setReport(foundReport);
    } else {
      // In a real app, you would fetch from API here
      toast.error("Rapport ikke fundet");
      router.push(toEmbedAwarePath(pathname, "/"));
    }
  }, [pathname, reportId, reports, router]);

  // Listen for events from layout sidebar
  useEffect(() => {
    const handleEditStart = () => {
      setIsEditing(true);
    };

    const handleEditCancel = () => {
      setIsEditing(false);
      setHasChanges(false);
      // Reset to original report data
      const originalReport = reports.find((r) => r.id === reportId);
      if (originalReport) {
        setReport(originalReport);
      }
    };

    const handleSaved = (event: CustomEvent) => {
      setReport(event.detail.report);
      setIsEditing(false);
      setHasChanges(false);
    };

    window.addEventListener("reportEditStart", handleEditStart);
    window.addEventListener("reportEditCancel", handleEditCancel);
    window.addEventListener("reportSaved", handleSaved as EventListener);

    return () => {
      window.removeEventListener("reportEditStart", handleEditStart);
      window.removeEventListener("reportEditCancel", handleEditCancel);
      window.removeEventListener("reportSaved", handleSaved as EventListener);
    };
  }, [reportId, reports]);

  const handleContentBlockUpdate = (blockId: string, newContent: any) => {
    if (!report) return;

    const updatedBlocks = report.contentBlocks.map((block) =>
      block.id === blockId ? { ...block, content: newContent } : block,
    );

    const updatedReport = { ...report, contentBlocks: updatedBlocks };
    setReport(updatedReport);
    setHasChanges(true);

    // Communicate changes to layout sidebar
    window.dispatchEvent(
      new CustomEvent("reportChanged", {
        detail: { report: updatedReport, hasChanges: true },
      }),
    );
  };

  const handleAddBlock = (
    blockType: ReportContentBlock["type"],
    insertAfterPosition?: number,
  ) => {
    if (!report) return;

    const newBlockId = `block-${Date.now()}`;
    let newContent: any = {};

    // Helper to create dashboard metrics from report data
    const createDashboardMetrics = () => ({
      totalKeywords: report.metrics.totalKeywords,
      avgPosition: report.metrics.avgPosition,
      avgPositionChange: 0, // Default to no change
      keywordsChange: 0,
      avgCTR: report.metrics.avgCTR,
      ctrChange: 0,
      totalClicks: report.metrics.totalClicks,
      clicksChange: 0,
      totalImpressions: report.metrics.totalImpressions,
      impressionsChange: 0,
      topPositionKeywords: Math.floor(report.metrics.totalKeywords * 0.15),
      midPositionKeywords: Math.floor(report.metrics.totalKeywords * 0.25),
      lowPositionKeywords: Math.floor(report.metrics.totalKeywords * 0.3),
    });

    // Helper to create sample graph data
    const createGraphData = () => {
      const days = 30; // Create 30 days of sample data
      const startDate = new Date(report.metrics.dateRange.from);
      const graphData = [];

      for (let i = 0; i < days; i++) {
        const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
        const variation = 0.8 + Math.random() * 0.4; // Random variation between 0.8 and 1.2

        graphData.push({
          created_at: date.toISOString(),
          position: Math.max(
            1,
            report.metrics.avgPosition + (Math.random() - 0.5) * 4,
          ),
          clicks: Math.floor((report.metrics.totalClicks / 30) * variation),
          impressions: Math.floor(
            (report.metrics.totalImpressions / 30) * variation,
          ),
        });
      }

      return {
        graphData,
        compareGraphData: [], // Could add comparison data here if needed
      };
    };

    switch (blockType) {
      case "text":
        newContent = { text: "# Ny overskrift\n\nTilføj dit indhold her..." };
        break;
      case "conclusion":
        newContent = {
          text: "# Enden af rapporten\n\nDette konkluderer SEO rapporten. Husk at Google trafik svinger meget, hvis du kigger på det kortsigtet.",
        };
        break;

      // Combined blocks
      case "scorecards":
        newContent = createDashboardMetrics();
        break;
      case "dashboard-graph":
        newContent = {
          title: "Performance over tid",
          ...createGraphData(),
        };
        break;

      // Individual Score Cards
      case "card-keywords":
      case "card-position":
      case "card-clicks":
      case "card-impressions":
      case "card-ctr":
      case "card-top-positions":
        newContent = createDashboardMetrics();
        break;

      // Individual Graphs - now with proper sample data
      case "graph-clicks":
      case "graph-impressions":
      case "graph-position":
      case "graph-ctr":
        newContent = createGraphData();
        break;

      // Existing blocks
      case "metrics":
        newContent = {
          ...report.metrics,
          totalKeywords: 5,
        };
        break;
      case "graph":
        newContent = {
          dateRange: report.metrics.dateRange,
          chartType: "line",
        };
        break;
      case "highlight":
        newContent = {
          dateRange: report.metrics.dateRange,
          highlights: [
            {
              type: "improvement",
              title: "Bedste forbedring",
              description: "Søgeord steg X positioner",
            },
          ],
        };
        break;
      case "top-keywords":
        newContent = {
          ...report.metrics,
          domain: report.domain.url || report.domain.display_name,
          domainId: report.domain.id?.toString(),
        };
        break;
    }

    // Create new block
    const newPosition =
      insertAfterPosition !== undefined
        ? insertAfterPosition + 1
        : report.contentBlocks.length;

    // Set default size based on block type
    const getDefaultSize = (
      type: ReportContentBlock["type"],
    ): "full" | "half" | "third" | "quarter" => {
      switch (type) {
        case "card-keywords":
        case "card-position":
        case "card-clicks":
        case "card-impressions":
        case "card-ctr":
          return "quarter";
        case "card-top-positions":
          return "half";
        case "text":
        case "conclusion":
        case "metrics":
        case "highlight":
        case "top-keywords":
        case "scorecards":
        case "dashboard-graph":
        case "graph":
        case "graph-clicks":
        case "graph-impressions":
        case "graph-position":
        case "graph-ctr":
        default:
          return "full";
      }
    };

    const newBlock: ReportContentBlock = {
      id: newBlockId,
      type: blockType,
      content: newContent,
      position: newPosition,
      editable: true,
      size: getDefaultSize(blockType),
    };

    // If inserting after a specific position, update positions of subsequent blocks
    let updatedBlocks = [...report.contentBlocks];

    if (insertAfterPosition !== undefined) {
      // Increment position of all blocks that come after the insertion point
      updatedBlocks = updatedBlocks.map((block) => ({
        ...block,
        position:
          block.position > insertAfterPosition
            ? block.position + 1
            : block.position,
      }));
    }

    // Add the new block
    updatedBlocks.push(newBlock);

    // Sort by position to ensure correct order
    updatedBlocks.sort((a, b) => a.position - b.position);

    // Add block to report
    const updatedReport = {
      ...report,
      contentBlocks: updatedBlocks,
    };
    setReport(updatedReport);
    setHasChanges(true);

    // Communicate changes to layout sidebar
    window.dispatchEvent(
      new CustomEvent("reportChanged", {
        detail: { report: updatedReport, hasChanges: true },
      }),
    );
  };

  const handleDuplicateBlock = (blockId: string) => {
    if (!report) return;

    const blockToDuplicate = report.contentBlocks.find((b) => b.id === blockId);
    if (!blockToDuplicate) return;

    const newBlockId = `block-${Date.now()}`;
    const duplicatedBlock: ReportContentBlock = {
      ...blockToDuplicate,
      id: newBlockId,
      position:
        report.contentBlocks.length > 0
          ? Math.max(...report.contentBlocks.map((b) => b.position)) + 1
          : 0,
    };

    const updatedReport = {
      ...report,
      contentBlocks: [...report.contentBlocks, duplicatedBlock],
    };

    setReport(updatedReport);
    setHasChanges(true);

    // Communicate changes to layout sidebar
    window.dispatchEvent(
      new CustomEvent("reportChanged", {
        detail: { report: updatedReport, hasChanges: true },
      }),
    );

    toast.success("Blok dupliceret");
  };

  const handleDeleteBlock = (blockId: string) => {
    if (!report) return;

    // Find the block being deleted to get its position
    const blockToDelete = report.contentBlocks.find((b) => b.id === blockId);
    if (!blockToDelete) return;

    // Remove block from report and adjust positions
    let updatedBlocks = report.contentBlocks.filter((b) => b.id !== blockId);

    // Adjust positions of blocks that come after the deleted block
    updatedBlocks = updatedBlocks.map((block) => ({
      ...block,
      position:
        block.position > blockToDelete.position
          ? block.position - 1
          : block.position,
    }));

    const updatedReport = {
      ...report,
      contentBlocks: updatedBlocks,
    };

    setReport(updatedReport);
    setHasChanges(true);

    // Communicate changes to layout sidebar
    window.dispatchEvent(
      new CustomEvent("reportChanged", {
        detail: { report: updatedReport, hasChanges: true },
      }),
    );

    toast.success("Blok slettet");
  };

  const handleUpdateBlockOrder = (newBlocks: ReportContentBlock[]) => {
    if (!report) return;

    console.log("Updating block order:", newBlocks);

    // Find the new block (one that doesn't exist in current report)
    const currentBlockIds = new Set(
      report.contentBlocks.map((block) => block.id),
    );
    const newBlock = newBlocks.find((block) => !currentBlockIds.has(block.id));

    if (newBlock) {
      // This is adding a new block with reordering
      // We need to set the content for the new block based on its type
      const blockWithContent = {
        ...newBlock,
        content: getDefaultContentForBlockType(newBlock.type),
        editable: true,
        size: getDefaultSizeForBlockType(newBlock.type),
      };

      // Replace the new block in the array with the one that has content
      const finalBlocks = newBlocks.map((block) =>
        block.id === newBlock.id ? blockWithContent : block,
      );

      const updatedReport = {
        ...report,
        contentBlocks: finalBlocks,
      };

      setReport(updatedReport);
      setHasChanges(true);

      // Communicate changes to layout sidebar
      window.dispatchEvent(
        new CustomEvent("reportChanged", {
          detail: { report: updatedReport, hasChanges: true },
        }),
      );

      toast.success("Blok tilføjet og rapport omorganiseret");
    } else {
      // This is just reordering existing blocks
      const updatedReport = {
        ...report,
        contentBlocks: newBlocks,
      };

      setReport(updatedReport);
      setHasChanges(true);

      // Communicate changes to layout sidebar
      window.dispatchEvent(
        new CustomEvent("reportChanged", {
          detail: { report: updatedReport, hasChanges: true },
        }),
      );

      toast.success("Blokke omorganiseret");
    }
  };

  const getDefaultContentForBlockType = (
    blockType: ReportContentBlock["type"],
  ) => {
    if (!report) return {};

    // Helper to create dashboard metrics from report data
    const createDashboardMetrics = () => ({
      totalKeywords: report.metrics.totalKeywords,
      avgPosition: report.metrics.avgPosition,
      avgPositionChange: 0,
      keywordsChange: 0,
      avgCTR: report.metrics.avgCTR,
      ctrChange: 0,
      totalClicks: report.metrics.totalClicks,
      clicksChange: 0,
      totalImpressions: report.metrics.totalImpressions,
      impressionsChange: 0,
      topPositionKeywords: Math.floor(report.metrics.totalKeywords * 0.15),
      midPositionKeywords: Math.floor(report.metrics.totalKeywords * 0.25),
      lowPositionKeywords: Math.floor(report.metrics.totalKeywords * 0.3),
    });

    // Helper to create sample graph data
    const createGraphData = () => {
      const days = 30;
      const startDate = new Date(report.metrics.dateRange.from);
      const graphData = [];

      for (let i = 0; i < days; i++) {
        const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
        const variation = 0.8 + Math.random() * 0.4;

        graphData.push({
          created_at: date.toISOString(),
          position: Math.max(
            1,
            report.metrics.avgPosition + (Math.random() - 0.5) * 4,
          ),
          clicks: Math.floor((report.metrics.totalClicks / 30) * variation),
          impressions: Math.floor(
            (report.metrics.totalImpressions / 30) * variation,
          ),
        });
      }

      return { graphData, compareGraphData: [] };
    };

    switch (blockType) {
      case "text":
        return { text: "# Ny overskrift\n\nTilføj dit indhold her..." };
      case "conclusion":
        return {
          text: "# Enden af rapporten\n\nDette konkluderer SEO rapporten. Husk at Google trafik svinger meget, hvis du kigger på det kortsigtet.",
        };
      case "scorecards":
        return createDashboardMetrics();
      case "dashboard-graph":
        return { title: "Performance over tid", ...createGraphData() };
      case "card-keywords":
      case "card-position":
      case "card-clicks":
      case "card-impressions":
      case "card-ctr":
      case "card-top-positions":
        return createDashboardMetrics();
      case "graph-clicks":
      case "graph-impressions":
      case "graph-position":
      case "graph-ctr":
        return createGraphData();
      case "metrics":
        return { ...report.metrics, totalKeywords: 5 };
      case "graph":
        return { dateRange: report.metrics.dateRange, chartType: "line" };
      case "highlight":
        return {
          dateRange: report.metrics.dateRange,
          highlights: [
            {
              type: "improvement",
              title: "Bedste forbedring",
              description: "Søgeord steg X positioner",
            },
          ],
        };
      case "top-keywords":
        return {
          ...report.metrics,
          domain: report.domain.url || report.domain.display_name,
          domainId: report.domain.id?.toString(),
        };
      default:
        return {};
    }
  };

  const getDefaultSizeForBlockType = (
    type: ReportContentBlock["type"],
  ): "full" | "half" | "third" | "quarter" => {
    switch (type) {
      case "card-keywords":
      case "card-position":
      case "card-clicks":
      case "card-impressions":
      case "card-ctr":
        return "quarter";
      case "card-top-positions":
        return "half";
      default:
        return "full";
    }
  };

  const handleBlockSizeChange = (
    blockId: string,
    size: "full" | "half" | "third" | "quarter",
  ) => {
    if (!report) return;

    console.log("Size change:", {
      blockId,
      size,
      currentBlocks: report.contentBlocks,
    });

    const updatedBlocks = report.contentBlocks.map((block) =>
      block.id === blockId ? { ...block, size } : block,
    );

    console.log("Updated blocks:", updatedBlocks);

    const updatedReport = { ...report, contentBlocks: updatedBlocks };
    setReport(updatedReport);
    setHasChanges(true);

    // Communicate changes to layout sidebar
    window.dispatchEvent(
      new CustomEvent("reportChanged", {
        detail: { report: updatedReport, hasChanges: true },
      }),
    );

    toast.success(`Blok størrelse ændret til ${size}`);
  };

  const handleSave = async () => {
    if (!report || !hasChanges) return;

    setIsSaving(true);
    try {
      const updatedReport = await updateKeywordReport(report);
      updateReport(updatedReport);
      setReport(updatedReport);
      setHasChanges(false);
      setIsEditing(false);
      toast.success("Rapport opdateret");
    } catch (error) {
      console.error("Failed to save report:", error);
      toast.error("Fejl ved gemning af rapport");
    } finally {
      setIsSaving(false);
    }
  };

  // Note: Action handlers are now in the layout sidebar

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id && report) {
      const oldIndex = report.contentBlocks.findIndex(
        (block) => block.id === active.id,
      );
      const newIndex = report.contentBlocks.findIndex(
        (block) => block.id === over?.id,
      );

      if (oldIndex !== -1 && newIndex !== -1) {
        const reorderedBlocks = arrayMove(
          report.contentBlocks,
          oldIndex,
          newIndex,
        );

        // Update positions to match new order
        const updatedBlocks = reorderedBlocks.map((block, index) => ({
          ...block,
          position: index,
        }));

        const updatedReport = { ...report, contentBlocks: updatedBlocks };
        setReport(updatedReport);
        setHasChanges(true);

        // Communicate changes to layout sidebar
        window.dispatchEvent(
          new CustomEvent("reportChanged", {
            detail: { report: updatedReport, hasChanges: true },
          }),
        );

        toast.success("Blok flyttet");
      }
    }

    setActiveId(null);
  };

  if (!report) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("da-DK", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "ready":
        return "default";
      case "generating":
        return "secondary";
      case "error":
        return "destructive";
      default:
        return "outline";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "ready":
        return "Klar";
      case "generating":
        return "Genererer";
      case "error":
        return "Fejl";
      default:
        return status;
    }
  };

  return (
    <div className="min-h-full bg-gray-50 py-8">
      <div className="container mx-auto max-w-4xl px-4">
        {/* Page-like container */}
        <div className="report-pdf-container mx-auto overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
          {/* Clean Header Design - simplified without action buttons */}
          <div className="mb-6 border-b border-gray-100 px-8 py-8">
            <div className="space-y-4">
              <div className="">
                <Badge variant="outline" className="mb-2">
                  Overblik og ændringer
                </Badge>
              </div>
              <h1 className="mb-2 text-3xl font-bold text-gray-900">
                {report.name}
              </h1>
              <div className="flex items-center gap-6 text-base text-primary">
                <span>{formatDate(report.createdAt)}</span>
                <div className="flex items-center gap-6">
                  <div className="h-4 w-[1.5px] bg-primary"></div>
                  <span>{report.domain.display_name}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Content Blocks with Grid Layout */}
          <div className="min-h-[100px] px-8">
            {/* Add Block Section at the top when no blocks exist */}
            {isEditing && report.contentBlocks.length === 0 && (
              <AddBlockSection
                onAddBlock={handleAddBlock}
                onUpdateBlockOrder={handleUpdateBlockOrder}
                reportBlocks={report.contentBlocks}
                className="mb-6"
              />
            )}

            {/* Content Blocks */}
            {report.contentBlocks.length > 0 && (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={report.contentBlocks.map((block) => block.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <FlexibleBlockLayout
                    blocks={report.contentBlocks.sort(
                      (a, b) => a.position - b.position,
                    )}
                    isEditing={isEditing}
                    onUpdate={handleContentBlockUpdate}
                    onDuplicate={handleDuplicateBlock}
                    onDelete={handleDeleteBlock}
                    onSizeChange={handleBlockSizeChange}
                  />
                </SortableContext>

                {/* Drag Overlay */}
                <DragOverlay>
                  {activeId ? (
                    <div className="flex min-h-[150px] flex-col items-center justify-center rounded-lg bg-white p-8 opacity-90 shadow-xl">
                      <div className="text-center text-gray-500">
                        Flytter blok...
                      </div>
                    </div>
                  ) : null}
                </DragOverlay>
              </DndContext>
            )}

            {/* Add Block Section when editing */}
            {isEditing && (
              <div className="mt-6">
                <AddBlockSection
                  onAddBlock={handleAddBlock}
                  onUpdateBlockOrder={handleUpdateBlockOrder}
                  reportBlocks={report.contentBlocks}
                />
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="mt-12 border-t border-gray-100 px-8 pb-6 pt-6">
            <div className="flex items-center justify-between text-sm text-gray-500">
              <div>
                Rapport af {report.generatedBy} • {formatDate(report.createdAt)}
              </div>
              <div>Senest opdateret: {formatDate(report.updatedAt)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportViewer;
