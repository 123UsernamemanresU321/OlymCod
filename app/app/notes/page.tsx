import { NotesLibraryClient } from "@/components/notes/NotesLibraryClient";
import { createClient } from "@/lib/supabase/server";
import type { Note, SavedView } from "@/lib/types";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function NotesPage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [{ data }, { data: savedViewsData }] = await Promise.all([
    supabase
      .from("notes")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_archived", false)
      .neq("note_type", "Inbox")
      .order("updated_at", { ascending: false }),
    supabase
      .from("saved_views")
      .select("*")
      .eq("user_id", user.id)
      .eq("target_page", "notes")
      .order("updated_at", { ascending: false })
  ]);

  return <NotesLibraryClient notes={(data ?? []) as Note[]} savedViews={(savedViewsData ?? []) as SavedView[]} />;
}
