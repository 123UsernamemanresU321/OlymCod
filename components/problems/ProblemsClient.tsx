"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Badge, DifficultyBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Field, inputClassName } from "@/components/ui/Field";
import { TopicSelector } from "@/components/notes/TopicSelector";
import { PROBLEM_MISTAKE_CATEGORIES, PROBLEM_STATUSES } from "@/lib/constants/daily";
import { MATH_TOPICS, topicIncludes } from "@/lib/constants/notes";
import { createClient } from "@/lib/supabase/client";
import type { Note, ProblemLog } from "@/lib/types";
import { parseTags } from "@/lib/utils/tags";
import { cn } from "@/lib/utils/cn";

interface ProblemsClientProps {
  problems: ProblemLog[];
  notes: Note[];
}

export function ProblemsClient({ problems, notes }: ProblemsClientProps) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [topic, setTopic] = useState("");
  const [mistakeCategory, setMistakeCategory] = useState("");
  const [olympiad, setOlympiad] = useState("");
  const [linkedNote, setLinkedNote] = useState("");
  const [title, setTitle] = useState("");
  const [source, setSource] = useState("");
  const [formTopic, setFormTopic] = useState("Number Theory");
  const [formMistakeCategory, setFormMistakeCategory] = useState("");
  const [problemText, setProblemText] = useState("");
  const [keyIdea, setKeyIdea] = useState("");
  const [tagsText, setTagsText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return problems.filter((problem) => {
      const haystack = [
        problem.title,
        problem.source,
        problem.olympiad,
        problem.topic,
        problem.problem_text,
        problem.solution_summary,
        problem.key_idea,
        problem.mistake_made,
        problem.mistake_category,
        problem.tags.join(" ")
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (normalizedQuery && !haystack.includes(normalizedQuery)) return false;
      if (status && problem.status !== status) return false;
      if (difficulty && problem.difficulty !== Number(difficulty)) return false;
      if (topic && !topicIncludes(problem.topic, topic)) return false;
      if (mistakeCategory && problem.mistake_category !== mistakeCategory) return false;
      if (olympiad && !problem.olympiad?.toLowerCase().includes(olympiad.toLowerCase())) return false;
      if (linkedNote && !problem.linked_note_ids.includes(linkedNote)) return false;
      return true;
    });
  }, [difficulty, linkedNote, mistakeCategory, olympiad, problems, query, status, topic]);

  async function createProblem() {
    if (!title.trim()) {
      setError("Problem title is required.");
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
      const { error: insertError } = await supabase.from("problem_logs").insert({
        user_id: user.id,
        title: title.trim(),
        source: source.trim() || null,
        topic: formTopic,
        status: "attempted",
        problem_text: problemText.trim() || null,
        key_idea: keyIdea.trim() || null,
        mistake_category: formMistakeCategory || null,
        linked_note_ids: [],
        tags: parseTags(tagsText)
      });
      if (insertError) throw insertError;
      setTitle("");
      setSource("");
      setFormTopic("Number Theory");
      setFormMistakeCategory("");
      setProblemText("");
      setKeyIdea("");
      setTagsText("");
      setShowForm(false);
      router.refresh();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Could not create problem.");
    } finally {
      setBusy(false);
    }
  }

  function linkedTitles(problem: ProblemLog) {
    return problem.linked_note_ids
      .map((id) => notes.find((note) => note.id === id)?.title)
      .filter(Boolean)
      .join(", ");
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 lg:px-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[#0e3b69]">
            Applications
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-[#1a1c1c]">Problem Log</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#43474f]">
            Track where techniques appeared, what worked, and what needs review.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={() => setShowForm((current) => !current)}>
            Quick add
          </Button>
          <Button type="button" onClick={() => router.push("/app/problems/new")}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            New Problem
          </Button>
        </div>
      </div>

      {showForm ? (
        <section className="mt-6 rounded-lg border border-[#c3c6d0] bg-white p-5">
          <div className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Title">
                <input className={inputClassName()} value={title} onChange={(event) => setTitle(event.target.value)} />
              </Field>
              <Field label="Source">
                <input
                  className={inputClassName()}
                  value={source}
                  onChange={(event) => setSource(event.target.value)}
                  placeholder="IMO shortlist, BMO2, textbook"
                />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Topic">
                <TopicSelector value={formTopic} onChange={setFormTopic} />
              </Field>
              <Field label="Mistake category">
                <select className={inputClassName()} value={formMistakeCategory} onChange={(event) => setFormMistakeCategory(event.target.value)}>
                  <option value="">No category</option>
                  {PROBLEM_MISTAKE_CATEGORIES.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Problem statement">
              <textarea
                className={inputClassName("min-h-32")}
                value={problemText}
                onChange={(event) => setProblemText(event.target.value)}
              />
            </Field>
            <Field label="Key idea">
              <textarea
                className={inputClassName("min-h-24")}
                value={keyIdea}
                onChange={(event) => setKeyIdea(event.target.value)}
              />
            </Field>
            <Field label="Tags">
              <input
                className={inputClassName()}
                value={tagsText}
                onChange={(event) => setTagsText(event.target.value)}
                placeholder="modular arithmetic, invariant"
              />
            </Field>
            {error ? <p className="text-sm text-[#8f1d15]">{error}</p> : null}
            <div className="flex justify-end">
              <Button type="button" onClick={() => void createProblem()} disabled={busy}>
                {busy ? "Saving..." : "Save Problem"}
              </Button>
            </div>
          </div>
        </section>
      ) : null}

      <section className="mt-6 rounded-lg border border-[#c3c6d0] bg-white p-5">
        <div className="grid gap-3 md:grid-cols-[1.2fr_0.7fr_0.6fr_0.8fr_0.9fr_1fr]">
          <input
            className={inputClassName()}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search problems, key ideas, mistakes, tags..."
          />
          <select className={inputClassName()} value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">All statuses</option>
            {PROBLEM_STATUSES.map((item) => (
              <option key={item} value={item}>
                {item.replaceAll("_", " ")}
              </option>
            ))}
          </select>
          <select
            className={inputClassName()}
            value={difficulty}
            onChange={(event) => setDifficulty(event.target.value)}
          >
            <option value="">Any diff</option>
            {Array.from({ length: 12 }, (_, index) => index + 1).map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
          <select className={inputClassName()} value={topic} onChange={(event) => setTopic(event.target.value)}>
            <option value="">All topics</option>
            {MATH_TOPICS.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
          <select className={inputClassName()} value={mistakeCategory} onChange={(event) => setMistakeCategory(event.target.value)}>
            <option value="">Any mistake</option>
            {PROBLEM_MISTAKE_CATEGORIES.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
          <input
            className={inputClassName()}
            value={olympiad}
            onChange={(event) => setOlympiad(event.target.value)}
            placeholder="Olympiad/source"
          />
          <select
            className={inputClassName()}
            value={linkedNote}
            onChange={(event) => setLinkedNote(event.target.value)}
          >
            <option value="">Any linked technique</option>
            {notes.map((note) => (
              <option key={note.id} value={note.id}>
                {note.title}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-5 grid gap-3">
          {filtered.length ? (
            filtered.map((problem) => (
              <Link
                key={problem.id}
                href={`/app/problems/${problem.id}`}
                className="rounded border border-[#d5d7de] bg-[#f9f9f9] p-4 hover:bg-white"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate text-lg font-semibold text-[#1a1c1c]">{problem.title}</h2>
                    <p className="mt-1 text-sm text-[#43474f]">{problem.source ?? problem.olympiad ?? "No source yet"}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge tone={problem.status === "failed" ? "red" : problem.status === "mastered" ? "green" : "blue"}>
                      {problem.status.replaceAll("_", " ")}
                    </Badge>
                    {problem.topic ? <Badge>{problem.topic}</Badge> : null}
                    <DifficultyBadge value={problem.difficulty} kind="problem" />
                  </div>
                </div>
                {problem.key_idea ? (
                  <p className="mt-3 line-clamp-2 text-sm leading-6 text-[#43474f]">{problem.key_idea}</p>
                ) : null}
                {problem.mistake_category ? (
                  <p className="mt-2 text-[12px] font-medium text-[#8f1d15]">
                    Mistake category: {problem.mistake_category}
                  </p>
                ) : null}
                {linkedTitles(problem) ? (
                  <p className="mt-3 text-[12px] font-medium text-[#0e3b69]">
                    Linked notes: {linkedTitles(problem)}
                  </p>
                ) : null}
                {problem.tags.length ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {problem.tags.map((tag) => (
                      <span key={tag} className="text-[12px] text-[#0e3b69]">
                        #{tag}
                      </span>
                    ))}
                  </div>
                ) : null}
              </Link>
            ))
          ) : (
            <p className={cn("rounded border border-dashed border-[#c3c6d0] p-6 text-sm text-[#43474f]")}>
              No problems match these filters.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
