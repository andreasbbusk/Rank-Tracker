"use client";

import { Button } from "@/modules/core/components/ui/button";
import { Textarea } from "@/modules/core/components/ui/textarea";
import { Label } from "@/modules/core/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/modules/core/components/ui/dialog";
import { cn } from "@/modules/core/lib/utils";
import { Plus, Trash2, Edit3 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface Note {
  id: number;
  description: string;
  created_at?: string;
  updated_at?: string;
}

interface NoteManagerProps {
  notes: Note[];
  onNotesChange: (notes: Note[]) => void;
  disabled?: boolean;
}

// Helper function to format date to Danish format
const formatDateToDanish = (dateString: string): string => {
  const date = new Date(dateString);
  const months = [
    "jan",
    "feb",
    "mar",
    "apr",
    "maj",
    "jun",
    "jul",
    "aug",
    "sep",
    "okt",
    "nov",
    "dec",
  ];

  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();

  return `${day} ${month} ${year}`;
};

export const NoteManager = ({
  notes,
  onNotesChange,
  disabled = false,
}: NoteManagerProps) => {
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [editingText, setEditingText] = useState("");
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newNoteText, setNewNoteText] = useState("");

  const handleEditNote = (note: Note) => {
    setEditingNoteId(note.id);
    setEditingText(note.description);
  };

  const handleSaveEdit = () => {
    if (!editingText.trim()) {
      toast.error("Note kan ikke være tom");
      return;
    }

    const updatedNotes = notes.map((note) =>
      note.id === editingNoteId
        ? {
            ...note,
            description: editingText.trim(),
            updated_at: new Date().toISOString(),
          }
        : note,
    );

    onNotesChange(updatedNotes);
    setEditingNoteId(null);
    setEditingText("");
    toast.success("Note opdateret");
  };

  const handleCancelEdit = () => {
    setEditingNoteId(null);
    setEditingText("");
  };

  const handleDeleteNote = (noteId: number) => {
    const updatedNotes = notes.filter((note) => note.id !== noteId);
    onNotesChange(updatedNotes);
    toast.success("Note slettet");
  };

  const handleAddNewNote = () => {
    setIsAddingNew(true);
    setNewNoteText("");
  };

  const handleSaveNewNote = () => {
    if (!newNoteText.trim()) {
      toast.error("Note kan ikke være tom");
      return;
    }

    const now = new Date().toISOString();
    const newNote: Note = {
      id: Date.now(), // Temporary ID, will be replaced by server
      description: newNoteText.trim(),
      created_at: now,
      updated_at: now,
    };

    onNotesChange([...notes, newNote]);
    setIsAddingNew(false);
    setNewNoteText("");
    toast.success("Note tilføjet");
  };

  const handleCancelNewNote = () => {
    setIsAddingNew(false);
    setNewNoteText("");
  };

  // Sort notes by creation date (newest first)
  const sortedNotes = [...notes].sort((a, b) => {
    const dateA = new Date(a.created_at || a.updated_at || 0);
    const dateB = new Date(b.created_at || b.updated_at || 0);
    return dateB.getTime() - dateA.getTime();
  });

  const formatNoteDisplay = (note: Note): string => {
    const dateToUse = note.created_at || note.updated_at;
    if (!dateToUse) return note.description;

    const formattedDate = formatDateToDanish(dateToUse);
    return `${formattedDate}: ${note.description}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>Noter ({notes.length})</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAddNewNote}
          disabled={disabled || isAddingNew}
          className="h-8 gap-1 px-2"
        >
          <Plus className="h-3 w-3" />
          Tilføj note
        </Button>
      </div>

      {/* Existing notes */}
      {notes.length > 0 && (
        <div className="space-y-1">
          {sortedNotes.map((note, index) => (
            <div
              key={note.id}
              className={cn(
                "border-l-2 bg-gray-50/30 py-2 pl-3 pr-2",
                index < sortedNotes.length - 0 && "border-b border-gray-200",
              )}
            >
              {editingNoteId === note.id ? (
                <div className="space-y-2">
                  <Textarea
                    value={editingText}
                    onChange={(e) => setEditingText(e.target.value)}
                    placeholder="Rediger note..."
                    className="min-h-[60px] resize-none bg-white"
                    maxLength={500}
                    disabled={disabled}
                  />
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-500">
                      {editingText.length}/500 tegn
                    </p>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleCancelEdit}
                        disabled={disabled}
                      >
                        Annuller
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleSaveEdit}
                        disabled={disabled || !editingText.trim()}
                      >
                        Gem
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
                    {formatNoteDisplay(note)}
                  </p>
                  <div className="flex justify-end gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditNote(note)}
                      disabled={disabled}
                      className="h-7 gap-1 px-2 text-gray-600 hover:text-gray-900"
                    >
                      <Edit3 className="h-3 w-3" />
                      Rediger
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteNote(note.id)}
                      disabled={disabled}
                      className="h-7 gap-1 px-2 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-3 w-3" />
                      Slet
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add new note form */}
      {isAddingNew && (
        <div className="mt-2 rounded-lg border border-dashed border-gray-300 p-3">
          <div className="space-y-3">
            <Textarea
              value={newNoteText}
              onChange={(e) => setNewNoteText(e.target.value)}
              placeholder="Skriv din note her..."
              className="min-h-[60px] resize-none"
              maxLength={500}
              disabled={disabled}
              autoFocus
            />
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500">
                {newNoteText.length}/500 tegn
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCancelNewNote}
                  disabled={disabled}
                >
                  Annuller
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSaveNewNote}
                  disabled={disabled || !newNoteText.trim()}
                >
                  Tilføj note
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Show placeholder when no notes */}
      {notes.length === 0 && !isAddingNew && (
        <div className="rounded-lg border border-dashed border-gray-200 p-4 text-center">
          <p className="text-sm text-gray-500">
            Ingen noter endnu. Klik "Tilføj note" for at oprette den første.
          </p>
        </div>
      )}
    </div>
  );
};
