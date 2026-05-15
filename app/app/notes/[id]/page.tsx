import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { DiagramGallery } from "@/components/diagrams/DiagramGallery";
import { MarkdownPreview } from "@/components/editor/MarkdownPreview";
import { NoteQualityPanel } from "@/components/notes/NoteQualityPanel";
import { NoteReviewActions } from "@/components/notes/NoteReviewActions";
import { NoteViewActions } from "@/components/notes/NoteViewActions";
import { Badge, DifficultyBadge } from "@/components/ui/Badge";
import { inverseNoteLinkRelation } from "@/lib/constants/daily";
import { createClient } from "@/lib/supabase/server";
import type { MistakeLog, Note, NoteLink, NoteReview, ProblemLog } from "@/lib/types";
import { formatUpdatedAt } from "@/lib/utils/notes";

export const dynamic = "force-dynamic";

export default async function NoteViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: noteData } = await supabase
    .from("notes")
    .select("*")
    .eq("id", id)
    .single();

  if (!noteData) notFound();

  const note = noteData as Note;
  const [
    { data: relatedData },
    { data: allNotesData },
    { data: sourceLinksData },
    { data: backlinksData },
    { data: problemsData },
    { data: mistakesData },
    { data: reviewData }
  ] = await Promise.all([
    supabase.from("notes").select("*").eq("is_archived", false).eq("topic", note.topic).neq("id", note.id).limit(3),
    supabase.from("notes").select("*").eq("is_archived", false).order("title", { ascending: true }),
    supabase.from("note_links").select("*").eq("source_note_id", note.id),
    supabase.from("note_links").select("*").eq("target_note_id", note.id),
    supabase.from("problem_logs").select("*").contains("linked_note_ids", [note.id]).order("updated_at", { ascending: false }).limit(8),
    supabase.from("mistake_logs").select("*").contains("linked_note_ids", [note.id]).order("updated_at", { ascending: false }).limit(8),
    supabase.from("note_reviews").select("*").eq("note_id", note.id).maybeSingle()
  ]);

  const { data: signedData } = note.diagram_urls.length
    ? await supabase.storage.from("note-diagrams").createSignedUrls(note.diagram_urls, 60 * 60)
    : { data: [] };

  const diagrams =
    signedData?.flatMap((item) =>
      item.path && item.signedUrl ? [{ path: item.path, signedUrl: item.signedUrl }] : []
    ) ?? [];

  const related = (relatedData ?? []) as Note[];
  const allNotes = (allNotesData ?? []) as Note[];
  const sourceLinks = (sourceLinksData ?? []) as NoteLink[];
  const backlinks = (backlinksData ?? []) as NoteLink[];
  const problems = (problemsData ?? []) as ProblemLog[];
  const mistakes = (mistakesData ?? []) as MistakeLog[];
  const review = reviewData as NoteReview | null;

  const explicitLinks = sourceLinks
    .map((link) => ({ link, note: allNotes.find((item) => item.id === link.target_note_id) }))
    .filter((row): row is { link: NoteLink; note: Note } => Boolean(row.note));
  const explicitlyRelatedNoteIds = new Set(explicitLinks.map(({ note }) => note.id));
  const backlinkRows = backlinks
    .flatMap((link) => {
      const backlinkNote = allNotes.find((item) => item.id === link.source_note_id);
      return backlinkNote
        ? [{ link, currentRelation: inverseNoteLinkRelation(link.relation_type), note: backlinkNote }]
        : [];
    })
    .filter((row) => !explicitlyRelatedNoteIds.has(row.note.id));

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
            <Badge tone={note.visibility === "public" ? "green" : "default"}>{note.visibility}</Badge>
            <DifficultyBadge value={note.difficulty} noteType={note.note_type} />
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
            <div className="flex justify-between gap-3">
              <span className="text-[#43474f]">Visibility</span>
              <Badge tone={note.visibility === "public" ? "green" : "default"}>{note.visibility}</Badge>
            </div>
          </div>
        </section>

        <DiagramGallery diagrams={diagrams} />

        <NoteReviewActions note={note} review={review} />

        <NoteQualityPanel note={note} />

        <section className="rounded-lg border border-[#c3c6d0] bg-[#f9f9f9] p-5">
          <h2 className="text-lg font-semibold text-[#1a1c1c]">Related Notes</h2>
          <div className="mt-4 grid gap-2">
            {explicitLinks.length ? (
              explicitLinks.map(({ link, note: item }) => (
                <Link key={link.id} href={`/app/notes/${item.id}`} className="rounded p-2 hover:bg-white">
                  <p className="text-sm font-semibold text-[#1a1c1c]">{item.title}</p>
                  <p className="mt-1 text-xs text-[#0e3b69]">{link.relation_type}</p>
                  {item.description ? (
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#43474f]">{item.description}</p>
                  ) : null}
                </Link>
              ))
            ) : related.length ? (
              related.map((item) => (
                <Link key={item.id} href={`/app/notes/${item.id}`} className="rounded p-2 hover:bg-white">
                  <p className="text-sm font-semibold text-[#1a1c1c]">{item.title}</p>
                  <p className="mt-1 text-xs text-[#43474f]">Same topic</p>
                </Link>
              ))
            ) : (
              <p className="text-sm leading-6 text-[#43474f]">Related notes will appear by topic.</p>
            )}
          </div>
        </section>

        <section className="rounded-lg border border-[#c3c6d0] bg-[#f9f9f9] p-5">
          <h2 className="text-lg font-semibold text-[#1a1c1c]">Backlinks</h2>
          <div className="mt-4 grid gap-2">
            {backlinkRows.length ? (
              backlinkRows.map(({ link, currentRelation, note: item }) => (
                <Link key={link.id} href={`/app/notes/${item.id}`} className="rounded p-2 text-sm font-semibold text-[#0e3b69] hover:bg-white">
                  {item.title}
                  <span className="ml-2 text-xs font-normal text-[#43474f]">({currentRelation})</span>
                </Link>
              ))
            ) : (
              <p className="text-sm leading-6 text-[#43474f]">No notes link here yet.</p>
            )}
          </div>
        </section>

        <section className="rounded-lg border border-[#c3c6d0] bg-[#f9f9f9] p-5">
          <h2 className="text-lg font-semibold text-[#1a1c1c]">Problems where this appears</h2>
          <div className="mt-4 grid gap-2">
            {problems.length ? (
              problems.map((problem) => (
                <Link key={problem.id} href={`/app/problems/${problem.id}`} className="rounded p-2 hover:bg-white">
                  <p className="text-sm font-semibold text-[#1a1c1c]">{problem.title}</p>
                  {problem.key_idea ? <p className="mt-1 line-clamp-2 text-xs text-[#43474f]">{problem.key_idea}</p> : null}
                </Link>
              ))
            ) : (
              <p className="text-sm leading-6 text-[#43474f]">No linked problems yet.</p>
            )}
          </div>
        </section>

        <section className="rounded-lg border border-[#c3c6d0] bg-[#f9f9f9] p-5">
          <h2 className="text-lg font-semibold text-[#1a1c1c]">Common mistakes from my log</h2>
          <div className="mt-4 grid gap-2">
            {mistakes.length ? (
              mistakes.map((mistake) => (
                <div key={mistake.id} className="rounded p-2">
                  <p className="text-sm font-semibold text-[#1a1c1c]">{mistake.title}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-[#43474f]">{mistake.description}</p>
                </div>
              ))
            ) : (
              <p className="text-sm leading-6 text-[#43474f]">No linked mistakes yet.</p>
            )}
          </div>
        </section>
      </aside>
    </div>
  );
}
