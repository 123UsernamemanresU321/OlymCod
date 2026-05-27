"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, ChevronDown, Circle, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { MarkdownPreview } from "@/components/editor/MarkdownPreview";
import { getCriteriaForNoteType } from "@/lib/note-quality/getCriteriaForNoteType";
import type { Note, NoteDraft } from "@/lib/types";

interface NoteQualityPanelProps {
  note?: Note | null;
  draft?: NoteDraft | null;
  onAppendMarkdown?: (markdown: string) => void;
  defaultOpen?: boolean;
}

export function NoteQualityPanel({ defaultOpen = false, note = null, draft = null, onAppendMarkdown }: NoteQualityPanelProps) {
  const [suggestion, setSuggestion] = useState("");
  const [busy, setBusy] = useState(false);
  const source = draft ?? note;
  const quality = useMemo(() => (source ? getCriteriaForNoteType(source) : null), [source]);

  async function improve() {
    if (!source) return;
    setBusy(true);
    setSuggestion("");
    try {
      const response = await fetch("/api/ai/note-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "fill_missing_sections",
          note: source,
          userInstruction: "Suggest only the missing or weak sections from the note quality checklist."
        })
      });
      const payload = (await response.json()) as { markdown?: string; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "AI request failed.");
      setSuggestion(payload.markdown ?? "");
    } catch (error) {
      setSuggestion(error instanceof Error ? error.message : "Could not generate suggestions.");
    } finally {
      setBusy(false);
    }
  }

  if (!source) return null;

  return (
    <details className="group rounded-lg border border-[#c3c6d0] bg-[#f9f9f9]" open={defaultOpen}>
      <summary className="flex cursor-pointer list-none items-start justify-between gap-4 p-5">
        <div>
          <h2 className="text-lg font-semibold text-[#1a1c1c]">Note Quality</h2>
          <p className="mt-1 text-sm text-[#43474f]">
            Type-specific checklist · {quality?.completionPercent ?? 0}% complete · {quality?.requiredCompleted ?? 0}/{quality?.requiredTotal ?? 0} required.
          </p>
        </div>
        <ChevronDown className="mt-1 h-4 w-4 text-[#0e3b69] transition-transform group-open:rotate-180" aria-hidden="true" />
      </summary>
      <div className="grid gap-3 border-t border-[#d5d7de] px-5 pb-5 pt-4">
        <Button type="button" size="sm" variant="secondary" onClick={() => void improve()} loading={busy} loadingLabel="Thinking...">
          <Wand2 className="h-4 w-4" aria-hidden="true" />
          Improve
        </Button>
        <div className="grid gap-2">
          {quality?.criteria.map((check) => (
            <div key={check.id} className="flex items-start gap-2 text-sm text-[#43474f]">
              {check.completed ? (
                <CheckCircle2 className="h-4 w-4 text-[#1d5a35]" aria-hidden="true" />
              ) : (
                <Circle className="h-4 w-4 text-[#8f1d15]" aria-hidden="true" />
              )}
              <span>
                <span className="font-medium text-[#1a1c1c]">{check.label}</span>
                <span className="ml-2 rounded border border-[#d5d7de] px-1.5 py-0.5 text-[11px] uppercase tracking-[0.08em]">
                  {check.importance}
                </span>
                <span className="block text-xs leading-5 text-[#5d6470]">{check.source}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
      {suggestion ? (
        <div className="mx-5 mb-5 rounded border border-[#d5d7de] bg-white p-4">
          <MarkdownPreview markdown={suggestion} />
          {onAppendMarkdown ? (
            <Button type="button" className="mt-4" variant="secondary" onClick={() => onAppendMarkdown(suggestion)}>
              Append suggestion
            </Button>
          ) : null}
        </div>
      ) : null}
    </details>
  );
}
