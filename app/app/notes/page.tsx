import { NotesLibraryClient } from "@/components/notes/NotesLibraryClient";
import { createClient } from "@/lib/supabase/server";
import type { Note } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function NotesPage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const { data } = await supabase
    .from("notes")
    .select("*")
    .eq("user_id", user!.id)
    .eq("is_archived", false)
    .neq("note_type", "Inbox")
    .order("updated_at", { ascending: false });

  return <NotesLibraryClient notes={(data ?? []) as Note[]} />;
}
