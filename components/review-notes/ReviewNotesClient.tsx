"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, Shuffle } from "lucide-react";
import { InlineMarkdown } from "@/components/editor/InlineMarkdown";
import { Badge, DifficultyBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { nextReviewDateFromRating } from "@/lib/constants/daily";
import { createClient } from "@/lib/supabase/client";
import type { Note, NoteReview } from "@/lib/types";

interface ReviewNotesClientProps {
  notes: Note[];
  reviews: NoteReview[];
}

function keyPoints(markdown: string) {
  const lines = markdown
    .split("\n")
    .filter((line) => /^#{2,3}\s+|^- /.test(line.trim()))
    .slice(0, 8);
  return lines.length ? lines.join("\n") : markdown.slice(0, 400);
}

export function ReviewNotesClient({ notes, reviews }: ReviewNotesClientProps) {
  const router = useRouter();
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const reviewByNote = useMemo(() => new Map(reviews.map((review) => [review.note_id, review])), [reviews]);
  const dueNotes = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return notes
      .filter((note) => {
        const review = reviewByNote.get(note.id);
        if (!review) return true;
        if (review.review_status === "ignored" || review.review_status === "mastered") {
          return review.next_review_at !== null && review.next_review_at <= today;
        }
        return !review.next_review_at || review.next_review_at <= today;
      })
      .slice(0, 30);
  }, [notes, reviewByNote]);

  const needsPractice = notes.filter((note) => reviewByNote.get(note.id)?.review_status === "needs_practice");
  const randomTechnique = notes.find((note) => note.note_type === "Technique") ?? notes[0] ?? null;

  async function mark(note: Note, rating: "forgot" | "shaky" | "good" | "mastered") {
    setBusyId(note.id);
    const status =
      rating === "forgot" ? "needs_practice" : rating === "shaky" ? "learning" : rating === "good" ? "comfortable" : "mastered";
    const confidence = rating === "forgot" ? 1 : rating === "shaky" ? 2 : rating === "good" ? 4 : 5;
    try {
      const supabase = createClient();
      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (!user) throw new Error("You must be logged in.");
      const current = reviewByNote.get(note.id);
      await supabase.from("note_reviews").upsert(
        {
          id: current?.id,
          user_id: user.id,
          note_id: note.id,
          review_status: status,
          confidence,
          next_review_at: nextReviewDateFromRating(rating),
          last_reviewed_at: new Date().toISOString(),
          review_count: (current?.review_count ?? 0) + 1
        },
        { onConflict: "user_id,note_id" }
      );
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  function ReviewCard({ note }: { note: Note }) {
    const review = reviewByNote.get(note.id);
    return (
      <article className="rounded border border-[#d5d7de] bg-[#f9f9f9] p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <Link href={`/app/notes/${note.id}`} className="text-lg font-semibold text-[#1a1c1c] hover:text-[#0e3b69]">
              <InlineMarkdown text={note.title} />
            </Link>
            <p className="mt-1 text-sm text-[#43474f]">{note.topic} · {note.note_type}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge tone={review?.review_status === "needs_practice" ? "red" : "blue"}>
              {review?.review_status?.replaceAll("_", " ") ?? "new"}
            </Badge>
            <DifficultyBadge value={note.difficulty} noteType={note.note_type} />
          </div>
        </div>
        {note.tags.length ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {note.tags.map((tag) => (
              <span key={tag} className="text-[12px] text-[#0e3b69]">
                #{tag}
              </span>
            ))}
          </div>
        ) : null}
        {revealed[note.id] ? (
          <pre className="mt-4 whitespace-pre-wrap rounded border border-[#d5d7de] bg-white p-3 text-sm leading-6 text-[#1a1c1c]">
            {keyPoints(note.body_markdown)}
          </pre>
        ) : null}
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setRevealed((current) => ({ ...current, [note.id]: !current[note.id] }))}
          >
            <Eye className="h-4 w-4" aria-hidden="true" />
            {revealed[note.id] ? "Hide key points" : "Reveal key points"}
          </Button>
          <Button type="button" variant="secondary" disabled={busyId === note.id} onClick={() => void mark(note, "forgot")}>
            Forgot
          </Button>
          <Button type="button" variant="secondary" disabled={busyId === note.id} onClick={() => void mark(note, "shaky")}>
            Shaky
          </Button>
          <Button type="button" variant="secondary" disabled={busyId === note.id} onClick={() => void mark(note, "good")}>
            Good
          </Button>
          <Button type="button" disabled={busyId === note.id} onClick={() => void mark(note, "mastered")}>
            Mastered
          </Button>
        </div>
      </article>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 lg:px-10">
      <div>
        <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[#0e3b69]">
          Light review
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-[#1a1c1c]">Review Notes</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#43474f]">
          A small queue for notes that should stay active in memory. No card deck overhead.
        </p>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-[#c3c6d0] bg-white p-4">
          <p className="text-sm text-[#43474f]">Due today</p>
          <p className="mt-2 text-3xl font-semibold text-[#0e3b69]">{dueNotes.length}</p>
        </div>
        <div className="rounded-lg border border-[#c3c6d0] bg-white p-4">
          <p className="text-sm text-[#43474f]">Needs practice</p>
          <p className="mt-2 text-3xl font-semibold text-[#0e3b69]">{needsPractice.length}</p>
        </div>
        <div className="rounded-lg border border-[#c3c6d0] bg-white p-4">
          <p className="text-sm text-[#43474f]">Random technique</p>
          {randomTechnique ? (
            <Link href={`/app/notes/${randomTechnique.id}`} className="mt-2 flex items-center gap-2 text-sm font-semibold text-[#0e3b69]">
              <Shuffle className="h-4 w-4" aria-hidden="true" />
              {randomTechnique.title}
            </Link>
          ) : (
            <p className="mt-2 text-sm text-[#43474f]">No notes yet.</p>
          )}
        </div>
      </div>

      <section className="mt-6 rounded-lg border border-[#c3c6d0] bg-white p-5">
        <h2 className="text-xl font-semibold">Due today</h2>
        <div className="mt-4 grid gap-3">
          {dueNotes.length ? (
            dueNotes.map((note) => <ReviewCard key={note.id} note={note} />)
          ) : (
            <p className="rounded border border-dashed border-[#c3c6d0] p-6 text-sm text-[#43474f]">
              Nothing due. Mark a note as needs practice to start the queue.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
