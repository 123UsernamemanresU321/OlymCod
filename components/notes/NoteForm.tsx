"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Save, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { DiagramUpload } from "@/components/diagrams/DiagramUpload";
import { EditorToolbar } from "@/components/editor/EditorToolbar";
import { MarkdownPreview } from "@/components/editor/MarkdownPreview";
import { SectionEditor } from "@/components/editor/SectionEditor";
import { AIWritingAssistant } from "@/components/notes/AIWritingAssistant";
import { LearningMetadataList } from "@/components/notes/LearningMetadataList";
import { LinkedNotesManager } from "@/components/notes/LinkedNotesManager";
import { NoteQualityPanel } from "@/components/notes/NoteQualityPanel";
import { NoteOutline } from "@/components/notes/NoteOutline";
import { NoteSplitTool } from "@/components/notes/NoteSplitTool";
import { TopicSelector } from "@/components/notes/TopicSelector";
import { VersionHistory } from "@/components/notes/VersionHistory";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Field, inputClassName } from "@/components/ui/Field";
import { Toast } from "@/components/ui/Toast";
import {
  buildNoteTemplate,
  getNoteFormat,
  noteTypeDifficultyMeta,
  noteTypeLearningFields
} from "@/lib/constants/note-formats";
import { NOTE_TYPES } from "@/lib/constants/notes";
import { createClient } from "@/lib/supabase/client";
import { allTemplates, BUILT_IN_NOTE_TEMPLATES } from "@/lib/templates/noteTemplates";
import type { Note, NoteDraft, NoteTemplate, ToastKind } from "@/lib/types";
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

const EDITOR_LAYOUT_KEY = "olympiad-codex:note-editor-layout";
type EditorLayoutMode = "split" | "focus" | "metadata";

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
      recognition_triggers: [],
      false_uses: [],
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
    recognition_triggers: note.recognition_triggers ?? [],
    false_uses: note.false_uses ?? [],
    visibility: note.visibility ?? "private",
    is_favorite: note.is_favorite
  };
}

function parseLearningList(value: string) {
  return value
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function NoteForm({ initialNote = null, mode }: NoteFormProps) {
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [draft, setDraft] = useState<NoteDraft>(() => noteToDraft(initialNote));
  const [tagsText, setTagsText] = useState(() => noteToDraft(initialNote).tags.join(", "));
  const [recognitionText, setRecognitionText] = useState(() =>
    noteToDraft(initialNote).recognition_triggers.join("\n")
  );
  const [falseUsesText, setFalseUsesText] = useState(() => noteToDraft(initialNote).false_uses.join("\n"));
  const [savedId, setSavedId] = useState<string | null>(initialNote?.id ?? null);
  const [slugTouched, setSlugTouched] = useState(Boolean(initialNote?.slug));
  const [topicTouched, setTopicTouched] = useState(Boolean(initialNote?.topic));
  const [bodyUsesTemplate, setBodyUsesTemplate] = useState(!initialNote);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [mobileTab, setMobileTab] = useState<"edit" | "preview" | "metadata">("edit");
  const [editorMode, setEditorMode] = useState<"raw" | "sections">("raw");
  const [workspaceMode, setWorkspaceMode] = useState<EditorLayoutMode>(() => {
    if (typeof window === "undefined") return "split";
    const saved = window.localStorage.getItem(EDITOR_LAYOUT_KEY);
    return saved === "focus" || saved === "metadata" || saved === "split" ? saved : "split";
  });
  const [templates, setTemplates] = useState<NoteTemplate[]>(BUILT_IN_NOTE_TEMPLATES);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(BUILT_IN_NOTE_TEMPLATES[0]?.id ?? "");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [localDraftStatus, setLocalDraftStatus] = useState("Local draft ready");

  const format = useMemo(() => getNoteFormat(draft.note_type), [draft.note_type]);
  const difficultyMeta = useMemo(() => noteTypeDifficultyMeta(draft.note_type), [draft.note_type]);
  const learningFields = useMemo(() => noteTypeLearningFields(draft.note_type), [draft.note_type]);
  const selectedTemplate = templates.find((template) => template.id === selectedTemplateId) ?? templates[0] ?? null;
  const showPreviewPane = workspaceMode === "split";

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
        JSON.stringify({ draft, tagsText, recognitionText, falseUsesText, savedAt: new Date().toISOString() })
      );
      setLocalDraftStatus("Saved locally");
    }, 1800);
    return () => window.clearTimeout(timer);
  }, [dirty, draft, falseUsesText, recognitionText, savedId, tagsText]);

  useEffect(() => {
    let cancelled = false;
    async function loadTemplates() {
      const supabase = createClient();
      const { data } = await supabase.from("note_templates").select("*").order("updated_at", { ascending: false });
      if (!cancelled) setTemplates(allTemplates((data ?? []) as NoteTemplate[]));
    }
    void loadTemplates();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    window.localStorage.setItem(EDITOR_LAYOUT_KEY, workspaceMode);
  }, [workspaceMode]);

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

  function applySelectedTemplate() {
    if (!selectedTemplate) return;
    const hasBody = draft.body_markdown.trim().length > 0;
    if (hasBody && !bodyUsesTemplate && !window.confirm("Apply this template and replace the current Markdown body?")) {
      return;
    }
    const nextLearningFields = noteTypeLearningFields(selectedTemplate.note_type);
    const nextRecognitionTriggers = nextLearningFields.recognitionTriggers
      ? selectedTemplate.default_recognition_triggers
      : [];
    const nextFalseUses = nextLearningFields.falseUses ? selectedTemplate.default_false_uses : [];
    updateDraft({
      note_type: selectedTemplate.note_type,
      topic: selectedTemplate.topic ?? draft.topic,
      body_markdown: selectedTemplate.template_markdown.replaceAll("[Title]", draft.title || "[Title]"),
      recognition_triggers: nextRecognitionTriggers,
      false_uses: nextFalseUses,
      tags: selectedTemplate.default_tags.length ? selectedTemplate.default_tags : draft.tags
    });
    setRecognitionText(nextRecognitionTriggers.join("\n"));
    setFalseUsesText(nextFalseUses.join("\n"));
    if (selectedTemplate.default_tags.length) setTagsText(selectedTemplate.default_tags.join(", "));
    setBodyUsesTemplate(true);
  }

  async function saveCurrentAsTemplate() {
    const name = window.prompt("Template name", `${draft.title || draft.note_type} structure`);
    if (!name) return;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setToast({ kind: "error", title: "Template not saved", message: "You must be logged in." });
      return;
    }
    const { error: templateError } = await supabase.from("note_templates").insert({
      user_id: user.id,
      name,
      description: `Created from ${draft.title || "current note"}`,
      note_type: draft.note_type,
      topic: draft.topic,
      template_markdown: draft.body_markdown,
      default_recognition_triggers: learningFields.recognitionTriggers ? draft.recognition_triggers : [],
      default_false_uses: learningFields.falseUses ? draft.false_uses : [],
      default_tags: draft.tags
    });
    setToast(
      templateError
        ? { kind: "error", title: "Template not saved", message: templateError.message }
        : { kind: "success", title: "Template saved", message: "Open Templates to edit or duplicate it." }
    );
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

  function jumpEditorToHeading(title: string) {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const match = draft.body_markdown.match(new RegExp(`^#{1,6}\\s+${title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`, "m"));
    if (!match || match.index === undefined) return;
    textarea.focus();
    textarea.selectionStart = match.index;
    textarea.selectionEnd = match.index + match[0].length;
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

  function insertDiagramMarkdown(markdown: string) {
    const block = `\n\n${markdown.trim()}\n\n`;
    insertGeneratedMarkdown(block);
    setToast({
      kind: "success",
      title: "Diagram inserted",
      message: "The diagram Markdown was placed at your cursor and should render in Live Preview."
    });
  }

  function applyAIMetadata(metadata: {
    description?: string | null;
    tags?: string[];
    recognition_triggers?: string[];
    false_uses?: string[];
  }) {
    const update: Partial<NoteDraft> = {};
    if (metadata.description) update.description = metadata.description;
    if (metadata.tags?.length) {
      update.tags = metadata.tags;
      setTagsText(metadata.tags.join(", "));
    }
    if (learningFields.recognitionTriggers && metadata.recognition_triggers?.length) {
      update.recognition_triggers = metadata.recognition_triggers;
      setRecognitionText(metadata.recognition_triggers.join("\n"));
    }
    if (learningFields.falseUses && metadata.false_uses?.length) {
      update.false_uses = metadata.false_uses;
      setFalseUsesText(metadata.false_uses.join("\n"));
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
      recognition_triggers: learningFields.recognitionTriggers ? parseLearningList(recognitionText) : [],
      false_uses: learningFields.falseUses ? parseLearningList(falseUsesText) : [],
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
        const { data: currentNote } = await supabase.from("notes").select("*").eq("id", savedId).eq("user_id", user.id).maybeSingle();
        if (currentNote && JSON.stringify({
          title: currentNote.title,
          body_markdown: currentNote.body_markdown,
          topic: currentNote.topic,
          note_type: currentNote.note_type,
          difficulty: currentNote.difficulty,
          description: currentNote.description,
          tags: currentNote.tags,
          recognition_triggers: currentNote.recognition_triggers,
          false_uses: currentNote.false_uses,
          visibility: currentNote.visibility,
          is_favorite: currentNote.is_favorite
        }) !== JSON.stringify({
          title: payload.title,
          body_markdown: payload.body_markdown,
          topic: payload.topic,
          note_type: payload.note_type,
          difficulty: payload.difficulty,
          description: payload.description,
          tags: payload.tags,
          recognition_triggers: payload.recognition_triggers,
          false_uses: payload.false_uses,
          visibility: payload.visibility,
          is_favorite: payload.is_favorite
        })) {
          await supabase.from("note_versions").insert({
            user_id: user.id,
            note_id: savedId,
            title: currentNote.title,
            body_markdown: currentNote.body_markdown,
            metadata: {
              slug: currentNote.slug,
              topic: currentNote.topic,
              note_type: currentNote.note_type,
              difficulty: currentNote.difficulty,
              description: currentNote.description,
              tags: currentNote.tags,
              recognition_triggers: currentNote.recognition_triggers,
              false_uses: currentNote.false_uses,
              visibility: currentNote.visibility,
              is_favorite: currentNote.is_favorite
            }
          });
        }
        const { error: updateError } = await supabase
          .from("notes")
          .update(payload)
          .eq("id", savedId)
          .eq("user_id", user.id);

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
        .eq("id", savedId)
        .eq("user_id", user.id);

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
        <div className="mx-auto flex max-w-[1800px] flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="text-[13px] font-medium tracking-[0.04em] text-[#43474f]">
              {dirty ? `Unsaved changes · ${localDraftStatus}` : mode === "create" ? "New note" : localDraftStatus}
            </p>
            <h1 className="truncate text-xl font-semibold text-[#1a1c1c]">
              {draft.title || "Untitled Note"}
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="mr-1 inline-flex rounded border border-[#c3c6d0] bg-white p-1">
              {([
                ["split", "Split Preview"],
                ["focus", "Editor Focus"],
                ["metadata", "Metadata"]
              ] as const).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={cn(
                    "rounded px-2.5 py-1.5 text-[12px] font-medium text-[#43474f]",
                    workspaceMode === value && "bg-[#dbeafe] text-[#0e3b69]"
                  )}
                  onClick={() => setWorkspaceMode(value)}
                >
                  {label}
                </button>
              ))}
            </div>
            <Button type="button" variant="secondary" onClick={() => router.back()}>
              Cancel
            </Button>
            {savedId ? (
              <Button type="button" variant="danger" onClick={() => setDeleteOpen(true)}>
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                Delete
              </Button>
            ) : null}
            <Button type="button" onClick={() => void saveNote(false)} loading={busy} loadingLabel="Saving...">
              <Save className="h-4 w-4" aria-hidden="true" />
              Save
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

      <div
        className={cn(
          "mx-auto grid max-w-[1800px] gap-0 lg:h-[calc(100vh-120px)] lg:overflow-hidden",
          showPreviewPane
            ? "lg:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]"
            : "lg:grid-cols-1"
        )}
      >
        <section className="border-[#c3c6d0] p-4 lg:h-full lg:overflow-y-auto lg:border-r lg:p-10 pb-20">
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

          <div
            className={cn(
              "rounded-lg border border-[#c3c6d0] bg-white p-6",
              mobileTab !== "metadata" && "hidden lg:block",
              workspaceMode !== "metadata" && "lg:hidden"
            )}
          >
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
              <Field label="Topic">
                <TopicSelector
                  value={draft.topic}
                  includeInbox
                  onChange={(topic) => {
                    setTopicTouched(true);
                    updateDraft({ topic });
                  }}
                />
              </Field>
              <div className="grid gap-5 sm:grid-cols-3">
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
                {difficultyMeta.usesDifficulty ? (
                  <Field label={`${difficultyMeta.label} (1-12)`}>
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
              {learningFields.recognitionTriggers || learningFields.falseUses ? (
                <details className="rounded-lg border border-[#c3c6d0] bg-[#f9f9f9] p-4">
                  <summary className="cursor-pointer text-sm font-semibold text-[#1a1c1c]">
                    Recognition and traps · {draft.recognition_triggers.length + draft.false_uses.length} items
                  </summary>
                  <div className="mt-4 grid gap-4">
                    {learningFields.recognitionTriggers ? (
                      <Field label="Recognition Triggers">
                        <textarea
                          className={inputClassName("min-h-24")}
                          value={recognitionText}
                          onChange={(event) => {
                            const next = event.target.value;
                            setRecognitionText(next);
                            updateDraft({ recognition_triggers: parseLearningList(next) });
                          }}
                          placeholder="large exponent modulo n, three cevians in a triangle"
                        />
                      </Field>
                    ) : null}
                    {learningFields.falseUses ? (
                      <Field label="Common False Uses">
                        <textarea
                          className={inputClassName("min-h-24")}
                          value={falseUsesText}
                          onChange={(event) => {
                            const next = event.target.value;
                            setFalseUsesText(next);
                            updateDraft({ false_uses: parseLearningList(next) });
                          }}
                          placeholder="Do not use if gcd(a,n) is not 1."
                        />
                      </Field>
                    ) : null}
                  </div>
                </details>
              ) : null}
              <label className="flex items-center gap-3 text-sm font-medium text-[#43474f]">
                <input
                  type="checkbox"
                  checked={draft.is_favorite}
                  onChange={(event) => updateDraft({ is_favorite: event.target.checked })}
                />
                Favorite note
              </label>
              <details className="rounded-lg border border-[#c3c6d0] bg-[#f9f9f9] p-4">
                <summary className="cursor-pointer text-sm font-semibold text-[#1a1c1c]">
                  Templates and format
                </summary>
                <div className="mt-4 grid gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[#1a1c1c]">{format.label} format</p>
                    <p className="mt-1 text-sm leading-6 text-[#43474f]">{format.description}</p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
                    <select className={inputClassName()} value={selectedTemplateId} onChange={(event) => setSelectedTemplateId(event.target.value)}>
                      {templates.map((template) => (
                        <option key={template.id} value={template.id}>{template.name}</option>
                      ))}
                    </select>
                    <Button type="button" variant="secondary" onClick={applySelectedTemplate}>Apply selected</Button>
                    <Button type="button" variant="secondary" onClick={applyCurrentTemplate}>
                      Apply {format.label} default
                    </Button>
                  </div>
                  <Button type="button" variant="secondary" onClick={() => void saveCurrentAsTemplate()}>
                    Save current note as template
                  </Button>
                  {selectedTemplate ? (
                    <details className="rounded border border-[#d5d7de] bg-white p-3 text-sm text-[#43474f]">
                      <summary className="cursor-pointer font-medium text-[#0e3b69]">Preview template</summary>
                      <pre className="mt-3 max-h-56 overflow-auto whitespace-pre-wrap font-mono text-xs">{selectedTemplate.template_markdown}</pre>
                    </details>
                  ) : null}
                </div>
              </details>
            </div>
          </div>

          <div
            className={cn(
              "mt-6",
              mobileTab !== "edit" && "hidden lg:block",
              workspaceMode === "metadata" && "lg:hidden"
            )}
          >
            <div className="mb-3">
              <NoteOutline markdown={draft.body_markdown} compact onSelectHeading={jumpEditorToHeading} />
            </div>
            <div className="mb-3 inline-flex rounded border border-[#c3c6d0] bg-white p-1">
              {(["raw", "sections"] as const).map((modeValue) => (
                <button
                  key={modeValue}
                  type="button"
                  className={cn(
                    "rounded px-3 py-1.5 text-sm font-medium capitalize text-[#43474f]",
                    editorMode === modeValue && "bg-[#dbeafe] text-[#0e3b69]"
                  )}
                  onClick={() => setEditorMode(modeValue)}
                >
                  {modeValue === "raw" ? "Raw Markdown" : "Section Editor"}
                </button>
              ))}
            </div>
            {editorMode === "raw" ? (
              <>
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
              </>
            ) : (
              <SectionEditor
                markdown={draft.body_markdown}
                noteType={draft.note_type}
                title={draft.title}
                onChange={(body_markdown) => {
                  setBodyUsesTemplate(false);
                  updateDraft({ body_markdown });
                }}
              />
            )}
          </div>

          <details className="mt-6 rounded-lg border border-[#c3c6d0] bg-white p-4">
            <summary className="cursor-pointer list-none text-sm font-semibold text-[#1a1c1c]">
              Assistant, links, media, and safety tools
            </summary>
            <div className="mt-4 grid gap-6">
              <AIWritingAssistant
                draft={draft}
                noteId={savedId}
                getSelectedText={getSelectedMarkdown}
                onInsertMarkdown={insertGeneratedMarkdown}
                onAppendMarkdown={appendGeneratedMarkdown}
                onReplaceMarkdown={replaceGeneratedMarkdown}
                onApplyMetadata={applyAIMetadata}
              />

              <DiagramUpload
                noteId={savedId}
                paths={draft.diagram_urls}
                onInsertMarkdown={insertDiagramMarkdown}
                onChange={(diagram_urls) =>
                  setDraft((current) => ({ ...current, diagram_urls }))
                }
              />

              <LinkedNotesManager noteId={savedId} draft={draft} />
              <NoteQualityPanel draft={draft} onAppendMarkdown={appendGeneratedMarkdown} />
              <VersionHistory
                noteId={savedId}
                currentTitle={draft.title}
                currentBody={draft.body_markdown}
                currentMetadata={{
                  slug: draft.slug,
                  topic: draft.topic,
                  note_type: draft.note_type,
                  difficulty: draft.difficulty,
                  description: draft.description,
                  tags: draft.tags,
                  recognition_triggers: draft.recognition_triggers,
                  false_uses: draft.false_uses,
                  visibility: draft.visibility,
                  is_favorite: draft.is_favorite
                }}
              />
              {initialNote ? <NoteSplitTool note={initialNote} /> : null}
            </div>
          </details>
        </section>

        {showPreviewPane ? (
          <section
            className={cn(
              "p-4 lg:block lg:h-full lg:overflow-y-auto lg:p-10 pb-20",
              mobileTab !== "preview" && "hidden lg:block"
            )}
          >
            <div className="sticky top-20 mb-4 flex items-center justify-between border-b border-[#c3c6d0] bg-[#f9f9f9]/95 py-2 text-[13px] font-medium tracking-[0.04em] text-[#43474f] backdrop-blur lg:top-4">
              <span>Live Preview</span>
              <span>KaTeX</span>
            </div>
            <div className="rounded-lg border border-[#c3c6d0] bg-white p-6">
              <MarkdownPreview markdown={draft.body_markdown} />
              {learningFields.recognitionTriggers || learningFields.falseUses ? (
                <div className="mt-6 grid gap-4">
                  {learningFields.recognitionTriggers ? (
                    <LearningMetadataList
                      title="Recognition Triggers"
                      description="Metadata preview"
                      items={draft.recognition_triggers}
                      compact
                    />
                  ) : null}
                  {learningFields.falseUses ? (
                    <LearningMetadataList title="Common False Uses" items={draft.false_uses} tone="red" compact />
                  ) : null}
                </div>
              ) : null}
            </div>
          </section>
        ) : null}
      </div>

      <div className="fixed inset-x-0 bottom-16 z-30 border-t border-[#c3c6d0] bg-[#f9f9f9] p-4 lg:hidden">
        <Button type="button" fullWidth onClick={() => void saveNote(false)} loading={busy} loadingLabel="Saving...">
          <Save className="h-4 w-4" aria-hidden="true" />
          Save Note
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
