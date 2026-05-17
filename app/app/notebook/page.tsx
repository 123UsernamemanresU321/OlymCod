import { NotebookBuilder } from "@/components/notebook/NotebookBuilder";
import { NOTEBOOK_TOPIC_OPTIONS } from "@/lib/notebook/defaultNotebookConfig";
import { requireOwner } from "@/lib/auth/server";
import type { NotebookPreset } from "@/lib/types";

export const dynamic = "force-dynamic";

function uniqSorted(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value)))).sort(
    (a, b) => a.localeCompare(b)
  );
}

export default async function NotebookPage() {
  const { supabase, user } = await requireOwner();

  const [presetsResult, notesResult, problemsResult, mistakesResult, capturesResult] = await Promise.all([
    supabase
      .from("notebook_presets")
      .select("*")
      .eq("user_id", user.id)
      .order("is_default", { ascending: false })
      .order("updated_at", { ascending: false }),
    supabase.from("notes").select("topic,tags").eq("user_id", user.id).eq("is_archived", false),
    supabase.from("problem_logs").select("tags").eq("user_id", user.id),
    supabase.from("mistake_logs").select("topic").eq("user_id", user.id),
    supabase.from("quick_captures").select("topic_guess,tags").eq("user_id", user.id).eq("is_archived", false)
  ]);

  const noteRows = (notesResult.data ?? []) as Array<{ topic: string | null; tags: string[] | null }>;
  const problemRows = (problemsResult.data ?? []) as Array<{ tags: string[] | null }>;
  const mistakeRows = (mistakesResult.data ?? []) as Array<{ topic: string | null }>;
  const captureRows = (capturesResult.data ?? []) as Array<{ topic_guess: string | null; tags: string[] | null }>;

  const availableTopics = uniqSorted([
    ...NOTEBOOK_TOPIC_OPTIONS,
    ...noteRows.map((note) => note.topic),
    ...mistakeRows.map((mistake) => mistake.topic),
    ...captureRows.map((capture) => capture.topic_guess)
  ]);

  const availableTags = uniqSorted([
    ...noteRows.flatMap((note) => note.tags ?? []),
    ...problemRows.flatMap((problem) => problem.tags ?? []),
    ...captureRows.flatMap((capture) => capture.tags ?? [])
  ]);

  return (
    <NotebookBuilder
      presets={(presetsResult.data ?? []) as NotebookPreset[]}
      availableTopics={availableTopics}
      availableTags={availableTags}
    />
  );
}
