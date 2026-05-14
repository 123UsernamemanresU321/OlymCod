import { DashboardClient } from "@/components/notes/DashboardClient";
import { createClient } from "@/lib/supabase/server";
import type { Note, SiteSettings, Suggestion } from "@/lib/types";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [{ data }, { data: suggestionsData }, { data: settingsData }] = await Promise.all([
    supabase.from("notes").select("*").eq("is_archived", false).order("updated_at", { ascending: false }),
    supabase.from("suggestions").select("*").order("created_at", { ascending: false }).limit(8),
    supabase.from("site_settings").select("*").eq("id", "main").single()
  ]);

  return (
    <DashboardClient
      notes={(data ?? []) as Note[]}
      suggestions={(suggestionsData ?? []) as Suggestion[]}
      settings={settingsData as SiteSettings}
    />
  );
}
