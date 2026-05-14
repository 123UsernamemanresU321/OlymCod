import { MistakesClient } from "@/components/mistakes/MistakesClient";
import { requireOwner } from "@/lib/auth/server";
import type { MistakeLog, Note } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function MistakesPage() {
  const { supabase } = await requireOwner();
  const [{ data: mistakesData }, { data: notesData }] = await Promise.all([
    supabase.from("mistake_logs").select("*").order("updated_at", { ascending: false }),
    supabase.from("notes").select("*").eq("is_archived", false).order("title", { ascending: true })
  ]);

  return (
    <MistakesClient
      mistakes={(mistakesData ?? []) as MistakeLog[]}
      notes={(notesData ?? []) as Note[]}
    />
  );
}
