import { ArrowRight, BookOpen, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Note, SiteSettings } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function PublicHomePage() {
  const supabase = await createClient();
  const { data: settingsData } = await supabase
    .from("site_settings")
    .select("*")
    .eq("id", "main")
    .single();
  const settings = settingsData as SiteSettings | null;

  const { data: notesData } = settings?.public_notes_enabled
    ? await supabase
        .from("notes")
        .select("*")
        .eq("visibility", "public")
        .eq("is_archived", false)
        .order("updated_at", { ascending: false })
        .limit(6)
    : { data: [] };

  const notes = (notesData ?? []) as Note[];

  return (
    <main className="min-h-screen bg-[#f9f9f9] text-[#1a1c1c]">
      <section className="mx-auto grid min-h-[70vh] max-w-6xl content-center gap-10 px-4 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:px-10">
        <div>
          <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[#0e3b69]">
            Private handbook, moderated public contributions
          </p>
          <h1 className="mt-4 text-5xl font-semibold leading-tight text-[#0e3b69]">
            Olympiad Codex
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-[#43474f]">
            A serious mathematics knowledge base for theorems, techniques, formulae,
            problem patterns, and geometry diagrams. Public contributions are reviewed
            before anything becomes official.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/notes"
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded border border-[#2c5282] bg-[#2c5282] px-4 py-2 text-[13px] font-medium tracking-[0.04em] text-white hover:bg-[#23466f]"
            >
              Browse Public Notes
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href="/contribute"
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded border border-[#c3c6d0] bg-white px-4 py-2 text-[13px] font-medium tracking-[0.04em] text-[#0e3b69] hover:bg-[#eef4ff]"
            >
              Contribution Guidelines
            </Link>
            <Link
              href="/login"
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded border border-[#c3c6d0] bg-white px-4 py-2 text-[13px] font-medium tracking-[0.04em] text-[#0e3b69] hover:bg-[#eef4ff]"
            >
              Owner Login
            </Link>
          </div>
        </div>

        <div className="rounded-lg border border-[#c3c6d0] bg-white p-6">
          <div className="flex items-center gap-3 border-b border-[#c3c6d0] pb-4">
            <ShieldCheck className="h-5 w-5 text-[#0e3b69]" aria-hidden="true" />
            <h2 className="text-xl font-semibold">Editorial Control</h2>
          </div>
          <div className="mt-5 grid gap-4 text-sm leading-6 text-[#43474f]">
            <p>Official notes are owner-managed.</p>
            <p>Contributor submissions enter a review queue.</p>
            <p>Private notes are never listed publicly.</p>
            <p>Public notes can receive suggestions, corrections, and diagram proposals.</p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16 lg:px-10">
        <div className="flex items-center justify-between border-b border-[#c3c6d0] pb-3">
          <h2 className="text-xl font-semibold">Recent Public Notes</h2>
          <Link href="/notes" className="text-sm font-medium text-[#0e3b69]">
            View all
          </Link>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {notes.length ? (
            notes.map((note) => (
              <Link
                key={note.id}
                href={`/notes/${note.slug}`}
                className="rounded-lg border border-[#c3c6d0] bg-[#f9f9f9] p-5 hover:bg-white"
              >
                <BookOpen className="h-5 w-5 text-[#0e3b69]" aria-hidden="true" />
                <h3 className="mt-3 text-lg font-semibold">{note.title}</h3>
                {note.description ? (
                  <p className="mt-2 line-clamp-3 text-sm leading-6 text-[#43474f]">
                    {note.description}
                  </p>
                ) : null}
              </Link>
            ))
          ) : (
            <p className="rounded-lg border border-[#c3c6d0] p-5 text-sm text-[#43474f] md:col-span-2 lg:col-span-3">
              Public notes are currently disabled or no notes have been published yet.
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
