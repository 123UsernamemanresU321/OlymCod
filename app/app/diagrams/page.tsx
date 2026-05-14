import { DiagramManagerClient } from "@/components/diagrams/DiagramManagerClient";
import { requireOwner } from "@/lib/auth/server";
import type { Diagram, Note } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function DiagramsPage() {
  const { supabase } = await requireOwner();
  const [{ data: diagramsData }, { data: notesData }] = await Promise.all([
    supabase.from("diagrams").select("*").order("created_at", { ascending: false }),
    supabase.from("notes").select("*").eq("is_archived", false).order("title", { ascending: true })
  ]);

  const diagrams = (diagramsData ?? []) as Diagram[];
  const signed = await Promise.all(
    diagrams.map(async (diagram) => {
      const { data } = await supabase.storage
        .from("note-diagrams")
        .createSignedUrl(diagram.storage_path, 60 * 60);
      return { ...diagram, signed_url: data?.signedUrl ?? null };
    })
  );

  return <DiagramManagerClient diagrams={signed} notes={(notesData ?? []) as Note[]} />;
}
