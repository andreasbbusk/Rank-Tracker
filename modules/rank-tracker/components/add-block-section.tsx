"use client";

import { useState } from "react";
import { Button } from "@/modules/core/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/modules/core/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/modules/core/components/ui/tabs";
import { Input } from "@/modules/core/components/ui/input";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Plus,
  BarChart3,
  FileText,
  Lightbulb,
  Grid3X3,
  LineChart,
  MousePointer,
  Eye,
  Target,
  TrendingUp,
  Trophy,
  Search,
  GripVertical,
  Check,
  ArrowLeft,
} from "lucide-react";
import { ReportContentBlock } from "../types";

interface AddBlockSectionProps {
  onAddBlock: (
    blockType: ReportContentBlock["type"],
    insertAfterPosition?: number,
  ) => void;
  onUpdateBlockOrder?: (blocks: ReportContentBlock[]) => void;
  reportBlocks?: ReportContentBlock[];
  insertAfterPosition?: number;
  className?: string;
}

interface BlockType {
  type: ReportContentBlock["type"];
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  category: "content" | "cards" | "graphs" | "combined";
}

const AddBlockSection = ({
  onAddBlock,
  onUpdateBlockOrder,
  reportBlocks = [],
  insertAfterPosition,
  className = "",
}: AddBlockSectionProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [selectedBlockType, setSelectedBlockType] = useState<
    ReportContentBlock["type"] | null
  >(null);
  const [previewBlocks, setPreviewBlocks] = useState<ReportContentBlock[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const blockTypes: BlockType[] = [
    // Content blocks
    {
      type: "text",
      label: "Tekst blok",
      description: "Tilføj tekst, overskrifter og beskrivelser til rapporten",
      icon: FileText,
      category: "content",
    },
    {
      type: "conclusion",
      label: "Konklusion",
      description: "Standard rapport konklusion med anbefalinger og råd",
      icon: FileText,
      category: "content",
    },
    {
      type: "metrics",
      label: "Nøgletal oversigt",
      description: "Vis performance data og statistikker for valgte periode",
      icon: BarChart3,
      category: "content",
    },
    {
      type: "highlight",
      label: "Highlights",
      description: "Fremhæv vigtige indsigter og forbedringer",
      icon: Lightbulb,
      category: "content",
    },
    {
      type: "top-keywords",
      label: "Top 5 søgeord",
      description: "Vis de 5 bedst performerende søgeord med detaljer",
      icon: Trophy,
      category: "content",
    },

    // Individual Cards
    {
      type: "card-keywords",
      label: "Antal søgeord kort",
      description: "Vis totale antal søgeord med periode-til-periode ændring",
      icon: Target,
      category: "cards",
    },
    {
      type: "card-position",
      label: "Gennemsnitsposition kort",
      description: "Vis gennemsnitlig ranking position med trend",
      icon: TrendingUp,
      category: "cards",
    },
    {
      type: "card-clicks",
      label: "Klik kort",
      description: "Vis totale klik med periode-til-periode ændring",
      icon: MousePointer,
      category: "cards",
    },
    {
      type: "card-impressions",
      label: "Visninger kort",
      description: "Vis totale visninger med periode-til-periode ændring",
      icon: Eye,
      category: "cards",
    },
    {
      type: "card-ctr",
      label: "CTR kort",
      description: "Vis gennemsnitlig click-through rate med trend",
      icon: Target,
      category: "cards",
    },
    {
      type: "card-top-positions",
      label: "Top positioner kort",
      description: "Vis opdeling af top 1-3, 3-10, 10-20 positioner",
      icon: Grid3X3,
      category: "cards",
    },

    // Individual Graphs
    {
      type: "graph-clicks",
      label: "Klik graf",
      description: "Interaktiv tidsseriegraf for klik over valgte periode",
      icon: LineChart,
      category: "graphs",
    },
    {
      type: "graph-impressions",
      label: "Visninger graf",
      description: "Interaktiv tidsseriegraf for visninger over tid",
      icon: LineChart,
      category: "graphs",
    },
    {
      type: "graph-position",
      label: "Position graf",
      description: "Interaktiv tidsseriegraf for positioner over tid",
      icon: LineChart,
      category: "graphs",
    },
    {
      type: "graph-ctr",
      label: "CTR graf",
      description: "Interaktiv tidsseriegraf for CTR over valgte periode",
      icon: LineChart,
      category: "graphs",
    },

    // Combined blocks
    {
      type: "scorecards",
      label: "Alle dashboard kort",
      description: "Komplet dashboard med alle nøgletal som kort",
      icon: Grid3X3,
      category: "combined",
    },
    {
      type: "dashboard-graph",
      label: "Komplet dashboard graf",
      description: "Interaktiv graf med alle metrics kombineret",
      icon: LineChart,
      category: "combined",
    },
    {
      type: "graph",
      label: "Performance graf",
      description: "Komplet visualisering af data over tid",
      icon: BarChart3,
      category: "combined",
    },
  ];

  const handleBlockClick = (blockType: ReportContentBlock["type"]) => {
    setSelectedBlockType(blockType);

    console.log("Current reportBlocks:", reportBlocks); // Debug log

    // Create preview with new block added
    const newBlock: ReportContentBlock = {
      type: blockType,
      id: `temp-${Date.now()}`,
      content: {},
      position:
        insertAfterPosition !== undefined
          ? insertAfterPosition + 1
          : reportBlocks.length,
      editable: true,
      size: "full",
    };

    // Start with all existing blocks, sorted by position
    const existingBlocks = [...reportBlocks].sort(
      (a, b) => a.position - b.position,
    );

    let updatedBlocks: ReportContentBlock[];
    if (insertAfterPosition !== undefined) {
      // Insert after specific position
      updatedBlocks = [...existingBlocks];
      updatedBlocks.splice(insertAfterPosition + 1, 0, newBlock);
    } else {
      // Add at the end
      updatedBlocks = [...existingBlocks, newBlock];
    }

    // Update positions to be sequential
    const reorderedBlocks = updatedBlocks.map((block, index) => ({
      ...block,
      position: index,
    }));

    console.log("Preview blocks:", reorderedBlocks); // Debug log
    setPreviewBlocks(reorderedBlocks);
    setIsOpen(false);
    setIsPreviewOpen(true);
  };

  const handleConfirmAdd = () => {
    if (selectedBlockType && onUpdateBlockOrder) {
      // Update the entire block order including the new block
      // First, create the real new block to replace the temp one
      const newBlockId = `block-${Date.now()}`;
      const tempBlockIndex = previewBlocks.findIndex((block) =>
        block.id.startsWith("temp-"),
      );

      if (tempBlockIndex !== -1) {
        const finalBlocks = previewBlocks.map((block, index) => ({
          ...block,
          id: block.id.startsWith("temp-") ? newBlockId : block.id,
          position: index,
        }));

        // Pass the complete reordered block structure
        onUpdateBlockOrder(finalBlocks);
      }
    } else if (selectedBlockType) {
      // Fallback to original method if onUpdateBlockOrder is not provided
      const newBlockIndex = previewBlocks.findIndex((block) =>
        block.id.startsWith("temp-"),
      );
      const insertPosition = newBlockIndex > 0 ? newBlockIndex - 1 : undefined;
      onAddBlock(selectedBlockType, insertPosition);
    }

    setIsPreviewOpen(false);
    setSelectedBlockType(null);
    setPreviewBlocks([]);
  };

  const handleCancelPreview = () => {
    setIsPreviewOpen(false);
    setSelectedBlockType(null);
    setPreviewBlocks([]);
    setIsOpen(true);
  };

  // Get block type info for display
  const getBlockInfo = (blockType: ReportContentBlock["type"]) => {
    const blockInfo = blockTypes.find((b) => b.type === blockType);
    return (
      blockInfo || {
        label: blockType,
        description: "Ukendt blok type",
        icon: FileText,
        category: "content" as const,
      }
    );
  };

  // Handle drag and drop with dnd-kit
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = previewBlocks.findIndex(
        (block) => block.id === active.id,
      );
      const newIndex = previewBlocks.findIndex(
        (block) => block.id === over?.id,
      );

      if (oldIndex !== -1 && newIndex !== -1) {
        const reorderedBlocks = arrayMove(previewBlocks, oldIndex, newIndex);

        // Update positions
        const blocksWithUpdatedPositions = reorderedBlocks.map(
          (block, index) => ({
            ...block,
            position: index,
          }),
        );

        setPreviewBlocks(blocksWithUpdatedPositions);
      }
    }
  };

  // Preview block component with dnd-kit
  const PreviewSkeletonBlock = ({ block }: { block: ReportContentBlock }) => {
    const blockInfo = getBlockInfo(block.type);
    const Icon = blockInfo.icon;
    const isNewBlock = block.id.startsWith("temp-");

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
    };

    return (
      <div
        ref={setNodeRef}
        style={style}
        className={`group flex items-center gap-3 rounded-lg border p-4 transition-all hover:shadow-sm ${
          isDragging ? "z-50 opacity-50" : ""
        } ${isNewBlock ? "border-blue-300 bg-blue-50" : "border-gray-200 bg-white"}`}
        {...attributes}
      >
        <div {...listeners} className="cursor-grab active:cursor-grabbing">
          <GripVertical className="h-4 w-4 text-gray-400" />
        </div>
        <div className="rounded bg-gray-100 p-2">
          <Icon className="h-5 w-5 text-gray-600" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900">{blockInfo.label}</span>
            {isNewBlock && (
              <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800">
                Ny
              </span>
            )}
          </div>
          <div className="text-sm text-gray-500">{blockInfo.description}</div>
        </div>
      </div>
    );
  };

  const filteredBlocks = blockTypes.filter((block) => {
    const matchesSearch =
      searchQuery === "" ||
      block.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      block.description.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesTab = activeTab === "all" || block.category === activeTab;

    return matchesSearch && matchesTab;
  });

  const BlockCard = ({ block }: { block: BlockType }) => {
    const Icon = block.icon;
    return (
      <div
        onClick={() => handleBlockClick(block.type)}
        className="group relative cursor-pointer rounded-lg border border-gray-200 bg-white p-4 transition-all hover:border-gray-300 hover:shadow-md"
      >
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-gray-50 p-2 group-hover:bg-gray-100">
            <Icon className="h-5 w-5 text-gray-600" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="truncate font-medium text-gray-900">
                {block.label}
              </h3>
            </div>
            <p className="mt-1 line-clamp-2 text-sm text-gray-500">
              {block.description}
            </p>
          </div>
        </div>
      </div>
    );
  };

  const QuickAddButton = ({
    blockType,
    label,
    icon: Icon,
  }: {
    blockType: ReportContentBlock["type"];
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }) => (
    <Button
      variant="outline"
      size="sm"
      onClick={() => handleBlockClick(blockType)}
      className="flex items-center gap-2 text-gray-600 hover:bg-gray-50 hover:text-gray-900"
    >
      <Icon className="h-4 w-4" />
      {label}
    </Button>
  );

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Main Add Block Section */}
      <div className="rounded-lg border-2 border-dashed border-gray-300 bg-white">
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              className="flex h-24 w-full flex-col items-center justify-center gap-2 text-gray-500 hover:bg-gray-50 hover:text-gray-700"
            >
              <Plus className="h-8 w-8" />
              <span className="text-sm font-medium">Tilføj blok</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[80vh] max-w-4xl overflow-hidden">
            <DialogHeader>
              <DialogTitle>Tilføj blok til rapport</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Søg efter blok type..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Tabs */}
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="all">Alle</TabsTrigger>
                  <TabsTrigger value="content">Indhold</TabsTrigger>
                  <TabsTrigger value="cards">Kort</TabsTrigger>
                  <TabsTrigger value="graphs">Grafer</TabsTrigger>
                </TabsList>

                <TabsContent value={activeTab} className="mt-4">
                  <div className="max-h-96 overflow-y-auto no-scrollbar">
                    {filteredBlocks.length > 0 ? (
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        {filteredBlocks.map((block) => (
                          <BlockCard key={block.type} block={block} />
                        ))}
                      </div>
                    ) : (
                      <div className="py-8 text-center text-gray-500">
                        <FileText className="mx-auto mb-2 h-12 w-12 text-gray-300" />
                        <p>Ingen blokke fundet</p>
                        <p className="text-sm">Prøv at justere din søgning</p>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Preview Modal */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-h-[80vh] max-w-2xl overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Forhåndsvisning af rapport struktur
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="text-sm text-gray-600">
              Træk og slip for at ændre rækkefølgen af blokke i rapporten
            </div>

            <div className="max-h-96 overflow-y-auto p-1">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={previewBlocks.map((block) => block.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-3">
                    {previewBlocks.map((block) => (
                      <PreviewSkeletonBlock key={block.id} block={block} />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </div>

            <div className="flex items-center justify-between border-t pt-4">
              <Button
                variant="outline"
                onClick={handleCancelPreview}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Tilbage
              </Button>

              <Button
                onClick={handleConfirmAdd}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
              >
                <Check className="h-4 w-4" />
                Tilføj til rapport
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AddBlockSection;
