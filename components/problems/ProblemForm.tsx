"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Field, inputClassName } from "@/components/ui/Field";
import { TopicSelector } from "@/components/notes/TopicSelector";
import { PROBLEM_MISTAKE_CATEGORIES, PROBLEM_STATUSES } from "@/lib/constants/daily";
import { createClient } from "@/lib/supabase/client";
import type { Note, ProblemLog, ProblemStatus } from "@/lib/types";
import { parseTags } from "@/lib/utils/tags";

interface ProblemFormProps {
  initialProblem?: ProblemLog | null;
  notes: Note[];
}

export function ProblemForm({ initialProblem = null, notes }: ProblemFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState(initialProblem?.title ?? "");
  const [source, setSource] = useState(initialProblem?.source ?? "");
  const [olympiad, setOlympiad] = useState(initialProblem?.olympiad ?? "");
  const [year, setYear] = useState(initialProblem?.year?.toString() ?? "");
  const [problemNumber, setProblemNumber] = useState(initialProblem?.problem_number ?? "");
  const [topic, setTopic] = useState(initialProblem?.topic ?? "Number Theory");
  const [difficulty, setDifficulty] = useState(initialProblem?.difficulty?.toString() ?? "");
  const [status, setStatus] = useState(initialProblem?.status ?? "attempted");
  const [problemText, setProblemText] = useState(initialProblem?.problem_text ?? "");
  const [solutionSummary, setSolutionSummary] = useState(initialProblem?.solution_summary ?? "");
  const [keyIdea, setKeyIdea] = useState(initialProblem?.key_idea ?? "");
  const [mistakeMade, setMistakeMade] = useState(initialProblem?.mistake_made ?? "");
  const [mistakeCategory, setMistakeCategory] = useState(initialProblem?.mistake_category ?? "");
  const [linkedNoteIds, setLinkedNoteIds] = useState<string[]>(initialProblem?.linked_note_ids ?? []);
  const [tagsText, setTagsText] = useState((initialProblem?.tags ?? []).join(", "));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleNote(id: string) {
    setLinkedNoteIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  async function saveProblem() {
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

      const payload = {
        title: title.trim(),
        source: source.trim() || null,
        olympiad: olympiad.trim() || null,
        year: year ? Number(year) : null,
        problem_number: problemNumber.trim() || null,
        topic: topic || null,
        difficulty: difficulty ? Number(difficulty) : null,
        status,
        problem_text: problemText.trim() || null,
        solution_summary: solutionSummary.trim() || null,
        key_idea: keyIdea.trim() || null,
        mistake_made: mistakeMade.trim() || null,
        mistake_category: mistakeCategory || null,
        linked_note_ids: linkedNoteIds,
        tags: parseTags(tagsText)
      };

      if (initialProblem) {
        const { error: updateError } = await supabase.from("problem_logs").update(payload).eq("id", initialProblem.id);
        if (updateError) throw updateError;
        router.push(`/app/problems/${initialProblem.id}`);
      } else {
        const { data, error: insertError } = await supabase
          .from("problem_logs")
          .insert({ ...payload, user_id: user.id })
          .select("id")
          .single();
        if (insertError) throw insertError;
        router.push(`/app/problems/${data.id}`);
      }
      router.refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save problem.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 lg:px-10">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold text-[#1a1c1c]">
          {initialProblem ? "Edit Problem" : "New Problem"}
        </h1>
        <p className="mt-2 text-sm leading-6 text-[#43474f]">
          Store the source, key idea, mistake pattern, and linked techniques for later review.
        </p>
      </div>

      <div className="grid gap-5 rounded-lg border border-[#c3c6d0] bg-white p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Title">
            <input className={inputClassName()} value={title} onChange={(event) => setTitle(event.target.value)} />
          </Field>
          <Field label="Topic">
            <TopicSelector value={topic} onChange={setTopic} />
          </Field>
          <Field label="Source">
            <input className={inputClassName()} value={source} onChange={(event) => setSource(event.target.value)} />
          </Field>
          <Field label="Olympiad">
            <input className={inputClassName()} value={olympiad} onChange={(event) => setOlympiad(event.target.value)} />
          </Field>
          <Field label="Year">
            <input className={inputClassName()} type="number" value={year} onChange={(event) => setYear(event.target.value)} />
          </Field>
          <Field label="Problem number">
            <input className={inputClassName()} value={problemNumber} onChange={(event) => setProblemNumber(event.target.value)} />
          </Field>
          <Field label="Problem Difficulty">
            <input className={inputClassName()} type="number" min={1} max={12} value={difficulty} onChange={(event) => setDifficulty(event.target.value)} />
          </Field>
          <Field label="Status">
            <select className={inputClassName()} value={status} onChange={(event) => setStatus(event.target.value as ProblemStatus)}>
              {PROBLEM_STATUSES.map((item) => (
                <option key={item} value={item}>{item.replaceAll("_", " ")}</option>
              ))}
            </select>
          </Field>
          <Field label="Mistake category">
            <select className={inputClassName()} value={mistakeCategory} onChange={(event) => setMistakeCategory(event.target.value)}>
              <option value="">No category</option>
              {PROBLEM_MISTAKE_CATEGORIES.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </Field>
          <Field label="Tags">
            <input className={inputClassName()} value={tagsText} onChange={(event) => setTagsText(event.target.value)} />
          </Field>
        </div>

        <Field label="Problem statement">
          <textarea className={inputClassName("min-h-36")} value={problemText} onChange={(event) => setProblemText(event.target.value)} />
        </Field>
        <Field label="Solution summary">
          <textarea className={inputClassName("min-h-28")} value={solutionSummary} onChange={(event) => setSolutionSummary(event.target.value)} />
        </Field>
        <Field label="Key idea">
          <textarea className={inputClassName("min-h-24")} value={keyIdea} onChange={(event) => setKeyIdea(event.target.value)} />
        </Field>
        <Field label="Mistake made">
          <textarea className={inputClassName("min-h-24")} value={mistakeMade} onChange={(event) => setMistakeMade(event.target.value)} />
        </Field>

        <Field label="Linked notes">
          <div className="max-h-56 overflow-y-auto codex-scrollbar rounded border border-[#d5d7de] p-3">
            {notes.map((note) => (
              <label key={note.id} className="flex items-center gap-2 py-1 text-sm text-[#43474f]">
                <input type="checkbox" checked={linkedNoteIds.includes(note.id)} onChange={() => toggleNote(note.id)} />
                {note.title}
              </label>
            ))}
          </div>
        </Field>

        {error ? <p className="text-sm text-[#8f1d15]">{error}</p> : null}
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => router.back()}>Cancel</Button>
          <Button type="button" onClick={() => void saveProblem()} loading={busy} loadingLabel="Saving...">
            Save Problem
          </Button>
        </div>
      </div>
    </div>
  );
}
