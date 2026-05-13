import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DiagramGallery } from "@/components/diagrams/DiagramGallery";
import { MarkdownPreview } from "@/components/editor/MarkdownPreview";
import { NoteViewActions } from "@/components/notes/NoteViewActions";
import { Badge, DifficultyBadge } from "@/components/ui/Badge";
import { createClient } from "@/lib/supabase/server";
import type { Note } from "@/lib/types";
import { formatUpdatedAt } from "@/lib/utils/notes";

export const dynamic = "force-dynamic";

export default async function NoteViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const { data: noteData } = await supabase
    .from("notes")
    .select("*")
    .eq("user_id", user!.id)
    .eq("id", id)
    .single();

  if (!noteData) notFound();

  const note = noteData as Note;
  const { data: relatedData } = await supabase
    .from("notes")
    .select("*")
    .eq("user_id", user!.id)
    .eq("is_archived", false)
    .eq("topic", note.topic)
    .neq("id", note.id)
    .limit(3);

  const { data: signedData } = note.diagram_urls.length
    ? await supabase.storage.from("diagrams").createSignedUrls(note.diagram_urls, 60 * 60)
    : { data: [] };

  const diagrams =
    signedData?.flatMap((item) =>
      item.path && item.signedUrl ? [{ path: item.path, signedUrl: item.signedUrl }] : []
    ) ?? [];

  const related = (relatedData ?? []) as Note[];

  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-4 py-8 lg:grid-cols-[minmax(0,616px)_288px] lg:px-10 lg:py-20">
      <article className="rounded-lg border border-[#c3c6d0] bg-white p-6 lg:p-10">
        <nav className="mb-6 flex items-center gap-2 text-[13px] font-medium tracking-[0.04em] text-[#43474f]">
          <Link href="/app/notes" className="text-[#0e3b69]">
            Notes Library
          </Link>
          <ChevronRight className="h-3 w-3" aria-hidden="true" />
          <span>{note.topic}</span>
        </nav>

        <header>
          <div className="mb-4 flex flex-wrap gap-2">
            <Badge tone="blue">{note.topic}</Badge>
            <Badge>{note.note_type}</Badge>
            <DifficultyBadge value={note.difficulty} />
          </div>
          <h1 className="text-4xl font-semibold leading-tight text-[#1a1c1c]">{note.title}</h1>
          {note.description ? (
            <p className="mt-4 text-lg leading-8 text-[#43474f]">{note.description}</p>
          ) : null}
          <p className="mt-4 text-sm text-[#43474f]">Last updated: {formatUpdatedAt(note.updated_at)}</p>
        </header>

        <div className="mt-8">
          <MarkdownPreview markdown={note.body_markdown} />
        </div>
      </article>

      <aside className="grid content-start gap-6">
        <NoteViewActions note={note} />

        <section className="rounded-lg border border-[#c3c6d0] bg-[#f9f9f9] p-5">
          <h2 className="text-lg font-semibold text-[#1a1c1c]">Metadata</h2>
          <div className="mt-4 grid gap-4 text-sm">
            <div className="flex justify-between gap-3">
              <span className="text-[#43474f]">Topic</span>
              <Badge tone="blue">{note.topic}</Badge>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-[#43474f]">Type</span>
              <Badge>{note.note_type}</Badge>
            </div>
            <div>
              <span className="text-[#43474f]">Tags</span>
              <div className="mt-2 flex flex-wrap gap-2">
                {note.tags.length ? note.tags.map((tag) => <Badge key={tag}>{tag}</Badge>) : <Badge>No tags</Badge>}
              </div>
            </div>
          </div>
        </section>

        <DiagramGallery diagrams={diagrams} />

        <section className="rounded-lg border border-[#c3c6d0] bg-[#f9f9f9] p-5">
          <h2 className="text-lg font-semibold text-[#1a1c1c]">Related Notes</h2>
          <div className="mt-4 grid gap-2">
            {related.length ? (
              related.map((item) => (
                <Link key={item.id} href={`/app/notes/${item.id}`} className="rounded p-2 hover:bg-white">
                  <p className="text-sm font-semibold text-[#1a1c1c]">{item.title}</p>
                  {item.description ? (
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#43474f]">{item.description}</p>
                  ) : null}
                </Link>
              ))
            ) : (
              <p className="text-sm leading-6 text-[#43474f]">Related notes will appear by topic.</p>
            )}
          </div>
        </section>
      </aside>
    </div>
  );
}
