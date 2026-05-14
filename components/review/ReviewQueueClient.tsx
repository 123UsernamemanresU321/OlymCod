"use client";

import { AlertTriangle, ExternalLink, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { inputClassName } from "@/components/ui/Field";
import { SUGGESTION_STATUSES, SUGGESTION_TYPES, TOPICS } from "@/lib/constants/notes";
import type { Profile, Suggestion } from "@/lib/types";
import { formatUpdatedAt } from "@/lib/utils/notes";

interface ReviewQueueClientProps {
  suggestions: Suggestion[];
  profiles: Profile[];
}

function statusTone(status: string) {
  if (status === "approved" || status === "merged") return "green";
  if (status === "rejected" || status === "spam") return "red";
  if (status === "needs_changes") return "blue";
  return "default";
}

export function ReviewQueueClient({ suggestions, profiles }: ReviewQueueClientProps) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("pending");
  const [type, setType] = useState("All");
  const [topic, setTopic] = useState("All");
  const [contributor, setContributor] = useState("All");

  const profileById = useMemo(() => new Map(profiles.map((profile) => [profile.id, profile])), [profiles]);
  const filtered = useMemo(() => {
    return suggestions.filter((suggestion) => {
      const profile = suggestion.contributor_id ? profileById.get(suggestion.contributor_id) : null;
      const haystack = [
        suggestion.title,
        suggestion.body_markdown,
        suggestion.reason ?? "",
        suggestion.source_reference ?? "",
        profile?.email ?? "",
        profile?.display_name ?? ""
      ]
        .join(" ")
        .toLowerCase();
      if (query && !haystack.includes(query.toLowerCase())) return false;
      if (status !== "All" && suggestion.status !== status) return false;
      if (type !== "All" && suggestion.suggestion_type !== type) return false;
      if (topic !== "All" && suggestion.topic !== topic) return false;
      if (contributor !== "All" && suggestion.contributor_id !== contributor) return false;
      return true;
    });
  }, [contributor, profileById, query, status, suggestions, topic, type]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 lg:px-10">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Review Queue</h1>
          <p className="mt-2 text-[#43474f]">Moderate suggestions before they affect official notes.</p>
        </div>
        <label className="relative w-full lg:w-80">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#43474f]" />
          <input className={inputClassName("pl-10")} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search suggestions..." />
        </label>
      </header>

      <section className="mt-8 flex flex-wrap gap-3 rounded-lg border border-[#c3c6d0] bg-[#f9f9f9] p-4">
        <select className={inputClassName("w-auto min-w-36")} value={status} onChange={(event) => setStatus(event.target.value)}>
          <option>All</option>
          {SUGGESTION_STATUSES.map((item) => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}
        </select>
        <select className={inputClassName("w-auto min-w-36")} value={type} onChange={(event) => setType(event.target.value)}>
          <option>All</option>
          {SUGGESTION_TYPES.map((item) => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}
        </select>
        <select className={inputClassName("w-auto min-w-36")} value={topic} onChange={(event) => setTopic(event.target.value)}>
          <option>All</option>
          {TOPICS.filter((item) => item !== "Inbox").map((item) => <option key={item}>{item}</option>)}
        </select>
        <select className={inputClassName("w-auto min-w-48")} value={contributor} onChange={(event) => setContributor(event.target.value)}>
          <option>All</option>
          {profiles.map((profile) => (
            <option key={profile.id} value={profile.id}>{profile.email ?? profile.display_name ?? profile.id}</option>
          ))}
        </select>
      </section>

      <section className="mt-8 grid gap-4">
        {filtered.length ? filtered.map((suggestion) => {
          const profile = suggestion.contributor_id ? profileById.get(suggestion.contributor_id) : null;
          const containsLink = /https?:\/\//i.test(suggestion.body_markdown) || /https?:\/\//i.test(suggestion.source_reference ?? "");
          const containsImage = suggestion.diagram_urls.length > 0 || /!\[/.test(suggestion.body_markdown);
          const longSubmission = suggestion.body_markdown.length > 4000;

          return (
            <Link key={suggestion.id} href={`/app/review/${suggestion.id}`} className="rounded-lg border border-[#c3c6d0] bg-white p-5 hover:bg-[#f9f9f9]">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold">{suggestion.title}</h2>
                  <p className="mt-1 text-sm text-[#43474f]">
                    {profile?.display_name || profile?.email || "Unknown contributor"} · {formatUpdatedAt(suggestion.created_at)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge tone={statusTone(suggestion.status)}>{suggestion.status.replaceAll("_", " ")}</Badge>
                  <Badge>{suggestion.suggestion_type.replaceAll("_", " ")}</Badge>
                </div>
              </div>
              <p className="mt-4 line-clamp-2 text-sm leading-6 text-[#43474f]">{suggestion.body_markdown}</p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {containsLink ? <Badge tone="blue"><ExternalLink className="mr-1 h-3 w-3" /> contains link</Badge> : null}
                {containsImage ? <Badge tone="blue">contains image</Badge> : null}
                {longSubmission ? <Badge tone="red"><AlertTriangle className="mr-1 h-3 w-3" /> long submission</Badge> : null}
              </div>
            </Link>
          );
        }) : (
          <p className="rounded-lg border border-[#c3c6d0] bg-white p-5 text-sm text-[#43474f]">No suggestions match these filters.</p>
        )}
      </section>
    </div>
  );
}
