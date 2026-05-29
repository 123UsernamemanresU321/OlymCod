"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MarkdownPreview } from "@/components/editor/MarkdownPreview";
import { Button } from "@/components/ui/Button";
import { Field, inputClassName } from "@/components/ui/Field";
import { NOTE_TYPES } from "@/lib/constants/notes";
import { createClient } from "@/lib/supabase/client";
import type { Note } from "@/lib/types";
import { titleToSlug } from "@/lib/utils/slug";

export function MergeNotesClient({ notes }: { notes: Note[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [title, setTitle] = useState("Merged Olympiad Note");
  const [noteType, setNoteType] = useState("Technique");
  const [archiveOriginals, setArchiveOriginals] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const chosen = useMemo(() => selected.map((id) => notes.find((note) => note.id === id)).filter(Boolean) as Note[], [notes, selected]);

  const preview = chosen
    .map((note) => `## ${note.title}\n\n${note.body_markdown}`)
    .join("\n\n---\n\n");

  async function merge() {
    if (chosen.length < 2) {
      setMessage("Select at least two notes to merge.");
      return;
    }
    if (!window.confirm(`Create one merged note from ${chosen.length} notes? Originals will not be deleted.`)) return;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setMessage("You must be logged in.");
      return;
    }
    const tags = Array.from(new Set(chosen.flatMap((note) => note.tags)));
    const { data, error } = await supabase
      .from("notes")
      .insert({
        user_id: user.id,
        title,
        slug: `${titleToSlug(title)}-${Date.now().toString(36)}`,
        topic: chosen[0].topic,
        note_type: noteType,
        difficulty: chosen.find((note) => note.difficulty)?.difficulty ?? null,
        description: `Merged from ${chosen.map((note) => note.title).join(", ")}`,
        tags,
        body_markdown: `# ${title}\n\n${preview}`,
        diagram_urls: Array.from(new Set(chosen.flatMap((note) => note.diagram_urls))),
        recognition_triggers: Array.from(new Set(chosen.flatMap((note) => note.recognition_triggers))),
        false_uses: Array.from(new Set(chosen.flatMap((note) => note.false_uses))),
        visibility: "private",
        is_archived: false,
        is_favorite: false
      })
      .select("id")
      .single();
    if (error) {
      setMessage(error.message);
      return;
    }
    if (archiveOriginals) {
      await supabase.from("notes").update({ is_archived: true }).eq("user_id", user.id).in("id", selected);
    }
    router.push(`/app/notes/${data.id}`);
    router.refresh();
  }

  return (
    <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 lg:grid-cols-[360px_minmax(0,1fr)] lg:px-10">
      <aside className="rounded-lg border border-[#c3c6d0] bg-white p-4">
        <h1 className="text-2xl font-semibold text-[#1a1c1c]">Merge Notes</h1>
        <p className="mt-2 text-sm leading-6 text-[#43474f]">Select notes, preview the merged Markdown, then create a new private note. Originals are archived only if selected.</p>
        <div className="mt-4 grid gap-3">
          <Field label="Merged title">
            <input className={inputClassName()} value={title} onChange={(event) => setTitle(event.target.value)} />
          </Field>
          <Field label="Merged note type">
            <select className={inputClassName()} value={noteType} onChange={(event) => setNoteType(event.target.value)}>
              {NOTE_TYPES.map((type) => <option key={type}>{type}</option>)}
            </select>
          </Field>
          <label className="flex items-center gap-2 text-sm text-[#43474f]">
            <input type="checkbox" checked={archiveOriginals} onChange={(event) => setArchiveOriginals(event.target.checked)} />
            Archive originals after merge
          </label>
          <Button type="button" onClick={() => void merge()}>Create merged note</Button>
          {message ? <p className="text-sm text-[#8f1d15]">{message}</p> : null}
        </div>
        <div className="mt-4 max-h-[55vh] overflow-auto codex-scrollbar rounded border border-[#d5d7de] bg-[#f9f9f9] p-2">
          {notes.map((note) => (
            <label key={note.id} className="flex items-start gap-2 rounded p-2 text-sm hover:bg-white">
              <input
                type="checkbox"
                checked={selected.includes(note.id)}
                onChange={(event) => setSelected((current) => event.target.checked ? [...current, note.id] : current.filter((id) => id !== note.id))}
              />
              <span>
                <span className="block font-semibold text-[#1a1c1c]">{note.title}</span>
                <span className="text-xs text-[#43474f]">{note.topic} · {note.note_type}</span>
              </span>
            </label>
          ))}
        </div>
      </aside>
      <main className="rounded-lg border border-[#c3c6d0] bg-white p-5">
        <h2 className="text-lg font-semibold text-[#1a1c1c]">Merge Preview</h2>
        <div className="mt-4 rounded border border-[#d5d7de] bg-[#f9f9f9] p-4">
          <MarkdownPreview markdown={preview || "Select notes to preview the merged result."} />
        </div>
      </main>
    </div>
  );
}
