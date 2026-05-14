"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Circle, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { MarkdownPreview } from "@/components/editor/MarkdownPreview";
import type { Note, NoteDraft } from "@/lib/types";

interface NoteQualityPanelProps {
  note?: Note | null;
  draft?: NoteDraft | null;
  onAppendMarkdown?: (markdown: string) => void;
}

function hasSection(body: string, names: string[]) {
  const normalized = body.toLowerCase();
  return names.some((name) => normalized.includes(`## ${name.toLowerCase()}`));
}

export function NoteQualityPanel({ note = null, draft = null, onAppendMarkdown }: NoteQualityPanelProps) {
  const [suggestion, setSuggestion] = useState("");
  const [busy, setBusy] = useState(false);
  const source = draft ?? note;
  const checks = useMemo(() => {
    const body = source?.body_markdown ?? "";
    return [
      { label: "Statement/Core idea", ok: hasSection(body, ["Statement", "Core idea", "Formula", "Claim"]) },
      { label: "When to use it", ok: hasSection(body, ["When to use it", "Trigger", "Signs this technique may work"]) },
      { label: "Intuition", ok: hasSection(body, ["Intuition", "Why it works", "Why it helps"]) },
      { label: "Example", ok: hasSection(body, ["Example", "Mini example", "Worked example", "Quick example"]) },
      { label: "Common mistakes", ok: hasSection(body, ["Common mistakes", "Mistakes to avoid", "Common diagram traps"]) },
      { label: "Related techniques", ok: hasSection(body, ["Related techniques", "Related formulae", "Related results"]) },
      { label: "Problems where this appears", ok: hasSection(body, ["Problems where this appears", "Related problems"]) },
      { label: "Tags", ok: Boolean(source?.tags?.length) },
      { label: "Difficulty", ok: source?.difficulty !== null || source?.note_type === "Formula" || source?.note_type === "Formula Log" }
    ];
  }, [source]);

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
    <section className="rounded-lg border border-[#c3c6d0] bg-[#f9f9f9] p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-[#1a1c1c]">Note Quality</h2>
          <p className="mt-1 text-sm text-[#43474f]">A small checklist to avoid shallow formula dumps.</p>
        </div>
        <Button type="button" variant="secondary" onClick={() => void improve()} disabled={busy}>
          <Wand2 className="h-4 w-4" aria-hidden="true" />
          {busy ? "Thinking..." : "Improve"}
        </Button>
      </div>
      <div className="mt-4 grid gap-2">
        {checks.map((check) => (
          <div key={check.label} className="flex items-center gap-2 text-sm text-[#43474f]">
            {check.ok ? (
              <CheckCircle2 className="h-4 w-4 text-[#1d5a35]" aria-hidden="true" />
            ) : (
              <Circle className="h-4 w-4 text-[#8f1d15]" aria-hidden="true" />
            )}
            {check.label}
          </div>
        ))}
      </div>
      {suggestion ? (
        <div className="mt-4 rounded border border-[#d5d7de] bg-white p-4">
          <MarkdownPreview markdown={suggestion} />
          {onAppendMarkdown ? (
            <Button type="button" className="mt-4" variant="secondary" onClick={() => onAppendMarkdown(suggestion)}>
              Append suggestion
            </Button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
