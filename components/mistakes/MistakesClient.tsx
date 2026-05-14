"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Plus } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Field, inputClassName } from "@/components/ui/Field";
import { MISTAKE_TYPES } from "@/lib/constants/daily";
import { TOPICS } from "@/lib/constants/notes";
import { createClient } from "@/lib/supabase/client";
import type { MistakeLog, Note } from "@/lib/types";

interface MistakesClientProps {
  mistakes: MistakeLog[];
  notes: Note[];
}

export function MistakesClient({ mistakes, notes }: MistakesClientProps) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [query, setQuery] = useState("");
  const [topic, setTopic] = useState("");
  const [mistakeType, setMistakeType] = useState("");
  const [resolved, setResolved] = useState("unresolved");
  const [sort, setSort] = useState("recent");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [correctPrinciple, setCorrectPrinciple] = useState("");
  const [severity, setSeverity] = useState(3);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = mistakes.filter((mistake) => {
      const haystack = [
        mistake.title,
        mistake.topic,
        mistake.mistake_type,
        mistake.description,
        mistake.correct_principle,
        mistake.example
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (q && !haystack.includes(q)) return false;
      if (topic && mistake.topic !== topic) return false;
      if (mistakeType && mistake.mistake_type !== mistakeType) return false;
      if (resolved === "unresolved" && mistake.is_resolved) return false;
      if (resolved === "resolved" && !mistake.is_resolved) return false;
      return true;
    });

    return [...rows].sort((a, b) => {
      if (sort === "severity") return b.severity - a.severity;
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });
  }, [mistakeType, mistakes, query, resolved, sort, topic]);

  async function createMistake() {
    if (!title.trim() || !description.trim()) {
      setError("Title and description are required.");
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
      const { error: insertError } = await supabase.from("mistake_logs").insert({
        user_id: user.id,
        title: title.trim(),
        topic: topic || null,
        mistake_type: mistakeType || "Other",
        description: description.trim(),
        correct_principle: correctPrinciple.trim() || null,
        linked_note_ids: [],
        severity
      });
      if (insertError) throw insertError;
      setTitle("");
      setDescription("");
      setCorrectPrinciple("");
      setSeverity(3);
      setShowForm(false);
      router.refresh();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Could not save mistake.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleResolved(mistake: MistakeLog) {
    const supabase = createClient();
    await supabase.from("mistake_logs").update({ is_resolved: !mistake.is_resolved }).eq("id", mistake.id);
    router.refresh();
  }

  function linkedTitles(mistake: MistakeLog) {
    return mistake.linked_note_ids
      .map((id) => notes.find((note) => note.id === id)?.title)
      .filter(Boolean)
      .join(", ");
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 lg:px-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[#0e3b69]">
            Error tracking
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-[#1a1c1c]">Mistake Log</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#43474f]">
            Keep recurring traps visible until the correct principle is automatic.
          </p>
        </div>
        <Button type="button" onClick={() => setShowForm((current) => !current)}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          New Mistake
        </Button>
      </div>

      {showForm ? (
        <section className="mt-6 rounded-lg border border-[#c3c6d0] bg-white p-5">
          <div className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Title">
                <input className={inputClassName()} value={title} onChange={(event) => setTitle(event.target.value)} />
              </Field>
              <Field label="Mistake type">
                <select
                  className={inputClassName()}
                  value={mistakeType}
                  onChange={(event) => setMistakeType(event.target.value)}
                >
                  <option value="">Choose type</option>
                  {MISTAKE_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Description">
              <textarea className={inputClassName("min-h-28")} value={description} onChange={(event) => setDescription(event.target.value)} />
            </Field>
            <Field label="Correct principle">
              <textarea
                className={inputClassName("min-h-24")}
                value={correctPrinciple}
                onChange={(event) => setCorrectPrinciple(event.target.value)}
              />
            </Field>
            <Field label="Severity">
              <input
                className={inputClassName("max-w-32")}
                type="number"
                min={1}
                max={5}
                value={severity}
                onChange={(event) => setSeverity(Number(event.target.value))}
              />
            </Field>
            {error ? <p className="text-sm text-[#8f1d15]">{error}</p> : null}
            <div className="flex justify-end">
              <Button type="button" onClick={() => void createMistake()} disabled={busy}>
                Save Mistake
              </Button>
            </div>
          </div>
        </section>
      ) : null}

      <section className="mt-6 rounded-lg border border-[#c3c6d0] bg-white p-5">
        <div className="grid gap-3 md:grid-cols-[1.2fr_0.8fr_1fr_0.8fr_0.8fr]">
          <input className={inputClassName()} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search mistakes..." />
          <select className={inputClassName()} value={topic} onChange={(event) => setTopic(event.target.value)}>
            <option value="">All topics</option>
            {TOPICS.filter((item) => item !== "Inbox").map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <select className={inputClassName()} value={mistakeType} onChange={(event) => setMistakeType(event.target.value)}>
            <option value="">All mistake types</option>
            {MISTAKE_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          <select className={inputClassName()} value={resolved} onChange={(event) => setResolved(event.target.value)}>
            <option value="unresolved">Unresolved</option>
            <option value="resolved">Resolved</option>
            <option value="all">All</option>
          </select>
          <select className={inputClassName()} value={sort} onChange={(event) => setSort(event.target.value)}>
            <option value="recent">Recent</option>
            <option value="severity">Severity</option>
          </select>
        </div>

        <div className="mt-5 grid gap-3">
          {filtered.length ? (
            filtered.map((mistake) => (
              <article key={mistake.id} className="rounded border border-[#d5d7de] bg-[#f9f9f9] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-[#1a1c1c]">{mistake.title}</h2>
                    <p className="mt-1 text-sm text-[#43474f]">{mistake.topic ?? "No topic"} · {mistake.mistake_type ?? "Other"}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge tone={mistake.severity >= 4 ? "red" : "blue"}>Severity {mistake.severity}</Badge>
                    <Badge tone={mistake.is_resolved ? "green" : "default"}>
                      {mistake.is_resolved ? "Resolved" : "Unresolved"}
                    </Badge>
                  </div>
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[#43474f]">{mistake.description}</p>
                {mistake.correct_principle ? (
                  <p className="mt-3 rounded border border-[#d5d7de] bg-white p-3 text-sm leading-6 text-[#1a1c1c]">
                    <span className="font-semibold">Correct principle: </span>
                    {mistake.correct_principle}
                  </p>
                ) : null}
                {linkedTitles(mistake) ? (
                  <p className="mt-3 text-[12px] text-[#0e3b69]">Linked notes: {linkedTitles(mistake)}</p>
                ) : null}
                {mistake.linked_problem_id ? (
                  <Link href={`/app/problems/${mistake.linked_problem_id}`} className="mt-3 inline-block text-sm font-medium text-[#0e3b69]">
                    Open source problem
                  </Link>
                ) : null}
                <div className="mt-4">
                  <Button type="button" variant="secondary" onClick={() => void toggleResolved(mistake)}>
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                    {mistake.is_resolved ? "Mark unresolved" : "Mark resolved"}
                  </Button>
                </div>
              </article>
            ))
          ) : (
            <p className="rounded border border-dashed border-[#c3c6d0] p-6 text-sm text-[#43474f]">
              No mistakes match these filters.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
