"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Archive, ArrowRight, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Field, inputClassName } from "@/components/ui/Field";
import { TopicSelector } from "@/components/notes/TopicSelector";
import {
  CONVERSION_TEMPLATE_TYPES,
  buildConversionTemplate,
  templateToNoteDefaults,
  type ConversionTemplateType
} from "@/lib/constants/daily";
import { createClient } from "@/lib/supabase/client";
import type { QuickCapture } from "@/lib/types";
import { parseTags } from "@/lib/utils/tags";
import { titleToSlug } from "@/lib/utils/slug";
import { cn } from "@/lib/utils/cn";

interface CaptureClientProps {
  captures: QuickCapture[];
  initialConvertId?: string | null;
}

type CaptureFilter = "active" | "converted" | "archived" | "all";

function guessTitle(capture: QuickCapture | null) {
  if (!capture) return "";
  const firstLine = capture.raw_text.split("\n").find(Boolean) ?? "Captured idea";
  return firstLine.replace(/^#+\s*/, "").slice(0, 72);
}

export function CaptureClient({ captures, initialConvertId = null }: CaptureClientProps) {
  const router = useRouter();
  const initialCapture = captures.find((capture) => capture.id === initialConvertId) ?? null;
  const [filter, setFilter] = useState<CaptureFilter>("active");
  const [typeFilter, setTypeFilter] = useState("");
  const [selectedCapture, setSelectedCapture] = useState<QuickCapture | null>(initialCapture);
  const [templateType, setTemplateType] = useState<ConversionTemplateType>("Technique");
  const [title, setTitle] = useState(() => guessTitle(initialCapture));
  const [topic, setTopic] = useState(initialCapture?.topic_guess ?? "Number Theory");
  const [difficulty, setDifficulty] = useState<number | null>(4);
  const [tagsText, setTagsText] = useState(() => (initialCapture?.tags ?? []).join(", "));
  const [body, setBody] = useState(() =>
    buildConversionTemplate("Technique", guessTitle(initialCapture), initialCapture?.raw_text ?? "")
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const visibleCaptures = useMemo(() => {
    return captures.filter((capture) => {
      if (filter === "active" && (capture.is_archived || capture.is_converted)) return false;
      if (filter === "converted" && !capture.is_converted) return false;
      if (filter === "archived" && !capture.is_archived) return false;
      if (typeFilter && capture.capture_type !== typeFilter) return false;
      return true;
    });
  }, [captures, filter, typeFilter]);

  function startConversion(capture: QuickCapture) {
    const nextTemplate =
      capture.capture_type === "Formula"
        ? "Formula"
        : capture.capture_type === "Theorem"
          ? "Theorem"
          : capture.capture_type === "Mistake"
            ? "Mistake"
            : capture.capture_type === "Geometry Diagram"
              ? "Geometry"
              : capture.capture_type === "Problem Pattern"
                ? "Problem Pattern"
                : "Technique";
    const defaults = templateToNoteDefaults(nextTemplate);
    const nextTitle = guessTitle(capture);

    setSelectedCapture(capture);
    setTemplateType(nextTemplate);
    setTitle(nextTitle);
    setTopic(capture.topic_guess ?? defaults.topic);
    setDifficulty(defaults.difficulty);
    setTagsText(capture.tags.join(", "));
    setBody(buildConversionTemplate(nextTemplate, nextTitle, capture.raw_text));
    setError(null);
  }

  function changeTemplate(nextTemplate: ConversionTemplateType) {
    const defaults = templateToNoteDefaults(nextTemplate);
    setTemplateType(nextTemplate);
    setTopic((current) => current || defaults.topic);
    setDifficulty(defaults.difficulty);
    setBody(buildConversionTemplate(nextTemplate, title, selectedCapture?.raw_text ?? ""));
  }

  async function archiveCapture(capture: QuickCapture) {
    const supabase = createClient();
    await supabase.from("quick_captures").update({ is_archived: true }).eq("id", capture.id);
    router.refresh();
  }

  async function convertCapture() {
    if (!selectedCapture) return;
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const supabase = createClient();
      const {
        data: { user },
        error: userError
      } = await supabase.auth.getUser();
      if (userError || !user) throw new Error(userError?.message ?? "You must be logged in.");

      const defaults = templateToNoteDefaults(templateType);
      const slug = `${titleToSlug(title)}-${Date.now().toString(36)}`;
      const { data, error: insertError } = await supabase
        .from("notes")
        .insert({
          user_id: user.id,
          title: title.trim(),
          slug,
          topic: topic || defaults.topic,
          note_type: defaults.note_type,
          difficulty: defaults.difficulty === null ? null : difficulty ?? defaults.difficulty,
          description: selectedCapture.raw_text.slice(0, 180),
          tags: parseTags(tagsText),
          body_markdown: body.trim(),
          diagram_urls: selectedCapture.attachment_urls,
          visibility: "private",
          is_favorite: false,
          is_archived: false
        })
        .select("id")
        .single();
      if (insertError) throw insertError;

      await supabase
        .from("quick_captures")
        .update({ is_converted: true, converted_note_id: data.id })
        .eq("id", selectedCapture.id);

      router.push(`/app/notes/${data.id}/edit`);
      router.refresh();
    } catch (convertError) {
      setError(convertError instanceof Error ? convertError.message : "Could not convert capture.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 lg:px-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[#0e3b69]">
            Fast inbox
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-[#1a1c1c]">Capture</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#43474f]">
            Store rough thoughts quickly, then convert the useful ones into polished notes.
          </p>
        </div>
        <Link
          href="/app/notes/new"
          className="inline-flex min-h-9 items-center justify-center gap-2 rounded border border-[#2c5282] bg-[#2c5282] px-4 py-2 text-[13px] font-medium tracking-[0.04em] text-white"
        >
          New Note
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_420px]">
        <section className="rounded-lg border border-[#c3c6d0] bg-white p-5">
          <div className="flex flex-col gap-3 border-b border-[#c3c6d0] pb-4 sm:flex-row">
            <select
              className={inputClassName("sm:max-w-44")}
              value={filter}
              onChange={(event) => setFilter(event.target.value as CaptureFilter)}
            >
              <option value="active">Unconverted</option>
              <option value="converted">Converted</option>
              <option value="archived">Archived</option>
              <option value="all">All captures</option>
            </select>
            <select
              className={inputClassName("sm:max-w-52")}
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
            >
              <option value="">All types</option>
              {[...new Set(captures.map((capture) => capture.capture_type))].map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-5 grid gap-3">
            {visibleCaptures.length ? (
              visibleCaptures.map((capture) => (
                <article
                  key={capture.id}
                  className={cn(
                    "rounded border border-[#d5d7de] bg-[#f9f9f9] p-4",
                    selectedCapture?.id === capture.id && "border-[#2c5282] bg-[#eef4ff]"
                  )}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="blue">{capture.capture_type}</Badge>
                    {capture.topic_guess ? <Badge>{capture.topic_guess}</Badge> : null}
                    {capture.is_converted ? <Badge tone="green">Converted</Badge> : null}
                    {capture.is_archived ? <Badge>Archived</Badge> : null}
                  </div>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[#1a1c1c]">
                    {capture.raw_text}
                  </p>
                  {capture.tags.length ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {capture.tags.map((tag) => (
                        <span key={tag} className="text-[12px] text-[#0e3b69]">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  <div className="mt-4 flex flex-wrap gap-2">
                    {!capture.is_converted ? (
                      <Button type="button" variant="secondary" onClick={() => startConversion(capture)}>
                        Convert to Full Note
                      </Button>
                    ) : capture.converted_note_id ? (
                      <Link
                        href={`/app/notes/${capture.converted_note_id}`}
                        className="inline-flex min-h-9 items-center justify-center gap-2 rounded border border-[#c3c6d0] px-4 py-2 text-[13px] font-medium text-[#0e3b69]"
                      >
                        <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                        View note
                      </Link>
                    ) : null}
                    {!capture.is_archived ? (
                      <Button type="button" variant="ghost" onClick={() => void archiveCapture(capture)}>
                        <Archive className="h-4 w-4" aria-hidden="true" />
                        Archive
                      </Button>
                    ) : null}
                  </div>
                </article>
              ))
            ) : (
              <p className="rounded border border-dashed border-[#c3c6d0] p-6 text-sm text-[#43474f]">
                No captures match these filters.
              </p>
            )}
          </div>
        </section>

        <aside className="rounded-lg border border-[#c3c6d0] bg-white p-5 lg:sticky lg:top-6 lg:self-start">
          <h2 className="text-lg font-semibold text-[#1a1c1c]">Inbox-to-note converter</h2>
          {selectedCapture ? (
            <div className="mt-4 grid gap-4">
              <Field label="Template">
                <select
                  className={inputClassName()}
                  value={templateType}
                  onChange={(event) => changeTemplate(event.target.value as ConversionTemplateType)}
                >
                  {CONVERSION_TEMPLATE_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Title">
                <input
                  className={inputClassName()}
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Topic">
                  <TopicSelector value={topic} onChange={setTopic} />
                </Field>
                <Field label="Difficulty">
                  <input
                    className={inputClassName()}
                    type="number"
                    min={1}
                    max={12}
                    value={difficulty ?? ""}
                    onChange={(event) =>
                      setDifficulty(event.target.value ? Number(event.target.value) : null)
                    }
                  />
                </Field>
              </div>
              <Field label="Tags">
                <input
                  className={inputClassName()}
                  value={tagsText}
                  onChange={(event) => setTagsText(event.target.value)}
                  placeholder="comma, separated, tags"
                />
              </Field>
              <Field label="Draft body">
                <textarea
                  className={inputClassName("min-h-72 font-mono text-sm")}
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                />
              </Field>
              {error ? <p className="text-sm text-[#8f1d15]">{error}</p> : null}
              <Button type="button" onClick={() => void convertCapture()} disabled={busy}>
                {busy ? "Converting..." : "Create official note"}
              </Button>
            </div>
          ) : (
            <p className="mt-4 text-sm leading-6 text-[#43474f]">
              Choose a capture to turn a rough idea into a structured theorem, technique,
              formula, geometry, mistake, or pattern note.
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}
