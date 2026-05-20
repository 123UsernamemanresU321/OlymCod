"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Download, Save } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, inputClassName } from "@/components/ui/Field";
import { Badge, DifficultyBadge } from "@/components/ui/Badge";
import { LearningMetadataList } from "@/components/notes/LearningMetadataList";
import { TopicSelector } from "@/components/notes/TopicSelector";
import { buildRevisionPack, type RevisionPackOptions } from "@/lib/revision/buildRevisionPack";
import { DEFAULT_NOTEBOOK_CONFIG } from "@/lib/notebook/defaultNotebookConfig";
import { createClient } from "@/lib/supabase/client";
import type { MistakeLog, Note, NoteReview, ProblemLog } from "@/lib/types";

interface RevisionPackClientProps {
  notes: Note[];
  reviews: NoteReview[];
  problems: ProblemLog[];
  mistakes: MistakeLog[];
}

const defaultOptions: RevisionPackOptions = {
  timing: "tomorrow",
  focusTopics: [],
  style: "balanced",
  includeWeakNotes: true,
  includeNeedsPractice: true,
  includeFailedProblems: true,
  includeMistakePatterns: true,
  includeFalseUses: true,
  includeRecognitionTriggers: true,
  includeFormulae: true,
  includeGeometryDiagrams: true,
  includeRecentNotes: true,
  includeHighDifficulty: false,
  includeRandomOldNotes: false
};

function download(filename: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function RevisionPackClient({ notes, reviews, problems, mistakes }: RevisionPackClientProps) {
  const [options, setOptions] = useState<RevisionPackOptions>(defaultOptions);
  const [topicDraft, setTopicDraft] = useState("Number Theory");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const pack = useMemo(
    () => buildRevisionPack({ notes, reviews, problems, mistakes, options }),
    [mistakes, notes, options, problems, reviews]
  );

  const notebookConfig = {
    ...DEFAULT_NOTEBOOK_CONFIG,
    selectionMode: "whitelist" as const,
    noteIds: pack.selectedNotes.map(({ note }) => note.id),
    contentSources: { ...DEFAULT_NOTEBOOK_CONFIG.contentSources, problemLogs: true },
    detailLevel:
      options.style === "ultra_compact"
        ? "Compact Revision Mode"
        : options.style === "full_review"
          ? "Full Detail Mode"
          : "Standard Notebook Mode",
    sectionToggles: {
      ...DEFAULT_NOTEBOOK_CONFIG.sectionToggles,
      showFalseUses: options.includeFalseUses,
      showRecognitionTriggers: options.includeRecognitionTriggers,
      showDiagrams: options.includeGeometryDiagrams,
      showProofs: options.style === "full_review"
    },
    coverTitle: "Contest Revision Pack",
    coverSummary: "Generated from weak notes, failed problems, recognition triggers, and common false uses."
  };

  function update(update: Partial<RevisionPackOptions>) {
    setOptions((current) => ({ ...current, ...update }));
  }

  function addFocusTopic() {
    if (options.focusTopics.includes(topicDraft)) return;
    update({ focusTopics: [...options.focusTopics, topicDraft] });
  }

  async function savePreset() {
    setBusy(true);
    setMessage(null);
    try {
      const supabase = createClient();
      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (!user) throw new Error("You must be logged in.");
      const { error } = await supabase.from("notebook_presets").insert({
        user_id: user.id,
        name: `Contest Revision Pack ${new Date().toLocaleDateString()}`,
        description: "Generated from the revision pack builder.",
        config: notebookConfig
      });
      if (error) throw error;
      await supabase.from("revision_packs").insert({
        user_id: user.id,
        name: `Contest Revision Pack ${new Date().toLocaleDateString()}`,
        description: "Generated deterministic revision pack.",
        config: options,
        selected_note_ids: pack.selectedNotes.map(({ note }) => note.id),
        selected_problem_ids: pack.selectedProblems.map((problem) => problem.id)
      });
      setMessage("Saved as a Notebook preset and revision pack.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save preset.");
    } finally {
      setBusy(false);
    }
  }

  async function exportMarkdown() {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/export/notebook/markdown", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: notebookConfig })
      });
      const text = await response.text();
      if (!response.ok) throw new Error(text || "Export failed.");
      download("contest-revision-pack.md", text, "text/markdown");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not export Markdown.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 lg:px-10">
      <div>
        <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[#0e3b69]">Before contest</p>
        <h1 className="mt-2 text-3xl font-semibold text-[#1a1c1c]">Contest Revision Pack</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#43474f]">
          Generate a focused pack from weak notes, false uses, recognition triggers, and problem mistakes.
        </p>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <section className="grid content-start gap-4 rounded-lg border border-[#c3c6d0] bg-white p-5">
          <Field label="Contest timing">
            <select className={inputClassName()} value={options.timing} onChange={(event) => update({ timing: event.target.value as RevisionPackOptions["timing"] })}>
              <option value="tomorrow">Contest tomorrow</option>
              <option value="3days">In 3 days</option>
              <option value="1week">In 1 week</option>
              <option value="custom">Custom date</option>
            </select>
          </Field>
          <Field label="Pack style">
            <select className={inputClassName()} value={options.style} onChange={(event) => update({ style: event.target.value as RevisionPackOptions["style"] })}>
              <option value="ultra_compact">Ultra compact</option>
              <option value="balanced">Balanced</option>
              <option value="full_review">Full review</option>
            </select>
          </Field>
          <Field label="Focus topics">
            <div className="grid gap-2">
              <TopicSelector value={topicDraft} onChange={setTopicDraft} />
              <Button type="button" variant="secondary" onClick={addFocusTopic}>Add topic</Button>
              <div className="flex flex-wrap gap-2">
                {options.focusTopics.map((topic) => (
                  <button key={topic} type="button" onClick={() => update({ focusTopics: options.focusTopics.filter((item) => item !== topic) })}>
                    <Badge>{topic} x</Badge>
                  </button>
                ))}
              </div>
            </div>
          </Field>
          {[
            ["includeWeakNotes", "Weak notes"],
            ["includeNeedsPractice", "Needs practice"],
            ["includeFailedProblems", "Failed/review-later problems"],
            ["includeFalseUses", "Common false uses"],
            ["includeRecognitionTriggers", "Recognition triggers"],
            ["includeFormulae", "Formulae"],
            ["includeGeometryDiagrams", "Geometry diagrams"],
            ["includeHighDifficulty", "High concept-level notes"]
          ].map(([key, label]) => (
            <label key={key} className="flex items-center gap-3 text-sm text-[#43474f]">
              <input
                type="checkbox"
                checked={Boolean(options[key as keyof RevisionPackOptions])}
                onChange={(event) => update({ [key]: event.target.checked } as Partial<RevisionPackOptions>)}
              />
              {label}
            </label>
          ))}
        </section>

        <section className="grid gap-5">
          <div className="rounded-lg border border-[#c3c6d0] bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-[#1a1c1c]">Generated Pack</h2>
                <p className="mt-1 text-sm text-[#43474f]">{pack.selectedNotes.length} notes · {pack.selectedProblems.length} problem reminders</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="secondary" onClick={exportMarkdown} disabled={busy}>
                  <Download className="h-4 w-4" aria-hidden="true" />
                  Export Markdown
                </Button>
                <Button type="button" onClick={savePreset} disabled={busy}>
                  <Save className="h-4 w-4" aria-hidden="true" />
                  Save as Notebook Preset
                </Button>
              </div>
            </div>
            {message ? <p className="mt-3 text-sm text-[#0e3b69]">{message}</p> : null}
          </div>

          <div className="rounded-lg border border-[#c3c6d0] bg-white p-5">
            <h2 className="text-lg font-semibold text-[#1a1c1c]">Suggested review order</h2>
            <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm leading-6 text-[#43474f]">
              {pack.suggestedReviewOrder.map((item) => <li key={item}>{item}</li>)}
            </ol>
          </div>

          <div className="grid gap-3">
            {pack.selectedNotes.map(({ note, score, reasons }) => (
              <Link key={note.id} href={`/app/notes/${note.id}`} className="rounded-lg border border-[#d5d7de] bg-white p-4 hover:bg-[#f9f9f9]">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-[#1a1c1c]">{note.title}</h3>
                    <p className="mt-1 text-sm text-[#43474f]">{note.topic} · {note.note_type}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge tone="blue">Score {score}</Badge>
                    <DifficultyBadge value={note.difficulty} noteType={note.note_type} />
                  </div>
                </div>
                <p className="mt-2 text-xs text-[#43474f]">{reasons.join(" · ")}</p>
                <div className="mt-3 grid gap-2">
                  {options.includeRecognitionTriggers ? (
                    <LearningMetadataList title="Recognition Triggers" items={note.recognition_triggers ?? []} compact />
                  ) : null}
                  {options.includeFalseUses ? (
                    <LearningMetadataList title="Common False Uses" items={note.false_uses ?? []} tone="red" compact />
                  ) : null}
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
