"use client";

import { useMemo, useState } from "react";
import { Copy, Plus, Save, Trash2 } from "lucide-react";
import { MarkdownPreview } from "@/components/editor/MarkdownPreview";
import { TopicSelector } from "@/components/notes/TopicSelector";
import { Button } from "@/components/ui/Button";
import { Field, inputClassName } from "@/components/ui/Field";
import { noteTypeLearningFields } from "@/lib/constants/note-formats";
import { NOTE_TYPES } from "@/lib/constants/notes";
import { BUILT_IN_NOTE_TEMPLATES, isBuiltInTemplate } from "@/lib/templates/noteTemplates";
import { createClient } from "@/lib/supabase/client";
import type { NoteTemplate } from "@/lib/types";
import { parseTags } from "@/lib/utils/tags";

interface TemplateLibraryClientProps {
  customTemplates: NoteTemplate[];
}

function emptyTemplate(): NoteTemplate {
  return {
    id: "new",
    user_id: null,
    name: "",
    description: "",
    note_type: "Theorem",
    topic: "Number Theory",
    template_markdown: "# [Title]\n\n## Statement\n\n",
    default_recognition_triggers: [],
    default_false_uses: [],
    default_tags: [],
    created_at: null,
    updated_at: null
  };
}

export function TemplateLibraryClient({ customTemplates }: TemplateLibraryClientProps) {
  const [selectedId, setSelectedId] = useState<string>(BUILT_IN_NOTE_TEMPLATES[0]?.id ?? "new");
  const [draft, setDraft] = useState<NoteTemplate>(emptyTemplate());
  const [tagsText, setTagsText] = useState("");
  const [triggersText, setTriggersText] = useState("");
  const [falseUsesText, setFalseUsesText] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const templates = useMemo(() => [...BUILT_IN_NOTE_TEMPLATES, ...customTemplates], [customTemplates]);
  const selected = templates.find((template) => template.id === selectedId) ?? null;
  const shown = selectedId === "new" ? draft : selected;
  const editable = selectedId === "new" || Boolean(selected && !isBuiltInTemplate(selected));
  const activeDraft = selectedId === "new" ? draft : editable ? draft : shown;
  const learningFields = activeDraft ? noteTypeLearningFields(activeDraft.note_type) : noteTypeLearningFields("Theorem");

  function editTemplate(template: NoteTemplate) {
    setSelectedId(template.id);
    setDraft(template);
    setTagsText(template.default_tags.join(", "));
    setTriggersText(template.default_recognition_triggers.join("\n"));
    setFalseUsesText(template.default_false_uses.join("\n"));
  }

  function createNew() {
    const next = emptyTemplate();
    setSelectedId("new");
    setDraft(next);
    setTagsText("");
    setTriggersText("");
    setFalseUsesText("");
  }

  async function saveTemplate(duplicate = false) {
    const template = selectedId === "new" || duplicate || isBuiltInTemplate(draft) ? draft : { ...draft, id: selectedId };
    if (!template.name.trim()) {
      setMessage("Template name is required.");
      return;
    }
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setMessage("You must be logged in.");
      return;
    }
    const payload = {
      user_id: user.id,
      name: duplicate ? `${template.name} copy` : template.name,
      description: template.description || null,
      note_type: template.note_type,
      topic: template.topic || null,
      template_markdown: template.template_markdown,
      default_recognition_triggers: learningFields.recognitionTriggers
        ? triggersText.split(/\r?\n|,/).map((item) => item.trim()).filter(Boolean)
        : [],
      default_false_uses: learningFields.falseUses
        ? falseUsesText.split(/\r?\n|,/).map((item) => item.trim()).filter(Boolean)
        : [],
      default_tags: parseTags(tagsText)
    };
    const query = selectedId !== "new" && !duplicate && !isBuiltInTemplate({ id: selectedId })
      ? supabase.from("note_templates").update(payload).eq("id", selectedId).eq("user_id", user.id)
      : supabase.from("note_templates").insert(payload);
    const { error } = await query;
    setMessage(error ? error.message : "Template saved. Refreshing will show the latest list.");
  }

  async function deleteTemplate(template: NoteTemplate) {
    if (isBuiltInTemplate(template) || !window.confirm(`Delete custom template "${template.name}"?`)) return;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("note_templates").delete().eq("id", template.id).eq("user_id", user.id);
    setMessage(error ? error.message : "Template deleted. Refresh to update the list.");
  }

  return (
    <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 lg:grid-cols-[320px_minmax(0,1fr)] lg:px-10">
      <aside className="rounded-lg border border-[#c3c6d0] bg-white p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[#0e3b69]">Creation library</p>
            <h1 className="mt-1 text-2xl font-semibold text-[#1a1c1c]">Note Templates</h1>
          </div>
          <Button type="button" variant="secondary" onClick={createNew}>
            <Plus className="h-4 w-4" /> New
          </Button>
        </div>
        <div className="mt-4 grid gap-2">
          {templates.map((template) => (
            <button
              key={template.id}
              type="button"
              className={`rounded border p-3 text-left text-sm ${selectedId === template.id ? "border-[#2c5282] bg-[#eef4ff]" : "border-[#d5d7de] bg-[#f9f9f9]"}`}
              onClick={() => editTemplate(template)}
            >
              <span className="block font-semibold text-[#1a1c1c]">{template.name}</span>
              <span className="block text-xs text-[#43474f]">{template.note_type} · {template.topic ?? "No topic"} {isBuiltInTemplate(template) ? "· built-in" : ""}</span>
            </button>
          ))}
        </div>
      </aside>

      <main className="grid gap-5">
        {activeDraft ? (
          <section className="rounded-lg border border-[#c3c6d0] bg-white p-5">
            <div className="grid gap-4 lg:grid-cols-2">
              <Field label="Template name">
                <input className={inputClassName()} value={activeDraft.name} disabled={!editable} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
              </Field>
              <Field label="Note type">
                <select className={inputClassName()} value={activeDraft.note_type} disabled={!editable} onChange={(event) => setDraft({ ...draft, note_type: event.target.value })}>
                  {NOTE_TYPES.map((type) => <option key={type}>{type}</option>)}
                </select>
              </Field>
              <Field label="Topic">
                <TopicSelector value={activeDraft.topic ?? ""} onChange={(topic) => setDraft({ ...draft, topic })} />
              </Field>
              <Field label="Default tags">
                <input className={inputClassName()} value={editable ? tagsText : activeDraft.default_tags.join(", ")} disabled={!editable} onChange={(event) => setTagsText(event.target.value)} />
              </Field>
            </div>
            <Field label="Description">
              <textarea className={inputClassName("min-h-20")} value={activeDraft.description ?? ""} disabled={!editable} onChange={(event) => setDraft({ ...draft, description: event.target.value })} />
            </Field>
            {learningFields.recognitionTriggers || learningFields.falseUses ? (
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                {learningFields.recognitionTriggers ? (
                  <Field label="Default recognition triggers">
                    <textarea className={inputClassName("min-h-24")} value={editable ? triggersText : activeDraft.default_recognition_triggers.join("\n")} disabled={!editable} onChange={(event) => setTriggersText(event.target.value)} />
                  </Field>
                ) : null}
                {learningFields.falseUses ? (
                  <Field label="Default false uses">
                    <textarea className={inputClassName("min-h-24")} value={editable ? falseUsesText : activeDraft.default_false_uses.join("\n")} disabled={!editable} onChange={(event) => setFalseUsesText(event.target.value)} />
                  </Field>
                ) : null}
              </div>
            ) : null}
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <Field label="Template Markdown">
                <textarea className={inputClassName("min-h-[420px] font-mono text-sm")} value={activeDraft.template_markdown} disabled={!editable} onChange={(event) => setDraft({ ...draft, template_markdown: event.target.value })} />
              </Field>
              <div>
                <p className="mb-2 text-sm font-medium text-[#43474f]">Preview</p>
                <div className="min-h-[420px] rounded border border-[#d5d7de] bg-[#f9f9f9] p-4">
                  <MarkdownPreview markdown={activeDraft.template_markdown} />
                </div>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button type="button" onClick={() => void saveTemplate(false)} disabled={!editable}>
                <Save className="h-4 w-4" /> Save
              </Button>
              <Button type="button" variant="secondary" onClick={() => void saveTemplate(true)}>
                <Copy className="h-4 w-4" /> Duplicate as custom
              </Button>
              {selected && !isBuiltInTemplate(selected) ? (
                <Button type="button" variant="danger" onClick={() => void deleteTemplate(selected)}>
                  <Trash2 className="h-4 w-4" /> Delete
                </Button>
              ) : null}
            </div>
            {message ? <p className="mt-3 text-sm text-[#0e3b69]">{message}</p> : null}
          </section>
        ) : null}
      </main>
    </div>
  );
}
