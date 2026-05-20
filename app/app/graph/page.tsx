import { NoteGraphClient } from "@/components/graph/NoteGraphClient";
import { requireOwner } from "@/lib/auth/server";
import type { Note, NoteLink } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function GraphPage() {
  const { supabase, user } = await requireOwner();
  const [{ data: notesData }, { data: linksData }] = await Promise.all([
    supabase.from("notes").select("*").eq("user_id", user.id).eq("is_archived", false).order("title", { ascending: true }),
    supabase.from("note_links").select("*").eq("user_id", user.id)
  ]);

  return <NoteGraphClient notes={(notesData ?? []) as Note[]} links={(linksData ?? []) as NoteLink[]} />;
}
