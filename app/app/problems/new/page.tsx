import { ProblemForm } from "@/components/problems/ProblemForm";
import { requireOwner } from "@/lib/auth/server";
import type { Note } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function NewProblemPage() {
  const { supabase } = await requireOwner();
  const { data: notesData } = await supabase
    .from("notes")
    .select("*")
    .eq("is_archived", false)
    .order("title", { ascending: true });

  return <ProblemForm notes={(notesData ?? []) as Note[]} />;
}
