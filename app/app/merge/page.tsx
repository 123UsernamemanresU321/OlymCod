import { MergeNotesClient } from "@/components/notes/MergeNotesClient";
import { requireOwner } from "@/lib/auth/server";
import type { Note } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function MergeNotesPage() {
  const { supabase, user } = await requireOwner();
  const { data } = await supabase
    .from("notes")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_archived", false)
    .order("title", { ascending: true });

  return <MergeNotesClient notes={(data ?? []) as Note[]} />;
}
