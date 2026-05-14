import { ReviewNotesClient } from "@/components/review-notes/ReviewNotesClient";
import { requireOwner } from "@/lib/auth/server";
import type { Note, NoteReview } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ReviewNotesPage() {
  const { supabase } = await requireOwner();
  const [{ data: notesData }, { data: reviewsData }] = await Promise.all([
    supabase.from("notes").select("*").eq("is_archived", false).neq("note_type", "Inbox").order("updated_at", { ascending: false }),
    supabase.from("note_reviews").select("*").order("next_review_at", { ascending: true })
  ]);

  return (
    <ReviewNotesClient
      notes={(notesData ?? []) as Note[]}
      reviews={(reviewsData ?? []) as NoteReview[]}
    />
  );
}
