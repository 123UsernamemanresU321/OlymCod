import type { SupabaseClient } from "@supabase/supabase-js";
import { buildNotebookItems } from "@/lib/notebook/buildNotebookItems";
import { notebookSectionEnabled } from "@/lib/notebook/defaultNotebookConfig";
import type { NotebookConfig, NotebookRawData, NotebookSectionToggle } from "@/lib/notebook/types";
import type { Diagram, MistakeLog, Note, NoteLink, NoteReview, ProblemLog, QuickCapture } from "@/lib/types";

export async function loadNotebookRawData(
  supabase: SupabaseClient,
  userId: string,
  config: NotebookConfig
): Promise<NotebookRawData> {
  const show = (key: NotebookSectionToggle) => notebookSectionEnabled(config, key);
  const wantsProblems =
    config.contentSources.problemLogs ||
    config.detailLevel === "Problem Booklet Mode" ||
    show("showLinkedProblems");
  const wantsMistakes = config.contentSources.mistakeLogs || show("showLinkedMistakes");
  const wantsCaptures = config.contentSources.quickCaptures;
  const wantsReviews =
    config.contentSources.reviewDueNotes ||
    config.reviewStatuses.length > 0 ||
    show("showReviewStatus");
  const wantsDiagrams = config.contentSources.diagrams || show("showDiagrams");

  const [
    notesResult,
    problemsResult,
    mistakesResult,
    capturesResult,
    linksResult,
    reviewsResult,
    diagramsResult
  ] = await Promise.all([
    supabase.from("notes").select("*").eq("user_id", userId).eq("is_archived", false),
    wantsProblems
      ? supabase.from("problem_logs").select("*").eq("user_id", userId)
      : Promise.resolve({ data: [] }),
    wantsMistakes
      ? supabase.from("mistake_logs").select("*").eq("user_id", userId)
      : Promise.resolve({ data: [] }),
    wantsCaptures
      ? supabase.from("quick_captures").select("*").eq("user_id", userId).eq("is_archived", false)
      : Promise.resolve({ data: [] }),
    supabase.from("note_links").select("*").eq("user_id", userId),
    wantsReviews
      ? supabase.from("note_reviews").select("*").eq("user_id", userId)
      : Promise.resolve({ data: [] }),
    wantsDiagrams
      ? supabase.from("diagrams").select("*").eq("user_id", userId)
      : Promise.resolve({ data: [] })
  ]);

  return {
    notes: (notesResult.data ?? []) as Note[],
    problems: (problemsResult.data ?? []) as ProblemLog[],
    mistakes: (mistakesResult.data ?? []) as MistakeLog[],
    captures: (capturesResult.data ?? []) as QuickCapture[],
    noteLinks: (linksResult.data ?? []) as NoteLink[],
    reviews: (reviewsResult.data ?? []) as NoteReview[],
    diagrams: (diagramsResult.data ?? []) as Diagram[]
  };
}

export async function buildNotebookForUser(
  supabase: SupabaseClient,
  userId: string,
  config: NotebookConfig
) {
  const raw = await loadNotebookRawData(supabase, userId, config);
  return buildNotebookItems(raw, config);
}
