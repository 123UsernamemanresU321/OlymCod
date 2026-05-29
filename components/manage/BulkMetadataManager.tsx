"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Archive, CheckSquare, Eye, EyeOff, Search, Star, Trash2, X } from "lucide-react";
import { InlineMarkdown } from "@/components/editor/InlineMarkdown";
import { Badge, DifficultyBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Field, inputClassName } from "@/components/ui/Field";
import {
  COLLECTION_TOPICS,
  MATH_TOPICS,
  NOTE_TYPES,
  buildTopicValue,
  splitTopicValue,
  topicIncludes
} from "@/lib/constants/notes";
import { createClient } from "@/lib/supabase/client";
import { getCriteriaForNoteType } from "@/lib/note-quality/getCriteriaForNoteType";
import type { Note } from "@/lib/types";
import { parseTags } from "@/lib/utils/tags";
import { cn } from "@/lib/utils/cn";

interface BulkMetadataManagerProps {
  notes: Note[];
}

function ActionField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <span className="text-[13px] font-medium uppercase tracking-[0.05em] text-[#43474f]">{label}</span>
      {children}
    </div>
  );
}

function CompactTopicPicker({
  value,
  onChange,
  label = "Topic",
  allowEmpty = false
}: {
  value: string;
  onChange: (topic: string) => void;
  label?: string;
  allowEmpty?: boolean;
}) {
  const selected = splitTopicValue(value);
  const selectedCollections = selected.filter((topic) =>
    COLLECTION_TOPICS.includes(topic as (typeof COLLECTION_TOPICS)[number])
  );
  const selectedMath = selected.filter((topic) => MATH_TOPICS.includes(topic as (typeof MATH_TOPICS)[number]));

  function toggleMathTopic(topic: string) {
    const nextMath = selectedMath.includes(topic)
      ? selectedMath.filter((item) => item !== topic)
      : [...selectedMath, topic];
    onChange(buildTopicValue([...selectedCollections, ...nextMath]));
  }

  function toggleCollectionTopic(topic: string) {
    const nextCollections = selectedCollections.includes(topic)
      ? selectedCollections.filter((item) => item !== topic)
      : [...selectedCollections, topic];
    onChange(buildTopicValue([...nextCollections, ...selectedMath]));
  }

  return (
    <details className="group relative">
      <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between gap-3 rounded border border-[#c3c6d0] bg-[#f9f9f9] px-3 py-2 text-left text-sm text-[#1a1c1c] transition hover:bg-white">
        <span className="min-w-0">
          <span className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#5d6470]">{label}</span>
          <span className="block truncate font-medium text-[#0e3b69]">{value || "Any topic"}</span>
        </span>
        <span className="text-xs text-[#43474f] group-open:hidden">Open</span>
        <span className="hidden text-xs text-[#43474f] group-open:inline">Close</span>
      </summary>
      <div className="absolute z-20 mt-2 w-[min(28rem,calc(100vw-2rem))] rounded-lg border border-[#c3c6d0] bg-white p-3 shadow-[0_16px_40px_rgba(26,32,44,0.16)]">
        <div className="flex flex-wrap gap-2">
          {allowEmpty ? (
            <button
              type="button"
              onClick={() => onChange("")}
              className={cn(
                "rounded border px-2.5 py-1.5 text-xs font-medium text-[#43474f] hover:bg-[#f9f9f9]",
                !value && "border-[#2c5282] bg-[#dbeafe] text-[#0e3b69]"
              )}
            >
              Any topic
            </button>
          ) : null}
          {MATH_TOPICS.map((topic) => {
            const active = selectedMath.includes(topic);
            return (
              <button
                key={topic}
                type="button"
                onClick={() => toggleMathTopic(topic)}
                className={cn(
                  "rounded border px-2.5 py-1.5 text-xs font-medium text-[#43474f] hover:bg-[#eef4ff]",
                  active && "border-[#2c5282] bg-[#dbeafe] text-[#0e3b69]"
                )}
              >
                {topic}
              </button>
            );
          })}
        </div>
        <div className="mt-3 flex flex-wrap gap-2 border-t border-[#d5d7de] pt-3">
          {COLLECTION_TOPICS.map((topic) => {
            const active = selectedCollections.includes(topic);
            return (
              <button
                key={topic}
                type="button"
                onClick={() => toggleCollectionTopic(topic)}
                className={cn(
                  "rounded border px-2.5 py-1.5 text-xs font-medium text-[#43474f] hover:bg-[#f9f9f9]",
                  active && "border-[#2c5282] bg-[#dbeafe] text-[#0e3b69]"
                )}
              >
                {topic}
              </button>
            );
          })}
        </div>
      </div>
    </details>
  );
}

export function BulkMetadataManager({ notes }: BulkMetadataManagerProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [topic, setTopic] = useState("");
  const [type, setType] = useState("");
  const [visibility, setVisibility] = useState("");
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
      if (visibility && note.visibility !== visibility) return false;
      if (missing === "metadata" && note.description && note.tags.length && note.difficulty) return false;
      if (missing === "triggers" && note.recognition_triggers.length) return false;
      if (missing === "false_uses" && note.false_uses.length) return false;
      if (missing === "quality" && quality.completionPercent >= 80) return false;
      return true;
    });
  }, [missing, notes, query, topic, type, visibility]);

  const selectedNotes = useMemo(() => notes.filter((note) => selected.includes(note.id)), [notes, selected]);
  const publicSelected = selectedNotes.filter((note) => note.visibility === "public").length;
  const privateSelected = selectedNotes.length - publicSelected;

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

  async function setBulkVisibility(nextVisibility: "private" | "public") {
    await applyUpdate({
      visibility: nextVisibility,
      published_at: nextVisibility === "public" ? new Date().toISOString() : null
    });
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
    <div className="mx-auto max-w-[1500px] px-4 py-8 lg:px-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[#0e3b69]">Metadata operations</p>
          <h1 className="mt-2 text-3xl font-semibold text-[#1a1c1c]">Bulk Metadata Manager</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#43474f]">
            Filter notes, select the rows you need, then apply one focused metadata action at a time.
          </p>
        </div>
        <Link
          href="/app/taxonomy"
          className="inline-flex min-h-9 items-center justify-center rounded border border-[#c3c6d0] bg-[#f9f9f9] px-4 py-2 text-[13px] font-medium text-[#0e3b69] hover:bg-white"
        >
          Tags & Topics counts
        </Link>
      </div>

      <section className="mt-6 rounded-lg border border-[#c3c6d0] bg-white p-4">
        <div className="grid gap-3 xl:grid-cols-[minmax(18rem,1.4fr)_minmax(12rem,0.9fr)_minmax(10rem,0.75fr)_minmax(10rem,0.75fr)_minmax(12rem,0.85fr)_auto] xl:items-end">
          <label className="relative">
            <span className="sr-only">Search notes</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5d6470]" />
            <input className={inputClassName("pl-9")} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search title, description, topic, tags..." />
          </label>
          <CompactTopicPicker value={topic} onChange={setTopic} label="Topic filter" allowEmpty />
          <select className={inputClassName()} value={type} onChange={(event) => setType(event.target.value)}>
            <option value="">All types</option>
            {NOTE_TYPES.map((item) => <option key={item}>{item}</option>)}
          </select>
          <select className={inputClassName()} value={visibility} onChange={(event) => setVisibility(event.target.value)}>
            <option value="">Any visibility</option>
            <option value="private">Private only</option>
            <option value="public">Public only</option>
          </select>
          <select className={inputClassName()} value={missing} onChange={(event) => setMissing(event.target.value)}>
            <option value="">Any quality</option>
            <option value="metadata">Missing metadata</option>
            <option value="triggers">Missing recognition triggers</option>
            <option value="false_uses">Missing common false uses</option>
            <option value="quality">Quality below 80%</option>
          </select>
          <Button type="button" variant="secondary" onClick={() => setSelected(filtered.map((note) => note.id))}>
            <CheckSquare className="h-4 w-4" /> Select filtered
          </Button>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[#43474f]">
          <span className="rounded border border-[#d5d7de] bg-[#f9f9f9] px-2 py-1">{filtered.length} matching notes</span>
          {topic ? <Badge tone="blue">Topic: {topic}</Badge> : null}
          {type ? <Badge tone="blue">Type: {type}</Badge> : null}
          {visibility ? <Badge tone={visibility === "public" ? "green" : "default"}>{visibility}</Badge> : null}
          {missing ? <Badge tone="amber">{missing.replaceAll("_", " ")}</Badge> : null}
          {(query || topic || type || visibility || missing) ? (
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded border border-[#d5d7de] bg-white px-2 py-1 text-xs font-medium text-[#0e3b69] hover:bg-[#eef4ff]"
              onClick={() => {
                setQuery("");
                setTopic("");
                setType("");
                setVisibility("");
                setMissing("");
              }}
            >
              <X className="h-3 w-3" /> Clear filters
            </button>
          ) : null}
        </div>
      </section>

      <section className="mt-4 rounded-lg border border-[#c3c6d0] bg-white p-4">
        <div className="flex flex-col gap-3 border-b border-[#e2e4ea] pb-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#5d6470]">Selection</p>
            <p className="mt-1 text-sm text-[#43474f]">
              <span className="font-semibold text-[#1a1c1c]">{selected.length}</span> selected
              {selected.length ? ` · ${publicSelected} public · ${privateSelected} private` : " · bulk actions are disabled until rows are selected"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="secondary" onClick={() => setSelected(filtered.map((note) => note.id))}>Select filtered</Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setSelected([])} disabled={!selected.length}>Clear selection</Button>
          </div>
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_1fr_1.3fr]">
          <ActionField label="Topic">
            <div className="grid gap-2">
              <CompactTopicPicker value={bulkTopic} onChange={setBulkTopic} label="New topic" />
              <Button
                type="button"
                variant="secondary"
                onClick={() => void applyUpdate({ topic: bulkTopic })}
                disabled={!selected.length}
                loading={busy}
                loadingLabel="Applying..."
              >
                Set topic
              </Button>
            </div>
          </ActionField>

          <ActionField label="Type / level">
            <div className="grid gap-2">
              <select className={inputClassName()} value={bulkType} onChange={(event) => setBulkType(event.target.value)}>
                {NOTE_TYPES.map((item) => <option key={item}>{item}</option>)}
              </select>
              <input className={inputClassName()} value={bulkLevel} onChange={(event) => setBulkLevel(event.target.value)} placeholder="Level 1-12, based on note type" />
              <Button
                type="button"
                variant="secondary"
                onClick={() => void applyUpdate({ note_type: bulkType, difficulty: bulkLevel ? Number(bulkLevel) : null })}
                disabled={!selected.length}
                loading={busy}
                loadingLabel="Applying..."
              >
                Set type/level
              </Button>
            </div>
          </ActionField>

          <ActionField label="Tags, visibility, and state">
            <div className="grid gap-2">
              <input className={inputClassName()} value={bulkTags} onChange={(event) => setBulkTags(event.target.value)} placeholder="add tags..." />
              <Button
                type="button"
                variant="secondary"
                onClick={() => void addTags()}
                disabled={!selected.length || !bulkTags.trim()}
                loading={busy}
                loadingLabel="Adding..."
              >
                Add tags
              </Button>
              <div className="grid gap-2 sm:grid-cols-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => void setBulkVisibility("public")}
                  disabled={!selected.length}
                  loading={busy}
                  loadingLabel="Publishing..."
                >
                  <Eye className="h-4 w-4" /> Make public
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => void setBulkVisibility("private")}
                  disabled={!selected.length}
                  loading={busy}
                  loadingLabel="Privatizing..."
                >
                  <EyeOff className="h-4 w-4" /> Make private
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => void applyUpdate({ is_archived: true })}
                  disabled={!selected.length}
                  loading={busy}
                  loadingLabel="Archiving..."
                >
                  <Archive className="h-4 w-4" />Archive
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => void applyUpdate({ is_favorite: true })}
                  disabled={!selected.length}
                  loading={busy}
                  loadingLabel="Updating..."
                >
                  <Star className="h-4 w-4" />Favorite
                </Button>
              </div>
            </div>
          </ActionField>
        </div>
      </section>

      <details className="mt-4 rounded-lg border border-[#ffd2cc] bg-[#fff7f5] p-4">
        <summary className="cursor-pointer list-none text-sm font-semibold text-[#8f1d15]">Danger zone: bulk delete</summary>
        <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
          <Field label="Bulk delete confirmation">
            <input className={inputClassName()} value={deleteConfirm} onChange={(event) => setDeleteConfirm(event.target.value)} placeholder="Type DELETE to delete selected notes" />
          </Field>
          <Button type="button" variant="danger" onClick={() => void deleteSelected()} disabled={deleteConfirm !== "DELETE"} loading={busy} loadingLabel="Deleting...">
            <Trash2 className="h-4 w-4" /> Delete selected
          </Button>
        </div>
        {message ? <p className="mt-3 text-sm text-[#8f1d15]">{message}</p> : null}
      </details>

      <section className="mt-6 overflow-x-auto rounded-lg border border-[#c3c6d0] bg-white">
        <table className="w-full min-w-[900px] border-collapse text-sm">
          <thead className="sticky top-0 bg-[#f9f9f9] text-left text-[12px] uppercase tracking-[0.06em] text-[#43474f]">
            <tr>
              <th className="p-3">Select</th>
              <th className="p-3">Title</th>
              <th className="p-3">Topic</th>
              <th className="p-3">Type</th>
              <th className="p-3">Visibility</th>
              <th className="p-3">Difficulty label</th>
              <th className="p-3">Quality</th>
              <th className="p-3">Tags</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((note) => {
              const quality = getCriteriaForNoteType(note);
              const checked = selected.includes(note.id);
              return (
                <tr key={note.id} className={cn("border-t border-[#e2e4ea]", checked && "bg-[#eef4ff]")}>
                  <td className="p-3"><input type="checkbox" checked={checked} onChange={() => toggle(note.id)} aria-label={`Select ${note.title}`} /></td>
                  <td className="max-w-sm p-3 font-semibold text-[#0e3b69]"><InlineMarkdown text={note.title} /></td>
                  <td className="p-3">{note.topic}</td>
                  <td className="p-3">{note.note_type}</td>
                  <td className="p-3"><Badge tone={note.visibility === "public" ? "green" : "default"}>{note.visibility}</Badge></td>
                  <td className="p-3"><DifficultyBadge value={note.difficulty} noteType={note.note_type} /></td>
                  <td className="p-3">
                    <span className={cn(
                      "font-semibold",
                      quality.completionPercent >= 85 ? "text-[#1d5a35]" : quality.completionPercent >= 65 ? "text-[#6b4a00]" : "text-[#8f1d15]"
                    )}>
                      {quality.completionPercent}%
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex max-w-md flex-wrap gap-1">
                      {note.tags.slice(0, 6).map((tag) => <Badge key={tag}>{tag}</Badge>)}
                      {note.tags.length > 6 ? <Badge tone="default">+{note.tags.length - 6}</Badge> : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </div>
  );
}
