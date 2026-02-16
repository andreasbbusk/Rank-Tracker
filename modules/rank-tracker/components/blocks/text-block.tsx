"use client";

import { Button } from "@/modules/core/components/ui/button";
import { Textarea } from "@/modules/core/components/ui/textarea";
import { Check, X } from "lucide-react";
import { useState, useEffect } from "react";

interface TextBlockProps {
  content: { text?: string };
  isEditing: boolean;
  isBlockEditing: boolean;
  onStartEdit: () => void;
  onSave: (content: any) => void;
  onCancel: () => void;
  renderActionButtons: () => React.ReactNode;
}

const TextBlock = ({
  content,
  isEditing,
  isBlockEditing,
  onStartEdit,
  onSave,
  onCancel,
  renderActionButtons,
}: TextBlockProps) => {
  const [tempContent, setTempContent] = useState(content);
  const text = tempContent?.text || "";

  useEffect(() => {
    setTempContent(content);
  }, [content]);

  const handleSave = () => {
    onSave(tempContent);
  };

  const handleCancel = () => {
    setTempContent(content);
    onCancel();
  };

  if (isEditing && isBlockEditing) {
    return (
      <>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Tekstblok</h3>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={handleCancel}>
              <X className="h-4 w-4" />
            </Button>
            <Button size="sm" onClick={handleSave}>
              <Check className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <Textarea
          value={text}
          onChange={(e) =>
            setTempContent({ ...tempContent, text: e.target.value })
          }
          className="min-h-[200px] border-gray-200"
          placeholder="Indtast tekst..."
        />
      </>
    );
  }

  return (
    <>
      {renderActionButtons()}
      <div className="prose prose-sm max-w-none text-gray-700">
        {text.split("\n").map((line: string, index: number) => {
          if (line.startsWith("# ")) {
            return (
              <h1 key={index} className="mb-4 text-2xl font-bold text-gray-900">
                {line.slice(2)}
              </h1>
            );
          }
          if (line.startsWith("## ")) {
            return (
              <h2
                key={index}
                className="mb-3 text-xl font-semibold text-gray-900"
              >
                {line.slice(3)}
              </h2>
            );
          }
          if (line.startsWith("### ")) {
            return (
              <h3 key={index} className="text-l mb-2 font-medium text-gray-900">
                {line.slice(4)}
              </h3>
            );
          }
          return (
            <p key={index} className="mb-2">
              {line}
            </p>
          );
        })}
      </div>
    </>
  );
};

export default TextBlock;
