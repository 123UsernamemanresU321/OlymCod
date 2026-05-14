import { InboxClient } from "@/components/notes/InboxClient";
import { createClient } from "@/lib/supabase/server";
import type { Note } from "@/lib/types";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function InboxPage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data } = await supabase
    .from("notes")
    .select("*")
    .eq("is_archived", false)
    .eq("note_type", "Inbox")
    .order("created_at", { ascending: false });

  return <InboxClient notes={(data ?? []) as Note[]} />;
}
