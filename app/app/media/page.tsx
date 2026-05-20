import { MediaLibraryClient } from "@/components/media/MediaLibraryClient";
import { requireOwner } from "@/lib/auth/server";
import type { Diagram, Note } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function MediaPage() {
  const { supabase, user } = await requireOwner();
  const [{ data: diagramsData }, { data: notesData }] = await Promise.all([
    supabase.from("diagrams").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
    supabase.from("notes").select("*").eq("user_id", user.id).eq("is_archived", false).order("title", { ascending: true })
  ]);

  const signed = await Promise.all(
    ((diagramsData ?? []) as Diagram[]).map(async (diagram) => {
      const { data } = await supabase.storage.from("note-diagrams").createSignedUrl(diagram.storage_path, 60 * 60);
      return { ...diagram, signed_url: data?.signedUrl ?? null };
    })
  );

  return <MediaLibraryClient assets={signed} notes={(notesData ?? []) as Note[]} />;
}
