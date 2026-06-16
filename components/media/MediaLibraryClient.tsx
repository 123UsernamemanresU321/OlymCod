"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Link2, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, inputClassName } from "@/components/ui/Field";
import { StatusMessage } from "@/components/ui/Page";
import { createClient } from "@/lib/supabase/client";
import type { Diagram, Note } from "@/lib/types";
import { safeFilename, validateDiagramFile } from "@/lib/utils/files";
import { parseTags } from "@/lib/utils/tags";

type MediaAsset = Diagram & { signed_url?: string | null };

interface MediaLibraryClientProps {
  assets: MediaAsset[];
  notes: Note[];
}

export function MediaLibraryClient({ assets, notes }: MediaLibraryClientProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [file, setFile] = useState<File | null>(null);
  const [noteId, setNoteId] = useState("");
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [altText, setAltText] = useState("");
  const [tagsText, setTagsText] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return assets.filter((asset) => {
      const note = notes.find((item) => item.id === asset.note_id);
      const haystack = [
        asset.filename,
        asset.title,
        asset.caption,
        asset.alt_text,
        asset.tags?.join(" "),
        note?.title
      ].filter(Boolean).join(" ").toLowerCase();
      return !q || haystack.includes(q);
    });
  }, [assets, notes, query]);

  async function upload() {
    if (!file) {
      setMessage("Choose a file first.");
      return;
    }
    const validation = validateDiagramFile(file);
    if (validation) {
      setMessage(validation);
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("You must be logged in.");
      const path = `${user.id}/${noteId || "media"}/${safeFilename(file.name)}`;
      const { error: uploadError } = await supabase.storage.from("note-diagrams").upload(path, file, {
        contentType: file.type,
        upsert: false
      });
      if (uploadError) throw uploadError;
      const { error } = await supabase.from("diagrams").insert({
        user_id: user.id,
        note_id: noteId || null,
        storage_path: path,
        filename: file.name,
        mime_type: file.type || null,
        size_bytes: file.size,
        title: title.trim() || null,
        caption: caption.trim() || null,
        alt_text: altText.trim() || null,
        tags: parseTags(tagsText)
      });
      if (error) throw error;
      if (noteId) {
        const note = notes.find((item) => item.id === noteId);
        await supabase.from("notes").update({ diagram_urls: Array.from(new Set([...(note?.diagram_urls ?? []), path])) }).eq("id", noteId).eq("user_id", user.id);
      }
      setFile(null);
      setTitle("");
      setCaption("");
      setAltText("");
      setTagsText("");
      setNoteId("");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  async function updateAsset(asset: MediaAsset, update: Partial<Diagram>) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("diagrams").update(update).eq("id", asset.id).eq("user_id", user.id);
    router.refresh();
  }

  async function attach(asset: MediaAsset, nextNoteId: string) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const note = notes.find((item) => item.id === nextNoteId);
    if (!note) return;
    await supabase.from("notes").update({ diagram_urls: Array.from(new Set([...note.diagram_urls, asset.storage_path])) }).eq("id", nextNoteId).eq("user_id", user.id);
    await updateAsset(asset, { note_id: nextNoteId });
  }

  async function detach(asset: MediaAsset) {
    if (!asset.note_id) return;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const note = notes.find((item) => item.id === asset.note_id);
    await supabase.from("notes").update({ diagram_urls: (note?.diagram_urls ?? []).filter((path) => path !== asset.storage_path) }).eq("id", asset.note_id).eq("user_id", user.id);
    await updateAsset(asset, { note_id: null });
  }

  async function deleteAsset(asset: MediaAsset) {
    if (!window.confirm(`Delete ${asset.filename}?`)) return;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    if (asset.note_id) await detach(asset);
    await supabase.storage.from("note-diagrams").remove([asset.storage_path]);
    await supabase.from("diagrams").delete().eq("id", asset.id).eq("user_id", user.id);
    router.refresh();
  }

  async function copyMarkdown(asset: MediaAsset) {
    const markdown = `![${asset.alt_text || asset.caption || asset.filename}](${asset.storage_path})`;
    try {
      await navigator.clipboard.writeText(markdown);
      setMessage("Markdown image syntax copied.");
    } catch {
      setMessage(markdown);
    }
  }

  async function appendToLinkedNote(asset: MediaAsset) {
    if (!asset.note_id) {
      setMessage("Attach this media to a note before inserting it.");
      return;
    }
    const note = notes.find((item) => item.id === asset.note_id);
    if (!note) return;
    const markdown = `![${asset.alt_text || asset.caption || asset.filename}](${asset.storage_path})`;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase
      .from("notes")
      .update({ body_markdown: `${note.body_markdown.trimEnd()}\n\n${markdown}\n` })
      .eq("id", note.id)
      .eq("user_id", user.id);
    setMessage(error ? error.message : `Inserted media Markdown into ${note.title}.`);
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 lg:px-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[#0e3b69]">Reusable assets</p>
          <h1 className="mt-2 text-3xl font-semibold text-[#1a1c1c]">Media Library</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#43474f]">Manage diagrams, GeoGebra exports, screenshots, captions, alt text, and note attachments.</p>
        </div>
        <div className="inline-flex rounded border border-[#c3c6d0] bg-white p-1">
          <button type="button" className={`rounded px-3 py-1 text-sm ${view === "grid" ? "bg-[#dbeafe] text-[#0e3b69]" : "text-[#43474f]"}`} onClick={() => setView("grid")}>Grid</button>
          <button type="button" className={`rounded px-3 py-1 text-sm ${view === "list" ? "bg-[#dbeafe] text-[#0e3b69]" : "text-[#43474f]"}`} onClick={() => setView("list")}>List</button>
        </div>
      </div>

      <section className="mt-6 rounded-lg border border-[#c3c6d0] bg-white p-5">
        <div className="grid gap-4 lg:grid-cols-[1fr_0.8fr_0.8fr_0.8fr_0.8fr_auto] lg:items-end">
          <Field label="Upload media">
            <input className={inputClassName()} type="file" accept=".png,.jpg,.jpeg,image/png,image/jpeg" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
          </Field>
          <Field label="Title"><input className={inputClassName()} value={title} onChange={(event) => setTitle(event.target.value)} /></Field>
          <Field label="Caption"><input className={inputClassName()} value={caption} onChange={(event) => setCaption(event.target.value)} /></Field>
          <Field label="Alt text"><input className={inputClassName()} value={altText} onChange={(event) => setAltText(event.target.value)} /></Field>
          <Field label="Tags"><input className={inputClassName()} value={tagsText} onChange={(event) => setTagsText(event.target.value)} /></Field>
          <Button type="button" onClick={() => void upload()} loading={busy} loadingLabel="Uploading..."><Upload className="h-4 w-4" />Upload</Button>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr]">
          <Field label="Attach new upload to note">
            <select className={inputClassName()} value={noteId} onChange={(event) => setNoteId(event.target.value)}>
              <option value="">Unattached</option>
              {notes.map((note) => <option key={note.id} value={note.id}>{note.title}</option>)}
            </select>
          </Field>
          <Field label="Search media">
            <input className={inputClassName()} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="filename, caption, tag, linked note..." />
          </Field>
        </div>
        {message ? <StatusMessage className="mt-3">{message}</StatusMessage> : null}
      </section>

      <section className={view === "grid" ? "mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3" : "mt-6 grid gap-3"}>
        {filtered.map((asset) => {
          const linkedNote = notes.find((note) => note.id === asset.note_id);
          return (
            <article key={asset.id} className="rounded-lg border border-[#c3c6d0] bg-white p-4">
              <div className={view === "grid" ? "aspect-[4/3] overflow-hidden rounded border border-[#d5d7de] bg-[#f9f9f9]" : "hidden"}>
                {asset.signed_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={asset.signed_url} alt={asset.alt_text || asset.caption || asset.filename} className="h-full w-full object-contain" />
                ) : <div className="grid h-full place-items-center text-sm text-[#43474f]">Preview unavailable</div>}
              </div>
              <div className="mt-3 grid gap-2">
                <input className={inputClassName()} defaultValue={asset.title ?? ""} placeholder={asset.filename} onBlur={(event) => void updateAsset(asset, { title: event.target.value || null })} />
                <input className={inputClassName()} defaultValue={asset.caption ?? ""} placeholder="Caption" onBlur={(event) => void updateAsset(asset, { caption: event.target.value || null })} />
                <input className={inputClassName()} defaultValue={asset.alt_text ?? ""} placeholder="Alt text" onBlur={(event) => void updateAsset(asset, { alt_text: event.target.value || null })} />
                <input className={inputClassName()} defaultValue={(asset.tags ?? []).join(", ")} placeholder="tags" onBlur={(event) => void updateAsset(asset, { tags: parseTags(event.target.value) })} />
                <p className="text-xs text-[#43474f]">{linkedNote ? `Attached to ${linkedNote.title}` : "Unattached"} · {asset.mime_type ?? "unknown type"}</p>
                <select className={inputClassName()} value={asset.note_id ?? ""} onChange={(event) => event.target.value ? void attach(asset, event.target.value) : void detach(asset)}>
                  <option value="">Unattached</option>
                  {notes.map((note) => <option key={note.id} value={note.id}>{note.title}</option>)}
                </select>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="secondary" onClick={() => void copyMarkdown(asset)}><Copy className="h-4 w-4" />Copy Markdown</Button>
                  <Button type="button" variant="secondary" onClick={() => void appendToLinkedNote(asset)}>Insert into note</Button>
                  {asset.note_id ? <Button type="button" variant="secondary" onClick={() => void detach(asset)}><Link2 className="h-4 w-4" />Detach</Button> : null}
                  <Button type="button" variant="danger" onClick={() => void deleteAsset(asset)}><Trash2 className="h-4 w-4" />Delete</Button>
                </div>
              </div>
            </article>
          );
        })}
        {!filtered.length ? (
          <StatusMessage>No media assets match this search.</StatusMessage>
        ) : null}
      </section>
    </div>
  );
}
