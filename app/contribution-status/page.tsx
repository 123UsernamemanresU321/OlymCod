import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { getCurrentUserProfile } from "@/lib/auth/server";
import type { Suggestion } from "@/lib/types";
import { formatUpdatedAt } from "@/lib/utils/notes";

export const dynamic = "force-dynamic";

function statusTone(status: string) {
  if (status === "merged" || status === "approved") return "green";
  if (status === "rejected" || status === "spam") return "red";
  if (status === "needs_changes") return "blue";
  return "default";
}

export default async function ContributionStatusPage() {
  const { supabase, user, profile } = await getCurrentUserProfile();

  if (!user) {
    return (
      <main className="min-h-screen bg-[#f9f9f9] px-4 py-16">
        <div className="mx-auto max-w-2xl rounded-lg border border-[#c3c6d0] bg-white p-8">
          <h1 className="text-3xl font-semibold">Contribution Status</h1>
          <p className="mt-3 leading-7 text-[#43474f]">Log in to submit and track suggestions.</p>
          <Link className="mt-6 inline-flex rounded border border-[#2c5282] bg-[#2c5282] px-4 py-2 text-sm font-medium text-white" href="/login?next=/contribution-status">
            Log in
          </Link>
        </div>
      </main>
    );
  }

  const { data } = await supabase
    .from("suggestions")
    .select("*")
    .eq("contributor_id", user.id)
    .order("created_at", { ascending: false });
  const suggestions = (data ?? []) as Suggestion[];

  return (
    <main className="min-h-screen bg-[#f9f9f9] px-4 py-10 lg:px-10">
      <div className="mx-auto max-w-4xl">
        <header>
          <Link href="/" className="text-sm font-medium text-[#0e3b69]">Olympiad Codex</Link>
          <h1 className="mt-3 text-3xl font-semibold">Contribution Status</h1>
          <p className="mt-2 text-[#43474f]">
            Role: <span className="font-medium capitalize">{profile?.role ?? "contributor"}</span>
          </p>
          {profile?.is_banned || profile?.role === "banned" ? (
            <p className="mt-4 rounded border border-[#ffb4ab] bg-[#ffdad6] p-3 text-sm text-[#8f1d15]">
              Your account is suspended from submitting suggestions.
            </p>
          ) : null}
        </header>

        <section className="mt-8 grid gap-4">
          {suggestions.length ? (
            suggestions.map((suggestion) => (
              <article key={suggestion.id} className="rounded-lg border border-[#c3c6d0] bg-white p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold">{suggestion.title}</h2>
                  <Badge tone={statusTone(suggestion.status)}>{suggestion.status.replaceAll("_", " ")}</Badge>
                </div>
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#43474f]">
                  {suggestion.body_markdown}
                </p>
                {suggestion.owner_feedback ? (
                  <p className="mt-3 rounded border border-[#c3c6d0] bg-[#f9f9f9] p-3 text-sm text-[#43474f]">
                    Owner feedback: {suggestion.owner_feedback}
                  </p>
                ) : null}
                <p className="mt-3 text-xs font-medium uppercase tracking-[0.06em] text-[#43474f]">
                  Submitted {formatUpdatedAt(suggestion.created_at)}
                </p>
              </article>
            ))
          ) : (
            <p className="rounded-lg border border-[#c3c6d0] bg-white p-5 text-sm text-[#43474f]">
              You have not submitted any suggestions yet.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
