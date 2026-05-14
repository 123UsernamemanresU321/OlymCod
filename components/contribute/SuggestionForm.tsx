"use client";

import { Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { MarkdownPreview } from "@/components/editor/MarkdownPreview";
import { Button } from "@/components/ui/Button";
import { Field, inputClassName } from "@/components/ui/Field";
import { NOTE_TYPES, SUGGESTION_TYPES, TOPICS } from "@/lib/constants/notes";
import { createClient } from "@/lib/supabase/client";
import type { Note, SuggestionType } from "@/lib/types";
import { safeFilename, validateDiagramFile } from "@/lib/utils/files";

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
  const [body, setBody] = useState(targetNote ? targetNote.body_markdown : "# Proposed Note\n\n## Statement\n\n");
  const [reason, setReason] = useState("");
  const [sourceReference, setSourceReference] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const tags = useMemo(
    () => tagsText.split(",").map((tag) => tag.trim()).filter(Boolean),
    [tagsText]
  );

  async function submit() {
    setBusy(true);
    setError(null);

    try {
      const supabase = createClient();
      const {
        data: { user },
        error: userError
      } = await supabase.auth.getUser();
      if (userError || !user) throw new Error(userError?.message ?? "You must be logged in.");
      if (!title.trim()) throw new Error("Suggestion title is required.");
      if (!body.trim()) throw new Error("Suggestion body is required.");
      if (file) {
        const validation = validateDiagramFile(file);
        if (validation) throw new Error(validation);
      }

      const { data, error: insertError } = await supabase
        .from("suggestions")
        .insert({
          contributor_id: user.id,
          target_note_id: targetNote?.id ?? null,
          title: title.trim(),
          suggestion_type: suggestionType,
          topic,
          note_type: noteType,
          difficulty,
          tags,
          body_markdown: body.trim(),
          reason: reason.trim() || null,
          source_reference: sourceReference.trim() || null,
          diagram_urls: [],
          status: "pending"
        })
        .select("id")
        .single();

      if (insertError) throw insertError;

      if (file && data?.id) {
        const storagePath = `${user.id}/${data.id}/${safeFilename(file.name)}`;
        const { error: uploadError } = await supabase.storage
          .from("suggestion-diagrams")
          .upload(storagePath, file, {
            cacheControl: "3600",
            upsert: false,
            contentType: file.type || undefined
          });
        if (uploadError) throw uploadError;

        const { error: updateError } = await supabase
          .from("suggestions")
          .update({ diagram_urls: [storagePath] })
          .eq("id", data.id)
          .eq("contributor_id", user.id);
        if (updateError) {
          await supabase.storage.from("suggestion-diagrams").remove([storagePath]);
          throw updateError;
        }
      }

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
            <input className={inputClassName()} value={title} onChange={(event) => setTitle(event.target.value)} />
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
              <select className={inputClassName()} value={topic} onChange={(event) => setTopic(event.target.value)}>
                {TOPICS.filter((item) => item !== "Inbox").map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </Field>
            <Field label="Note type">
              <select className={inputClassName()} value={noteType} onChange={(event) => setNoteType(event.target.value)}>
                {NOTE_TYPES.filter((item) => item !== "Inbox").map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </Field>
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
          </div>
          <Field label="Tags">
            <input className={inputClassName()} value={tagsText} onChange={(event) => setTagsText(event.target.value)} />
          </Field>
          <Field label="Suggested Markdown / LaTeX">
            <textarea className={inputClassName("min-h-[360px] font-mono text-sm leading-7")} value={body} onChange={(event) => setBody(event.target.value)} />
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
              accept=".svg,.png,.jpg,.jpeg,image/svg+xml,image/png,image/jpeg"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
          </label>
          {error ? <p className="rounded border border-[#ffb4ab] bg-[#ffdad6] p-3 text-sm text-[#8f1d15]">{error}</p> : null}
          <Button type="button" onClick={() => void submit()} disabled={busy}>
            {busy ? "Submitting..." : "Submit for Review"}
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
