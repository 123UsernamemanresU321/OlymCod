import { DashboardClient } from "@/components/notes/DashboardClient";
import { createClient } from "@/lib/supabase/server";
import type { Note } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const { data } = await supabase
    .from("notes")
    .select("*")
    .eq("user_id", user!.id)
    .eq("is_archived", false)
    .order("updated_at", { ascending: false });

  return <DashboardClient notes={(data ?? []) as Note[]} />;
}
