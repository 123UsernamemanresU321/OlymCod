import { MistakesClient } from "@/components/mistakes/MistakesClient";
import { requireOwner } from "@/lib/auth/server";
import type { MistakeLog, Note, ProblemLog } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function MistakesPage() {
  const { supabase } = await requireOwner();
  const [{ data: mistakesData }, { data: notesData }, { data: problemsData }] = await Promise.all([
    supabase.from("mistake_logs").select("*").order("updated_at", { ascending: false }),
    supabase.from("notes").select("*").eq("is_archived", false).order("title", { ascending: true }),
    supabase.from("problem_logs").select("*").order("updated_at", { ascending: false })
  ]);

  return (
    <MistakesClient
      mistakes={(mistakesData ?? []) as MistakeLog[]}
      notes={(notesData ?? []) as Note[]}
      problems={(problemsData ?? []) as ProblemLog[]}
    />
  );
}
