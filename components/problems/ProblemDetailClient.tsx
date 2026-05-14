"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, Link2, Plus } from "lucide-react";
import { MarkdownPreview } from "@/components/editor/MarkdownPreview";
import { Badge, DifficultyBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { inputClassName } from "@/components/ui/Field";
import { createClient } from "@/lib/supabase/client";
import type { Note, ProblemLog } from "@/lib/types";
import { titleToSlug } from "@/lib/utils/slug";

interface ProblemDetailClientProps {
  problem: ProblemLog;
  notes: Note[];
}

export function ProblemDetailClient({ problem, notes }: ProblemDetailClientProps) {
  const router = useRouter();
  const [noteId, setNoteId] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const linkedNotes = problem.linked_note_ids
    .map((id) => notes.find((note) => note.id === id))
    .filter((note): note is Note => Boolean(note));

  async function linkNote() {
    if (!noteId || problem.linked_note_ids.includes(noteId)) return;
    setBusy(true);
    setMessage(null);
    const supabase = createClient();
    const { error } = await supabase
      .from("problem_logs")
      .update({ linked_note_ids: [...problem.linked_note_ids, noteId] })
      .eq("id", problem.id);
    setBusy(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    router.refresh();
  }

  async function createMistake() {
    setBusy(true);
    setMessage(null);
    try {
      const supabase = createClient();
      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (!user) throw new Error("You must be logged in.");
      const { error } = await supabase.from("mistake_logs").insert({
        user_id: user.id,
        title: `Mistake from ${problem.title}`,
        topic: null,
        mistake_type: "Other",
        description: problem.mistake_made ?? problem.key_idea ?? "Describe the mistake from this problem.",
        correct_principle: problem.key_idea,
        example: problem.problem_text,
        linked_note_ids: problem.linked_note_ids,
        linked_problem_id: problem.id,
        severity: 3
      });
      if (error) throw error;
      router.push("/app/mistakes");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not create mistake.");
    } finally {
      setBusy(false);
    }
  }

  async function createTechniqueNote() {
    setBusy(true);
    setMessage(null);
    try {
      const supabase = createClient();
      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (!user) throw new Error("You must be logged in.");
      const title = `${problem.title} technique`;
      const { data, error } = await supabase
        .from("notes")
        .insert({
          user_id: user.id,
          title,
          slug: `${titleToSlug(title)}-${Date.now().toString(36)}`,
          topic: "Problem Patterns",
          note_type: "Technique",
          difficulty: problem.difficulty ?? 5,
          description: problem.key_idea,
          tags: problem.tags,
          body_markdown: `# ${title}

## Source problem

${problem.title}

## Problem statement

${problem.problem_text ?? ""}

## Core idea

${problem.key_idea ?? ""}

## Solution summary

${problem.solution_summary ?? ""}

## Mistakes to avoid

${problem.mistake_made ?? ""}
`,
          diagram_urls: [],
          visibility: "private",
          is_favorite: false,
          is_archived: false
        })
        .select("id")
        .single();
      if (error) throw error;
      router.push(`/app/notes/${data.id}/edit`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not create technique note.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 lg:px-10">
      <Link href="/app/problems" className="text-sm font-medium text-[#0e3b69]">
        Back to Problem Log
      </Link>
      <div className="mt-5 rounded-lg border border-[#c3c6d0] bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold text-[#1a1c1c]">{problem.title}</h1>
            <p className="mt-2 text-sm text-[#43474f]">
              {[problem.source, problem.olympiad, problem.year, problem.problem_number].filter(Boolean).join(" · ") ||
                "No source metadata yet"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge tone="blue">{problem.status.replaceAll("_", " ")}</Badge>
            <DifficultyBadge value={problem.difficulty} />
          </div>
        </div>

        <div className="mt-6 grid gap-6">
          {problem.problem_text ? (
            <section>
              <h2 className="text-lg font-semibold">Problem statement</h2>
              <div className="mt-3 rounded border border-[#d5d7de] bg-[#f9f9f9] p-4">
                <MarkdownPreview markdown={problem.problem_text} />
              </div>
            </section>
          ) : null}
          {problem.solution_summary ? (
            <section>
              <h2 className="text-lg font-semibold">Solution summary</h2>
              <div className="mt-3 rounded border border-[#d5d7de] bg-[#f9f9f9] p-4">
                <MarkdownPreview markdown={problem.solution_summary} />
              </div>
            </section>
          ) : null}
          {problem.key_idea ? (
            <section>
              <h2 className="text-lg font-semibold">Key idea</h2>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#43474f]">{problem.key_idea}</p>
            </section>
          ) : null}
          {problem.mistake_made ? (
            <section>
              <h2 className="text-lg font-semibold">Mistake made</h2>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#43474f]">{problem.mistake_made}</p>
            </section>
          ) : null}
        </div>
      </div>

      <section className="mt-6 rounded-lg border border-[#c3c6d0] bg-white p-6">
        <h2 className="text-lg font-semibold">Linked notes</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {linkedNotes.length ? (
            linkedNotes.map((note) => (
              <Link key={note.id} href={`/app/notes/${note.id}`} className="rounded border border-[#c3c6d0] px-3 py-2 text-sm text-[#0e3b69]">
                {note.title}
              </Link>
            ))
          ) : (
            <p className="text-sm text-[#43474f]">No linked techniques yet.</p>
          )}
        </div>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <select className={inputClassName()} value={noteId} onChange={(event) => setNoteId(event.target.value)}>
            <option value="">Choose a note to link</option>
            {notes
              .filter((note) => !problem.linked_note_ids.includes(note.id))
              .map((note) => (
                <option key={note.id} value={note.id}>
                  {note.title}
                </option>
              ))}
          </select>
          <Button type="button" variant="secondary" onClick={() => void linkNote()} disabled={busy || !noteId}>
            <Link2 className="h-4 w-4" aria-hidden="true" />
            Link Note
          </Button>
        </div>
      </section>

      <section className="mt-6 flex flex-col gap-2 sm:flex-row">
        <Button type="button" variant="secondary" onClick={() => void createMistake()} disabled={busy}>
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          Create Mistake from this problem
        </Button>
        <Button type="button" onClick={() => void createTechniqueNote()} disabled={busy}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          Create Technique Note from this problem
        </Button>
      </section>
      {message ? <p className="mt-4 text-sm text-[#8f1d15]">{message}</p> : null}
    </div>
  );
}
