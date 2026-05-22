import { TemplateLibraryClient } from "@/components/templates/TemplateLibraryClient";
import { requireOwner } from "@/lib/auth/server";
import type { NoteTemplate } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function TemplatesPage() {
  const { supabase, user } = await requireOwner();
  const { data } = await supabase
    .from("note_templates")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  return <TemplateLibraryClient customTemplates={(data ?? []) as NoteTemplate[]} />;
}
