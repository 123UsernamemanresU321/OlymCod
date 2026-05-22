import { SavedViewsClient } from "@/components/views/SavedViewsClient";
import { requireOwner } from "@/lib/auth/server";
import type { SavedView } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ViewsPage() {
  const { supabase, user } = await requireOwner();
  const { data } = await supabase
    .from("saved_views")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  return <SavedViewsClient views={(data ?? []) as SavedView[]} />;
}
