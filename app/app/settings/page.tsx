import { SettingsClient } from "@/components/notes/SettingsClient";
import { requireOwner } from "@/lib/auth/server";
import type { AuditLog, MistakeLog, Note, ProblemLog, QuickCapture, SiteSettings, Suggestion } from "@/lib/types";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const { supabase, user, profile } = await requireOwner();
  if (!user) redirect("/login");

  const [
    { data: notesData },
    { data: suggestionsData },
    { data: settingsData },
    { data: auditData },
    { data: problemsData },
    { data: mistakesData },
    { data: capturesData }
  ] = await Promise.all([
    supabase.from("notes").select("*").eq("is_archived", false).order("updated_at", { ascending: false }),
    supabase.from("suggestions").select("*").order("created_at", { ascending: false }),
    supabase.from("site_settings").select("*").eq("id", "main").single(),
    supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(12),
    supabase.from("problem_logs").select("*").order("updated_at", { ascending: false }),
    supabase.from("mistake_logs").select("*").order("updated_at", { ascending: false }),
    supabase.from("quick_captures").select("*").order("created_at", { ascending: false })
  ]);

  return (
    <SettingsClient
      email={user.email}
      role={profile.role}
      notes={(notesData ?? []) as Note[]}
      suggestions={(suggestionsData ?? []) as Suggestion[]}
      problems={(problemsData ?? []) as ProblemLog[]}
      mistakes={(mistakesData ?? []) as MistakeLog[]}
      captures={(capturesData ?? []) as QuickCapture[]}
      settings={settingsData as SiteSettings}
      auditLogs={(auditData ?? []) as AuditLog[]}
    />
  );
}
