"use client";

import { Bold, Heading2, Image, Italic, LinkIcon, List, ListOrdered, Sigma } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface EditorToolbarProps {
  onInsert: (before: string, after?: string) => void;
  className?: string;
}

const tools = [
  { label: "Heading", icon: Heading2, before: "\n## ", after: "" },
  { label: "Bold", icon: Bold, before: "**", after: "**" },
  { label: "Italic", icon: Italic, before: "_", after: "_" },
  { label: "Bullet list", icon: List, before: "\n- ", after: "" },
  { label: "Numbered list", icon: ListOrdered, before: "\n1. ", after: "" },
  { label: "Link", icon: LinkIcon, before: "[", after: "](https://)" },
  { label: "Image", icon: Image, before: "![diagram](", after: ")" },
  { label: "LaTeX block", icon: Sigma, before: "\n$$\n", after: "\n$$\n" }
];

export function EditorToolbar({ onInsert, className }: EditorToolbarProps) {
  return (
    <div
      className={cn(
        "flex min-h-10 items-center gap-1 overflow-x-auto border border-[#c3c6d0] bg-[#f9f9f9] px-2 py-1",
        className
      )}
      aria-label="Markdown formatting toolbar"
    >
      {tools.map((tool, index) => {
        const Icon = tool.icon;
        return (
          <button
            key={tool.label}
            type="button"
            className={cn(
              "grid h-8 w-8 shrink-0 place-items-center rounded text-[#43474f] hover:bg-white hover:text-[#0e3b69]",
              index === 3 && "ml-2 border-l border-[#c3c6d0] pl-2"
            )}
            aria-label={tool.label}
            title={tool.label}
            onClick={() => onInsert(tool.before, tool.after)}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}
