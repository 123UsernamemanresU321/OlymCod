import { FormulaBankClient } from "@/components/notes/FormulaBankClient";
import { createClient } from "@/lib/supabase/server";
import type { Note } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function FormulaBankPage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const { data } = await supabase
    .from("notes")
    .select("*")
    .eq("user_id", user!.id)
    .eq("is_archived", false)
    .or("note_type.eq.Formula,topic.eq.Formula Bank")
    .order("updated_at", { ascending: false });

  return <FormulaBankClient notes={(data ?? []) as Note[]} />;
}
