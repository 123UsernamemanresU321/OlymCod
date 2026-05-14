"use client";

import { Sparkles } from "lucide-react";
import { useState } from "react";
import { MarkdownPreview } from "@/components/editor/MarkdownPreview";
import { Button } from "@/components/ui/Button";
import { Field, inputClassName } from "@/components/ui/Field";
import type { NoteDraft } from "@/lib/types";

type AssistMode =
  | "starter_draft"
  | "fill_missing_sections"
  | "improve_current_section"
  | "analyze_mistake"
  | "past_problem_scaffold"
  | "suggest_metadata"
  | "ask_my_codex"
  | "clean_rough_capture"
  | "suggest_related_notes"
  | "generate_recall_questions"
  | "find_common_mistakes"
  | "turn_problem_into_technique";

interface AIWritingAssistantProps {
  draft: NoteDraft;
  noteId: string | null;
  getSelectedText: () => string;
  onInsertMarkdown: (markdown: string) => void;
  onAppendMarkdown: (markdown: string) => void;
  onReplaceMarkdown: (markdown: string) => void;
  onApplyMetadata: (metadata: { description?: string | null; tags?: string[] }) => void;
}

type AIResult = {
  markdown: string;
  description: string | null;
  tags: string[];
  model?: string;
};

const assistModes: Array<{ value: AssistMode; label: string; hint: string }> = [
  {
    value: "starter_draft",
    label: "Starter draft",
    hint: "Create a structured first version from the title and metadata."
  },
  {
    value: "fill_missing_sections",
    label: "Fill missing sections",
    hint: "Replace placeholders and empty sections while preserving what is already useful."
  },
  {
    value: "improve_current_section",
    label: "Improve current section",
    hint: "Use selected text when available, otherwise improve the most relevant section."
  },
  {
    value: "analyze_mistake",
    label: "Analyze mistake",
    hint: "Turn a mistake or misconception into warning signs, correction, and repair."
  },
  {
    value: "past_problem_scaffold",
    label: "Past problem scaffold",
    hint: "Build a contest-problem writeup structure with solution and takeaway sections."
  },
  {
    value: "suggest_metadata",
    label: "Suggest description/tags",
    hint: "Generate a concise description and searchable tags."
  },
  {
    value: "ask_my_codex",
    label: "Ask My Codex",
    hint: "Answer using your existing notes as context and cite note titles used."
  },
  {
    value: "clean_rough_capture",
    label: "Clean rough capture",
    hint: "Turn messy inbox text into a structured note draft."
  },
  {
    value: "suggest_related_notes",
    label: "Suggest related notes",
    hint: "Find prerequisites, confused pairs, and used-together techniques."
  },
  {
    value: "generate_recall_questions",
    label: "Generate recall questions",
    hint: "Create questions that test whether you understand this note."
  },
  {
    value: "find_common_mistakes",
    label: "Find common mistakes",
    hint: "List missing conditions, traps, and likely proof mistakes."
  },
  {
    value: "turn_problem_into_technique",
    label: "Turn problem into technique",
    hint: "Extract a reusable technique, linked notes, and possible mistake entry."
  }
];

const modePlaceholders: Record<AssistMode, string> = {
  starter_draft: "Example: Build a note around Euler's theorem and modular exponent reduction.",
  fill_missing_sections: "Example: Fill in the intuition and mini example. Keep my statement unchanged.",
  improve_current_section: "Example: Make the selected proof sketch clearer and more olympiad-style.",
  analyze_mistake: "Example: I kept cancelling terms modulo n even when they were not coprime.",
  past_problem_scaffold: "Paste the problem statement, source, and anything you tried.",
  suggest_metadata: "Example: Make the description short and choose tags useful for search.",
  ask_my_codex: "Example: Which notes help with modular exponent cycles?",
  clean_rough_capture: "Paste a rough capture and ask for the best note format.",
  suggest_related_notes: "Example: Find prerequisites and commonly confused notes.",
  generate_recall_questions: "Example: Test the key conditions and common mistakes.",
  find_common_mistakes: "Example: What traps appear when applying this theorem?",
  turn_problem_into_technique: "Paste a problem and your attempted solution."
};

export function AIWritingAssistant({
  draft,
  noteId,
  getSelectedText,
  onInsertMarkdown,
  onAppendMarkdown,
  onReplaceMarkdown,
  onApplyMetadata
}: AIWritingAssistantProps) {
  const [mode, setMode] = useState<AssistMode>("starter_draft");
  const [instruction, setInstruction] = useState("");
  const [result, setResult] = useState<AIResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasMarkdown = Boolean(result?.markdown.trim());
  const hasMetadata = Boolean(result?.description || result?.tags.length);

  async function generate() {
    setBusy(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/ai/note-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          instruction,
          selectedText: getSelectedText(),
          note: {
            id: noteId,
            title: draft.title,
            topic: draft.topic,
            note_type: draft.note_type,
            difficulty: draft.difficulty,
            description: draft.description,
            tags: draft.tags,
            body_markdown: draft.body_markdown
          }
        })
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error ?? "AI generation failed.");
      }

      setResult({
        markdown: payload.markdown ?? "",
        description: payload.description ?? null,
        tags: Array.isArray(payload.tags) ? payload.tags : [],
        model: payload.model
      });
    } catch (generateError) {
      setError(generateError instanceof Error ? generateError.message : "AI generation failed.");
    } finally {
      setBusy(false);
    }
  }

  function replaceBody() {
    if (!result?.markdown) return;
    if (window.confirm("Replace the current Markdown body with the AI draft?")) {
      onReplaceMarkdown(result.markdown);
    }
  }

  return (
    <section className="mt-6 rounded-lg border border-[#c3c6d0] bg-white p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-[#1a1c1c]">
            <Sparkles className="h-4 w-4 text-[#0e3b69]" aria-hidden="true" />
            AI Writing Assistant
          </h2>
          <p className="mt-1 text-sm leading-6 text-[#43474f]">
            Generate draft content or metadata with DeepSeek. Output stays in preview until you apply it.
          </p>
        </div>
        {result?.model ? (
          <span className="rounded border border-[#d5d7de] bg-[#f9f9f9] px-2 py-1 text-xs text-[#43474f]">
            {result.model}
          </span>
        ) : null}
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
        <Field label="AI mode">
          <select
            className={inputClassName()}
            value={mode}
            onChange={(event) => setMode(event.target.value as AssistMode)}
          >
            {assistModes.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="What should the AI help with?">
          <textarea
            className={inputClassName("min-h-28")}
            value={instruction}
            onChange={(event) => setInstruction(event.target.value)}
            placeholder={modePlaceholders[mode]}
          />
        </Field>
      </div>

      <p className="mt-3 text-sm leading-6 text-[#43474f]">
        {assistModes.find((item) => item.value === mode)?.hint} Select text in the editor first to focus the request on one section.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" onClick={() => void generate()} disabled={busy}>
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          {busy ? "Generating..." : "Generate"}
        </Button>
        <Button type="button" variant="secondary" onClick={() => setResult(null)} disabled={busy || !result}>
          Clear output
        </Button>
      </div>

      {error ? (
        <p className="mt-4 rounded border border-[#ffb4ab] bg-[#ffdad6] p-3 text-sm text-[#8f1d15]">
          {error}
        </p>
      ) : null}

      {result ? (
        <div className="mt-5 grid gap-4">
          {hasMetadata ? (
            <div className="rounded border border-[#c3c6d0] bg-[#f9f9f9] p-4">
              <p className="text-sm font-semibold text-[#1a1c1c]">Suggested metadata</p>
              {result.description ? (
                <p className="mt-2 text-sm leading-6 text-[#43474f]">{result.description}</p>
              ) : null}
              {result.tags.length ? (
                <p className="mt-2 text-sm text-[#43474f]">Tags: {result.tags.join(", ")}</p>
              ) : null}
            </div>
          ) : null}

          {hasMarkdown ? (
            <div className="rounded border border-[#c3c6d0] bg-[#f9f9f9] p-4">
              <p className="text-sm font-semibold text-[#1a1c1c]">AI Markdown Preview</p>
              <div className="mt-4 rounded border border-[#d5d7de] bg-white p-4">
                <MarkdownPreview markdown={result.markdown} />
              </div>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => result.markdown && onInsertMarkdown(result.markdown)}
              disabled={!hasMarkdown}
            >
              Insert at cursor
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => result.markdown && onAppendMarkdown(result.markdown)}
              disabled={!hasMarkdown}
            >
              Append
            </Button>
            <Button type="button" variant="secondary" onClick={replaceBody} disabled={!hasMarkdown}>
              Replace body
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() =>
                result && onApplyMetadata({ description: result.description, tags: result.tags })
              }
              disabled={!hasMetadata}
            >
              Apply metadata
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
