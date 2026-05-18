import { RevisionPackClient } from "@/components/revision/RevisionPackClient";
import { requireOwner } from "@/lib/auth/server";
import type { MistakeLog, Note, NoteReview, ProblemLog } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function RevisionPackPage() {
  const { supabase } = await requireOwner();
  const [{ data: notesData }, { data: reviewsData }, { data: problemsData }, { data: mistakesData }] = await Promise.all([
    supabase.from("notes").select("*").eq("is_archived", false),
    supabase.from("note_reviews").select("*"),
    supabase.from("problem_logs").select("*"),
    supabase.from("mistake_logs").select("*")
  ]);

  return (
    <RevisionPackClient
      notes={(notesData ?? []) as Note[]}
      reviews={(reviewsData ?? []) as NoteReview[]}
      problems={(problemsData ?? []) as ProblemLog[]}
      mistakes={(mistakesData ?? []) as MistakeLog[]}
    />
  );
}
