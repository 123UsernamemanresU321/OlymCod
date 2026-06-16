import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { DiagramGallery } from "@/components/diagrams/DiagramGallery";
import { InlineMarkdown } from "@/components/editor/InlineMarkdown";
import { MarkdownPreview } from "@/components/editor/MarkdownPreview";
import { LearningMetadataList } from "@/components/notes/LearningMetadataList";
import { NoteQualityPanel } from "@/components/notes/NoteQualityPanel";
import { NoteReviewActions } from "@/components/notes/NoteReviewActions";
import { NoteOutline } from "@/components/notes/NoteOutline";
import { NoteSplitTool } from "@/components/notes/NoteSplitTool";
import { NoteViewActions } from "@/components/notes/NoteViewActions";
import { NoteViewModeShell } from "@/components/notes/NoteViewModeShell";
import { VersionHistory } from "@/components/notes/VersionHistory";
import { Badge, DifficultyBadge } from "@/components/ui/Badge";
import { noteTypeLearningFields } from "@/lib/constants/note-formats";
import { normalizeNoteRelations } from "@/lib/notes/normalizeNoteRelations";
import { createClient } from "@/lib/supabase/server";
import type { MistakeLog, Note, NoteLink, NoteReview, ProblemLog } from "@/lib/types";
import { isNoteDiagramStoragePath } from "@/lib/utils/diagrams";
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
    .eq("user_id", user.id)
    .single();

  if (!noteData) notFound();

  const note = noteData as Note;
  const learningFields = noteTypeLearningFields(note.note_type);
  const [
    { data: relatedData },
    { data: allNotesData },
    { data: sourceLinksData },
    { data: backlinksData },
    { data: problemsData },
    { data: mistakesData },
    { data: reviewData }
  ] = await Promise.all([
    supabase.from("notes").select("*").eq("user_id", user.id).eq("is_archived", false).eq("topic", note.topic).neq("id", note.id).limit(3),
    supabase.from("notes").select("*").eq("user_id", user.id).eq("is_archived", false).order("title", { ascending: true }),
    supabase.from("note_links").select("*").eq("user_id", user.id).eq("source_note_id", note.id),
    supabase.from("note_links").select("*").eq("user_id", user.id).eq("target_note_id", note.id),
    supabase.from("problem_logs").select("*").eq("user_id", user.id).contains("linked_note_ids", [note.id]).order("updated_at", { ascending: false }).limit(8),
    supabase.from("mistake_logs").select("*").eq("user_id", user.id).contains("linked_note_ids", [note.id]).order("updated_at", { ascending: false }).limit(8),
    supabase.from("note_reviews").select("*").eq("user_id", user.id).eq("note_id", note.id).maybeSingle()
  ]);

  const safeDiagramUrls = note.diagram_urls.filter(isNoteDiagramStoragePath);
  const { data: signedData } = safeDiagramUrls.length
    ? await supabase.storage.from("note-diagrams").createSignedUrls(safeDiagramUrls, 60 * 60)
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

  const relationGroups = normalizeNoteRelations({
    outgoingLinks: sourceLinks,
    incomingLinks: backlinks,
    notes: allNotes
  });
  const linkedNoteCount = new Set([
    ...sourceLinks.map((link) => link.target_note_id),
    ...backlinks.map((link) => link.source_note_id)
  ]).size;

  return (
    <NoteViewModeShell>
    <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:px-10 lg:py-16">
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
          <h1 className="text-4xl font-semibold leading-tight text-[#1a1c1c]">
            <InlineMarkdown text={note.title} />
          </h1>
          {note.description ? (
            <InlineMarkdown text={note.description} className="mt-4 block text-lg leading-8 text-[#43474f]" />
          ) : null}
          <p className="mt-4 text-sm text-[#43474f]">Last updated: {formatUpdatedAt(note.updated_at)}</p>
        </header>

        <div className="mt-8">
          {(learningFields.recognitionTriggers && note.recognition_triggers?.length) ||
          (learningFields.falseUses && note.false_uses?.length) ? (
            <div className="mb-8 grid gap-4">
              {learningFields.recognitionTriggers ? (
                <LearningMetadataList
                  title="Recognition Triggers"
                  description="Think of this when you see..."
                  items={note.recognition_triggers ?? []}
                />
              ) : null}
              {learningFields.falseUses ? (
                <LearningMetadataList title="Common False Uses" items={note.false_uses ?? []} tone="red" />
              ) : null}
            </div>
          ) : null}
          <MarkdownPreview markdown={note.body_markdown} />
        </div>
      </article>

      <aside className="grid content-start gap-6">
        <NoteViewActions note={note} />
        <NoteOutline markdown={note.body_markdown} compact />

        <section
          aria-label="Directional related notes including Prerequisites and Used By"
          className="rounded-lg border border-[#c3c6d0] bg-[#f9f9f9] p-5"
        >
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

        <NoteQualityPanel note={note} linkedNoteCount={linkedNoteCount} linkedProblemCount={problems.length} />
        <VersionHistory
          noteId={note.id}
          currentTitle={note.title}
          currentBody={note.body_markdown}
          currentMetadata={{
            slug: note.slug,
            topic: note.topic,
            note_type: note.note_type,
            difficulty: note.difficulty,
            description: note.description,
            tags: note.tags,
            recognition_triggers: note.recognition_triggers,
            false_uses: note.false_uses,
            visibility: note.visibility,
            is_favorite: note.is_favorite
          }}
        />
        <NoteSplitTool note={note} />

        <section className="rounded-lg border border-[#c3c6d0] bg-[#f9f9f9] p-5">
          <h2 className="text-lg font-semibold text-[#1a1c1c]">Related Notes</h2>
          <div className="mt-4 grid gap-5">
            {relationGroups.length ? (
              relationGroups.map((group) => (
                <div key={group.label}>
                  <h3 className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#0e3b69]">
                    {group.label}
                  </h3>
                  <div className="mt-2 grid gap-2">
                    {group.items.map(({ note: item, relation, direction }) => (
                      <Link key={`${group.label}-${item.id}`} href={`/app/notes/${item.id}`} className="rounded p-2 hover:bg-white">
                        <p className="text-sm font-semibold text-[#1a1c1c]">
                          <InlineMarkdown text={item.title} />
                        </p>
                        <p className="mt-1 text-xs text-[#0e3b69]">
                          {direction === "incoming" ? "linked here as" : "linked as"} {relation}
                        </p>
                        {item.description ? (
                          <InlineMarkdown text={item.description} className="mt-1 line-clamp-2 text-xs leading-5 text-[#43474f]" />
                        ) : null}
                      </Link>
                    ))}
                  </div>
                </div>
              ))
            ) : related.length ? (
              related.map((item) => (
                <Link key={item.id} href={`/app/notes/${item.id}`} className="rounded p-2 hover:bg-white">
                  <p className="text-sm font-semibold text-[#1a1c1c]">
                    <InlineMarkdown text={item.title} />
                  </p>
                  <p className="mt-1 text-xs text-[#43474f]">Same topic</p>
                </Link>
              ))
            ) : (
              <p className="text-sm leading-6 text-[#43474f]">Related notes will appear by topic.</p>
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
    </NoteViewModeShell>
  );
}
