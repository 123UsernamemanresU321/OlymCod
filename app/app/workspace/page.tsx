import { WorkspaceClient } from "@/components/workspace/WorkspaceClient";
import { requireOwner } from "@/lib/auth/server";
import type { Note, NoteLink } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function WorkspacePage() {
  const { supabase, user } = await requireOwner();
  const [{ data: notesData }, { data: linksData }] = await Promise.all([
    supabase.from("notes").select("*").eq("user_id", user.id).eq("is_archived", false).order("updated_at", { ascending: false }).limit(120),
    supabase.from("note_links").select("*").eq("user_id", user.id)
  ]);

  return <WorkspaceClient notes={(notesData ?? []) as Note[]} links={(linksData ?? []) as NoteLink[]} />;
}
