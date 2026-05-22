"use client";

import type React from "react";
import { useState } from "react";
import { cn } from "@/lib/utils/cn";

type NoteViewMode = "clean" | "compact" | "focus" | "metadata" | "split";

const modes: Array<{ value: NoteViewMode; label: string }> = [
  { value: "clean", label: "Clean Reading" },
  { value: "compact", label: "Compact" },
  { value: "focus", label: "Focus" },
  { value: "metadata", label: "Metadata Rich" },
  { value: "split", label: "Split With Related Notes" }
];

export function NoteViewModeShell({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<NoteViewMode>(() => {
    if (typeof window === "undefined") return "clean";
    const saved = window.localStorage.getItem("olympiad-codex:note-view-mode") as NoteViewMode | null;
    return saved && modes.some((item) => item.value === saved) ? saved : "clean";
  });

  function changeMode(next: NoteViewMode) {
    setMode(next);
    window.localStorage.setItem("olympiad-codex:note-view-mode", next);
  }

  return (
    <div className={cn("note-view-mode", `note-view-${mode}`)}>
      <div className="notebook-print-hidden mx-auto max-w-6xl px-4 pt-4 lg:px-10">
        <div className="flex flex-wrap gap-2 rounded-lg border border-[#c3c6d0] bg-white p-2">
          {modes.map((item) => (
            <button
              key={item.value}
              type="button"
              className={cn(
                "rounded px-3 py-1.5 text-sm text-[#43474f] hover:bg-[#eef4ff]",
                mode === item.value && "bg-[#dbeafe] font-medium text-[#0e3b69]"
              )}
              onClick={() => changeMode(item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
      {children}
    </div>
  );
}
