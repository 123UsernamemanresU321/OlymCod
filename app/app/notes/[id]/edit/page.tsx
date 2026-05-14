import { notFound, redirect } from "next/navigation";
import { NoteForm } from "@/components/notes/NoteForm";
import { createClient } from "@/lib/supabase/server";
import type { Note } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function EditNotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data } = await supabase
    .from("notes")
    .select("*")
    .eq("id", id)
    .single();

  if (!data) notFound();

  return <NoteForm mode="edit" initialNote={data as Note} />;
}
