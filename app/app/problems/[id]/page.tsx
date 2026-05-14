import { notFound } from "next/navigation";
import { ProblemDetailClient } from "@/components/problems/ProblemDetailClient";
import { requireOwner } from "@/lib/auth/server";
import type { Note, ProblemLog } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ProblemDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase } = await requireOwner();
  const [{ data: problemData }, { data: notesData }] = await Promise.all([
    supabase.from("problem_logs").select("*").eq("id", id).single(),
    supabase.from("notes").select("*").eq("is_archived", false).order("title", { ascending: true })
  ]);

  if (!problemData) notFound();

  return (
    <ProblemDetailClient
      problem={problemData as ProblemLog}
      notes={(notesData ?? []) as Note[]}
    />
  );
}
