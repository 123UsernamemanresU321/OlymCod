"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { nextReviewDateFromRating } from "@/lib/constants/daily";
import { createClient } from "@/lib/supabase/client";
import type { Note, NoteReview, ReviewStatus } from "@/lib/types";

interface NoteReviewActionsProps {
  note: Note;
  review?: NoteReview | null;
}

export function NoteReviewActions({ note, review = null }: NoteReviewActionsProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function mark(status: ReviewStatus, confidence: number, days: "forgot" | "shaky" | "good" | "mastered") {
    setBusy(true);
    try {
      const supabase = createClient();
      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (!user) throw new Error("You must be logged in.");
      await supabase.from("note_reviews").upsert(
        {
          id: review?.id,
          user_id: user.id,
          note_id: note.id,
          review_status: status,
          confidence,
          next_review_at: nextReviewDateFromRating(days),
          last_reviewed_at: new Date().toISOString(),
          review_count: (review?.review_count ?? 0) + 1
        },
        { onConflict: "user_id,note_id" }
      );
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-lg border border-[#c3c6d0] bg-[#f9f9f9] p-5">
      <h2 className="text-lg font-semibold text-[#1a1c1c]">Review status</h2>
      <p className="mt-2 text-sm text-[#43474f]">
        Current: {review?.review_status?.replaceAll("_", " ") ?? "new"}
      </p>
      <div className="mt-4 grid gap-2">
        <Button type="button" variant="secondary" disabled={busy} onClick={() => void mark("needs_practice", 2, "forgot")}>
          Mark needs practice
        </Button>
        <Button type="button" variant="secondary" disabled={busy} onClick={() => void mark("comfortable", 4, "good")}>
          Mark comfortable
        </Button>
        <Button type="button" disabled={busy} onClick={() => void mark("mastered", 5, "mastered")}>
          Mark mastered
        </Button>
      </div>
    </section>
  );
}
