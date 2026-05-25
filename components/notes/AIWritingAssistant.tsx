"use client";

import { Brain } from "lucide-react";
import { useState } from "react";
import { MarkdownPreview } from "@/components/editor/MarkdownPreview";
import { LearningMetadataList } from "@/components/notes/LearningMetadataList";
import { Button } from "@/components/ui/Button";
import { Field, inputClassName } from "@/components/ui/Field";
import { noteTypeLearningFields } from "@/lib/constants/note-formats";
import type { NoteDraft } from "@/lib/types";

type AssistMode =
  | "starter_draft"
  | "fill_missing_sections"
  | "improve_current_section"
  | "analyze_mistake"
  | "past_problem_scaffold"
  | "suggest_metadata"
  | "suggest_recognition_triggers"
  | "suggest_false_uses"
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
  onApplyMetadata: (metadata: {
    description?: string | null;
    tags?: string[];
    recognition_triggers?: string[];
    false_uses?: string[];
  }) => void;
}

type AIResult = {
  markdown: string;
  description: string | null;
  tags: string[];
  recognition_triggers: string[];
  false_uses: string[];
  link_suggestions: Array<{
    targetNoteId: string;
    targetTitle: string;
    relationType: string;
    reason: string;
    confidence: number;
  }>;
  possible_new_notes: Array<{ title: string; reason?: string }>;
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
    value: "suggest_recognition_triggers",
    label: "Suggest Recognition Triggers",
    hint: "Draft phrases that tell you when this theorem or technique should come to mind."
  },
  {
    value: "suggest_false_uses",
    label: "Suggest False Uses",
    hint: "Draft conditions, traps, and situations where this note should not be used."
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
  suggest_recognition_triggers: "Example: Suggest short search phrases for recognizing this in a contest problem.",
  suggest_false_uses: "Example: List common conditions where this theorem fails or is misapplied.",
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
  const learningFields = noteTypeLearningFields(draft.note_type);
  const availableAssistModes = assistModes.filter((item) => {
    if (item.value === "suggest_recognition_triggers") return learningFields.recognitionTriggers;
    if (item.value === "suggest_false_uses") return learningFields.falseUses;
    return true;
  });
  const effectiveMode = availableAssistModes.some((item) => item.value === mode) ? mode : "starter_draft";

  const hasMarkdown = Boolean(result?.markdown.trim());
  const hasMetadata = Boolean(
    result?.description ||
      result?.tags.length ||
      (learningFields.recognitionTriggers && result?.recognition_triggers.length) ||
      (learningFields.falseUses && result?.false_uses.length)
  );

  async function generate() {
    setBusy(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/ai/note-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: effectiveMode,
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
            body_markdown: draft.body_markdown,
            recognition_triggers: draft.recognition_triggers,
            false_uses: draft.false_uses
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
        recognition_triggers: Array.isArray(payload.recognition_triggers) ? payload.recognition_triggers : [],
        false_uses: Array.isArray(payload.false_uses) ? payload.false_uses : [],
        link_suggestions: Array.isArray(payload.link_suggestions) ? payload.link_suggestions : [],
        possible_new_notes: Array.isArray(payload.possible_new_notes) ? payload.possible_new_notes : [],
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
            <Brain className="h-4 w-4 text-[#0e3b69]" aria-hidden="true" />
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
            value={effectiveMode}
            onChange={(event) => setMode(event.target.value as AssistMode)}
          >
            {availableAssistModes.map((item) => (
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
            placeholder={modePlaceholders[effectiveMode]}
          />
        </Field>
      </div>

      <p className="mt-3 text-sm leading-6 text-[#43474f]">
        {assistModes.find((item) => item.value === effectiveMode)?.hint} Select text in the editor first to focus the request on one section.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" onClick={() => void generate()} loading={busy} loadingLabel="Generating...">
          <Brain className="h-4 w-4" aria-hidden="true" />
          Generate
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
              {learningFields.recognitionTriggers || learningFields.falseUses ? (
                <div className="mt-3 grid gap-3">
                  {learningFields.recognitionTriggers ? (
                    <LearningMetadataList
                      title="Recognition triggers"
                      items={result.recognition_triggers}
                      compact
                    />
                  ) : null}
                  {learningFields.falseUses ? (
                    <LearningMetadataList title="False uses" items={result.false_uses} tone="red" compact />
                  ) : null}
                </div>
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

          {result.link_suggestions.length || result.possible_new_notes.length ? (
            <div className="rounded border border-[#c3c6d0] bg-[#f9f9f9] p-4">
              <p className="text-sm font-semibold text-[#1a1c1c]">Structured link suggestions</p>
              <p className="mt-1 text-sm leading-6 text-[#43474f]">
                Related-note AI returns link candidates only. Add them from the Linked Notes panel so the relationship stays directional.
              </p>
              {result.link_suggestions.length ? (
                <div className="mt-3 grid gap-2">
                  {result.link_suggestions.map((suggestion) => (
                    <article key={`${suggestion.targetNoteId}-${suggestion.relationType}`} className="rounded border border-[#d5d7de] bg-white p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-[#1a1c1c]">{suggestion.targetTitle}</span>
                        <span className="rounded border border-[#d5d7de] px-2 py-0.5 text-[11px] uppercase tracking-[0.08em] text-[#43474f]">
                          {suggestion.relationType}
                        </span>
                        <span className="text-xs text-[#646974]">
                          {Math.round(suggestion.confidence * 100)}% confidence
                        </span>
                      </div>
                      <p className="mt-1 text-sm leading-6 text-[#43474f]">{suggestion.reason}</p>
                    </article>
                  ))}
                </div>
              ) : null}
              {result.possible_new_notes.length ? (
                <div className="mt-3 rounded border border-dashed border-[#c3c6d0] bg-white p-3 text-sm text-[#43474f]">
                  <p className="font-medium text-[#1a1c1c]">Possible new notes</p>
                  <ul className="mt-2 list-disc space-y-1 pl-5">
                    {result.possible_new_notes.map((item) => (
                      <li key={item.title}>
                        {item.title}
                        {item.reason ? ` - ${item.reason}` : ""}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
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
                result &&
                onApplyMetadata({
                  description: result.description,
                  tags: result.tags,
                  recognition_triggers: learningFields.recognitionTriggers ? result.recognition_triggers : [],
                  false_uses: learningFields.falseUses ? result.false_uses : []
                })
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
