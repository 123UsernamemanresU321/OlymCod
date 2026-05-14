import { SuggestionForm } from "@/components/contribute/SuggestionForm";
import { requireContributor } from "@/lib/auth/server";
import type { SiteSettings } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function NewContributionPage() {
  const { supabase } = await requireContributor();
  const { data } = await supabase.from("site_settings").select("*").eq("id", "main").single();
  const settings = data as SiteSettings | null;

  if (!settings?.contributions_enabled) {
    return (
      <main className="min-h-screen bg-[#f9f9f9] px-4 py-12">
        <div className="mx-auto max-w-2xl rounded-lg border border-[#c3c6d0] bg-white p-8">
          <h1 className="text-3xl font-semibold">Contributions are disabled</h1>
          <p className="mt-3 leading-7 text-[#43474f]">The owner is not accepting new suggestions right now.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f9f9f9] px-4 py-8 lg:px-10">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8">
          <h1 className="text-3xl font-semibold">Submit a Suggestion</h1>
          <p className="mt-2 text-[#43474f]">Your proposal enters the owner review queue.</p>
        </header>
        <SuggestionForm />
      </div>
    </main>
  );
}
