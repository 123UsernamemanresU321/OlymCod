"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Link2, Trash2, Wand2 } from "lucide-react";
import { InlineMarkdown } from "@/components/editor/InlineMarkdown";
import { Button } from "@/components/ui/Button";
import { inputClassName } from "@/components/ui/Field";
import { NOTE_LINK_RELATIONS } from "@/lib/constants/daily";
import { createClient } from "@/lib/supabase/client";
import type { Note, NoteDraft, NoteLink } from "@/lib/types";

interface LinkedNotesManagerProps {
  noteId: string | null;
  draft: NoteDraft;
}

type LinkSuggestion = {
  targetNoteId: string;
  targetTitle: string;
  relationType: string;
  reason: string;
  confidence: number;
};

export function LinkedNotesManager({ noteId, draft }: LinkedNotesManagerProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [links, setLinks] = useState<NoteLink[]>([]);
  const [targetId, setTargetId] = useState("");
  const [noteSearch, setNoteSearch] = useState("");
  const [relation, setRelation] = useState("related");
  const [linkSuggestions, setLinkSuggestions] = useState<LinkSuggestion[]>([]);
  const [possibleNewNotes, setPossibleNewNotes] = useState<Array<{ title: string; reason?: string }>>([]);
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

  const availableNotes = useMemo(() => {
    const linkedTargetIds = new Set(links.map((link) => link.target_note_id));
    const query = noteSearch.trim().toLowerCase();
    const matchesSearch = (note: Note) => {
      if (!query) return true;
      return [
        note.title,
        note.description,
        note.topic,
        note.note_type,
        ...(note.tags ?? [])
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query);
    };
    const filtered = notes
      .filter((note) => note.id !== noteId && !linkedTargetIds.has(note.id) && matchesSearch(note))
      .slice(0, 30);
    const selected = targetId ? notes.find((note) => note.id === targetId) : null;
    return selected && !filtered.some((note) => note.id === selected.id) ? [selected, ...filtered] : filtered;
  }, [links, noteId, noteSearch, notes, targetId]);

  function relationLabel(value: string) {
    if (value === "prerequisite") return "prerequisite (target is needed before this note)";
    if (value === "generalization") return "generalization (target is broader)";
    if (value === "special case") return "special case (target is narrower)";
    return value;
  }

  async function addLink(target = targetId, relationType = relation) {
    if (!noteId || !target) return;
    if (links.some((link) => link.target_note_id === target && link.relation_type === relationType)) return;
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
          target_note_id: target,
          relation_type: relationType
        })
        .select("*")
        .single();
      if (error) throw error;
      setLinks((current) => [...current, data as NoteLink]);
      setTargetId("");
      setNoteSearch("");
      setLinkSuggestions((current) => current.filter((item) => item.targetNoteId !== target));
    } catch (linkError) {
      setError(linkError instanceof Error ? linkError.message : "Could not add link.");
    } finally {
      setBusy(false);
    }
  }

  async function removeLink(linkId: string) {
    const supabase = createClient();
    await supabase.from("note_links").delete().eq("id", linkId);
    setLinks((current) => current.filter((link) => link.id !== linkId));
  }

  async function suggestRelated() {
    setBusy(true);
    setLinkSuggestions([]);
    setPossibleNewNotes([]);
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
      const payload = (await response.json()) as {
        link_suggestions?: LinkSuggestion[];
        possible_new_notes?: Array<{ title: string; reason?: string }>;
        error?: string;
      };
      if (!response.ok) throw new Error(payload.error ?? "AI request failed.");
      setLinkSuggestions(
        (payload.link_suggestions ?? []).filter(
          (item) => !links.some((link) => link.target_note_id === item.targetNoteId)
        )
      );
      setPossibleNewNotes(payload.possible_new_notes ?? []);
    } catch (aiError) {
      setError(aiError instanceof Error ? aiError.message : "Could not suggest links.");
    } finally {
      setBusy(false);
    }
  }

  async function addSelectedSuggestions() {
    for (const item of linkSuggestions) {
      await addLink(item.targetNoteId, item.relationType);
    }
  }

  return (
    <section className="rounded-lg border border-[#c3c6d0] bg-[#f9f9f9] p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-[#1a1c1c]">Linked Notes</h3>
          <p className="mt-1 text-sm text-[#43474f]">
            Add prerequisite for this note, confused pairs, special cases, or notes used together. Reverse labels are computed on the other note page.
          </p>
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
        <div className="grid gap-2">
          <input
            className={inputClassName()}
            value={noteSearch}
            onChange={(event) => setNoteSearch(event.target.value)}
            placeholder="Search notes by title, topic, type, or tag"
            disabled={!noteId}
          />
          <select className={inputClassName()} value={targetId} onChange={(event) => setTargetId(event.target.value)} disabled={!noteId}>
            <option value="">{noteSearch ? `Choose from ${availableNotes.length} matches` : "Choose a note"}</option>
            {availableNotes.map((note) => (
              <option key={note.id} value={note.id}>
                {note.title} {note.topic ? `- ${note.topic}` : ""}
              </option>
            ))}
          </select>
        </div>
        <select className={inputClassName()} value={relation} onChange={(event) => setRelation(event.target.value)} disabled={!noteId}>
          {NOTE_LINK_RELATIONS.map((item) => (
            <option key={item} value={item}>
              {relationLabel(item)}
            </option>
          ))}
        </select>
        <Button type="button" onClick={() => void addLink()} disabled={!noteId || !targetId || busy}>
          <Link2 className="h-4 w-4" aria-hidden="true" />
          Add
        </Button>
      </div>
      {error ? <p className="mt-3 text-sm text-[#8f1d15]">{error}</p> : null}
      {linkSuggestions.length || possibleNewNotes.length ? (
        <div className="mt-4 grid gap-3 rounded border border-[#d5d7de] bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-[#1a1c1c]">AI link suggestions</p>
            <div className="flex flex-wrap gap-2">
              {linkSuggestions.length ? (
                <Button type="button" variant="secondary" onClick={() => void addSelectedSuggestions()} disabled={busy}>
                  Add selected links
                </Button>
              ) : null}
              <Button type="button" variant="secondary" onClick={() => void suggestRelated()} disabled={busy}>
                Regenerate
              </Button>
              <Button type="button" variant="secondary" onClick={() => { setLinkSuggestions([]); setPossibleNewNotes([]); }}>
                Ignore
              </Button>
            </div>
          </div>
          {linkSuggestions.map((item) => (
            <article key={`${item.targetNoteId}-${item.relationType}`} className="rounded border border-[#c3c6d0] bg-[#f9f9f9] p-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[#0e3b69]">{item.targetTitle}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.08em] text-[#43474f]">{item.relationType} · {Math.round(item.confidence * 100)}%</p>
                  <p className="mt-2 text-sm leading-6 text-[#43474f]">{item.reason}</p>
                </div>
                <Button type="button" variant="secondary" onClick={() => void addLink(item.targetNoteId, item.relationType)} disabled={busy}>
                  Add
                </Button>
              </div>
            </article>
          ))}
          {possibleNewNotes.length ? (
            <div className="rounded border border-dashed border-[#c3c6d0] p-3">
              <p className="text-sm font-semibold text-[#1a1c1c]">Possible new notes</p>
              <ul className="mt-2 list-disc pl-5 text-sm leading-6 text-[#43474f]">
                {possibleNewNotes.map((item) => (
                  <li key={item.title}>{item.title}{item.reason ? ` - ${item.reason}` : ""}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
