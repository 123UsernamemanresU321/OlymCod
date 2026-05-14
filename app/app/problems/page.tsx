import { ProblemsClient } from "@/components/problems/ProblemsClient";
import { requireOwner } from "@/lib/auth/server";
import type { Note, ProblemLog } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ProblemsPage() {
  const { supabase } = await requireOwner();
  const [{ data: problemsData }, { data: notesData }] = await Promise.all([
    supabase.from("problem_logs").select("*").order("updated_at", { ascending: false }),
    supabase.from("notes").select("*").eq("is_archived", false).order("title", { ascending: true })
  ]);

  return (
    <ProblemsClient
      problems={(problemsData ?? []) as ProblemLog[]}
      notes={(notesData ?? []) as Note[]}
    />
  );
}
