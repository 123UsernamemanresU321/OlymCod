"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Link2, Trash2, Upload } from "lucide-react";
import { InlineMarkdown } from "@/components/editor/InlineMarkdown";
import { Button } from "@/components/ui/Button";
import { Field, inputClassName } from "@/components/ui/Field";
import { createClient } from "@/lib/supabase/client";
import type { Diagram, Note } from "@/lib/types";
import { safeFilename, validateDiagramFile } from "@/lib/utils/files";

type DiagramWithUrl = Diagram & { signed_url?: string | null };

interface DiagramManagerClientProps {
  diagrams: DiagramWithUrl[];
  notes: Note[];
}

export function DiagramManagerClient({ diagrams, notes }: DiagramManagerClientProps) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [attachNoteId, setAttachNoteId] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function uploadDiagram() {
    if (!file) {
      setMessage("Choose a diagram file first.");
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
      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (!user) throw new Error("You must be logged in.");
      const path = `${user.id}/unattached/${safeFilename(file.name)}`;
      const { error: uploadError } = await supabase.storage
        .from("note-diagrams")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (uploadError) throw uploadError;
      const { error: insertError } = await supabase.from("diagrams").insert({
        user_id: user.id,
        note_id: attachNoteId || null,
        storage_path: path,
        filename: file.name,
        mime_type: file.type || null,
        size_bytes: file.size,
        caption: caption.trim() || null
      });
      if (insertError) throw insertError;
      if (attachNoteId) {
        const note = notes.find((item) => item.id === attachNoteId);
        await supabase
          .from("notes")
          .update({ diagram_urls: [...(note?.diagram_urls ?? []), path] })
          .eq("id", attachNoteId);
      }
      setFile(null);
      setCaption("");
      setAttachNoteId("");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not upload diagram.");
    } finally {
      setBusy(false);
    }
  }

  async function attachDiagram(diagram: DiagramWithUrl, noteId: string) {
    const note = notes.find((item) => item.id === noteId);
    if (!note) return;
    const supabase = createClient();
    await supabase
      .from("notes")
      .update({ diagram_urls: Array.from(new Set([...note.diagram_urls, diagram.storage_path])) })
      .eq("id", noteId);
    await supabase.from("diagrams").update({ note_id: noteId }).eq("id", diagram.id);
    router.refresh();
  }

  async function removeFromNote(diagram: DiagramWithUrl) {
    if (!diagram.note_id) return;
    const note = notes.find((item) => item.id === diagram.note_id);
    const supabase = createClient();
    await supabase
      .from("notes")
      .update({ diagram_urls: (note?.diagram_urls ?? []).filter((path) => path !== diagram.storage_path) })
      .eq("id", diagram.note_id);
    await supabase.from("diagrams").update({ note_id: null }).eq("id", diagram.id);
    router.refresh();
  }

  async function deleteDiagram(diagram: DiagramWithUrl) {
    if (!window.confirm(`Delete ${diagram.filename}? This also removes the stored object.`)) return;
    const supabase = createClient();
    if (diagram.note_id) await removeFromNote(diagram);
    await supabase.storage.from("note-diagrams").remove([diagram.storage_path]);
    await supabase.from("diagrams").delete().eq("id", diagram.id);
    router.refresh();
  }

  async function copyMarkdown(diagram: DiagramWithUrl) {
    const text = `![${diagram.caption ?? diagram.filename}](${diagram.signed_url ?? diagram.storage_path})`;
    try {
      await navigator.clipboard.writeText(text);
      setMessage("Markdown image syntax copied.");
    } catch {
      setMessage(text);
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 lg:px-10">
      <div>
        <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[#0e3b69]">
          Geometry assets
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-[#1a1c1c]">Diagrams</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#43474f]">
          Manage SVG, PNG, and JPG diagrams stored in the private Supabase bucket.
        </p>
      </div>

      <section className="mt-6 rounded-lg border border-[#c3c6d0] bg-white p-5">
        <div className="grid gap-4 md:grid-cols-[1fr_1fr_1fr_auto] md:items-end">
          <Field label="Diagram">
            <input
              className={inputClassName()}
              type="file"
              accept=".svg,.png,.jpg,.jpeg,image/svg+xml,image/png,image/jpeg"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
          </Field>
          <Field label="Caption">
            <input className={inputClassName()} value={caption} onChange={(event) => setCaption(event.target.value)} />
          </Field>
          <Field label="Attach to note">
            <select className={inputClassName()} value={attachNoteId} onChange={(event) => setAttachNoteId(event.target.value)}>
              <option value="">Keep unattached</option>
              {notes.map((note) => (
                <option key={note.id} value={note.id}>
                  {note.title}
                </option>
              ))}
            </select>
          </Field>
          <Button type="button" onClick={() => void uploadDiagram()} disabled={busy}>
            <Upload className="h-4 w-4" aria-hidden="true" />
            Upload
          </Button>
        </div>
        {message ? <p className="mt-3 text-sm text-[#0e3b69]">{message}</p> : null}
      </section>

      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {diagrams.length ? (
          diagrams.map((diagram) => {
            const note = notes.find((item) => item.id === diagram.note_id);
            return (
              <article key={diagram.id} className="rounded-lg border border-[#c3c6d0] bg-white p-4">
                <div className="relative aspect-[4/3] overflow-hidden rounded border border-[#d5d7de] bg-[#f9f9f9]">
                  {diagram.signed_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={diagram.signed_url}
                      alt={diagram.caption ?? diagram.filename}
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <div className="grid h-full place-items-center text-sm text-[#43474f]">Preview unavailable</div>
                  )}
                </div>
                <h2 className="mt-3 truncate text-base font-semibold text-[#1a1c1c]">{diagram.filename}</h2>
                <p className="mt-1 text-sm text-[#43474f]">{diagram.caption ?? "No caption"}</p>
                <p className="mt-1 text-[12px] text-[#43474f]">
                  {note ? (
                    <>
                      Attached to <InlineMarkdown text={note.title} />
                    </>
                  ) : (
                    "Unattached"
                  )}
                </p>
                <div className="mt-4 grid gap-2">
                  <select
                    className={inputClassName()}
                    value={diagram.note_id ?? ""}
                    onChange={(event) => {
                      if (event.target.value) void attachDiagram(diagram, event.target.value);
                    }}
                  >
                    <option value="">Attach to note</option>
                    {notes.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.title}
                      </option>
                    ))}
                  </select>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="secondary" onClick={() => void copyMarkdown(diagram)}>
                      <Copy className="h-4 w-4" aria-hidden="true" />
                      Copy Markdown
                    </Button>
                    {diagram.note_id ? (
                      <Button type="button" variant="secondary" onClick={() => void removeFromNote(diagram)}>
                        <Link2 className="h-4 w-4" aria-hidden="true" />
                        Remove from note
                      </Button>
                    ) : null}
                    <Button type="button" variant="danger" onClick={() => void deleteDiagram(diagram)}>
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                      Delete
                    </Button>
                  </div>
                </div>
              </article>
            );
          })
        ) : (
          <p className="rounded border border-dashed border-[#c3c6d0] p-6 text-sm text-[#43474f] sm:col-span-2 xl:col-span-3">
            No diagram records yet. Upload one here or from a saved note.
          </p>
        )}
      </section>
    </div>
  );
}
