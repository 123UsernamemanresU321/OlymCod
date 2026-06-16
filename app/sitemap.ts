import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://olympiad-codex.vercel.app";

function entry(path: string, lastModified = new Date()): MetadataRoute.Sitemap[number] {
  return {
    url: `${siteUrl}${path}`,
    lastModified,
    changeFrequency: "weekly",
    priority: path === "/" ? 1 : 0.7
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient();
  const { data: settings } = await supabase
    .from("site_settings")
    .select("public_notes_enabled")
    .eq("id", "main")
    .maybeSingle();

  const routes = [entry("/"), entry("/notes"), entry("/contribute")];
  if (!settings?.public_notes_enabled) return routes;

  const { data: notes } = await supabase
    .from("notes")
    .select("slug, updated_at")
    .eq("visibility", "public")
    .eq("is_archived", false)
    .order("updated_at", { ascending: false })
    .limit(500);

  return [
    ...routes,
    ...((notes ?? []).map((note) =>
      entry(`/notes/${note.slug}`, note.updated_at ? new Date(note.updated_at) : new Date())
    ))
  ];
}
