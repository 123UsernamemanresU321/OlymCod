import { ReviewQueueClient } from "@/components/review/ReviewQueueClient";
import { requireOwner } from "@/lib/auth/server";
import type { Profile, Suggestion } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ReviewQueuePage() {
  const { supabase } = await requireOwner();
  const [{ data: suggestionsData }, { data: profilesData }] = await Promise.all([
    supabase.from("suggestions").select("*").order("created_at", { ascending: false }),
    supabase.from("profiles").select("*").order("created_at", { ascending: false })
  ]);

  return (
    <ReviewQueueClient
      suggestions={(suggestionsData ?? []) as Suggestion[]}
      profiles={(profilesData ?? []) as Profile[]}
    />
  );
}
