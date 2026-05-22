"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MarkdownPreview } from "@/components/editor/MarkdownPreview";
import { TopicSelector } from "@/components/notes/TopicSelector";
import { Button } from "@/components/ui/Button";
import { Field, inputClassName } from "@/components/ui/Field";
import { NOTE_TYPES } from "@/lib/constants/notes";
import { extractSpecificSection, parseMarkdownHeadings } from "@/lib/markdown/sections";
import { createClient } from "@/lib/supabase/client";
import { titleToSlug } from "@/lib/utils/slug";
import { parseTags } from "@/lib/utils/tags";

function guessTitle(markdown: string) {
  const h1 = markdown.match(/^#\s+(.+)$/m);
  return h1?.[1]?.trim() || markdown.split(/\r?\n/).find((line) => line.trim())?.slice(0, 80) || "Imported Note";
}

function guessType(markdown: string) {
  const lower = markdown.toLowerCase();
  if (lower.includes("## formula")) return "Formula";
  if (lower.includes("## definition")) return "Definition";
  if (lower.includes("## mistake")) return "Common Mistake";
  if (lower.includes("## proof") || lower.includes("## statement")) return "Theorem";
  return "Technique";
}

export function SmartImporterClient() {
  const router = useRouter();
  const [raw, setRaw] = useState("");
  const [topic, setTopic] = useState("Number Theory");
  const [noteType, setNoteType] = useState("Technique");
  const [tagsText, setTagsText] = useState("");
  const [splitByH1, setSplitByH1] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const headings = useMemo(() => parseMarkdownHeadings(raw), [raw]);
  const title = guessTitle(raw);
  const detectedType = guessType(raw);

  function useDetected() {
    setNoteType(detectedType);
  }

  async function readFile(file: File | null) {
    if (!file) return;
    if (!/\.(md|txt)$/i.test(file.name) || file.size > 1024 * 1024) {
      setMessage("Only .md/.txt files up to 1 MB are accepted.");
      return;
    }
    setRaw(await file.text());
  }

  async function importNotes() {
    if (!raw.trim()) {
      setMessage("Paste or upload content first.");
      return;
    }
    if (!window.confirm(splitByH1 ? "Import top-level sections as separate notes?" : "Import this content as one note?")) return;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setMessage("You must be logged in.");
      return;
    }
    const tags = parseTags(tagsText);
    const parts = splitByH1
      ? parseMarkdownHeadings(raw).filter((heading) => heading.level === 1).map((heading) => ({
          title: heading.title,
          body: `# ${heading.title}\n\n${heading.content}`
        }))
      : [{ title, body: raw }];
    for (const part of parts) {
      const recognition = extractSpecificSection(part.body, "Recognition Triggers")?.content.split(/\r?\n/).map((item) => item.replace(/^[-*]\s*/, "").trim()).filter(Boolean) ?? [];
      const falseUses = extractSpecificSection(part.body, "Common False Uses")?.content.split(/\r?\n/).map((item) => item.replace(/^[-*]\s*/, "").trim()).filter(Boolean) ?? [];
      const { error, data } = await supabase.from("notes").insert({
        user_id: user.id,
        title: part.title,
        slug: `${titleToSlug(part.title)}-${Date.now().toString(36)}`,
        topic,
        note_type: noteType,
        difficulty: noteType === "Formula" || noteType === "Definition" ? null : 3,
        description: "Imported from Markdown/Text",
        tags,
        body_markdown: part.body,
        recognition_triggers: recognition,
        false_uses: falseUses,
        diagram_urls: [],
        visibility: "private",
        is_archived: false,
        is_favorite: false
      }).select("id").single();
      if (error) {
        setMessage(error.message);
        return;
      }
      if (!splitByH1) {
        router.push(`/app/notes/${data.id}/edit`);
        return;
      }
    }
    setMessage(`Imported ${parts.length} notes.`);
    router.refresh();
  }

  return (
    <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 lg:grid-cols-2 lg:px-10">
      <section className="rounded-lg border border-[#c3c6d0] bg-white p-5">
        <h1 className="text-3xl font-semibold text-[#1a1c1c]">Smart Importer</h1>
        <p className="mt-2 text-sm leading-6 text-[#43474f]">Paste Markdown/plain text or upload a .md/.txt file, preview it, then save as one note or split by top-level headings.</p>
        <div className="mt-5 grid gap-4">
          <Field label="Upload .md or .txt">
            <input className={inputClassName()} type="file" accept=".md,.txt,text/markdown,text/plain" onChange={(event) => void readFile(event.target.files?.[0] ?? null)} />
          </Field>
          <Field label="Content">
            <textarea className={inputClassName("min-h-[360px] font-mono text-sm")} value={raw} onChange={(event) => setRaw(event.target.value)} placeholder="# My old note..." />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Topic"><TopicSelector value={topic} onChange={setTopic} /></Field>
            <Field label="Note type">
              <select className={inputClassName()} value={noteType} onChange={(event) => setNoteType(event.target.value)}>
                {NOTE_TYPES.map((type) => <option key={type}>{type}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Tags">
            <input className={inputClassName()} value={tagsText} onChange={(event) => setTagsText(event.target.value)} placeholder="imported, geometry" />
          </Field>
          <label className="flex items-center gap-2 text-sm text-[#43474f]">
            <input type="checkbox" checked={splitByH1} onChange={(event) => setSplitByH1(event.target.checked)} />
            Split by top-level `#` headings
          </label>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={useDetected}>Use detected type: {detectedType}</Button>
            <Button type="button" onClick={() => void importNotes()}>Import</Button>
          </div>
          {message ? <p className="text-sm text-[#0e3b69]">{message}</p> : null}
        </div>
      </section>
      <aside className="rounded-lg border border-[#c3c6d0] bg-white p-5">
        <h2 className="text-lg font-semibold text-[#1a1c1c]">Preview</h2>
        <p className="mt-1 text-sm text-[#43474f]">Detected title: {title}. Headings: {headings.length}.</p>
        <div className="mt-4 rounded border border-[#d5d7de] bg-[#f9f9f9] p-4">
          <MarkdownPreview markdown={raw || "Nothing to preview yet."} />
        </div>
      </aside>
    </div>
  );
}
