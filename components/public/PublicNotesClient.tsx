"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { InlineMarkdown } from "@/components/editor/InlineMarkdown";
import { Badge, DifficultyBadge } from "@/components/ui/Badge";
import { inputClassName } from "@/components/ui/Field";
import { MATH_TOPICS, SPECIAL_TOPICS, topicIncludes } from "@/lib/constants/notes";
import type { Note } from "@/lib/types";
import { matchesNoteSearch, sortNotes } from "@/lib/utils/notes";

export function PublicNotesClient({ notes }: { notes: Note[] }) {
  const [query, setQuery] = useState("");
  const [topic, setTopic] = useState("All");

  const filtered = useMemo(() => {
    return sortNotes(
      notes.filter((note) => {
        if (!matchesNoteSearch(note, query)) return false;
        if (!topicIncludes(note.topic, topic)) return false;
        return true;
      }),
      "updated"
    );
  }, [notes, query, topic]);

  return (
    <main className="min-h-screen bg-[#f9f9f9] px-4 py-10 text-[#1a1c1c] lg:px-10">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Link href="/" className="text-sm font-medium text-[#0e3b69]">
              Olympiad Codex
            </Link>
            <h1 className="mt-3 text-4xl font-semibold text-[#1a1c1c]">Public Notes</h1>
            <p className="mt-2 max-w-2xl text-[#43474f]">
              Published official notes. Private owner notes are not shown here.
            </p>
          </div>
          <label className="relative w-full lg:w-80">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#43474f]" />
            <input
              className={inputClassName("pl-10")}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search public notes..."
            />
          </label>
        </header>

        <section className="mt-8 flex flex-wrap gap-3 rounded-lg border border-[#c3c6d0] bg-white p-4">
          <select className={inputClassName("w-auto min-w-44")} value={topic} onChange={(event) => setTopic(event.target.value)}>
            <option>All</option>
            {[...MATH_TOPICS, ...SPECIAL_TOPICS.filter((item) => item !== "Inbox")].map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
          <Link
            href="/contribute/new"
            className="inline-flex min-h-9 items-center justify-center rounded border border-[#2c5282] bg-[#2c5282] px-4 py-2 text-[13px] font-medium tracking-[0.04em] text-white"
          >
            Propose New Note
          </Link>
        </section>

        <section className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filtered.length ? (
            filtered.map((note) => (
              <Link
                key={note.id}
                href={`/notes/${note.slug}`}
                className="rounded-lg border border-[#c3c6d0] bg-white p-5 hover:bg-[#f9f9f9]"
              >
                <div className="mb-4 flex flex-wrap gap-2">
                  <Badge tone="blue">{note.topic}</Badge>
                  <Badge>{note.note_type}</Badge>
                </div>
                <h2 className="text-xl font-semibold">
                  <InlineMarkdown text={note.title} />
                </h2>
                {note.description ? (
                  <InlineMarkdown text={note.description} className="mt-3 line-clamp-3 text-sm leading-6 text-[#43474f]" />
                ) : null}
                <div className="mt-5 flex flex-wrap gap-2">
                  <DifficultyBadge value={note.difficulty} noteType={note.note_type} />
                  {note.tags.slice(0, 3).map((tag) => (
                    <Badge key={tag}>{tag}</Badge>
                  ))}
                </div>
              </Link>
            ))
          ) : (
            <p className="rounded-lg border border-[#c3c6d0] p-5 text-sm text-[#43474f] md:col-span-2 xl:col-span-3">
              No public notes match this search.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
