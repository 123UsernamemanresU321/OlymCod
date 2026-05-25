"use client";

import { BookOpen, Calculator, FileText, Image as ImageIcon, Inbox, Network, NotebookTabs, Plus, Search, ShieldCheck, Shapes, Shuffle, Sigma, Table2, Target } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { InlineMarkdown } from "@/components/editor/InlineMarkdown";
import { NoteCard } from "@/components/notes/NoteCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { TOPICS } from "@/lib/constants/notes";
import { calculateMastery } from "@/lib/mastery/calculateMastery";
import { analyzeMistakePatterns } from "@/lib/problems/analyzeMistakePatterns";
import type { MistakeLog, Note, NoteReview, ProblemLog, SiteSettings, Suggestion } from "@/lib/types";
import { matchesNoteSearch } from "@/lib/utils/notes";

interface DashboardClientProps {
  notes: Note[];
  suggestions: Suggestion[];
  reviews: NoteReview[];
  problems: ProblemLog[];
  mistakes: MistakeLog[];
  settings: SiteSettings;
}

const topicIcons = {
  "Number Theory": Sigma,
  Combinatorics: Network,
  Algebra: Calculator,
  Geometry: Shapes,
  Inequalities: Sigma,
  "Formula Bank": BookOpen,
  "Problem Patterns": FileText,
  Inbox
};

export function DashboardClient({ notes, suggestions, reviews, problems, mistakes, settings }: DashboardClientProps) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => notes.filter((note) => matchesNoteSearch(note, query)), [notes, query]);
  const recent = [...filtered].sort((a, b) => +new Date(b.updated_at) - +new Date(a.updated_at)).slice(0, 3);
  const favorites = filtered.filter((note) => note.is_favorite).slice(0, 5);
  const techniques = notes.filter((note) => note.note_type === "Technique");
  const today = new Date().toISOString().slice(0, 10);
  const reviewByNote = new Map(reviews.map((review) => [review.note_id, review]));
  const dueNotes = notes
    .filter((note) => {
      const review = reviewByNote.get(note.id);
      return !review || !review.next_review_at || review.next_review_at <= today;
    })
    .slice(0, 5);
  const masteryRows = useMemo(() => calculateMastery({ notes, reviews, problems, mistakes }), [mistakes, notes, problems, reviews]);
  const mistakePatterns = useMemo(() => analyzeMistakePatterns(problems, notes, "30d"), [notes, problems]);
  const weakestTopic = masteryRows.filter((row) => row.label !== "Unknown").sort((a, b) => a.score - b.score)[0];

  const stats = [
    { label: "Total notes", value: notes.length, tone: "bg-[#a5c8ff]" },
    { label: "Private notes", value: notes.filter((note) => note.visibility === "private").length, tone: "bg-[#dde2f3]" },
    { label: "Public notes", value: notes.filter((note) => note.visibility === "public").length, tone: "bg-[#93d4af]" },
    { label: "Pending suggestions", value: suggestions.filter((item) => item.status === "pending").length, tone: "bg-[#ffdad6]" }
  ];

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-8 lg:px-10 lg:py-10">
      <section className="mx-auto w-full max-w-3xl">
        <h1 className="sr-only">Olympiad Codex</h1>
        <p className="sr-only">
          A private handbook for theorems, techniques, formulae, and problem-solving patterns.
        </p>
        <label className="relative block">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#43474f]" />
          <input
            className="h-14 w-full rounded-lg border border-[#c3c6d0] bg-[#f9f9f9] pl-12 pr-4 text-base shadow-sm outline-none focus:border-[#2c5282] focus:ring-2 focus:ring-[#a5c8ff]"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search theorem, technique, formula, or tag..."
          />
        </label>

        <div className="mt-5 flex flex-wrap justify-center gap-4">
          <Button type="button" onClick={() => location.assign("/app/notes/new")}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            New Note
          </Button>
          <Button type="button" variant="secondary" onClick={() => location.assign("/app/capture")}>
            <Inbox className="h-4 w-4" aria-hidden="true" />
            Quick Capture
          </Button>
          <Button type="button" variant="secondary" onClick={() => location.assign("/app/review")}>
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            Review Suggestions
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={!techniques.length}
            onClick={() => {
              const note = techniques[Math.floor(Math.random() * techniques.length)];
              if (note) location.assign(`/app/notes/${note.id}`);
            }}
          >
            <Shuffle className="h-4 w-4" aria-hidden="true" />
            Random Technique
          </Button>
        </div>
      </section>

      <section className="grid gap-4 rounded-lg border border-[#c3c6d0] bg-white p-5 sm:grid-cols-3">
        <div>
          <p className="text-[13px] font-medium uppercase tracking-[0.06em] text-[#43474f]">
            Contribution Mode
          </p>
          <p className="mt-1 text-lg font-semibold text-[#1a1c1c]">
            {settings.contributions_enabled ? "Enabled" : "Disabled"}
          </p>
        </div>
        <div>
          <p className="text-[13px] font-medium uppercase tracking-[0.06em] text-[#43474f]">
            Public Notes
          </p>
          <p className="mt-1 text-lg font-semibold text-[#1a1c1c]">
            {settings.public_notes_enabled ? "Enabled" : "Disabled"}
          </p>
        </div>
        <div>
          <p className="text-[13px] font-medium uppercase tracking-[0.06em] text-[#43474f]">
            Approved / Rejected
          </p>
          <p className="mt-1 text-lg font-semibold text-[#1a1c1c]">
            {suggestions.filter((item) => item.status === "approved" || item.status === "merged").length}
            {" / "}
            {suggestions.filter((item) => item.status === "rejected" || item.status === "spam").length}
          </p>
        </div>
      </section>

      <section className="rounded-lg border border-[#c3c6d0] bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#dfe3ea] pb-3">
          <div>
            <h2 className="text-lg font-semibold text-[#1a1c1c]">Daily tools</h2>
            <p className="mt-1 text-sm text-[#43474f]">Open the main writing, organization, and export surfaces.</p>
          </div>
          <Link href="/app/settings" className="text-sm font-medium text-[#0e3b69] hover:underline">
            Settings
          </Link>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Link href="/app/workspace" className="rounded border border-[#d5d7de] bg-[#f9f9f9] p-4 hover:bg-white">
            <NotebookTabs className="h-5 w-5 text-[#0e3b69]" aria-hidden="true" />
            <h2 className="mt-3 text-lg font-semibold text-[#1a1c1c]">Workspace</h2>
            <p className="mt-2 text-sm leading-6 text-[#43474f]">Edit one note while referencing linked notes side by side.</p>
          </Link>
          <Link href="/app/notebook" className="rounded border border-[#d5d7de] bg-[#f9f9f9] p-4 hover:bg-white">
            <BookOpen className="h-5 w-5 text-[#0e3b69]" aria-hidden="true" />
            <h2 className="mt-3 text-lg font-semibold text-[#1a1c1c]">Notebook Builder</h2>
            <p className="mt-2 text-sm leading-6 text-[#43474f]">Build printable theorem sheets, formula sheets, and revision packs.</p>
          </Link>
          <Link href="/app/graph" className="rounded border border-[#d5d7de] bg-[#f9f9f9] p-4 hover:bg-white">
            <Network className="h-5 w-5 text-[#0e3b69]" aria-hidden="true" />
            <h2 className="mt-3 text-lg font-semibold text-[#1a1c1c]">Note Graph</h2>
            <p className="mt-2 text-sm leading-6 text-[#43474f]">Visualize prerequisites, special cases, and commonly confused notes.</p>
          </Link>
          <Link href="/app/media" className="rounded border border-[#d5d7de] bg-[#f9f9f9] p-4 hover:bg-white">
            <ImageIcon className="h-5 w-5 text-[#0e3b69]" aria-hidden="true" />
            <h2 className="mt-3 text-lg font-semibold text-[#1a1c1c]">Media Library</h2>
            <p className="mt-2 text-sm leading-6 text-[#43474f]">Manage diagrams, captions, alt text, and reusable media assets.</p>
          </Link>
          <Link href="/app/manage" className="rounded border border-[#d5d7de] bg-[#f9f9f9] p-4 hover:bg-white">
            <Table2 className="h-5 w-5 text-[#0e3b69]" aria-hidden="true" />
            <h2 className="mt-3 text-lg font-semibold text-[#1a1c1c]">Manage Notes</h2>
            <p className="mt-2 text-sm leading-6 text-[#43474f]">Bulk edit topics, tags, type-specific levels, visibility, and archived state.</p>
          </Link>
          <Link href="/app/revision-pack" className="rounded border border-[#d5d7de] bg-[#f9f9f9] p-4 hover:bg-white">
            <Target className="h-5 w-5 text-[#0e3b69]" aria-hidden="true" />
            <h2 className="mt-3 text-lg font-semibold text-[#1a1c1c]">Generate Contest Revision Pack</h2>
            <p className="mt-2 text-sm leading-6 text-[#43474f]">Build a compact pack from weak notes, failed problems, triggers, and false uses.</p>
          </Link>
          <Link href="/app/mastery" className="rounded border border-[#d5d7de] bg-[#f9f9f9] p-4 hover:bg-white">
            <Target className="h-5 w-5 text-[#0e3b69]" aria-hidden="true" />
            <h2 className="mt-3 text-lg font-semibold text-[#1a1c1c]">Mastery Heatmap</h2>
            <p className="mt-2 text-sm leading-6 text-[#43474f]">
              {weakestTopic ? `Weakest topic now: ${weakestTopic.topic} (${weakestTopic.label}).` : "Track topic strength as you review."}
            </p>
          </Link>
          <Link href="/app/mistakes" className="rounded border border-[#d5d7de] bg-[#f9f9f9] p-4 hover:bg-white">
            <ShieldCheck className="h-5 w-5 text-[#0e3b69]" aria-hidden="true" />
            <h2 className="mt-3 text-lg font-semibold text-[#1a1c1c]">Mistake Pattern</h2>
            <p className="mt-2 text-sm leading-6 text-[#43474f]">
              {mistakePatterns.topCategories[0]
                ? `${mistakePatterns.topCategories[0].label}: ${mistakePatterns.topCategories[0].count} recent weak problems.`
                : "Patterns appear once problems are marked failed or review later."}
            </p>
          </Link>
        </div>
      </section>

      <details className="rounded-lg border border-[#c3c6d0] bg-white p-4 text-sm">
        <summary className="cursor-pointer list-none font-semibold text-[#1a1c1c]">
          More organization tools
        </summary>
        <section className="mt-3 flex flex-wrap gap-2">
          {[
            ["/app/templates", "Templates"],
            ["/app/import", "Import"],
            ["/app/taxonomy", "Taxonomy"],
            ["/app/views", "Saved Views"],
            ["/app/merge", "Merge Notes"]
          ].map(([href, label]) => (
            <Link key={href} href={href} className="rounded border border-[#c3c6d0] px-3 py-2 font-medium text-[#0e3b69] hover:bg-[#eef4ff]">
              {label}
            </Link>
          ))}
        </section>
      </details>

      <section>
        <div className="border-b border-[#c3c6d0] pb-2">
          <h2 className="text-xl font-medium text-[#1a1c1c]">Knowledge Domains</h2>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {TOPICS.map((topic) => {
            const Icon = topicIcons[topic];
            return (
              <Link
                key={topic}
                href={topic === "Formula Bank" ? "/app/formula-bank" : topic === "Inbox" ? "/app/inbox" : `/app/notes?topic=${encodeURIComponent(topic)}`}
                className="rounded-lg border border-[#c3c6d0] bg-[#f9f9f9] p-4 hover:bg-white"
              >
                <Icon className="h-5 w-5 text-[#0e3b69]" aria-hidden="true" />
                <p className="mt-3 text-[13px] font-semibold tracking-[0.04em] text-[#1a1c1c]">
                  {topic}
                </p>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="flex min-h-28 items-center gap-4 border border-[#c3c6d0] bg-[#f9f9f9] p-4"
          >
            <span className={`grid h-9 w-9 place-items-center rounded ${stat.tone}`}>
              <FileText className="h-4 w-4 text-[#0e3b69]" aria-hidden="true" />
            </span>
            <div>
              <p className="text-3xl font-semibold text-[#1a1c1c]">{stat.value}</p>
              <p className="text-[13px] font-medium tracking-[0.04em] text-[#43474f]">
                {stat.label}
              </p>
            </div>
          </div>
        ))}
      </section>

      <section className="grid gap-8 lg:grid-cols-[2fr_1fr]">
        <div>
          <div className="flex items-center justify-between border-b border-[#c3c6d0] pb-2">
            <h2 className="text-xl font-medium text-[#1a1c1c]">Recent Notes</h2>
            <Link href="/app/notes" className="text-[13px] font-medium text-[#0e3b69]">
              View All
            </Link>
          </div>
          <div className="mt-5 grid gap-4">
            {recent.length ? (
              recent.map((note) => <NoteCard key={note.id} note={note} compact />)
            ) : (
              <EmptyState
                title="No notes yet"
                body="Create your first theorem, technique, formula, or problem pattern."
                actionHref="/app/notes/new"
                actionLabel="Create First Note"
              />
            )}
          </div>
        </div>

        <div>
          <div className="border-b border-[#c3c6d0] pb-2">
            <h2 className="text-xl font-medium text-[#1a1c1c]">Review Today</h2>
          </div>
          <div className="mt-5 grid gap-2">
            {dueNotes.length ? (
              dueNotes.map((note) => (
                <Link
                  key={note.id}
                  href={`/app/notes/${note.id}`}
                  className="flex items-center justify-between gap-3 p-2 text-sm font-medium text-[#1a1c1c] hover:bg-white"
                >
                  <InlineMarkdown text={note.title} className="truncate" />
                  <Badge>{note.topic}</Badge>
                </Link>
              ))
            ) : (
              <p className="text-sm leading-6 text-[#43474f]">No notes are due today.</p>
            )}
          </div>

          <div className="mt-8 border-b border-[#c3c6d0] pb-2">
            <h2 className="text-xl font-medium text-[#1a1c1c]">Favorite Notes</h2>
          </div>
          <div className="mt-5 grid gap-2">
            {favorites.length ? (
              favorites.map((note) => (
                <Link
                  key={note.id}
                  href={`/app/notes/${note.id}`}
                  className="flex items-center justify-between gap-3 p-2 text-sm font-medium text-[#1a1c1c] hover:bg-white"
                >
                  <InlineMarkdown text={note.title} className="truncate" />
                  <Badge>{note.topic}</Badge>
                </Link>
              ))
            ) : (
              <p className="text-sm leading-6 text-[#43474f]">Favorite notes appear here.</p>
            )}
          </div>
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between border-b border-[#c3c6d0] pb-2">
          <h2 className="text-xl font-medium text-[#1a1c1c]">Recent Contributor Activity</h2>
          <Link href="/app/review" className="text-[13px] font-medium text-[#0e3b69]">
            Review queue
          </Link>
        </div>
        <div className="mt-5 grid gap-3">
          {suggestions.length ? (
            suggestions.slice(0, 5).map((suggestion) => (
              <Link key={suggestion.id} href={`/app/review/${suggestion.id}`} className="rounded border border-[#c3c6d0] bg-[#f9f9f9] p-4 hover:bg-white">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">{suggestion.title}</span>
                  <Badge>{suggestion.status.replaceAll("_", " ")}</Badge>
                </div>
                <p className="mt-1 line-clamp-1 text-sm text-[#43474f]">{suggestion.body_markdown}</p>
              </Link>
            ))
          ) : (
            <p className="text-sm leading-6 text-[#43474f]">Contributor activity will appear here.</p>
          )}
        </div>
      </section>
    </div>
  );
}
