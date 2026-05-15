import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isNoteDiagramStoragePath, normalizeDiagramStoragePath } from "@/lib/utils/diagrams";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const rawPath = url.searchParams.get("path") ?? "";
  const path = normalizeDiagramStoragePath(rawPath);

  if (!isNoteDiagramStoragePath(path)) {
    return NextResponse.json({ error: "Invalid diagram path." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: notes, error: noteError } = await supabase
    .from("notes")
    .select("id")
    .contains("diagram_urls", [path])
    .limit(1);

  if (noteError) {
    return NextResponse.json({ error: "Could not verify diagram access." }, { status: 403 });
  }

  if (!notes?.length) {
    return NextResponse.json({ error: "Diagram not found on an accessible note." }, { status: 404 });
  }

  const { data, error } = await supabase.storage.from("note-diagrams").createSignedUrl(path, 60 * 10);

  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: "Could not create diagram preview URL." }, { status: 404 });
  }

  const response = NextResponse.redirect(data.signedUrl, 302);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
