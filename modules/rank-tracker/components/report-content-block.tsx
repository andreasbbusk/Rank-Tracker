"use client";

import { Button } from "@/modules/core/components/ui/button";
import { Copy, Edit, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { ReportContentBlock } from "../types";
import {
  TextBlock,
  MetricsBlock,
  GraphBlock,
  HighlightBlock,
  ScorecardsBlock,
  DashboardGraphBlock,
  IndividualCardBlock,
  IndividualGraphBlock,
  TopKeywordsBlock,
} from "./blocks";

interface ReportContentBlockComponentProps {
  block: ReportContentBlock;
  isEditing: boolean;
  onUpdate: (content: any) => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
}

const ReportContentBlockComponent = ({
  block,
  isEditing,
  onUpdate,
  onDuplicate,
  onDelete,
}: ReportContentBlockComponentProps) => {
  const [isBlockEditing, setIsBlockEditing] = useState(false);

  // Debug logging for block content
  useEffect(() => {
    console.log(`Block Debug - Type: ${block.type}`, {
      blockId: block.id,
      hasContent: !!block.content,
      contentKeys: block.content ? Object.keys(block.content) : [],
      content: block.content,
    });

    // Additional debug for metrics and highlights blocks
    if (block.type === "metrics" || block.type === "highlight") {
      console.log(`${block.type} Block Data:`, {
        hasChanges: !!(block.content as any)?.changes,
        hasPreviousPeriod: !!(block.content as any)?.previousPeriod,
        hasDateRange: !!(block.content as any)?.dateRange,
        changes: (block.content as any)?.changes,
        previousPeriod: (block.content as any)?.previousPeriod,
        dateRange: (block.content as any)?.dateRange,
      });
    }
  }, [block]);

  const handleSave = (content: any) => {
    onUpdate(content);
    setIsBlockEditing(false);
  };

  const handleCancel = () => {
    setIsBlockEditing(false);
  };

  const handleStartEdit = () => {
    setIsBlockEditing(true);
  };

  const renderActionButtons = () => {
    if (!isEditing) return null;

    return (
      <div
        data-pdf-hide
        className="absolute right-4 top-4 z-10 flex gap-2 opacity-0 transition-opacity group-hover:opacity-100"
      >
        {block.editable && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleStartEdit}
            className="h-8 w-8 bg-white p-0 shadow-sm"
          >
            <Edit className="h-4 w-4" />
          </Button>
        )}
        {onDuplicate && (
          <Button
            size="sm"
            variant="outline"
            onClick={onDuplicate}
            className="h-8 w-8 bg-white p-0 shadow-sm"
          >
            <Copy className="h-4 w-4" />
          </Button>
        )}
        {onDelete && (
          <Button
            size="sm"
            variant="outline"
            onClick={onDelete}
            className="h-8 w-8 bg-white p-0 shadow-sm"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    );
  };

  const blockContent = (() => {
    switch (block.type) {
      case "text":
      case "conclusion":
        return (
          <TextBlock
            content={block.content}
            isEditing={isEditing}
            isBlockEditing={isBlockEditing}
            onStartEdit={handleStartEdit}
            onSave={handleSave}
            onCancel={handleCancel}
            renderActionButtons={renderActionButtons}
          />
        );
      case "metrics":
        return (
          <MetricsBlock
            content={block.content}
            renderActionButtons={renderActionButtons}
          />
        );
      case "graph":
        return (
          <GraphBlock
            content={block.content}
            renderActionButtons={renderActionButtons}
          />
        );
      case "highlight":
        return (
          <HighlightBlock
            content={block.content}
            renderActionButtons={renderActionButtons}
          />
        );
      case "top-keywords":
        return (
          <TopKeywordsBlock
            content={block.content}
            renderActionButtons={renderActionButtons}
          />
        );
      case "scorecards":
        return (
          <ScorecardsBlock
            content={block.content}
            renderActionButtons={renderActionButtons}
          />
        );
      case "dashboard-graph":
        return (
          <DashboardGraphBlock
            content={block.content}
            renderActionButtons={renderActionButtons}
          />
        );
      // Individual Score Cards
      case "card-keywords":
      case "card-position":
      case "card-clicks":
      case "card-impressions":
      case "card-ctr":
      case "card-top-positions":
        return (
          <IndividualCardBlock
            blockType={block.type}
            content={block.content}
            renderActionButtons={renderActionButtons}
          />
        );
      // Individual Graphs
      case "graph-clicks":
      case "graph-impressions":
      case "graph-position":
      case "graph-ctr":
        return (
          <IndividualGraphBlock
            blockType={block.type}
            content={block.content}
            renderActionButtons={renderActionButtons}
          />
        );
      default:
        return (
          <>
            {renderActionButtons()}
            <span className="text-gray-500">
              Ukendt blok type: {block.type}
            </span>
          </>
        );
    }
  })();

  return blockContent;
};

export default ReportContentBlockComponent;
