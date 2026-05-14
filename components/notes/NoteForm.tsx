"use client";

import { useMemo, useRef, useState } from "react";
import { Save, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { DiagramUpload } from "@/components/diagrams/DiagramUpload";
import { EditorToolbar } from "@/components/editor/EditorToolbar";
import { MarkdownPreview } from "@/components/editor/MarkdownPreview";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Field, inputClassName } from "@/components/ui/Field";
import { Toast } from "@/components/ui/Toast";
import { DEFAULT_NOTE_TEMPLATE, NOTE_TYPES, TOPICS } from "@/lib/constants/notes";
import { createClient } from "@/lib/supabase/client";
import type { Note, NoteDraft, ToastKind } from "@/lib/types";
import { cn } from "@/lib/utils/cn";
import { titleToSlug } from "@/lib/utils/slug";

interface NoteFormProps {
  initialNote?: Note | null;
  mode: "create" | "edit";
}

type ToastState = {
  kind: ToastKind;
  title: string;
  message?: string;
};

function noteToDraft(note?: Note | null): NoteDraft {
  if (!note) {
    return {
      title: "",
      slug: "",
      topic: "Number Theory",
      note_type: "Theorem",
      difficulty: 4,
      description: "",
      tags: [],
      body_markdown: DEFAULT_NOTE_TEMPLATE,
      diagram_urls: [],
      visibility: "private",
      is_favorite: false
    };
  }

  return {
    title: note.title,
    slug: note.slug,
    topic: note.topic,
    note_type: note.note_type,
    difficulty: note.difficulty,
    description: note.description ?? "",
    tags: note.tags ?? [],
    body_markdown: note.body_markdown,
    diagram_urls: note.diagram_urls ?? [],
    visibility: note.visibility ?? "private",
    is_favorite: note.is_favorite
  };
}

export function NoteForm({ initialNote = null, mode }: NoteFormProps) {
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [draft, setDraft] = useState<NoteDraft>(() => noteToDraft(initialNote));
  const [savedId, setSavedId] = useState<string | null>(initialNote?.id ?? null);
  const [slugTouched, setSlugTouched] = useState(Boolean(initialNote?.slug));
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [mobileTab, setMobileTab] = useState<"edit" | "preview">("edit");
  const [deleteOpen, setDeleteOpen] = useState(false);

  const tagsText = useMemo(() => draft.tags.join(", "), [draft.tags]);

  function updateDraft(update: Partial<NoteDraft>) {
    setDraft((current) => ({ ...current, ...update }));
    setDirty(true);
  }

  function handleTitleChange(title: string) {
    const update: Partial<NoteDraft> = { title };
    if (!slugTouched) update.slug = titleToSlug(title);
    if (!initialNote && draft.body_markdown === DEFAULT_NOTE_TEMPLATE) {
      update.body_markdown = DEFAULT_NOTE_TEMPLATE.replace("[Title]", title || "[Title]");
    }
    updateDraft(update);
  }

  function insertMarkdown(before: string, after = "") {
    const textarea = textareaRef.current;
    if (!textarea) {
      updateDraft({ body_markdown: `${draft.body_markdown}${before}${after}` });
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = draft.body_markdown.slice(start, end);
    const next = `${draft.body_markdown.slice(0, start)}${before}${selected}${after}${draft.body_markdown.slice(end)}`;
    updateDraft({ body_markdown: next });

    requestAnimationFrame(() => {
      textarea.focus();
      textarea.selectionStart = start + before.length;
      textarea.selectionEnd = start + before.length + selected.length;
    });
  }

  function buildPayload() {
    return {
      title: draft.title.trim(),
      slug: draft.slug.trim() || titleToSlug(draft.title),
      topic: draft.topic,
      note_type: draft.note_type,
      difficulty: draft.difficulty ? Number(draft.difficulty) : null,
      description: draft.description?.trim() || null,
      tags: draft.tags.map((tag) => tag.trim()).filter(Boolean),
      body_markdown: draft.body_markdown.trim() || DEFAULT_NOTE_TEMPLATE,
      diagram_urls: draft.diagram_urls,
      visibility: draft.visibility,
      published_at: draft.visibility === "public" ? new Date().toISOString() : null,
      is_favorite: draft.is_favorite,
      is_archived: false
    };
  }

  async function saveNote(viewAfterSave = false) {
    setBusy(true);
    setError(null);

    try {
      const supabase = createClient();
      const {
        data: { user },
        error: userError
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error(userError?.message ?? "You must be logged in to save notes.");
      }

      const payload = buildPayload();
      if (!payload.title) throw new Error("Title is required.");
      if (!payload.slug) throw new Error("Slug is required.");

      let targetId = savedId;
      if (savedId) {
        const { error: updateError } = await supabase
          .from("notes")
          .update(payload)
          .eq("id", savedId);

        if (updateError) throw updateError;
      } else {
        const { data, error: insertError } = await supabase
          .from("notes")
          .insert({ ...payload, user_id: user.id })
          .select("id")
          .single();

        if (insertError) throw insertError;
        targetId = data.id;
        setSavedId(data.id);

        if (!viewAfterSave) {
          router.replace(`/app/notes/${data.id}/edit`);
          router.refresh();
        }
      }

      setDirty(false);
      setToast({ kind: "success", title: "Draft Saved", message: "Changes committed locally." });

      if (viewAfterSave) {
        router.push(`/app/notes/${targetId}`);
        router.refresh();
      } else {
        router.refresh();
      }
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save note.");
      setToast({ kind: "error", title: "Save failed", message: "Review the note fields and try again." });
    } finally {
      setBusy(false);
    }
  }

  async function deleteNote() {
    if (!savedId) return;
    setBusy(true);

    try {
      const supabase = createClient();
      const {
        data: { user },
        error: userError
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error(userError?.message ?? "You must be logged in to delete notes.");
      }

      const { error: deleteError } = await supabase
        .from("notes")
        .delete()
        .eq("id", savedId);

      if (deleteError) throw deleteError;

      router.push("/app/notes");
      router.refresh();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Could not delete note.");
      setDeleteOpen(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f9f9f9]">
      <div className="sticky top-16 z-20 border-b border-[#c3c6d0] bg-[#f9f9f9]/95 px-4 py-3 backdrop-blur lg:top-0">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[13px] font-medium tracking-[0.04em] text-[#43474f]">
              {dirty ? "Unsaved changes" : mode === "create" ? "New note" : "All changes saved"}
            </p>
            <h1 className="truncate text-xl font-semibold text-[#1a1c1c]">
              {draft.title || "Untitled Note"}
            </h1>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button type="button" variant="secondary" onClick={() => router.back()}>
              Cancel
            </Button>
            {savedId ? (
              <Button type="button" variant="danger" onClick={() => setDeleteOpen(true)}>
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                Delete
              </Button>
            ) : null}
            <Button type="button" onClick={() => void saveNote(false)} disabled={busy}>
              <Save className="h-4 w-4" aria-hidden="true" />
              {busy ? "Saving..." : "Save"}
            </Button>
            <Button type="button" variant="secondary" onClick={() => void saveNote(true)} disabled={busy}>
              Save and View
            </Button>
          </div>
        </div>
      </div>

      {error ? (
        <div className="mx-auto mt-6 max-w-7xl px-4">
          <div className="rounded border border-[#ffb4ab] bg-[#ffdad6] px-4 py-3 text-sm text-[#8f1d15]">
            {error}
          </div>
        </div>
      ) : null}

      <div className="mx-auto grid max-w-7xl gap-0 lg:grid-cols-2">
        <section className="border-[#c3c6d0] p-4 lg:min-h-[calc(100vh-64px)] lg:border-r lg:p-10">
          <div className="rounded-lg border border-[#c3c6d0] bg-white p-6">
            <div className="grid gap-5">
              <Field label="Title">
                <input
                  className={inputClassName("text-lg font-semibold")}
                  value={draft.title}
                  onChange={(event) => handleTitleChange(event.target.value)}
                  placeholder="Euler Phi Theorem"
                  required
                />
              </Field>
              <Field label="Slug">
                <input
                  className={inputClassName()}
                  value={draft.slug}
                  onChange={(event) => {
                    setSlugTouched(true);
                    updateDraft({ slug: titleToSlug(event.target.value) });
                  }}
                  placeholder="euler-phi-theorem"
                  required
                />
              </Field>
              <div className="grid gap-5 sm:grid-cols-4">
                <Field label="Topic">
                  <select
                    className={inputClassName()}
                    value={draft.topic}
                    onChange={(event) => updateDraft({ topic: event.target.value })}
                  >
                    {TOPICS.map((topic) => (
                      <option key={topic} value={topic}>
                        {topic}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Note type">
                  <select
                    className={inputClassName()}
                    value={draft.note_type}
                    onChange={(event) => updateDraft({ note_type: event.target.value })}
                  >
                    {NOTE_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Difficulty (1-12)">
                  <input
                    className={inputClassName()}
                    type="number"
                    min={1}
                    max={12}
                    value={draft.difficulty ?? ""}
                    onChange={(event) =>
                      updateDraft({
                        difficulty: event.target.value ? Number(event.target.value) : null
                      })
                    }
                  />
                </Field>
                <Field label="Visibility">
                  <select
                    className={inputClassName()}
                    value={draft.visibility}
                    onChange={(event) =>
                      updateDraft({ visibility: event.target.value as "private" | "public" })
                    }
                  >
                    <option value="private">Private</option>
                    <option value="public">Public</option>
                  </select>
                </Field>
              </div>
              <Field label="Description">
                <textarea
                  className={inputClassName("min-h-24")}
                  value={draft.description ?? ""}
                  onChange={(event) => updateDraft({ description: event.target.value })}
                  placeholder="A short description for search and note cards."
                />
              </Field>
              <Field label="Tags">
                <input
                  className={inputClassName()}
                  value={tagsText}
                  onChange={(event) =>
                    updateDraft({
                      tags: event.target.value
                        .split(",")
                        .map((tag) => tag.trim())
                        .filter(Boolean)
                    })
                  }
                  placeholder="modular arithmetic, phi, coprime"
                />
              </Field>
              <label className="flex items-center gap-3 text-sm font-medium text-[#43474f]">
                <input
                  type="checkbox"
                  checked={draft.is_favorite}
                  onChange={(event) => updateDraft({ is_favorite: event.target.checked })}
                />
                Favorite note
              </label>
            </div>
          </div>

          <div className="mt-6 lg:hidden">
            <div className="flex border-b border-[#c3c6d0]">
              {(["edit", "preview"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  className={cn(
                    "px-4 py-2 text-sm font-medium capitalize text-[#43474f]",
                    mobileTab === tab && "border-b-2 border-[#0e3b69] text-[#0e3b69]"
                  )}
                  onClick={() => setMobileTab(tab)}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <div className={cn("mt-6", mobileTab === "preview" && "hidden lg:block")}>
            <EditorToolbar onInsert={insertMarkdown} />
            <textarea
              ref={textareaRef}
              className="codex-scrollbar mt-0 min-h-[560px] w-full resize-y border border-t-0 border-[#c3c6d0] bg-white p-4 font-mono text-sm leading-7 text-[#1a1c1c] outline-none focus:ring-2 focus:ring-[#a5c8ff]"
              value={draft.body_markdown}
              onChange={(event) => updateDraft({ body_markdown: event.target.value })}
              placeholder="Write Markdown and LaTeX here..."
            />
          </div>

          <div className="mt-6">
            <DiagramUpload
              noteId={savedId}
              paths={draft.diagram_urls}
              onChange={(diagram_urls) =>
                setDraft((current) => ({ ...current, diagram_urls }))
              }
            />
          </div>
        </section>

        <section
          className={cn(
            "p-4 lg:block lg:min-h-[calc(100vh-64px)] lg:p-10",
            mobileTab === "edit" && "hidden"
          )}
        >
          <div className="sticky top-20 mb-4 flex items-center justify-between border-b border-[#c3c6d0] bg-[#f9f9f9]/95 py-2 text-[13px] font-medium tracking-[0.04em] text-[#43474f] backdrop-blur lg:top-4">
            <span>Live Preview</span>
            <span>KaTeX</span>
          </div>
          <div className="rounded-lg border border-[#c3c6d0] bg-white p-6">
            <MarkdownPreview markdown={draft.body_markdown} />
          </div>
        </section>
      </div>

      <div className="fixed inset-x-0 bottom-16 z-30 border-t border-[#c3c6d0] bg-[#f9f9f9] p-4 lg:hidden">
        <Button type="button" className="w-full" onClick={() => void saveNote(false)} disabled={busy}>
          <Save className="h-4 w-4" aria-hidden="true" />
          {busy ? "Saving..." : "Save Note"}
        </Button>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        title="Delete note"
        body={`Are you sure you want to permanently remove "${draft.title || "this note"}"? This action cannot be undone.`}
        confirmLabel="Delete note"
        onCancel={() => setDeleteOpen(false)}
        onConfirm={() => void deleteNote()}
        busy={busy}
      />

      {toast ? (
        <Toast
          kind={toast.kind}
          title={toast.title}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      ) : null}
    </div>
  );
}
