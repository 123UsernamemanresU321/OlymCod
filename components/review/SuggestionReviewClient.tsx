"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MarkdownPreview } from "@/components/editor/MarkdownPreview";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Field, inputClassName } from "@/components/ui/Field";
import { getNoteFormat } from "@/lib/constants/note-formats";
import { NOTE_TYPES, TOPICS } from "@/lib/constants/notes";
import { createClient } from "@/lib/supabase/client";
import type { Note, Profile, Suggestion, SuggestionStatus } from "@/lib/types";
import { titleToSlug } from "@/lib/utils/slug";

interface SuggestionReviewClientProps {
  suggestion: Suggestion;
  targetNote: Note | null;
  contributor: Profile | null;
  ownerId: string;
  diagrams: Array<{ path: string; signedUrl: string }>;
}

export function SuggestionReviewClient({
  suggestion,
  targetNote,
  contributor,
  ownerId,
  diagrams
}: SuggestionReviewClientProps) {
  const router = useRouter();
  const [body, setBody] = useState(targetNote?.body_markdown ?? suggestion.body_markdown);
  const [title, setTitle] = useState(suggestion.title);
  const [topic, setTopic] = useState(suggestion.topic ?? targetNote?.topic ?? "Number Theory");
  const [noteType, setNoteType] = useState(suggestion.note_type ?? targetNote?.note_type ?? "Technique");
  const [difficulty, setDifficulty] = useState<number | null>(suggestion.difficulty ?? targetNote?.difficulty ?? 3);
  const [tagsText, setTagsText] = useState((suggestion.tags.length ? suggestion.tags : targetNote?.tags ?? []).join(", "));
  const [visibility, setVisibility] = useState<"private" | "public">("private");
  const [ownerFeedback, setOwnerFeedback] = useState(suggestion.owner_feedback ?? "");
  const [internalNote, setInternalNote] = useState(suggestion.owner_internal_note ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const format = getNoteFormat(noteType);

  function handleNoteTypeChange(value: string) {
    const nextFormat = getNoteFormat(value);
    setNoteType(value);
    setDifficulty(nextFormat.usesDifficulty ? difficulty ?? nextFormat.defaultDifficulty ?? 3 : null);
    if (!targetNote) setTopic(nextFormat.defaultTopic);
  }

  async function writeAudit(action: string, targetType: string, targetId: string | null, metadata = {}) {
    const supabase = createClient();
    await supabase.from("audit_logs").insert({
      actor_id: ownerId,
      action,
      target_type: targetType,
      target_id: targetId,
      metadata
    });
  }

  async function setStatus(status: SuggestionStatus) {
    setBusy(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase
        .from("suggestions")
        .update({
          status,
          owner_feedback: ownerFeedback.trim() || null,
          owner_internal_note: internalNote.trim() || null,
          reviewed_by: ownerId,
          reviewed_at: new Date().toISOString()
        })
        .eq("id", suggestion.id);
      if (updateError) throw updateError;
      await writeAudit(`suggestion_${status}`, "suggestion", suggestion.id);
      router.refresh();
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : "Could not update suggestion.");
    } finally {
      setBusy(false);
    }
  }

  async function mergeIntoNote() {
    if (!targetNote) return;
    setBusy(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error: noteError } = await supabase
        .from("notes")
        .update({ body_markdown: body })
        .eq("id", targetNote.id);
      if (noteError) throw noteError;

      const { error: suggestionError } = await supabase
        .from("suggestions")
        .update({
          status: "merged",
          owner_feedback: ownerFeedback.trim() || null,
          owner_internal_note: internalNote.trim() || null,
          reviewed_by: ownerId,
          reviewed_at: new Date().toISOString(),
          merged_note_id: targetNote.id
        })
        .eq("id", suggestion.id);
      if (suggestionError) throw suggestionError;
      await writeAudit("suggestion_merged", "note", targetNote.id, { suggestion_id: suggestion.id });
      router.push(`/app/notes/${targetNote.id}`);
      router.refresh();
    } catch (mergeError) {
      setError(mergeError instanceof Error ? mergeError.message : "Could not merge suggestion.");
    } finally {
      setBusy(false);
    }
  }

  async function convertToNote() {
    setBusy(true);
    setError(null);
    try {
      const supabase = createClient();
      const slug = `${titleToSlug(title)}-${suggestion.id.slice(0, 8)}`;
      const { data, error: noteError } = await supabase
        .from("notes")
        .insert({
          user_id: ownerId,
          title: title.trim(),
          slug,
          topic,
          note_type: noteType,
          difficulty: format.usesDifficulty ? difficulty : null,
          description: suggestion.reason,
          tags: tagsText.split(",").map((tag) => tag.trim()).filter(Boolean),
          body_markdown: body.trim(),
          diagram_urls: suggestion.diagram_urls,
          visibility,
          is_favorite: false,
          is_archived: false,
          published_at: visibility === "public" ? new Date().toISOString() : null
        })
        .select("id")
        .single();
      if (noteError) throw noteError;

      const { error: suggestionError } = await supabase
        .from("suggestions")
        .update({
          status: "merged",
          owner_feedback: ownerFeedback.trim() || null,
          owner_internal_note: internalNote.trim() || null,
          reviewed_by: ownerId,
          reviewed_at: new Date().toISOString(),
          merged_note_id: data.id
        })
        .eq("id", suggestion.id);
      if (suggestionError) throw suggestionError;
      await writeAudit("suggestion_merged", "note", data.id, { suggestion_id: suggestion.id, converted: true });
      router.push(`/app/notes/${data.id}`);
      router.refresh();
    } catch (convertError) {
      setError(convertError instanceof Error ? convertError.message : "Could not convert suggestion.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteSuggestion() {
    if (!confirm("Delete this suggestion permanently?")) return;
    setBusy(true);
    try {
      const supabase = createClient();
      const { error: deleteError } = await supabase.from("suggestions").delete().eq("id", suggestion.id);
      if (deleteError) throw deleteError;
      await writeAudit("suggestion_deleted", "suggestion", suggestion.id);
      router.push("/app/review");
      router.refresh();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Could not delete suggestion.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 lg:px-10">
      <header className="flex flex-col gap-4 border-b border-[#c3c6d0] pb-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">{suggestion.title}</h1>
          <p className="mt-2 text-sm text-[#43474f]">
            Contributor: {contributor?.display_name || contributor?.email || "Unknown"}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge>{suggestion.status.replaceAll("_", " ")}</Badge>
            <Badge tone="blue">{suggestion.suggestion_type.replaceAll("_", " ")}</Badge>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" disabled={busy} onClick={() => void setStatus("approved")}>Approve</Button>
          <Button type="button" variant="secondary" disabled={busy} onClick={() => void setStatus("needs_changes")}>Needs changes</Button>
          <Button type="button" variant="danger" disabled={busy} onClick={() => void setStatus("rejected")}>Reject</Button>
          <Button type="button" variant="danger" disabled={busy} onClick={() => void setStatus("spam")}>Mark spam</Button>
        </div>
      </header>

      {error ? <p className="mt-5 rounded border border-[#ffb4ab] bg-[#ffdad6] p-3 text-sm text-[#8f1d15]">{error}</p> : null}

      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-[#c3c6d0] bg-white p-5">
          <h2 className="text-lg font-semibold">Original Suggestion</h2>
          <div className="mt-4">
            <MarkdownPreview markdown={suggestion.body_markdown} />
          </div>
          {suggestion.reason ? <p className="mt-5 rounded border border-[#c3c6d0] bg-[#f9f9f9] p-3 text-sm text-[#43474f]">Reason: {suggestion.reason}</p> : null}
          {suggestion.source_reference ? <p className="mt-3 text-sm text-[#43474f]">Source: {suggestion.source_reference}</p> : null}
          {diagrams.length ? (
            <div className="mt-5 grid gap-3">
              {diagrams.map((diagram) => (
                <figure key={diagram.path} className="rounded border border-[#c3c6d0] p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={diagram.signedUrl} alt="Suggested diagram" className="h-56 w-full object-contain" />
                  <figcaption className="mt-2 truncate text-xs text-[#43474f]">{diagram.path.split("/").pop()}</figcaption>
                </figure>
              ))}
            </div>
          ) : null}
        </div>

        <div className="rounded-lg border border-[#c3c6d0] bg-white p-5">
          <h2 className="text-lg font-semibold">{targetNote ? "Manual Merge Editor" : "Convert to Official Note"}</h2>
          {!targetNote ? (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Title">
                <input className={inputClassName()} value={title} onChange={(event) => setTitle(event.target.value)} />
              </Field>
              <Field label="Visibility">
                <select className={inputClassName()} value={visibility} onChange={(event) => setVisibility(event.target.value as "private" | "public")}>
                  <option value="private">Private</option>
                  <option value="public">Public</option>
                </select>
              </Field>
              <Field label="Topic">
                <select className={inputClassName()} value={topic} onChange={(event) => setTopic(event.target.value)}>
                  {TOPICS.filter((item) => item !== "Inbox").map((item) => <option key={item}>{item}</option>)}
                </select>
              </Field>
              <Field label="Note type">
                <select className={inputClassName()} value={noteType} onChange={(event) => handleNoteTypeChange(event.target.value)}>
                  {NOTE_TYPES.filter((item) => item !== "Inbox").map((item) => <option key={item}>{item}</option>)}
                </select>
              </Field>
              {format.usesDifficulty ? (
                <Field label="Difficulty">
                  <input className={inputClassName()} type="number" min={1} max={12} value={difficulty ?? ""} onChange={(event) => setDifficulty(event.target.value ? Number(event.target.value) : null)} />
                </Field>
              ) : (
                <div className="rounded border border-[#d5d7de] bg-[#f9f9f9] px-3 py-2 text-sm leading-6 text-[#43474f]">
                  Difficulty is not used for {format.label.toLowerCase()} notes.
                </div>
              )}
              <Field label="Tags">
                <input className={inputClassName()} value={tagsText} onChange={(event) => setTagsText(event.target.value)} />
              </Field>
            </div>
          ) : null}
          <textarea className={inputClassName("mt-4 min-h-[420px] font-mono text-sm leading-7")} value={body} onChange={(event) => setBody(event.target.value)} />
          <div className="mt-4 grid gap-4">
            <Field label="Feedback to contributor">
              <textarea className={inputClassName("min-h-20")} value={ownerFeedback} onChange={(event) => setOwnerFeedback(event.target.value)} />
            </Field>
            <Field label="Internal owner note">
              <textarea className={inputClassName("min-h-20")} value={internalNote} onChange={(event) => setInternalNote(event.target.value)} />
            </Field>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            {targetNote ? (
              <Button type="button" disabled={busy} onClick={() => void mergeIntoNote()}>Merge into note</Button>
            ) : (
              <Button type="button" disabled={busy} onClick={() => void convertToNote()}>Convert to official note</Button>
            )}
            <Button type="button" variant="danger" disabled={busy} onClick={() => void deleteSuggestion()}>Delete</Button>
          </div>
        </div>
      </section>

      {targetNote ? (
        <section className="mt-6 rounded-lg border border-[#c3c6d0] bg-white p-5">
          <h2 className="text-lg font-semibold">Current Official Note</h2>
          <div className="mt-4">
            <MarkdownPreview markdown={targetNote.body_markdown} />
          </div>
        </section>
      ) : null}
    </div>
  );
}
