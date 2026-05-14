import { SettingsClient } from "@/components/notes/SettingsClient";
import { requireOwner } from "@/lib/auth/server";
import type { AuditLog, Note, SiteSettings, Suggestion } from "@/lib/types";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const { supabase, user, profile } = await requireOwner();
  if (!user) redirect("/login");

  const [{ data: notesData }, { data: suggestionsData }, { data: settingsData }, { data: auditData }] = await Promise.all([
    supabase.from("notes").select("*").eq("is_archived", false).order("updated_at", { ascending: false }),
    supabase.from("suggestions").select("*").order("created_at", { ascending: false }),
    supabase.from("site_settings").select("*").eq("id", "main").single(),
    supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(12)
  ]);

  return (
    <SettingsClient
      email={user.email}
      role={profile.role}
      notes={(notesData ?? []) as Note[]}
      suggestions={(suggestionsData ?? []) as Suggestion[]}
      settings={settingsData as SiteSettings}
      auditLogs={(auditData ?? []) as AuditLog[]}
    />
  );
}
