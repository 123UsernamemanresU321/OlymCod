import Link from "next/link";
import { notFound } from "next/navigation";
import { MarkdownPreview } from "@/components/editor/MarkdownPreview";
import { Badge, DifficultyBadge } from "@/components/ui/Badge";
import { createClient } from "@/lib/supabase/server";
import type { Note } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function PublicNotePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("notes")
    .select("*")
    .eq("slug", slug)
    .eq("visibility", "public")
    .eq("is_archived", false)
    .limit(1)
    .maybeSingle();

  if (!data) notFound();
  const note = data as Note;

  const { data: signedData } = note.diagram_urls.length
    ? await supabase.storage.from("note-diagrams").createSignedUrls(note.diagram_urls, 60 * 60)
    : { data: [] };
  const diagrams =
    signedData?.flatMap((item) =>
      item.path && item.signedUrl ? [{ path: item.path, signedUrl: item.signedUrl }] : []
    ) ?? [];

  return (
    <main className="min-h-screen bg-[#f9f9f9] px-4 py-10 text-[#1a1c1c] lg:px-10">
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[minmax(0,720px)_280px]">
        <article className="rounded-lg border border-[#c3c6d0] bg-white p-6 lg:p-10">
          <Link href="/notes" className="text-sm font-medium text-[#0e3b69]">
            Public Notes
          </Link>
          <div className="mt-5 flex flex-wrap gap-2">
            <Badge tone="blue">{note.topic}</Badge>
            <Badge>{note.note_type}</Badge>
            <DifficultyBadge value={note.difficulty} />
          </div>
          <h1 className="mt-5 text-4xl font-semibold leading-tight">{note.title}</h1>
          {note.description ? <p className="mt-4 text-lg leading-8 text-[#43474f]">{note.description}</p> : null}
          <div className="mt-8">
            <MarkdownPreview markdown={note.body_markdown} />
          </div>
        </article>

        <aside className="grid content-start gap-4">
          <section className="rounded-lg border border-[#c3c6d0] bg-white p-5">
            <h2 className="text-lg font-semibold">Suggest an improvement</h2>
            <p className="mt-2 text-sm leading-6 text-[#43474f]">
              Corrections and additions go to the owner review queue before publication.
            </p>
            <div className="mt-4 grid gap-2">
              <Link
                href={`/contribute/note/${note.id}`}
                className="inline-flex min-h-9 items-center justify-center rounded border border-[#2c5282] bg-[#2c5282] px-4 py-2 text-[13px] font-medium tracking-[0.04em] text-white"
              >
                Suggest Correction
              </Link>
              <Link
                href="/contribute/new"
                className="inline-flex min-h-9 items-center justify-center rounded border border-[#c3c6d0] bg-[#f9f9f9] px-4 py-2 text-[13px] font-medium tracking-[0.04em] text-[#0e3b69]"
              >
                Propose New Note
              </Link>
            </div>
          </section>

          {diagrams.length ? (
            <section className="rounded-lg border border-[#c3c6d0] bg-white p-5">
              <h2 className="text-lg font-semibold">Diagrams</h2>
              <div className="mt-4 grid gap-3">
                {diagrams.map((diagram) => (
                  <figure key={diagram.path} className="rounded border border-[#c3c6d0] p-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={diagram.signedUrl} alt="Geometry diagram" className="h-44 w-full object-contain" />
                  </figure>
                ))}
              </div>
            </section>
          ) : null}
        </aside>
      </div>
    </main>
  );
}
