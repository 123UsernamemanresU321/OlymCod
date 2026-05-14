import { PublicNotesClient } from "@/components/public/PublicNotesClient";
import { createClient } from "@/lib/supabase/server";
import type { Note, SiteSettings } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function PublicNotesPage() {
  const supabase = await createClient();
  const { data: settingsData } = await supabase
    .from("site_settings")
    .select("*")
    .eq("id", "main")
    .single();
  const settings = settingsData as SiteSettings | null;

  if (!settings?.public_notes_enabled) {
    return (
      <main className="min-h-screen bg-[#f9f9f9] px-4 py-16 text-[#1a1c1c]">
        <div className="mx-auto max-w-2xl rounded-lg border border-[#c3c6d0] bg-white p-8">
          <h1 className="text-3xl font-semibold">Public notes are disabled</h1>
          <p className="mt-3 leading-7 text-[#43474f]">
            The owner has not enabled public browsing. Private notes remain owner-only.
          </p>
        </div>
      </main>
    );
  }

  const { data } = await supabase
    .from("notes")
    .select("*")
    .eq("visibility", "public")
    .eq("is_archived", false)
    .order("updated_at", { ascending: false });

  return <PublicNotesClient notes={(data ?? []) as Note[]} />;
}
