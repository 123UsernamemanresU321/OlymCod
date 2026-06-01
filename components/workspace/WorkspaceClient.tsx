"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { MarkdownPreview } from "@/components/editor/MarkdownPreview";
import { Button } from "@/components/ui/Button";
import { inputClassName } from "@/components/ui/Field";
import { createClient } from "@/lib/supabase/client";
import type { Note, NoteLink } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

interface WorkspaceClientProps {
  notes: Note[];
  links: NoteLink[];
}

export function WorkspaceClient({ notes, links }: WorkspaceClientProps) {
  const [query, setQuery] = useState("");
  const [openIds, setOpenIds] = useState<string[]>(notes[0] ? [notes[0].id] : []);
  const [activeId, setActiveId] = useState(notes[0]?.id ?? "");
  const [drafts, setDrafts] = useState<Record<string, string>>(() => Object.fromEntries(notes.map((note) => [note.id, note.body_markdown])));
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [showLibrary, setShowLibrary] = useState(true);
  const [showReference, setShowReference] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const active = notes.find((note) => note.id === activeId) ?? null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return notes.filter((note) => !q || [note.title, note.topic, note.note_type, note.tags.join(" ")].join(" ").toLowerCase().includes(q)).slice(0, 80);
  }, [notes, query]);

  const related = active
    ? links
        .filter((link) => link.source_note_id === active.id || link.target_note_id === active.id)
        .map((link) => ({
          link,
          note: notes.find((note) => note.id === (link.source_note_id === active.id ? link.target_note_id : link.source_note_id))
        }))
        .filter((item): item is { link: NoteLink; note: Note } => Boolean(item.note))
    : [];

  function openNote(id: string) {
    setOpenIds((current) => current.includes(id) ? current : [...current, id]);
    setActiveId(id);
  }

  async function saveActive() {
    if (!active) return;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setMessage("You must be logged in.");
      return;
    }
    await supabase.from("note_versions").insert({
      user_id: user.id,
      note_id: active.id,
      title: active.title,
      body_markdown: active.body_markdown,
      metadata: { workspace_backup: true }
    });
    const { error } = await supabase.from("notes").update({ body_markdown: drafts[active.id] ?? "" }).eq("id", active.id).eq("user_id", user.id);
    setMessage(error ? error.message : "Saved active note.");
  }

  return (
    <div
      className={cn(
        "grid min-h-[100dvh] lg:h-[100dvh] lg:max-h-[100dvh] lg:overflow-hidden gap-0 bg-[#f9f9f9]",
        showLibrary && showReference && "lg:grid-cols-[280px_minmax(0,1fr)_320px]",
        showLibrary && !showReference && "lg:grid-cols-[280px_minmax(0,1fr)]",
        !showLibrary && showReference && "lg:grid-cols-[minmax(0,1fr)_320px]",
        !showLibrary && !showReference && "lg:grid-cols-1"
      )}
    >
      {showLibrary ? <aside className="border-r border-[#c3c6d0] bg-white p-4 lg:h-full lg:flex lg:flex-col lg:min-h-0">
        <h1 className="text-2xl font-semibold text-[#1a1c1c]">Workspace</h1>
        <input className={inputClassName("mt-4")} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search notes..." />
        <div className="mt-4 grid gap-1 overflow-y-auto codex-scrollbar lg:flex-1 lg:min-h-0 pb-16">
          {filtered.map((note) => (
            <button key={note.id} type="button" onClick={() => openNote(note.id)} className={`rounded p-2 text-left text-sm ${activeId === note.id ? "bg-[#eef4ff] text-[#0e3b69]" : "hover:bg-[#f9f9f9]"}`}>
              <span className="block font-semibold">{note.title}</span>
              <span className="text-xs text-[#43474f]">{note.topic} · {note.note_type}</span>
            </button>
          ))}
        </div>
      </aside> : null}
      <main className="p-4 lg:p-6 lg:h-full lg:flex lg:flex-col lg:min-h-0">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Button type="button" variant="secondary" onClick={() => setShowLibrary((current) => !current)}>
            {showLibrary ? "Hide library" : "Show library"}
          </Button>
          <Button type="button" variant="secondary" onClick={() => setShowReference((current) => !current)}>
            {showReference ? "Hide reference" : "Show reference"}
          </Button>
          {openIds.map((id) => {
            const note = notes.find((item) => item.id === id);
            if (!note) return null;
            return <button key={id} type="button" className={`rounded border px-3 py-1 text-sm ${activeId === id ? "border-[#2c5282] bg-[#dbeafe]" : "border-[#d5d7de] bg-white"}`} onClick={() => setActiveId(id)}>{note.title}</button>;
          })}
          <div className="ml-auto flex gap-2">
            <Button type="button" variant="secondary" onClick={() => setMode(mode === "edit" ? "preview" : "edit")}>{mode === "edit" ? "Preview" : "Edit"}</Button>
            <Button type="button" onClick={() => void saveActive()}>Save</Button>
          </div>
        </div>
        {message ? <p className="mb-3 rounded border border-[#d5d7de] bg-white p-2 text-sm text-[#43474f]">{message}</p> : null}
        {active ? (
          mode === "edit" ? (
            <textarea className="flex-1 resize-none w-full rounded border border-[#c3c6d0] bg-white p-4 font-mono text-sm leading-7 outline-none" value={drafts[active.id] ?? ""} onChange={(event) => setDrafts((current) => ({ ...current, [active.id]: event.target.value }))} />
          ) : (
            <div className="rounded border border-[#c3c6d0] bg-white p-6 flex-1 min-h-0 overflow-y-auto codex-scrollbar"><MarkdownPreview markdown={drafts[active.id] ?? ""} /></div>
          )
        ) : <p className="text-sm text-[#43474f]">Open a note to begin.</p>}
      </main>
      {showReference ? <aside className="border-l border-[#c3c6d0] bg-white p-4 lg:h-full lg:flex lg:flex-col lg:min-h-0">
        <h2 className="text-lg font-semibold text-[#1a1c1c]">Reference Pane</h2>
        <div className="mt-4 grid gap-3 overflow-y-auto codex-scrollbar lg:flex-1 lg:min-h-0 pb-16">
          {related.map(({ link, note }) => (
            <article key={link.id} className="rounded border border-[#d5d7de] bg-[#f9f9f9] p-3">
              <Link href={`/app/notes/${note.id}`} className="font-semibold text-[#0e3b69]">{note.title}</Link>
              <p className="mt-1 text-xs text-[#43474f]">{link.relation_type}</p>
              <p className="mt-2 line-clamp-5 text-sm leading-6 text-[#43474f]">{note.description || note.body_markdown}</p>
            </article>
          ))}
          {!related.length ? <p className="text-sm text-[#43474f]">Related notes appear here when the active note has links.</p> : null}
        </div>
      </aside> : null}
    </div>
  );
}
