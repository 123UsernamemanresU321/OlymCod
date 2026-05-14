"use client";

import { Download, KeyRound, LogOut, Mail, ShieldCheck, ToggleLeft, UploadCloud } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { STARTER_NOTES } from "@/lib/constants/notes";
import { createClient } from "@/lib/supabase/client";
import type { AuditLog, Note, SiteSettings, Suggestion } from "@/lib/types";
import { exportNotesAsJson, exportNotesAsMarkdown, exportSuggestionsAsJson } from "@/lib/utils/export";

interface SettingsClientProps {
  email?: string;
  role: string;
  notes: Note[];
  suggestions: Suggestion[];
  settings: SiteSettings;
  auditLogs: AuditLog[];
}

export function SettingsClient({ email, role, notes, suggestions, settings, auditLogs }: SettingsClientProps) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [siteSettings, setSiteSettings] = useState(settings);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  async function seedStarterNotes() {
    setBusy(true);
    setMessage(null);

    try {
      const supabase = createClient();
      const {
        data: { user },
        error: userError
      } = await supabase.auth.getUser();
      if (userError || !user) throw new Error(userError?.message ?? "You must be logged in.");

      const rows = STARTER_NOTES.map(({ seed_slug: _seedSlug, ...note }) => ({
        ...note,
        user_id: user.id,
        is_archived: false
      }));

      const { error } = await supabase
        .from("notes")
        .upsert(rows, { onConflict: "user_id,slug", ignoreDuplicates: true });

      if (error) throw error;
      setMessage("Starter notes created. Existing starter slugs were skipped.");
      router.refresh();
    } catch (seedError) {
      setMessage(seedError instanceof Error ? seedError.message : "Could not create starter notes.");
    } finally {
      setBusy(false);
    }
  }

  async function updateSetting(update: Partial<SiteSettings>) {
    setMessage(null);
    const supabase = createClient();
    const { error } = await supabase.from("site_settings").update(update).eq("id", "main");
    if (error) {
      setMessage(error.message);
      return;
    }
    setSiteSettings((current) => ({ ...current, ...update }));
    setMessage("Site settings updated.");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 lg:px-10">
      <header>
        <h1 className="text-3xl font-semibold text-[#1a1c1c]">Settings</h1>
        <p className="mt-2 text-[#43474f]">Manage your account preferences and data exports.</p>
      </header>

      {message ? (
        <div className="mt-6 rounded border border-[#a5c8ff] bg-[#dbeafe] p-4 text-sm text-[#0e3b69]">
          {message}
        </div>
      ) : null}

      <section className="mt-8 rounded-lg border border-[#c3c6d0] bg-[#f9f9f9] p-6">
        <h2 className="flex items-center gap-3 border-b border-[#c3c6d0] pb-4 text-xl font-semibold">
          <Mail className="h-5 w-5 text-[#0e3b69]" aria-hidden="true" />
          Account Information
        </h2>
        <div className="mt-6 grid gap-6 sm:grid-cols-[1fr_auto] sm:items-center">
          <div>
            <p className="text-[13px] font-medium uppercase tracking-[0.05em] text-[#43474f]">
              Primary Email Address
            </p>
            <p className="mt-1 text-base text-[#1a1c1c]">{email ?? "Unknown"}</p>
            <p className="mt-1 text-sm capitalize text-[#0e3b69]">Role: {role}</p>
          </div>
          <Button type="button" variant="secondary" onClick={signOut}>
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Sign out
          </Button>
        </div>
        <div className="mt-6 flex items-start gap-3 text-sm leading-6 text-[#43474f]">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#0e3b69]" aria-hidden="true" />
          Owner routes are protected by role-based access. Contributors can submit suggestions,
          but they cannot directly edit official notes.
        </div>
      </section>

      <section className="mt-8 rounded-lg border border-[#c3c6d0] bg-[#f9f9f9] p-6">
        <h2 className="flex items-center gap-3 border-b border-[#c3c6d0] pb-4 text-xl font-semibold">
          <ToggleLeft className="h-5 w-5 text-[#0e3b69]" aria-hidden="true" />
          Publication and Contribution Mode
        </h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <label className="flex items-center gap-3 rounded border border-[#c3c6d0] bg-white p-4 text-sm font-medium text-[#43474f]">
            <input
              type="checkbox"
              checked={siteSettings.public_notes_enabled}
              onChange={(event) => void updateSetting({ public_notes_enabled: event.target.checked })}
            />
            Public notes enabled
          </label>
          <label className="flex items-center gap-3 rounded border border-[#c3c6d0] bg-white p-4 text-sm font-medium text-[#43474f]">
            <input
              type="checkbox"
              checked={siteSettings.contributions_enabled}
              onChange={(event) => void updateSetting({ contributions_enabled: event.target.checked })}
            />
            Contributions enabled
          </label>
          <label className="flex items-center gap-3 rounded border border-[#c3c6d0] bg-white p-4 text-sm font-medium text-[#43474f]">
            <input
              type="checkbox"
              checked={siteSettings.require_login_to_contribute}
              onChange={(event) => void updateSetting({ require_login_to_contribute: event.target.checked })}
            />
            Require login
          </label>
        </div>
      </section>

      <section className="mt-8 rounded-lg border border-[#c3c6d0] bg-[#f9f9f9] p-6">
        <h2 className="flex items-center gap-3 border-b border-[#c3c6d0] pb-4 text-xl font-semibold">
          <Download className="h-5 w-5 text-[#0e3b69]" aria-hidden="true" />
          Data Export
        </h2>
        <p className="mt-6 text-sm leading-6 text-[#43474f]">
          Download a complete archive of official notes, stored diagram paths, and submitted suggestions.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <Button type="button" variant="secondary" onClick={() => exportNotesAsJson(notes)}>
            <Download className="h-4 w-4" aria-hidden="true" />
            Export all notes as JSON
          </Button>
          <Button type="button" variant="secondary" onClick={() => exportNotesAsMarkdown(notes)}>
            <Download className="h-4 w-4" aria-hidden="true" />
            Export Markdown
          </Button>
          <Button type="button" variant="secondary" onClick={() => exportSuggestionsAsJson(suggestions)}>
            <Download className="h-4 w-4" aria-hidden="true" />
            Export suggestions
          </Button>
        </div>
      </section>

      <section className="mt-8 rounded-lg border border-[#c3c6d0] bg-[#f9f9f9] p-6">
        <h2 className="flex items-center gap-3 border-b border-[#c3c6d0] pb-4 text-xl font-semibold">
          <UploadCloud className="h-5 w-5 text-[#0e3b69]" aria-hidden="true" />
          Starter Notes
        </h2>
        <p className="mt-6 text-sm leading-6 text-[#43474f]">
          Create the six starter notes from the Olympiad Codex brief. Existing starter slugs are not
          duplicated.
        </p>
        <Button type="button" className="mt-6" onClick={seedStarterNotes} disabled={busy}>
          <KeyRound className="h-4 w-4" aria-hidden="true" />
          {busy ? "Creating..." : "Create starter notes"}
        </Button>
      </section>

      <section className="mt-8 rounded-lg border border-[#c3c6d0] bg-[#f9f9f9] p-6">
        <h2 className="border-b border-[#c3c6d0] pb-4 text-xl font-semibold">Audit Log</h2>
        <div className="mt-5 grid gap-3">
          {auditLogs.length ? (
            auditLogs.map((log) => (
              <div key={log.id} className="rounded border border-[#c3c6d0] bg-white p-3 text-sm">
                <p className="font-medium text-[#1a1c1c]">{log.action}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.06em] text-[#43474f]">
                  {log.target_type} · {new Date(log.created_at).toLocaleString()}
                </p>
              </div>
            ))
          ) : (
            <p className="text-sm text-[#43474f]">Important owner and contribution actions will appear here.</p>
          )}
        </div>
      </section>
    </div>
  );
}
