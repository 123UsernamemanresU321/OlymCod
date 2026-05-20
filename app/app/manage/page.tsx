import { BulkMetadataManager } from "@/components/manage/BulkMetadataManager";
import { requireOwner } from "@/lib/auth/server";
import type { Note } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ManagePage() {
  const { supabase, user } = await requireOwner();
  const { data } = await supabase
    .from("notes")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  return <BulkMetadataManager notes={(data ?? []) as Note[]} />;
}
