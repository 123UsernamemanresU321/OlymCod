import { SettingsClient } from "@/components/notes/SettingsClient";
import { createClient } from "@/lib/supabase/server";
import type { Note } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
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

  return <SettingsClient email={user?.email} notes={(data ?? []) as Note[]} />;
}
