import { TaxonomyManagerClient } from "@/components/taxonomy/TaxonomyManagerClient";
import { requireOwner } from "@/lib/auth/server";
import type { Note } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function TaxonomyPage() {
  const { supabase, user } = await requireOwner();
  const { data } = await supabase.from("notes").select("*").eq("user_id", user.id).order("title", { ascending: true });
  return <TaxonomyManagerClient notes={(data ?? []) as Note[]} />;
}
