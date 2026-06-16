"use client";

import { Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { MarkdownPreview } from "@/components/editor/MarkdownPreview";
import { TopicSelector } from "@/components/notes/TopicSelector";
import { Button } from "@/components/ui/Button";
import { Field, inputClassName } from "@/components/ui/Field";
import { buildNoteTemplate, getNoteFormat } from "@/lib/constants/note-formats";
import { NOTE_TYPES, SUGGESTION_TYPES } from "@/lib/constants/notes";
import type { Note, SuggestionType } from "@/lib/types";
import { validateDiagramFile } from "@/lib/utils/files";

interface SuggestionFormProps {
  targetNote?: Note | null;
  defaultType?: SuggestionType;
}

export function SuggestionForm({ targetNote = null, defaultType = "new_note" }: SuggestionFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState(targetNote ? `Suggestion for ${targetNote.title}` : "");
  const [suggestionType, setSuggestionType] = useState<SuggestionType>(defaultType);
  const [topic, setTopic] = useState(targetNote?.topic ?? "Number Theory");
  const [noteType, setNoteType] = useState(targetNote?.note_type ?? "Technique");
  const [difficulty, setDifficulty] = useState<number | null>(targetNote?.difficulty ?? 3);
  const [tagsText, setTagsText] = useState(targetNote?.tags.join(", ") ?? "");
  const [body, setBody] = useState(
    targetNote ? targetNote.body_markdown : buildNoteTemplate("Technique", "Proposed Note")
  );
  const [bodyUsesTemplate, setBodyUsesTemplate] = useState(!targetNote);
  const [reason, setReason] = useState("");
  const [sourceReference, setSourceReference] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const tags = useMemo(
    () => tagsText.split(",").map((tag) => tag.trim()).filter(Boolean),
    [tagsText]
  );
  const format = useMemo(() => getNoteFormat(noteType), [noteType]);

  function handleTitleChange(value: string) {
    setTitle(value);
    if (bodyUsesTemplate && !targetNote) {
      setBody(buildNoteTemplate(noteType, value || "Proposed Note"));
    }
  }

  function handleNoteTypeChange(value: string) {
    const nextFormat = getNoteFormat(value);
    setNoteType(value);
    setDifficulty(nextFormat.usesDifficulty ? difficulty ?? nextFormat.defaultDifficulty ?? 3 : null);
    if (!targetNote) setTopic(nextFormat.defaultTopic);
    if (bodyUsesTemplate && !targetNote) {
      setBody(buildNoteTemplate(value, title || "Proposed Note"));
    }
  }

  async function submit() {
    setBusy(true);
    setError(null);

    try {
      if (!title.trim()) throw new Error("Suggestion title is required.");
      if (!body.trim()) throw new Error("Suggestion body is required.");
      if (file) {
        const validation = validateDiagramFile(file);
        if (validation) throw new Error(validation);
      }

      const formData = new FormData();
      formData.set("target_note_id", targetNote?.id ?? "");
      formData.set("title", title.trim());
      formData.set("suggestion_type", suggestionType);
      formData.set("topic", topic);
      formData.set("note_type", noteType);
      formData.set("difficulty", format.usesDifficulty && difficulty ? String(difficulty) : "");
      formData.set("tags", JSON.stringify(tags));
      formData.set("body_markdown", body.trim());
      formData.set("reason", reason.trim());
      formData.set("source_reference", sourceReference.trim());
      if (file) formData.set("diagram", file);

      const response = await fetch("/api/contributions", {
        method: "POST",
        body: formData
      });
      const result = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) throw new Error(result?.error ?? "Could not submit suggestion.");

      router.push("/contribution-status");
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not submit suggestion.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <section className="rounded-lg border border-[#c3c6d0] bg-white p-5">
        <div className="grid gap-5">
          <Field label="Suggestion title">
            <input className={inputClassName()} value={title} onChange={(event) => handleTitleChange(event.target.value)} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Suggestion type">
              <select className={inputClassName()} value={suggestionType} onChange={(event) => setSuggestionType(event.target.value as SuggestionType)}>
                {SUGGESTION_TYPES.map((item) => (
                  <option key={item} value={item}>
                    {item.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Topic">
              <TopicSelector value={topic} onChange={setTopic} />
            </Field>
            <Field label="Note type">
              <select className={inputClassName()} value={noteType} onChange={(event) => handleNoteTypeChange(event.target.value)}>
                {NOTE_TYPES.filter((item) => item !== "Inbox").map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </Field>
            {format.usesDifficulty ? (
              <Field label="Difficulty">
                <input
                  className={inputClassName()}
                  type="number"
                  min={1}
                  max={12}
                  value={difficulty ?? ""}
                  onChange={(event) => setDifficulty(event.target.value ? Number(event.target.value) : null)}
                />
              </Field>
            ) : (
              <div className="rounded border border-[#d5d7de] bg-[#f9f9f9] px-3 py-2 text-sm leading-6 text-[#43474f]">
                Difficulty is not used for {format.label.toLowerCase()} notes.
              </div>
            )}
          </div>
          <Field label="Tags">
            <input className={inputClassName()} value={tagsText} onChange={(event) => setTagsText(event.target.value)} />
          </Field>
          <Field label="Suggested Markdown / LaTeX">
            <textarea
              className={inputClassName("min-h-[360px] font-mono text-sm leading-7")}
              value={body}
              onChange={(event) => {
                setBodyUsesTemplate(false);
                setBody(event.target.value);
              }}
            />
          </Field>
          <Field label="Reason for suggestion">
            <textarea className={inputClassName("min-h-24")} value={reason} onChange={(event) => setReason(event.target.value)} />
          </Field>
          <Field label="Source or reference">
            <input className={inputClassName()} value={sourceReference} onChange={(event) => setSourceReference(event.target.value)} placeholder="Optional" />
          </Field>
          <label className="rounded-lg border border-dashed border-[#c3c6d0] bg-[#f9f9f9] p-4 text-sm text-[#43474f]">
            <span className="flex items-center gap-2 font-medium text-[#1a1c1c]">
              <Upload className="h-4 w-4 text-[#0e3b69]" aria-hidden="true" />
              Optional diagram
            </span>
            <input
              className="mt-3 block w-full text-sm"
              type="file"
              accept=".png,.jpg,.jpeg,image/png,image/jpeg"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
          </label>
          {error ? <p className="rounded border border-[#ffb4ab] bg-[#ffdad6] p-3 text-sm text-[#8f1d15]">{error}</p> : null}
          <Button type="button" onClick={() => void submit()} loading={busy} loadingLabel="Submitting...">
            Submit for Review
          </Button>
        </div>
      </section>

      <section className="rounded-lg border border-[#c3c6d0] bg-white p-5">
        <h2 className="border-b border-[#c3c6d0] pb-3 text-lg font-semibold">Preview</h2>
        <div className="mt-5">
          <MarkdownPreview markdown={body} />
        </div>
      </section>
    </div>
  );
}
