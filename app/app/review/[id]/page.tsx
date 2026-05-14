import { notFound } from "next/navigation";
import { SuggestionReviewClient } from "@/components/review/SuggestionReviewClient";
import { requireOwner } from "@/lib/auth/server";
import type { Note, Profile, Suggestion } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ReviewDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await requireOwner();
  const { data: suggestionData } = await supabase.from("suggestions").select("*").eq("id", id).single();
  if (!suggestionData) notFound();
  const suggestion = suggestionData as Suggestion;

  const [{ data: noteData }, { data: profileData }] = await Promise.all([
    suggestion.target_note_id
      ? supabase.from("notes").select("*").eq("id", suggestion.target_note_id).maybeSingle()
      : Promise.resolve({ data: null }),
    suggestion.contributor_id
      ? supabase.from("profiles").select("*").eq("id", suggestion.contributor_id).maybeSingle()
      : Promise.resolve({ data: null })
  ]);

  const { data: signedData } = suggestion.diagram_urls.length
    ? await supabase.storage.from("suggestion-diagrams").createSignedUrls(suggestion.diagram_urls, 60 * 60)
    : { data: [] };
  const diagrams =
    signedData?.flatMap((item) =>
      item.path && item.signedUrl ? [{ path: item.path, signedUrl: item.signedUrl }] : []
    ) ?? [];

  return (
    <SuggestionReviewClient
      suggestion={suggestion}
      targetNote={(noteData as Note | null) ?? null}
      contributor={(profileData as Profile | null) ?? null}
      ownerId={user.id}
      diagrams={diagrams}
    />
  );
}
