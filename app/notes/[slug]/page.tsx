import { notFound } from "next/navigation";
import { PublicFooter } from "@/components/public/PublicFooter";
import { PublicNoteReader } from "@/components/public/PublicNoteReader";
import { createClient } from "@/lib/supabase/server";
import type { Note } from "@/lib/types";
import { isNoteDiagramStoragePath } from "@/lib/utils/diagrams";

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

  const safeDiagramUrls = note.diagram_urls.filter(isNoteDiagramStoragePath);
  const { data: signedData } = safeDiagramUrls.length
    ? await supabase.storage.from("note-diagrams").createSignedUrls(safeDiagramUrls, 60 * 60)
    : { data: [] };
  const diagrams =
    signedData?.flatMap((item) =>
      item.path && item.signedUrl ? [{ path: item.path, signedUrl: item.signedUrl }] : []
    ) ?? [];

  return (
    <>
      <PublicNoteReader note={note} diagrams={diagrams} />
      <PublicFooter />
    </>
  );
}
