"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, Star, Trash2 } from "lucide-react";
import { InlineMarkdown } from "@/components/editor/InlineMarkdown";
import { Badge, DifficultyBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Field, inputClassName } from "@/components/ui/Field";
import { NOTE_TYPES, topicIncludes } from "@/lib/constants/notes";
import { TopicSelector } from "@/components/notes/TopicSelector";
import { createClient } from "@/lib/supabase/client";
import { getCriteriaForNoteType } from "@/lib/note-quality/getCriteriaForNoteType";
import type { Note } from "@/lib/types";
import { parseTags } from "@/lib/utils/tags";

interface BulkMetadataManagerProps {
  notes: Note[];
}

export function BulkMetadataManager({ notes }: BulkMetadataManagerProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [topic, setTopic] = useState("");
  const [type, setType] = useState("");
  const [missing, setMissing] = useState("");
  const [bulkTopic, setBulkTopic] = useState("Number Theory");
  const [bulkType, setBulkType] = useState("Technique");
  const [bulkTags, setBulkTags] = useState("");
  const [bulkLevel, setBulkLevel] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return notes.filter((note) => {
      const quality = getCriteriaForNoteType(note);
      const haystack = [note.title, note.description, note.topic, note.note_type, note.tags.join(" ")].filter(Boolean).join(" ").toLowerCase();
      if (q && !haystack.includes(q)) return false;
      if (topic && !topicIncludes(note.topic, topic)) return false;
      if (type && note.note_type !== type) return false;
      if (missing === "metadata" && note.description && note.tags.length && note.difficulty) return false;
      if (missing === "triggers" && note.recognition_triggers.length) return false;
      if (missing === "false_uses" && note.false_uses.length) return false;
      if (missing === "quality" && quality.completionPercent >= 80) return false;
      return true;
    });
  }, [missing, notes, query, topic, type]);

  function toggle(id: string) {
    setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  async function applyUpdate(update: Record<string, unknown>) {
    if (!selected.length) {
      setMessage("Select at least one note.");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("You must be logged in.");
      const { error } = await supabase.from("notes").update(update).eq("user_id", user.id).in("id", selected);
      if (error) throw error;
      setSelected([]);
      setMessage(`Updated ${selected.length} notes.`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Bulk update failed.");
    } finally {
      setBusy(false);
    }
  }

  async function addTags() {
    const tags = parseTags(bulkTags);
    const nextUpdates = notes
      .filter((note) => selected.includes(note.id))
      .map((note) => ({ id: note.id, tags: Array.from(new Set([...note.tags, ...tags])) }));
    for (const update of nextUpdates) await applyUpdateForOne(update.id, { tags: update.tags });
    setBulkTags("");
    setSelected([]);
    router.refresh();
  }

  async function applyUpdateForOne(id: string, update: Record<string, unknown>) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("You must be logged in.");
    const { error } = await supabase.from("notes").update(update).eq("user_id", user.id).eq("id", id);
    if (error) throw error;
  }

  async function deleteSelected() {
    if (deleteConfirm !== "DELETE") {
      setMessage("Type DELETE before bulk deleting.");
      return;
    }
    if (!selected.length) return;
    setBusy(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("You must be logged in.");
      const { error } = await supabase.from("notes").delete().eq("user_id", user.id).in("id", selected);
      if (error) throw error;
      setSelected([]);
      setDeleteConfirm("");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Bulk delete failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 lg:px-10">
      <div>
        <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[#0e3b69]">Metadata operations</p>
        <h1 className="mt-2 text-3xl font-semibold text-[#1a1c1c]">Bulk Metadata Manager</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#43474f]">Review many notes, fix metadata, and apply safe bulk actions.</p>
      </div>

      <section className="mt-6 grid gap-3 rounded-lg border border-[#c3c6d0] bg-white p-4 lg:grid-cols-5">
        <input className={inputClassName()} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search notes..." />
        <TopicSelector value={topic} onChange={setTopic} />
        <select className={inputClassName()} value={type} onChange={(event) => setType(event.target.value)}>
          <option value="">All types</option>
          {NOTE_TYPES.map((item) => <option key={item}>{item}</option>)}
        </select>
        <select className={inputClassName()} value={missing} onChange={(event) => setMissing(event.target.value)}>
          <option value="">Any quality</option>
          <option value="metadata">Missing metadata</option>
          <option value="triggers">Missing recognition triggers</option>
          <option value="false_uses">Missing common false uses</option>
          <option value="quality">Quality below 80%</option>
        </select>
        <Button type="button" variant="secondary" onClick={() => setSelected(filtered.map((note) => note.id))}>Select filtered</Button>
      </section>

      <section className="mt-4 grid gap-4 rounded-lg border border-[#c3c6d0] bg-white p-4 xl:grid-cols-4">
        <Field label={`${selected.length} selected`}>
          <div className="text-sm text-[#43474f]">Bulk actions apply only to selected rows.</div>
        </Field>
        <Field label="Topic">
          <div className="grid gap-2">
            <TopicSelector value={bulkTopic} onChange={setBulkTopic} />
            <Button type="button" variant="secondary" onClick={() => void applyUpdate({ topic: bulkTopic })} disabled={busy}>Set topic</Button>
          </div>
        </Field>
        <Field label="Type / difficulty label">
          <div className="grid gap-2">
            <select className={inputClassName()} value={bulkType} onChange={(event) => setBulkType(event.target.value)}>
              {NOTE_TYPES.map((item) => <option key={item}>{item}</option>)}
            </select>
            <input className={inputClassName()} value={bulkLevel} onChange={(event) => setBulkLevel(event.target.value)} placeholder="Level 1-12, based on note type" />
            <Button type="button" variant="secondary" onClick={() => void applyUpdate({ note_type: bulkType, difficulty: bulkLevel ? Number(bulkLevel) : null })} disabled={busy}>Set type/level</Button>
          </div>
        </Field>
        <Field label="Tags and state">
          <div className="grid gap-2">
            <input className={inputClassName()} value={bulkTags} onChange={(event) => setBulkTags(event.target.value)} placeholder="add tags..." />
            <Button type="button" variant="secondary" onClick={() => void addTags()} disabled={busy}>Add tags</Button>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" onClick={() => void applyUpdate({ is_archived: true })}><Archive className="h-4 w-4" />Archive</Button>
              <Button type="button" variant="secondary" onClick={() => void applyUpdate({ is_favorite: true })}><Star className="h-4 w-4" />Favorite</Button>
            </div>
          </div>
        </Field>
      </section>

      <section className="mt-4 rounded-lg border border-[#ffd2cc] bg-[#fff7f5] p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
          <Field label="Bulk delete confirmation">
            <input className={inputClassName()} value={deleteConfirm} onChange={(event) => setDeleteConfirm(event.target.value)} placeholder="Type DELETE to delete selected notes" />
          </Field>
          <Button type="button" variant="danger" onClick={() => void deleteSelected()} disabled={busy || deleteConfirm !== "DELETE"}>
            <Trash2 className="h-4 w-4" /> Delete selected
          </Button>
        </div>
        {message ? <p className="mt-3 text-sm text-[#8f1d15]">{message}</p> : null}
      </section>

      <section className="mt-6 overflow-x-auto rounded-lg border border-[#c3c6d0] bg-white">
        <table className="w-full min-w-[900px] border-collapse text-sm">
          <thead className="bg-[#f9f9f9] text-left text-[#43474f]">
            <tr>
              <th className="p-3">Select</th>
              <th className="p-3">Title</th>
              <th className="p-3">Topic</th>
              <th className="p-3">Type</th>
              <th className="p-3">Difficulty label</th>
              <th className="p-3">Quality</th>
              <th className="p-3">Tags</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((note) => {
              const quality = getCriteriaForNoteType(note);
              return (
                <tr key={note.id} className="border-t border-[#e2e4ea]">
                  <td className="p-3"><input type="checkbox" checked={selected.includes(note.id)} onChange={() => toggle(note.id)} /></td>
                  <td className="p-3 font-semibold text-[#0e3b69]"><InlineMarkdown text={note.title} /></td>
                  <td className="p-3">{note.topic}</td>
                  <td className="p-3">{note.note_type}</td>
                  <td className="p-3"><DifficultyBadge value={note.difficulty} noteType={note.note_type} /></td>
                  <td className="p-3">{quality.completionPercent}%</td>
                  <td className="p-3"><div className="flex flex-wrap gap-1">{note.tags.map((tag) => <Badge key={tag}>{tag}</Badge>)}</div></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </div>
  );
}
