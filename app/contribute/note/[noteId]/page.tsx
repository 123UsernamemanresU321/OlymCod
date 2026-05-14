import { notFound } from "next/navigation";
import { SuggestionForm } from "@/components/contribute/SuggestionForm";
import { requireContributor } from "@/lib/auth/server";
import type { Note } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function NoteContributionPage({ params }: { params: Promise<{ noteId: string }> }) {
  const { noteId } = await params;
  const { supabase } = await requireContributor(`/contribute/note/${noteId}`);
  const { data } = await supabase
    .from("notes")
    .select("*")
    .eq("id", noteId)
    .eq("visibility", "public")
    .eq("is_archived", false)
    .single();

  if (!data) notFound();

  return (
    <main className="min-h-screen bg-[#f9f9f9] px-4 py-8 lg:px-10">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8">
          <h1 className="text-3xl font-semibold">Suggest an Edit</h1>
          <p className="mt-2 text-[#43474f]">Target note: {(data as Note).title}</p>
        </header>
        <SuggestionForm targetNote={data as Note} defaultType="correction" />
      </div>
    </main>
  );
}
