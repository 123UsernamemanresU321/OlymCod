"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ListTree } from "lucide-react";
import { parseMarkdownHeadings, slugHeading } from "@/lib/markdown/sections";
import { cn } from "@/lib/utils/cn";

interface NoteOutlineProps {
  markdown: string;
  compact?: boolean;
  onSelectHeading?: (title: string) => void;
}

export function NoteOutline({ markdown, compact = false, onSelectHeading }: NoteOutlineProps) {
  const [open, setOpen] = useState(!compact);
  const headings = useMemo(() => parseMarkdownHeadings(markdown), [markdown]);

  function jump(title: string) {
    onSelectHeading?.(title);
    const target = document.getElementById(slugHeading(title));
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  if (!headings.length) return null;

  return (
    <section className="rounded-lg border border-[#c3c6d0] bg-[#f9f9f9] p-4">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 text-left"
        onClick={() => setOpen((current) => !current)}
      >
        <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#1a1c1c]">
          <ListTree className="h-4 w-4 text-[#0e3b69]" aria-hidden="true" />
          Outline
        </span>
        <ChevronDown className={cn("h-4 w-4 text-[#43474f] transition-transform", open && "rotate-180")} aria-hidden="true" />
      </button>
      {open ? (
        <div className="mt-3 grid gap-1">
          {headings.map((heading) => (
            <button
              key={`${heading.title}-${heading.startLine}`}
              type="button"
              className="rounded px-2 py-1 text-left text-xs leading-5 text-[#43474f] hover:bg-white hover:text-[#0e3b69]"
              style={{ paddingLeft: `${Math.max(0, heading.level - 1) * 0.75 + 0.5}rem` }}
              onClick={() => jump(heading.title)}
            >
              {heading.title}
              <span className="ml-2 text-[10px] text-[#7a808a]">
                {heading.content.includes("$$") || heading.content.includes("$") ? "math" : ""}
                {heading.content.includes("![") ? " diagram" : ""}
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}
