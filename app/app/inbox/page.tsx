import { InboxClient } from "@/components/notes/InboxClient";
import { createClient } from "@/lib/supabase/server";
import type { Note } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function InboxPage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const { data } = await supabase
    .from("notes")
    .select("*")
    .eq("user_id", user!.id)
    .eq("is_archived", false)
    .eq("note_type", "Inbox")
    .order("created_at", { ascending: false });

  return <InboxClient notes={(data ?? []) as Note[]} />;
}
