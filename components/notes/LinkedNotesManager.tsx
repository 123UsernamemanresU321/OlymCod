"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Link2, Trash2, Wand2 } from "lucide-react";
import { InlineMarkdown } from "@/components/editor/InlineMarkdown";
import { Button } from "@/components/ui/Button";
import { inputClassName } from "@/components/ui/Field";
import { MarkdownPreview } from "@/components/editor/MarkdownPreview";
import { NOTE_LINK_RELATIONS, inverseNoteLinkRelation } from "@/lib/constants/daily";
import { createClient } from "@/lib/supabase/client";
import type { Note, NoteDraft, NoteLink } from "@/lib/types";

interface LinkedNotesManagerProps {
  noteId: string | null;
  draft: NoteDraft;
}

export function LinkedNotesManager({ noteId, draft }: LinkedNotesManagerProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [links, setLinks] = useState<NoteLink[]>([]);
  const [targetId, setTargetId] = useState("");
  const [relation, setRelation] = useState("related");
  const [suggestion, setSuggestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!noteId) return;
    let cancelled = false;
    async function load() {
      const supabase = createClient();
      const [notesResult, linksResult] = await Promise.all([
        supabase.from("notes").select("*").eq("is_archived", false).order("title", { ascending: true }),
        supabase.from("note_links").select("*").eq("source_note_id", noteId)
      ]);
      if (cancelled) return;
      setNotes((notesResult.data ?? []) as Note[]);
      setLinks((linksResult.data ?? []) as NoteLink[]);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [noteId]);

  const linkRows = useMemo(
    () =>
      links
        .map((link) => ({ link, note: notes.find((note) => note.id === link.target_note_id) }))
        .filter((row): row is { link: NoteLink; note: Note } => Boolean(row.note)),
    [links, notes]
  );

  async function addLink() {
    if (!noteId || !targetId) return;
    setBusy(true);
    setError(null);
    try {
      const supabase = createClient();
      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (!user) throw new Error("You must be logged in.");
      const { data, error } = await supabase
        .from("note_links")
        .insert({
          user_id: user.id,
          source_note_id: noteId,
          target_note_id: targetId,
          relation_type: relation
        })
        .select("*")
        .single();
      if (error) throw error;
      await supabase.from("note_links").upsert(
        {
          user_id: user.id,
          source_note_id: targetId,
          target_note_id: noteId,
          relation_type: inverseNoteLinkRelation(relation)
        },
        { onConflict: "user_id,source_note_id,target_note_id,relation_type" }
      );
      setLinks((current) => [...current, data as NoteLink]);
      setTargetId("");
    } catch (linkError) {
      setError(linkError instanceof Error ? linkError.message : "Could not add link.");
    } finally {
      setBusy(false);
    }
  }

  async function removeLink(linkId: string) {
    const link = links.find((item) => item.id === linkId);
    const supabase = createClient();
    await supabase.from("note_links").delete().eq("id", linkId);
    if (link) {
      await supabase
        .from("note_links")
        .delete()
        .match({
          user_id: link.user_id,
          source_note_id: link.target_note_id,
          target_note_id: link.source_note_id,
          relation_type: inverseNoteLinkRelation(link.relation_type)
        });
    }
    setLinks((current) => current.filter((link) => link.id !== linkId));
  }

  async function suggestRelated() {
    setBusy(true);
    setSuggestion("");
    setError(null);
    try {
      const response = await fetch("/api/ai/note-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "suggest_related_notes",
          note: draft,
          userInstruction:
            "Suggest relation candidates using only existing notes. Include relation type and short reason."
        })
      });
      const payload = (await response.json()) as { markdown?: string; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "AI request failed.");
      setSuggestion(payload.markdown ?? "");
    } catch (aiError) {
      setError(aiError instanceof Error ? aiError.message : "Could not suggest links.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-lg border border-[#c3c6d0] bg-[#f9f9f9] p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-[#1a1c1c]">Linked Notes</h3>
          <p className="mt-1 text-sm text-[#43474f]">Add prerequisites, confused pairs, and used-together links.</p>
        </div>
        <Button type="button" variant="secondary" onClick={() => void suggestRelated()} disabled={!noteId || busy}>
          <Wand2 className="h-4 w-4" aria-hidden="true" />
          Suggest related notes
        </Button>
      </div>

      {!noteId ? (
        <p className="mt-4 rounded border border-[#c3c6d0] bg-white p-3 text-sm text-[#43474f]">
          Save this note before adding links.
        </p>
      ) : null}

      <div className="mt-4 grid gap-2">
        {linkRows.length ? (
          linkRows.map(({ link, note }) => (
            <div key={link.id} className="flex items-center justify-between gap-3 rounded border border-[#d5d7de] bg-white p-3">
              <Link href={`/app/notes/${note.id}`} className="min-w-0 text-sm font-semibold text-[#0e3b69]">
                <InlineMarkdown text={note.title} />
                <span className="ml-2 font-normal text-[#43474f]">({link.relation_type})</span>
              </Link>
              <button type="button" onClick={() => void removeLink(link.id)} className="text-[#8f1d15]" aria-label="Remove note link">
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          ))
        ) : (
          <p className="text-sm text-[#43474f]">No explicit note links yet.</p>
        )}
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_0.8fr_auto]">
        <select className={inputClassName()} value={targetId} onChange={(event) => setTargetId(event.target.value)} disabled={!noteId}>
          <option value="">Choose a note</option>
          {notes
            .filter((note) => note.id !== noteId && !links.some((link) => link.target_note_id === note.id))
            .map((note) => (
              <option key={note.id} value={note.id}>
                {note.title}
              </option>
            ))}
        </select>
        <select className={inputClassName()} value={relation} onChange={(event) => setRelation(event.target.value)} disabled={!noteId}>
          {NOTE_LINK_RELATIONS.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        <Button type="button" onClick={() => void addLink()} disabled={!noteId || !targetId || busy}>
          <Link2 className="h-4 w-4" aria-hidden="true" />
          Add
        </Button>
      </div>
      {error ? <p className="mt-3 text-sm text-[#8f1d15]">{error}</p> : null}
      {suggestion ? (
        <div className="mt-4 rounded border border-[#d5d7de] bg-white p-4">
          <MarkdownPreview markdown={suggestion} />
        </div>
      ) : null}
    </section>
  );
}
