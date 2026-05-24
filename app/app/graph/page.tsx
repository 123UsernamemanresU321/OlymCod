import { NoteGraphClient, type GraphNote } from "@/components/graph/NoteGraphClient";
import { requireOwner } from "@/lib/auth/server";
import type { NoteLink } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function GraphPage({
  searchParams
}: {
  searchParams?: Promise<{ note?: string }>;
}) {
  const { supabase, user } = await requireOwner();
  const params = searchParams ? await searchParams : {};
  const [{ data: notesData }, { data: linksData }] = await Promise.all([
    supabase
      .from("notes")
      .select(
        "id,user_id,title,slug,topic,note_type,difficulty,description,tags,diagram_urls,recognition_triggers,false_uses,visibility,is_favorite,is_archived,created_at,updated_at,published_at"
      )
      .eq("user_id", user.id)
      .eq("is_archived", false)
      .order("title", { ascending: true }),
    supabase.from("note_links").select("*").eq("user_id", user.id)
  ]);

  return (
    <NoteGraphClient
      notes={(notesData ?? []) as GraphNote[]}
      links={(linksData ?? []) as NoteLink[]}
      initialNoteId={params.note ?? null}
    />
  );
}
