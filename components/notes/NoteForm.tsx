"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Save, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { DiagramUpload } from "@/components/diagrams/DiagramUpload";
import { EditorToolbar } from "@/components/editor/EditorToolbar";
import { MarkdownPreview } from "@/components/editor/MarkdownPreview";
import { AIWritingAssistant } from "@/components/notes/AIWritingAssistant";
import { LinkedNotesManager } from "@/components/notes/LinkedNotesManager";
import { NoteQualityPanel } from "@/components/notes/NoteQualityPanel";
import { VersionHistory } from "@/components/notes/VersionHistory";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Field, inputClassName } from "@/components/ui/Field";
import { Toast } from "@/components/ui/Toast";
import { buildNoteTemplate, getNoteFormat } from "@/lib/constants/note-formats";
import { NOTE_TYPES, TOPICS } from "@/lib/constants/notes";
import { createClient } from "@/lib/supabase/client";
import type { Note, NoteDraft, ToastKind } from "@/lib/types";
import { cn } from "@/lib/utils/cn";
import { parseTags } from "@/lib/utils/tags";
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
      body_markdown: buildNoteTemplate("Theorem", "[Title]"),
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
  const [tagsText, setTagsText] = useState(() => noteToDraft(initialNote).tags.join(", "));
  const [savedId, setSavedId] = useState<string | null>(initialNote?.id ?? null);
  const [slugTouched, setSlugTouched] = useState(Boolean(initialNote?.slug));
  const [topicTouched, setTopicTouched] = useState(Boolean(initialNote?.topic));
  const [bodyUsesTemplate, setBodyUsesTemplate] = useState(!initialNote);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [mobileTab, setMobileTab] = useState<"edit" | "preview" | "metadata">("edit");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [localDraftStatus, setLocalDraftStatus] = useState("Local draft ready");

  const format = useMemo(() => getNoteFormat(draft.note_type), [draft.note_type]);

  function updateDraft(update: Partial<NoteDraft>) {
    setDraft((current) => ({ ...current, ...update }));
    setDirty(true);
  }

  useEffect(() => {
    if (!dirty) return;
    const key = `olympiad-codex-draft-${savedId ?? "new"}`;
    const timer = window.setTimeout(() => {
      window.localStorage.setItem(
        key,
        JSON.stringify({ draft, tagsText, savedAt: new Date().toISOString() })
      );
      setLocalDraftStatus("Saved locally");
    }, 1800);
    return () => window.clearTimeout(timer);
  }, [dirty, draft, savedId, tagsText]);

  function handleTitleChange(title: string) {
    const update: Partial<NoteDraft> = { title };
    if (!slugTouched) update.slug = titleToSlug(title);
    if (bodyUsesTemplate) {
      update.body_markdown = buildNoteTemplate(draft.note_type, title || "[Title]");
    }
    updateDraft(update);
  }

  function handleNoteTypeChange(noteType: string) {
    const nextFormat = getNoteFormat(noteType);
    const update: Partial<NoteDraft> = {
      note_type: noteType,
      difficulty: nextFormat.usesDifficulty
        ? draft.difficulty ?? nextFormat.defaultDifficulty ?? 3
        : null
    };

    if (!topicTouched) {
      update.topic = nextFormat.defaultTopic;
    }

    if (bodyUsesTemplate) {
      update.body_markdown = buildNoteTemplate(noteType, draft.title || "[Title]");
    }

    updateDraft(update);
  }

  function applyCurrentTemplate() {
    const hasBody = draft.body_markdown.trim().length > 0;
    if (
      hasBody &&
      !bodyUsesTemplate &&
      !window.confirm("Replace the current Markdown body with this note type template?")
    ) {
      return;
    }

    updateDraft({ body_markdown: buildNoteTemplate(draft.note_type, draft.title || "[Title]") });
    setBodyUsesTemplate(true);
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

  function getSelectedMarkdown() {
    const textarea = textareaRef.current;
    if (!textarea) return "";
    return draft.body_markdown.slice(textarea.selectionStart, textarea.selectionEnd);
  }

  function insertGeneratedMarkdown(markdown: string) {
    const textarea = textareaRef.current;
    setBodyUsesTemplate(false);

    if (!textarea) {
      updateDraft({ body_markdown: `${draft.body_markdown}${markdown}` });
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const next = `${draft.body_markdown.slice(0, start)}${markdown}${draft.body_markdown.slice(end)}`;
    updateDraft({ body_markdown: next });

    requestAnimationFrame(() => {
      textarea.focus();
      textarea.selectionStart = start + markdown.length;
      textarea.selectionEnd = start + markdown.length;
    });
  }

  function appendGeneratedMarkdown(markdown: string) {
    setBodyUsesTemplate(false);
    updateDraft({
      body_markdown: `${draft.body_markdown.trimEnd()}\n\n${markdown.trim()}`.trimStart()
    });
  }

  function replaceGeneratedMarkdown(markdown: string) {
    setBodyUsesTemplate(false);
    updateDraft({ body_markdown: markdown.trim() });
  }

  function applyAIMetadata(metadata: { description?: string | null; tags?: string[] }) {
    const update: Partial<NoteDraft> = {};
    if (metadata.description) update.description = metadata.description;
    if (metadata.tags?.length) {
      update.tags = metadata.tags;
      setTagsText(metadata.tags.join(", "));
    }
    updateDraft(update);
  }

  function buildPayload() {
    return {
      title: draft.title.trim(),
      slug: draft.slug.trim() || titleToSlug(draft.title),
      topic: draft.topic,
      note_type: draft.note_type,
      difficulty: format.usesDifficulty && draft.difficulty ? Number(draft.difficulty) : null,
      description: draft.description?.trim() || null,
      tags: parseTags(tagsText),
      body_markdown: draft.body_markdown.trim() || buildNoteTemplate(draft.note_type, draft.title),
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
        await supabase.from("note_versions").insert({
          user_id: user.id,
          note_id: savedId,
          title: initialNote?.title ?? draft.title,
          body_markdown: initialNote?.body_markdown ?? draft.body_markdown,
          metadata: {
            slug: initialNote?.slug ?? draft.slug,
            topic: initialNote?.topic ?? draft.topic,
            note_type: initialNote?.note_type ?? draft.note_type,
            difficulty: initialNote?.difficulty ?? draft.difficulty,
            description: initialNote?.description ?? draft.description,
            tags: initialNote?.tags ?? draft.tags,
            visibility: initialNote?.visibility ?? draft.visibility,
            is_favorite: initialNote?.is_favorite ?? draft.is_favorite
          }
        });
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
      setLocalDraftStatus("Saved to cloud");
      setToast({ kind: "success", title: "Draft Saved", message: "Changes saved to Supabase." });

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
              {dirty ? `Unsaved changes · ${localDraftStatus}` : mode === "create" ? "New note" : localDraftStatus}
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
          <div className="mb-6 flex border-b border-[#c3c6d0] lg:hidden">
            {(["edit", "preview", "metadata"] as const).map((tab) => (
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

          <div className={cn("rounded-lg border border-[#c3c6d0] bg-white p-6", mobileTab !== "metadata" && "hidden lg:block")}>
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
                    onChange={(event) => {
                      setTopicTouched(true);
                      updateDraft({ topic: event.target.value });
                    }}
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
                    onChange={(event) => handleNoteTypeChange(event.target.value)}
                  >
                    {NOTE_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </Field>
                {format.usesDifficulty ? (
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
                ) : (
                  <div className="rounded border border-[#d5d7de] bg-[#f9f9f9] px-3 py-2 text-sm leading-6 text-[#43474f]">
                    Difficulty is not used for {format.label.toLowerCase()} notes.
                  </div>
                )}
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
                  onChange={(event) => {
                    const nextTagsText = event.target.value;
                    setTagsText(nextTagsText);
                    updateDraft({ tags: parseTags(nextTagsText) });
                  }}
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
              <div className="rounded-lg border border-[#c3c6d0] bg-[#f9f9f9] p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-[#1a1c1c]">{format.label} format</p>
                    <p className="mt-1 text-sm leading-6 text-[#43474f]">{format.description}</p>
                  </div>
                  <Button type="button" variant="secondary" onClick={applyCurrentTemplate}>
                    Apply {format.label} template
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className={cn("mt-6", mobileTab !== "edit" && "hidden lg:block")}>
            <EditorToolbar onInsert={insertMarkdown} />
            <textarea
              ref={textareaRef}
              className="codex-scrollbar mt-0 min-h-[560px] w-full resize-y border border-t-0 border-[#c3c6d0] bg-white p-4 font-mono text-sm leading-7 text-[#1a1c1c] outline-none focus:ring-2 focus:ring-[#a5c8ff]"
              value={draft.body_markdown}
              onChange={(event) => {
                setBodyUsesTemplate(false);
                updateDraft({ body_markdown: event.target.value });
              }}
              placeholder="Write Markdown and LaTeX here..."
            />
          </div>

          <AIWritingAssistant
            draft={draft}
            noteId={savedId}
            getSelectedText={getSelectedMarkdown}
            onInsertMarkdown={insertGeneratedMarkdown}
            onAppendMarkdown={appendGeneratedMarkdown}
            onReplaceMarkdown={replaceGeneratedMarkdown}
            onApplyMetadata={applyAIMetadata}
          />

          <div className="mt-6">
            <DiagramUpload
              noteId={savedId}
              paths={draft.diagram_urls}
              onChange={(diagram_urls) =>
                setDraft((current) => ({ ...current, diagram_urls }))
              }
            />
          </div>

          <div className="mt-6 grid gap-6">
            <LinkedNotesManager noteId={savedId} draft={draft} />
            <NoteQualityPanel draft={draft} onAppendMarkdown={appendGeneratedMarkdown} />
            <VersionHistory noteId={savedId} />
          </div>
        </section>

        <section
          className={cn(
            "p-4 lg:block lg:min-h-[calc(100vh-64px)] lg:p-10",
            mobileTab !== "preview" && "hidden lg:block"
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
