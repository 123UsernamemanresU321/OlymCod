"use client";

import { useMemo, useState } from "react";
import { SplitSquareHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Field, inputClassName } from "@/components/ui/Field";
import { NOTE_TYPES } from "@/lib/constants/notes";
import { parseMarkdownHeadings } from "@/lib/markdown/sections";
import { createClient } from "@/lib/supabase/client";
import type { Note } from "@/lib/types";
import { titleToSlug } from "@/lib/utils/slug";

interface NoteSplitToolProps {
  note: Note;
}

export function NoteSplitTool({ note }: NoteSplitToolProps) {
  const router = useRouter();
  const sections = useMemo(() => parseMarkdownHeadings(note.body_markdown).filter((heading) => heading.level <= 2), [note.body_markdown]);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [replaceWithLinks, setReplaceWithLinks] = useState(true);
  const [archiveOriginal, setArchiveOriginal] = useState(false);
  const [noteType, setNoteType] = useState(note.note_type);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function split() {
    const chosen = sections.filter((section) => selected.includes(section.id));
    if (!chosen.length) {
      setMessage("Select at least one section to split.");
      return;
    }
    if (!window.confirm(`Create ${chosen.length} notes from selected sections?`)) return;
    setBusy(true);
    setMessage(null);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("You must be logged in.");
      const created: Array<{ id: string; title: string }> = [];
      for (const section of chosen) {
        const body = `${"#".repeat(section.level)} ${section.title}\n\n${section.content}`.trim();
        const { data, error } = await supabase
          .from("notes")
          .insert({
            user_id: user.id,
            title: section.title,
            slug: `${titleToSlug(section.title)}-${Date.now().toString(36)}`,
            topic: note.topic,
            note_type: noteType,
            difficulty: note.difficulty,
            description: `Split from ${note.title}`,
            tags: note.tags,
            body_markdown: body,
            recognition_triggers: [],
            false_uses: [],
            diagram_urls: [],
            visibility: "private",
            is_archived: false,
            is_favorite: false
          })
          .select("id,title")
          .single();
        if (error) throw error;
        created.push(data as { id: string; title: string });
      }
      if (replaceWithLinks || archiveOriginal) {
        await supabase.from("note_versions").insert({
          user_id: user.id,
          note_id: note.id,
          title: note.title,
          body_markdown: note.body_markdown,
          metadata: { split_backup: true }
        });
      }
      if (replaceWithLinks) {
        let nextBody = note.body_markdown;
        for (const section of chosen) {
          const createdNote = created.find((item) => item.title === section.title);
          const original = `${"#".repeat(section.level)} ${section.title}\n\n${section.content}`.trim();
          nextBody = nextBody.replace(original, `## ${section.title}\n\nMoved to [[note:${createdNote?.title ?? section.title}]].`);
        }
        await supabase.from("notes").update({ body_markdown: nextBody, is_archived: archiveOriginal }).eq("id", note.id).eq("user_id", user.id);
      } else if (archiveOriginal) {
        await supabase.from("notes").update({ is_archived: true }).eq("id", note.id).eq("user_id", user.id);
      }
      for (const createdNote of created) {
        await supabase.from("note_links").insert({
          user_id: user.id,
          source_note_id: note.id,
          target_note_id: createdNote.id,
          relation_type: "related"
        });
      }
      setMessage(`Created ${created.length} notes.`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Split failed.");
    } finally {
      setBusy(false);
    }
  }

  if (!sections.length) return null;

  return (
    <section className="rounded-lg border border-[#c3c6d0] bg-[#f9f9f9] p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-[#1a1c1c]">Split Note</h3>
          <p className="mt-1 text-sm text-[#43474f]">Turn selected top-level sections into separate notes.</p>
        </div>
        <Button type="button" variant="secondary" onClick={() => setOpen((current) => !current)}>
          <SplitSquareHorizontal className="h-4 w-4" /> {open ? "Hide" : "Open"}
        </Button>
      </div>
      {open ? (
        <div className="mt-4 grid gap-3">
          <Field label="New note type">
            <select className={inputClassName()} value={noteType} onChange={(event) => setNoteType(event.target.value)}>
              {NOTE_TYPES.map((type) => <option key={type}>{type}</option>)}
            </select>
          </Field>
          <div className="max-h-56 overflow-auto rounded border border-[#d5d7de] bg-white p-2">
            {sections.map((section) => (
              <label key={section.id} className="flex items-start gap-2 rounded p-2 text-sm text-[#43474f] hover:bg-[#f9f9f9]">
                <input
                  type="checkbox"
                  checked={selected.includes(section.id)}
                  onChange={(event) => setSelected((current) => event.target.checked ? [...current, section.id] : current.filter((id) => id !== section.id))}
                />
                <span>
                  <span className="block font-medium text-[#1a1c1c]">{section.title}</span>
                  <span className="line-clamp-1 text-xs">{section.content || "No section body"}</span>
                </span>
              </label>
            ))}
          </div>
          <label className="flex items-center gap-2 text-sm text-[#43474f]">
            <input type="checkbox" checked={replaceWithLinks} onChange={(event) => setReplaceWithLinks(event.target.checked)} />
            Replace selected sections with links in original note
          </label>
          <label className="flex items-center gap-2 text-sm text-[#43474f]">
            <input type="checkbox" checked={archiveOriginal} onChange={(event) => setArchiveOriginal(event.target.checked)} />
            Archive original note after splitting
          </label>
          <Button type="button" onClick={() => void split()} disabled={busy}>
            {busy ? "Splitting..." : "Create split notes"}
          </Button>
          {message ? <p className="text-sm text-[#0e3b69]">{message}</p> : null}
        </div>
      ) : null}
    </section>
  );
}
